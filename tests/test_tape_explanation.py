import json
import unittest

from group_surveillance import analyze_group_price_patterns
from pair_surveillance import analyze_pair_price_patterns
from tape_analyzer import analyze_tape
from tape_explanation import explain_tape


def trade(t, price=1000, volume=100, buyer="AA", seller="BB", board="RG"):
    return {"t": t, "price": price, "volume_shares": volume,
            "buyer": buyer, "seller": seller, "board": board}


def alternating(*, volumes=None, prices=None):
    volumes = volumes or [100] * 6
    prices = prices or [1000 + 2 * i for i in range(6)]
    return [trade(32400 + i * 10, prices[i], volumes[i],
                  "AA" if i % 2 == 0 else "BB", "BB" if i % 2 == 0 else "AA")
            for i in range(len(prices))]


def explain(rows, window_seconds=300, invalid_row_count=0):
    return explain_tape(rows, analyze_pair_price_patterns(rows, window_seconds),
                        analyze_group_price_patterns(rows, window_seconds),
                        invalid_row_count=invalid_row_count)


def example(report, kind="pair"):
    return next(item for item in report["examples"] if item["kind"] == kind)


def edges_by_direction(item):
    return {(edge["seller"], edge["buyer"]): edge for edge in item["edges"]}


class TapeExplanationTests(unittest.TestCase):
    def test_edges_run_seller_to_buyer_and_member_nets_reconcile(self):
        item = example(explain(alternating(volumes=[100, 200, 100, 200, 100, 200])))
        edges = edges_by_direction(item)
        self.assertEqual(set(edges), {("AA", "BB"), ("BB", "AA")})
        self.assertEqual(edges["AA", "BB"]["volume_shares"], 600)
        self.assertEqual(edges["BB", "AA"]["volume_shares"], 300)
        self.assertEqual(edges["AA", "BB"]["count"], 3)
        self.assertEqual(edges["BB", "AA"]["count"], 3)
        self.assertAlmostEqual(sum(edge["share_of_internal_pct"] for edge in edges.values()), 100)
        flows = {row["broker"]: row for row in item["member_flows"]}
        self.assertEqual(flows["AA"]["buy_volume_shares"], 300)
        self.assertEqual(flows["AA"]["sell_volume_shares"], 600)
        self.assertEqual(flows["AA"]["net_volume_shares"], -300)
        self.assertEqual(flows["BB"]["net_volume_shares"], 300)

    def test_member_flows_exclude_trades_against_outside_brokers(self):
        rows = alternating()
        rows += [trade(32420, volume=2000, buyer="AA", seller="CC"),
                 trade(32430, volume=100, buyer="CC", seller="AA")]
        item = example(explain(rows))
        self.assertEqual(item["brokers"], ["AA", "BB"])
        self.assertEqual(sum(edge["volume_shares"] for edge in item["edges"]), 600)
        self.assertEqual([flow["net_volume_shares"] for flow in item["member_flows"]], [0, 0])
        self.assertEqual(sum(row["volume_shares"] for row in rows if row["buyer"] == "AA") -
                         sum(row["volume_shares"] for row in rows if row["seller"] == "AA"), 1900)
        self.assertTrue(any("seluruh pasar dapat berbeda" in text for text in item["limitations"]))

    def test_reversing_same_timestamp_rows_preserves_entire_explanation(self):
        original = alternating()
        rows = original + [{**row, "price": row["price"] + 1, "volume_shares": 300} for row in original]
        forward = explain(rows)
        backward = explain(list(reversed(rows)))
        self.assertEqual(forward, backward)
        item = example(forward)
        self.assertEqual(item["price_context"]["internal_first_vwap"], 1000.75)
        self.assertEqual(item["price_context"]["internal_last_vwap"], 1010.75)
        self.assertTrue(any("beberapa harga" in text for text in item["limitations"]))

    def test_inclusive_window_and_all_rg_denominator_and_price_endpoints(self):
        rows = alternating()
        rows += [trade(32400, 900, 100, None, None),
                 trade(32450, 1100, 100, "AA", "AA"),
                 trade(32400, 99999, 1_000_000, "AA", "BB", "NG"),
                 trade(32399, 5000, 5000, None, None),
                 trade(32451, 50, 5000, None, None)]
        item = example(explain(rows, window_seconds=50))
        self.assertEqual(item["window"]["start_seconds"], 32400)
        self.assertEqual(item["window"]["end_seconds"], 32450)
        self.assertEqual(sum(edge["count"] for edge in item["edges"]), 6)
        share = next(e["value"] for e in item["evidence"] if e["label"] == "Pangsa seluruh volume RG")
        self.assertEqual(share, 75)  # 600 pair shares / (600 + 100 unknown + 100 same-broker).
        prices = item["price_context"]
        self.assertEqual(prices["first_time"], "09:00:00")
        self.assertEqual(prices["last_time"], "09:00:50")
        self.assertEqual(prices["rg_first_vwap"], 950)
        self.assertEqual(prices["rg_last_vwap"], 1055)
        self.assertEqual(prices["internal_change_pct"], 1)
        self.assertAlmostEqual(prices["rg_change_pct"], (1055 / 950 - 1) * 100, places=6)

    def test_pair_rise_with_falling_matched_rg_has_explicit_warning(self):
        rows = alternating(prices=[100 + i for i in range(6)])
        rows += [trade(32400 + i * 10, 200 - 30 * i, 100, "CC", "DD") for i in range(6)]
        report = explain(rows)
        item = example(report)
        self.assertTrue(item["eligible"])  # Preserve the existing pair detector's definition.
        self.assertEqual(report["status"], "review_candidates")
        self.assertEqual(item["price_context"]["internal_change_pct"], 5)
        self.assertAlmostEqual(item["price_context"]["rg_change_pct"], -48.333333, places=6)
        self.assertTrue(any("seluruh RG pada dua waktu yang sama tidak naik" in text for text in item["limitations"]))
        self.assertTrue(any("Jangan menyimpulkan kelompok menaikkan harga pasar" in text for text in item["limitations"]))
        self.assertIn("Jangan menyimpulkan kelompok menaikkan harga pasar", item["interpretation"])

    def test_short_flat_and_no_regular_inputs_report_limits_and_failed_checks(self):
        for name, rows, failed_check in [
            ("short", alternating(prices=[1000, 1010]), "pair_prints"),
            ("flat", alternating(prices=[1000] * 6), "pair_vwap_rise_pct"),
        ]:
            with self.subTest(name=name):
                report = explain(rows)
                self.assertEqual(report["status"], "criteria_not_met")
                item = example(report)
                self.assertFalse(item["eligible"])
                self.assertIn(failed_check, {check["name"] for check in item["failed_checks"]})
                self.assertTrue(all(not check["passed"] for check in item["failed_checks"]))
        for rows in ([], [trade(32400, board="NG")], [trade(32400, board="UNKNOWN")]):
            with self.subTest(rows=rows):
                report = explain(rows)
                self.assertEqual(report["status"], "no_regular_trades")
                self.assertEqual(report["examples"], [])
                self.assertIsNone(report["coverage"]["known_counterparty_volume_pct"])

    def test_three_broker_cycle_exposes_actual_edges_without_pair_matching(self):
        brokers = ["AA", "BB", "CC"]
        rows = [trade(32400 + i * 10, 1000 + i * 2, 100,
                      brokers[(i + 1) % 3], brokers[i % 3]) for i in range(9)]
        report = explain(rows)
        item = example(report, "group")
        self.assertTrue(item["eligible"])
        edges = edges_by_direction(item)
        self.assertEqual(set(edges), {("AA", "BB"), ("BB", "CC"), ("CC", "AA")})
        self.assertTrue(all(edge["count"] == 3 and edge["volume_shares"] == 300 for edge in edges.values()))
        self.assertEqual([flow["net_volume_shares"] for flow in item["member_flows"]], [0, 0, 0])
        self.assertTrue(any("bukan urutan putaran saham yang sama" in text for text in item["limitations"]))
        self.assertFalse(example(report, "pair")["eligible"])

    def test_integrated_qty_tape_explanation_is_json_safe_and_preserves_invalid_count(self):
        lines = ["Time,Stock,Brd,Price,Qty,BC,SC"]
        for i in range(6):
            buyer, seller = ("AA", "BB") if i % 2 == 0 else ("BB", "AA")
            lines.append(f"09:00:{i * 10:02d},RAJA,RG,{1000 + i * 2},1,{buyer},{seller}")
        lines.append("invalid,RAJA,RG,1000,1,AA,BB")
        result = analyze_tape("\n".join(lines), quantity_unit="lot")
        report = result["explanation_report"]
        self.assertEqual(result["schema_version"], 4)
        self.assertEqual(report["status"], "review_candidates")
        self.assertEqual(report["coverage"]["regular_trade_count"], 6)
        self.assertEqual(report["coverage"]["known_counterparty_volume_pct"], 100)
        self.assertEqual(report["coverage"]["invalid_row_count"], 1)
        self.assertEqual(sum(edge["volume_shares"] for edge in example(report)["edges"]), 600)
        self.assertTrue(any("1 baris tidak valid" in text for text in report["limitations"]))
        self.assertEqual(json.loads(json.dumps(result, allow_nan=False))["explanation_report"], report)


if __name__ == "__main__":
    unittest.main()
