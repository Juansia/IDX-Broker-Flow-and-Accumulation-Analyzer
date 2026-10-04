"""HTTP boundary tests, including actual broker fixtures and crossing integration."""
import http.client
import http.server
import json
import threading
import unittest
from unittest.mock import patch
import urllib.parse

import app


class LocalApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.LocalServer(("127.0.0.1", 0), app.Handler)
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join(timeout=2)

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        content = response.read()
        status, content_type = response.status, response.getheader("Content-Type", "")
        connection.close()
        return status, json.loads(content) if "application/json" in content_type else content

    def post(self, payload):
        return self.request("POST", "/api/analyze", json.dumps(payload), {"Content-Type": "application/json"})

    def test_health_and_static(self):
        self.assertEqual(self.request("GET", "/api/health")[1]["engine"], "python")
        self.assertEqual(self.request("GET", "/")[0], 200)

    def test_duplicate_server_cannot_share_listening_port(self):
        with self.assertRaises(OSError):
            app.LocalServer(("127.0.0.1", self.port), app.Handler)

    def test_sdmu_tape_sample_has_explicit_filename_date(self):
        status, result = self.request("GET", "/api/tape-sample")
        self.assertEqual(status, 200, result)
        self.assertEqual(result["ticker"], "SDMU")
        self.assertEqual(result["session_date"], "2026-09-24")
        self.assertEqual(result["date_source"], "filename")
        headings = [cell for cell in result["text"].splitlines()[0].split("\t") if cell]
        self.assertEqual(headings[:5], ["Time", "Stock", "Brd", "Price", "Qty"])

    def test_qty_units_and_separate_session_date(self):
        payload = {"running_trade":"Time\tStock\tBrd\tPrice\tQty\tBT\tBC\tSC\tST\t\n09:00:01\tSDMU\tRG\t90\t100\tD\tAA\tBB\tD\t",
                   "session_date":"2026-09-24"}
        def send():
            return self.request("POST", "/api/tape", json.dumps(payload), {"Content-Type":"application/json"})
        self.assertEqual(send()[0], 400)
        payload["quantity_unit"] = "lot"
        status, result = send()
        self.assertEqual(status, 200, result)
        self.assertEqual(result["trades"][0]["volume_shares"], 10000)
        self.assertEqual(result["input"]["date"], "2026-09-24")
        self.assertEqual(result["input"]["date_source"], "user_supplied_session_date")
        payload["quantity_unit"] = "shares"
        self.assertEqual(send()[1]["trades"][0]["volume_shares"], 100)
        payload["session_date"] = "2026-02-30"
        self.assertEqual(send()[0], 400)
        payload["session_date"] = "2026-09-24"
        payload["running_trade"] = "date,time,price,lot,buyer,seller,board\n2026-09-23,09:00:01,90,100,AA,BB,RG"
        payload.pop("quantity_unit")
        self.assertEqual(send()[0], 400)

    def test_no_workspace_or_settings_exposure(self):
        for path in ("/app.py", "/.claude/settings.local.json", "/../app.py", "/RAJA/", "/%2e%2e/app.py"):
            with self.subTest(path=path):
                self.assertEqual(self.request("GET", path)[0], 404)

    def test_sample_allowlist(self):
        status, data = self.request("GET", "/api/samples")
        self.assertEqual(status, 200)
        self.assertTrue(any(x["ticker"] == "RAJA" and x["single_day"] for x in data["files"]))
        ranged = [x for x in data["files"] if x["ticker"] == "BBRI" and not x["single_day"]]
        self.assertEqual(len(ranged), 1)
        self.assertEqual(self.request("GET", "/api/sample?name=../app.py")[0], 404)

    def test_actual_sample_with_tape(self):
        name = "RAJA/1007 RAJAToBroker.csv"
        status, sample = self.request("GET", "/api/sample?name=" + urllib.parse.quote(name))
        self.assertEqual(status, 200)
        payload = {"files": [sample], "number_format": "en", "running_trade":
                   "time,price,lot,buyer,seller,board\n09:00:01,4350,10,CC,CC,RG\n09:00:02,4350,20,CC,XL,RG"}
        status, result = self.post(payload)
        self.assertEqual(status, 200, result)
        self.assertEqual(result["ticker"], "RAJA")
        self.assertTrue(result["brokers"])
        self.assertEqual(result["tape"]["same_broker"]["count"], 1)
        self.assertEqual(result["tape"]["same_broker"]["value"], 4350000)

    def test_bad_json_and_invalid_payloads(self):
        for body in ("{", '{"files":NaN}', '"hello"', '[]', '{"running_trade": 12}'):
            with self.subTest(body=body):
                status, result = self.request("POST", "/api/analyze", body, {"Content-Type": "application/json"})
                self.assertEqual(status, 400, result)
                self.assertIn("error", result)

    def test_tape_must_match_summary_context_when_supplied(self):
        sample = {"name": "sample", "text": (app.BASE / "RAJA" / "1007 RAJAToBroker.csv").read_text()}
        for ticker, date in (("BBRI", "2026-07-10"), ("RAJA", "2026-07-09")):
            with self.subTest(ticker=ticker, date=date):
                status, result = self.post({"files": [sample], "running_trade":
                    f"date,ticker,time,price,lot,buyer,seller,board\n{date},{ticker},09:00:01,4350,10,CC,CC,RG"})
                self.assertEqual(status, 400, result)

    def test_standalone_pair_screen_and_controls(self):
        for pattern in ("rising", "flat", "oneway", "broad"):
            rows = ["date,ticker,time,price,lot,buyer,seller,board,trade_id"]
            for i in range(12):
                seconds = i * 8
                time = f"09:{seconds // 60:02d}:{seconds % 60:02d}"
                price = 2500 if pattern == "flat" else 2500 + i * 10
                forward = pattern == "oneway" or i % 2 == 0
                buyer, seller = ("AA", "ZZ") if forward else ("ZZ", "AA")
                rows.append(f"2026-01-02,DEMO,{time},{price},100,{buyer},{seller},RG,{i}")
                if pattern == "broad":
                    rows.append(f"2026-01-02,DEMO,{time},{price},900,CC,DD,RG,bg-{i}")
            status, result = self.request("POST", "/api/tape", json.dumps({
                "running_trade": "\n".join(rows)}), {"Content-Type": "application/json"})
            with self.subTest(pattern=pattern):
                self.assertEqual(status, 200, result)
                qualified = [c for c in result["pair_price_surveillance"]["candidates"] if c["eligibility"]["eligible"]]
                self.assertEqual(bool(qualified), pattern == "rising")
                self.assertEqual(result["input"]["ticker"], "DEMO")

    def test_standalone_tape_rejects_missing_text_and_bad_format(self):
        for payload in ({}, {"running_trade": ""}, {"running_trade": []},
                        {"running_trade": "time,price,lot\n09:00:01,1000,10", "number_format": []}):
            with self.subTest(payload=payload):
                status, result = self.request("POST", "/api/tape", json.dumps(payload), {"Content-Type": "application/json"})
                self.assertEqual(status, 400, result)

    def test_three_and_four_broker_cycles_reach_api_report(self):
        for size in (3, 4):
            codes = ["AA", "BB", "CC", "DD"][:size]
            rows = ["time,price,lot,buyer,seller,board"]
            for i in range(12):
                seconds = i * 8
                rows.append(f"09:{seconds // 60:02d}:{seconds % 60:02d},{2500+i*10},100,{codes[i % size]},{codes[(i+1) % size]},RG")
            status, result = self.request("POST", "/api/tape", json.dumps({"running_trade":"\n".join(rows)}), {"Content-Type":"application/json"})
            self.assertEqual(status, 200, result)
            group = next(c for c in result["group_price_surveillance"]["candidates"] if c["brokers"] == codes)
            self.assertTrue(group["eligibility"]["eligible"], group)

    def test_tape_screen_does_not_change_accumulation_score(self):
        payload = {"files": [{"name": "RAJA", "text": (app.BASE / "RAJA" / "1007 RAJAToBroker.csv").read_text()}]}
        status, original = self.post(payload)
        self.assertEqual(status, 200, original)
        payload["running_trade"] = "date,ticker,time,price,lot,buyer,seller,board\n2026-07-10,RAJA,09:00:01,4350,10,CC,XL,RG"
        status, screened = self.post(payload)
        self.assertEqual(status, 200, screened)
        self.assertEqual(original["score"], screened["score"])
        self.assertIn("pair_price_surveillance", screened["tape"])

    def test_wrong_origin_and_host_are_rejected(self):
        for headers in ({"Origin": "https://example.com"}, {"Host": "attacker.example"}):
            self.assertEqual(self.request("GET", "/api/health", headers=headers)[0], 403)

    def test_payload_size_and_type(self):
        self.assertEqual(self.request("POST", "/api/analyze", "{}")[0], 415)
        self.assertEqual(self.request("POST", "/api/analyze", "", {
            "Content-Type": "application/json", "Content-Length": str(app.MAX_BODY + 1)})[0], 413)

    def test_unexpected_error_is_not_exposed(self):
        with patch.object(app, "run_analysis", side_effect=RuntimeError("private details")):
            with self.assertLogs(level="ERROR"):
                status, result = self.post({})
        self.assertEqual(status, 500)
        self.assertNotIn("private details", result["error"])


class ProxyPolicyTests(unittest.TestCase):
    def test_only_allowed_https_destinations(self):
        app.validate_proxy_url("https://query1.finance.yahoo.com/v8/finance/chart/BBRI.JK")
        for url in ("http://query1.finance.yahoo.com/", "https://api.goapi.io:123/",
                    "https://api.goapi.io@127.0.0.1/", "https://api.goapi.io.example.com/",
                    "file:///etc/passwd", "https://example.com/"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                app.validate_proxy_url(url)

    def test_redirect_cannot_escape_allowlist(self):
        with self.assertRaises(ValueError):
            app.RestrictedRedirect().redirect_request(None, None, 302, "", {}, "http://127.0.0.1/")


if __name__ == "__main__":
    unittest.main()
