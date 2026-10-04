import json
import unittest
from pathlib import Path

from analyzer import analyze_payload, parse_number


def row(day="2026-07-01", code="AA", buy=200_000, sell=50_000,
        buy_lot=2, sell_lot=1, ticker="TEST"):
    return {"date": day, "ticker": ticker, "code": code, "buy_value": buy,
            "sell_value": sell, "buy_lot": buy_lot, "sell_lot": sell_lot}


def export(start="2026-07-01", end=None, ticker="TEST", board="RG"):
    return (f"\ufeff{ticker}ToBrokerCode\t{ticker}\tStart\t{start}\tEnd\t{end or start}\tMode\tValue\n"
            f"Investor\tAll\tBoard\t{board}\n"
            "BY\tBLot\tBVal\tBAvg\t#\tSL\tSLot\tSVal\tSAvg\n"
            "AA\t2\t200,000\t1000\t1\tBB\t2\t200,000\t1000\n"
            "BB\t1\t50,000\t500\t2\tAA\t1\t50,000\t500\n")


class NumberTests(unittest.TestCase):
    def test_locale_and_suffixes(self):
        cases = [("23,890,825,000", "auto", 23890825000),
                 ("23.890.825.000", "id", 23890825000),
                 ("3.624,43", "auto", 3624.43),
                 ("3,624.43", "auto", 3624.43),
                 ("1.234", "en", 1.234), ("1.234", "id", 1234),
                 ("1,5B", "id", 1500000000), ("0.125", "auto", .125),
                 ("1.234B", "auto", 1234000000), ("1,234B", "auto", 1234000000)]
        for value, fmt, expected in cases:
            with self.subTest(value=value, fmt=fmt):
                self.assertAlmostEqual(parse_number(value, fmt), expected)

    def test_invalid_numeric_values(self):
        for value in (True, float("nan"), float("inf"), 10 ** 400, "NaN", "1,23,456", [], "abc", "(-100)", "(+100)"):
            with self.subTest(value=value):
                self.assertRaises(ValueError, parse_number, value)


