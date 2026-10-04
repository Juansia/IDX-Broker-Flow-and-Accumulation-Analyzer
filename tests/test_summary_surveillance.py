import json
import unittest
from pathlib import Path

from analyzer import analyze_payload
from summary_surveillance import analyze_summary_turnover


def row(code="AA", buy=100, sell=100, buy_lot=1, sell_lot=1, **extra):
    return {"code": code, "buy_value": buy, "sell_value": sell,
            "buy_lot": buy_lot, "sell_lot": sell_lot, **extra}


def source(day="2026-07-01", rows=None, end=None):
    rows = [row()] if rows is None else rows
    return {"start": day, "end": end or day, "ticker": "TEST", "board": "RG",
            "data": {r["code"]: r for r in rows}}


def broker(result, code="AA"):
    return next(item for item in result["brokers"] if item["code"] == code)


class SummarySurveillanceTests(unittest.TestCase):
    def test_multiday_cancellation_does_not_become_same_day_balance(self):
        result = analyze_summary_turnover([
            source(rows=[row(buy=1000, sell=0, sell_lot=0)]),
            source("2026-07-02", [row(buy=0, sell=1000, buy_lot=0)])])
        aa = broker(result)
        self.assertEqual(aa["net_value"], 0)
        self.assertEqual(aa["absolute_net_to_gross_pct"], 0)
        self.assertEqual(aa["same_day_balance_pct"], 0)
        self.assertFalse(aa["review_flag"])
        self.assertEqual(aa["role_switches"], 1)

    def test_same_day_balance_is_value_weighted(self):
        result = analyze_summary_turnover([
            source(rows=[row(buy=100, sell=100)]),
            source("2026-07-02", [row(buy=1800, sell=0, sell_lot=0)])])
        self.assertEqual(broker(result)["same_day_balance_pct"], 10)
        self.assertNotEqual(broker(result)["same_day_balance_pct"], 50)

    def test_period_exports_are_excluded_not_expanded_into_days(self):
        result = analyze_summary_turnover([
            source(rows=[row(buy=999999, sell=999999)], end="2026-07-07"),
            source("2026-07-08", [row(buy=100, sell=100)])])
        self.assertEqual(result["coverage"]["excluded_period_exports"], 1)
        self.assertEqual(result["coverage"]["observed_dates"], 1)
        self.assertEqual(broker(result)["gross_value"], 200)
        only_period = analyze_summary_turnover([source(end="2026-07-07")])
        self.assertEqual(only_period["status"], "no_daily_data")
        self.assertEqual(only_period["brokers"], [])

    def test_missing_lots_leave_prices_and_volume_sign_unknown(self):
        result = analyze_summary_turnover([source(rows=[row(buy_lot=None)])])
        aa = broker(result)
        self.assertEqual(aa["same_day_balance_pct"], 100)
        self.assertIsNone(aa["buy_lot"])
        self.assertIsNone(aa["net_lot"])
        self.assertIsNone(aa["net_value_volume_conflict"])
        self.assertIsNone(result["daily_observations"][0]["average_price_gap_pct"])

    def test_incomplete_side_has_null_daily_balance_and_explicit_coverage(self):
        sources = [source(f"2026-07-0{i}", [row(buy=100, sell=100)]) for i in (1, 2, 3)]
        sources.append(source("2026-07-04", [row(buy=9400, sell=0, sell_lot=0, sell_reported=False)]))
        result = analyze_summary_turnover(sources)
        aa = broker(result)
        incomplete = result["daily_observations"][-1]
        self.assertIsNone(incomplete["sell_value"])
        self.assertIsNone(incomplete["same_day_balance_pct"])
        self.assertIsNone(incomplete["absolute_net_to_gross_pct"])
        self.assertIsNone(incomplete["net_lot"])
        self.assertEqual(aa["same_day_balance_pct"], 100)
        self.assertEqual(aa["balance_covered_gross_pct"], 6)
        self.assertFalse(aa["review_flag"])
        self.assertEqual(aa["high_balance_dates"], 3)
        self.assertEqual(aa["net_buy_days"], 0)

    def test_explicit_zero_side_is_different_from_unreported_side(self):
        explicit = analyze_summary_turnover([source(rows=[row(sell=0, sell_lot=0)])])
        unknown = analyze_summary_turnover([source(rows=[row(sell=0, sell_lot=0, sell_reported=False)])])
        self.assertEqual(broker(explicit)["same_day_balance_pct"], 0)
        self.assertIsNone(broker(unknown)["same_day_balance_pct"])
        self.assertEqual(broker(explicit)["net_buy_days"], 1)
        self.assertEqual(broker(unknown)["net_buy_days"], 0)

    def test_role_switches_do_not_bridge_missing_zero_or_incomplete_dates(self):
        snapshots = [source("2026-07-01", [row(buy=200, sell=100)]),
            source("2026-07-02", [row(code="BB")]),
            source("2026-07-03", [row(buy=100, sell=200)]),
            source("2026-07-04", [row(buy=100, sell=100)]),
            source("2026-07-05", [row(buy=200, sell=100)]),
            source("2026-07-06", [row(buy=100, sell=0, sell_reported=False)]),
            source("2026-07-07", [row(buy=100, sell=200)])]
        aa = broker(analyze_summary_turnover(snapshots))
        self.assertEqual(aa["comparable_adjacent_pairs"], 0)
        self.assertEqual(aa["role_switches"], 0)
        self.assertIsNone(aa["role_switch_pct"])

    def test_adjacent_uploaded_dates_need_not_be_calendar_adjacent(self):
        aa = broker(analyze_summary_turnover([
            source("2026-07-01", [row(buy=200, sell=100)]),
            source("2026-07-09", [row(buy=100, sell=200)])]))
        self.assertEqual(aa["role_switches"], 1)
        self.assertEqual(aa["comparable_adjacent_pairs"], 1)

    def test_observed_two_sided_denominator_and_watchlist(self):
        snapshots = [source(f"2026-07-0{i}", [row(buy=100, sell=100), row("BB", 900, 900)]) for i in (1, 2, 3)]
        result = analyze_summary_turnover(snapshots)
        self.assertEqual(result["coverage"]["observed_two_sided_value"], 6000)
        self.assertEqual(broker(result)["gross_share_pct"], 10)
        self.assertEqual(result["daily_observations"][0]["gross_share_pct"], 10)
        self.assertTrue(broker(result)["review_flag"])
        self.assertEqual(result["coverage"]["watchlist_count"], 2)
        self.assertNotIn("score", result)
        json.dumps(result, allow_nan=False)

    def test_value_and_quantity_sign_conflict_is_explicit(self):
        result = analyze_summary_turnover([source(rows=[row(buy=200, sell=100, buy_lot=1, sell_lot=2)])])
        aa = broker(result)
        self.assertGreater(aa["net_value"], 0)
        self.assertLess(aa["net_lot"], 0)
        self.assertTrue(aa["net_value_volume_conflict"])
        self.assertTrue(result["daily_observations"][0]["net_value_volume_conflict"])
        self.assertTrue(any("Value/share direction disagree" in item for item in aa["evidence"]))

    def test_parser_retains_missing_side_flags_for_summary_only(self):
        text = ("TESTToBrokerCode\tTEST\tStart\t2026-07-01\tEnd\t2026-07-01\n"
                "Investor\tAll\tBoard\tRG\nBY\tBLot\tBVal\tSL\tSLot\tSVal\nAA\t1\t100\tBB\t1\t100\n")
        result = analyze_payload({"files": [{"name": "partial.tsv", "text": text}]})
        self.assertEqual(result["totals"]["buy_value"], 100)
        self.assertEqual(result["score"]["coverage_pct"], 40)
        aa = broker(result["summary_surveillance"])
        self.assertEqual(aa["one_side_unreported_dates"], 1)
        self.assertIsNone(aa["same_day_balance_pct"])
        self.assertIsNone(aa["net_value_volume_conflict"])

    def test_raja_fixture_cross_check(self):
        folder = Path(__file__).resolve().parent.parent / "RAJA"
        if not folder.exists():
            self.skipTest("RAJA fixtures unavailable")
        files = [{"name": path.name, "text": path.read_text(encoding="utf-8-sig")} for path in folder.glob("*.csv")]
        result = analyze_payload({"files": files})["summary_surveillance"]
        self.assertEqual(result["coverage"]["observed_dates"], 19)
        xl = broker(result, "XL")
        self.assertEqual(xl["gross_value"], 999794953000)
        self.assertEqual(xl["net_value"], 762997000)
        self.assertEqual(xl["net_lot"], -2712)
        self.assertTrue(xl["net_value_volume_conflict"])
        self.assertAlmostEqual(xl["gross_share_pct"], 20.407665, places=5)
        self.assertGreaterEqual(xl["same_day_balance_pct"], 80)
        self.assertTrue(xl["review_flag"])


if __name__ == "__main__":
    unittest.main()