class ImportTests(unittest.TestCase):
    def test_bom_tsv_independent_buy_sell_ranks(self):
        result = analyze_payload({"files": [{"name": "test.csv", "text": export()}]})
        self.assertEqual(result["ticker"], "TEST")
        aa = result["brokers"][0]
        self.assertEqual(aa["code"], "AA")
        self.assertEqual(aa["net_value"], 150000)
        self.assertEqual(aa["avg_buy_price"], 1000)
        self.assertEqual(aa["net_flow_implied_price"], 1500)
        self.assertEqual(result["totals"]["net_value"], 0)
        self.assertEqual(result["concentration"]["top3_positive_net_pct"], 100)

    def test_quoted_canonical_csv(self):
        text = 'date,ticker,code,buy_value,sell_value,buy_lot,sell_lot\n2026-07-01,TEST,AA,"1,200,000","200,000",12,2\n'
        result = analyze_payload({"files": [{"name": "canonical.csv", "text": text}]})
        self.assertEqual(result["brokers"][0]["buy_value"], 1200000)
        self.assertEqual(result["brokers"][0]["avg_buy_price"], 1000)

    def test_unquoted_grouped_csv_fails_actionably(self):
        text = "date,ticker,code,buy_value,sell_value\n2026-07-01,TEST,AA,1,200,000,200,000\n"
        with self.assertRaisesRegex(ValueError, "quote grouped numbers"):
            analyze_payload({"files": [{"name": "bad.csv", "text": text}]})

    def test_duplicate_snapshot_is_not_counted_twice(self):
        result = analyze_payload({"files": [{"name": "a.csv", "text": export()}, {"name": "b.csv", "text": export()}]})
        self.assertEqual(result["totals"]["buy_value"], 250000)
        self.assertEqual(result["period"]["observed_days"], 1)
        self.assertTrue(any("Ignored duplicate" in w for w in result["warnings"]))

    def test_conflicting_day_and_overlapping_period_rejected(self):
        cases = [export().replace("200,000", "300,000"), export(end="2026-07-02")]
        for other in cases:
            with self.subTest(other=other), self.assertRaisesRegex(ValueError, "Overlapping or conflicting"):
                analyze_payload({"files": [{"name": "a", "text": export()}, {"name": "b", "text": other}]})

    def test_ranges_are_not_fabricated_sessions(self):
        result = analyze_payload({"files": [{"name": "range", "text": export(end="2026-07-08")} ]})
        self.assertEqual(result["period"]["observed_days"], 0)
        self.assertEqual(result["period"]["period_exports"], 1)
        self.assertEqual(result["daily"], [])
        component = next(c for c in result["score"]["components"] if c["name"] == "consistency")
        self.assertFalse(component["available"])

    def test_mixed_ticker_requires_selection(self):
        payload = {"broker_rows": [row(), row(ticker="BBRI")]}
        self.assertRaisesRegex(ValueError, "Mixed tickers", analyze_payload, payload)
        payload["ticker"] = "BBRI"
        result = analyze_payload(payload)
        self.assertEqual(result["ticker"], "BBRI")
        self.assertEqual(len(result["brokers"]), 1)
        self.assertTrue(any("excluded uploads" in w for w in result["warnings"]))

    def test_boards_and_duplicate_broker_rows(self):
        with self.assertRaisesRegex(ValueError, "Mixed trading boards"):
            analyze_payload({"files": [{"text": export()}, {"text": export(start="2026-07-02", board="NG")}]})
        self.assertRaisesRegex(ValueError, "duplicate broker", analyze_payload, {"broker_rows": [row(), row()]})

    def test_repository_raja_fixtures(self):
        folder = Path(__file__).resolve().parent.parent / "RAJA"
        if not folder.exists():
            self.skipTest("Repository sample exports are unavailable")
        files = [{"name": p.name, "text": p.read_text(encoding="utf-8-sig")} for p in folder.glob("*.csv")]
        result = analyze_payload({"files": files})
        self.assertEqual(result["ticker"], "RAJA")
        self.assertEqual(result["period"]["observed_days"], len(files))
        self.assertGreater(result["totals"]["buy_value"], 0)
        self.assertAlmostEqual(result["totals"]["buy_value"], result["totals"]["sell_value"])
        json.dumps(result, allow_nan=False)


class AnalyticsTests(unittest.TestCase):
    def test_buy_vwap_uses_total_gross_shares(self):
        result = analyze_payload({"broker_rows": [row(buy=200000, buy_lot=2), row(day="2026-07-02", buy=1200000, buy_lot=4)]})
        broker = result["brokers"][0]
        self.assertAlmostEqual(broker["avg_buy_price"], 1400000 / 600, places=5)
        self.assertNotEqual(broker["avg_buy_price"], 2000)  # Arithmetic average of daily VWAPs is wrong.
        self.assertEqual(broker["net_buy_days"], 2)
        self.assertEqual(broker["consistency_pct"], 100)

    def test_missing_volume_is_not_invented(self):
        result = analyze_payload({"broker_rows": [row(buy_lot=None)]})
        broker = result["brokers"][0]
        self.assertIsNone(broker["buy_shares"])
        self.assertIsNone(broker["net_lot"])
        self.assertIsNone(broker["avg_buy_price"])
        self.assertIsNone(broker["net_flow_implied_price"])
        self.assertIsNone(result["totals"]["buy_lot"])
        self.assertEqual(broker["avg_sell_price"], 500)

    def test_positive_flow_concentration_denominator(self):
        rows = [row(code="AA", buy=1600, sell=0, sell_lot=0), row(code="BB", buy=300, sell=0, sell_lot=0),
                row(code="CC", buy=100, sell=0, sell_lot=0), row(code="DD", buy=0, sell=2000, buy_lot=0)]
        result = analyze_payload({"broker_rows": rows})
        self.assertEqual(result["totals"]["net_value"], 0)
        self.assertEqual(result["concentration"]["top3_positive_net_pct"], 100)
        self.assertAlmostEqual(result["concentration"]["hhi_positive_net"], .665)

    def test_missing_components_do_not_get_neutral_points(self):
        result = analyze_payload({"broker_rows": [row()]})
        self.assertEqual(result["score"]["coverage_pct"], 40)
        for component in result["score"]["components"]:
            if component["name"] in ("consistency", "price", "volume", "fundamentals"):
                self.assertIsNone(component["score"])
                self.assertEqual(component["effective_weight"], 0)

    def test_consistency_counts_distinct_dates_and_missing_broker_as_no_buy(self):
        result = analyze_payload({"broker_rows": [row(), row(day="2026-07-02", code="BB", buy=50000, sell=50000)]})
        aa = next(b for b in result["brokers"] if b["code"] == "AA")
        self.assertEqual(aa["observed_days"], 2)
        self.assertEqual(aa["consistency_pct"], 50)
        component = next(c for c in result["score"]["components"] if c["name"] == "consistency")
        self.assertEqual(component["score"], 50)

    def test_future_prices_and_fundamentals_are_not_used(self):
        result = analyze_payload({"broker_rows": [row()],
            "prices": [{"date": "2026-07-02", "close": 9000, "prev_close": 1000, "volume": 100, "avg_volume": 1}],
            "fundamentals": {"as_of": "2026-07-02", "roe": 40, "pe": 4}})
        self.assertEqual(result["context"]["prices_used"], [])
        self.assertIsNone(result["context"]["fundamentals_used"])
        self.assertEqual(result["score"]["coverage_pct"], 40)

    def test_full_context_and_partial_fundamental_coverage(self):
        result = analyze_payload({"broker_rows": [row(), row(day="2026-07-02")],
            "prices": [{"date": "2026-07-01", "close": 1000, "prev_close": 950, "volume": 200, "avg_volume": 100},
                       {"date": "2026-07-02", "close": 1045, "volume": 100, "avg_volume": 100}],
            "fundamentals": {"as_of": "2026-06-01", "roe": 20, "pe": -5}})
        self.assertEqual(result["score"]["coverage_pct"], 95)
        fundamental = next(c for c in result["score"]["components"] if c["name"] == "fundamentals")
        self.assertEqual(fundamental["score"], 50)
        self.assertEqual(fundamental["effective_weight"], 5)
        self.assertEqual(result["context"]["price_return_pct"], 10)
        self.assertEqual(result["context"]["volume_ratio"], 1.5)

    def test_negative_and_nonfinite_fields_fail(self):
        for key, value in (("buy_value", -1), ("buy_value", True), ("sell_lot", float("inf")), ("buy_lot", -3)):
            bad = row()
            bad[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                analyze_payload({"broker_rows": [bad]})
        self.assertRaises(ValueError, analyze_payload, {"broker_rows": [row()], "prices": [{"date": "2026-07-01", "close": 1000, "volume": -1}]})

    def test_falsey_wrong_collection_types_rejected(self):
        for key, value in (("files", False), ("broker_rows", {}), ("prices", 0), ("fundamentals", [])):
            with self.subTest(key=key), self.assertRaises(ValueError):
                analyze_payload({"broker_rows": [row()], key: value})

    def test_zero_value_with_positive_lots_rejected(self):
        self.assertRaisesRegex(ValueError, "positive buy lots cannot have zero value", analyze_payload,
                               {"broker_rows": [row(buy=0)]})
        self.assertRaisesRegex(ValueError, "positive sell lots cannot have zero value", analyze_payload,
                               {"files": [{"text": export().replace("BB\t2\t200,000", "BB\t2\t0")} ]})


if __name__ == "__main__":
    unittest.main()
