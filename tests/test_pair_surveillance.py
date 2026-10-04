import json
import unittest

from pair_surveillance import analyze_pair_price_patterns


def trade(t, price=1000, buyer="AA", seller="BB", volume=100, board="RG"):
    return {"t": t, "time": str(t), "price": price, "volume_shares": volume,
            "value": price * volume, "buyer": buyer, "seller": seller, "board": board, "line": int(t) + 1}


def alternating(start=32400, spacing=30, prices=None, volume=100):
    prices = prices if prices is not None else [1000, 1002, 1004, 1006, 1008, 1010]
    return [trade(start + i * spacing, price,
                  "AA" if i % 2 == 0 else "BB", "BB" if i % 2 == 0 else "AA", volume)
            for i, price in enumerate(prices)]


def pair_candidate(result, a="AA", b="BB"):
    return next(c for c in result["candidates"] if c["broker_a"] == a and c["broker_b"] == b)


class PairSurveillanceTests(unittest.TestCase):
    def test_alternating_rising_sequence_meets_all_gates(self):
        result = analyze_pair_price_patterns(alternating())
        candidate = pair_candidate(result)
        self.assertEqual(result["status"], "candidates_found")
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["label"], "High-priority review candidate")
        self.assertEqual(candidate["count"], 6)
        self.assertEqual(candidate["distinct_timestamps"], 6)
        self.assertEqual(candidate["reciprocity_pct"], 100)
        self.assertEqual(candidate["volume_share_pct"], 100)
        self.assertEqual(candidate["alternation_pct"], 100)
        self.assertEqual(candidate["price_change_pct"], 1)
        self.assertEqual(candidate["score"], 100)
        self.assertEqual(candidate["context"]["nonpair_volume_shares"], 0)
        self.assertIsNone(candidate["context"]["nonpair_price_change_pct"])
        json.dumps(result, allow_nan=False)

    def test_two_prints_cannot_qualify(self):
        result = analyze_pair_price_patterns(alternating(prices=[1000, 1010]))
        candidate = pair_candidate(result)
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertEqual(result["diagnostics"]["eligible_windows"], 0)
        self.assertNotIn("High-priority", candidate["label"])

    def test_one_way_rising_prints_cannot_qualify(self):
        rows = [trade(32400 + i * 20, 1000 + i * 5) for i in range(10)]
        result = analyze_pair_price_patterns(rows)
        candidate = pair_candidate(result)
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["reciprocity_pct"], 0)
        self.assertEqual(candidate["alternation_pct"], 0)
        self.assertEqual(result["status"], "no_eligible_candidates")
        self.assertTrue(any("One-way" in warning for warning in result["warnings"]))

    def test_balanced_flat_and_falling_prints_cannot_qualify(self):
        for prices in ([1000] * 6, [1010, 1008, 1006, 1004, 1002, 1000]):
            with self.subTest(prices=prices):
                result = analyze_pair_price_patterns(alternating(prices=prices))
                candidate = pair_candidate(result)
                self.assertFalse(candidate["eligibility"]["eligible"])
                self.assertLessEqual(candidate["price_change_pct"], 0)
                self.assertEqual(candidate["label"], "Reciprocal activity without rising-price evidence")

    def test_small_reciprocal_pair_in_broad_rise_fails_dominance(self):
        rows = alternating()
        rows += [trade(32400 + i * 30, 1000 + i * 2, "CC", "DD", volume=2000) for i in range(6)]
        result = analyze_pair_price_patterns(rows)
        candidate = pair_candidate(result)
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertAlmostEqual(candidate["volume_share_pct"], 100 / 21, places=5)
        self.assertEqual(candidate["context"]["nonpair_price_change_pct"], 1)

    def test_unknown_and_same_broker_rg_volume_stays_in_denominators(self):
        rows = alternating()
        rows += [trade(32400, buyer=None, seller=None, volume=6000),
                 trade(32400, buyer="AA", seller="AA", volume=6000)]
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertAlmostEqual(candidate["volume_share_pct"], 600 / 12600 * 100, places=5)
        self.assertAlmostEqual(candidate["dependence_a_pct"], 600 / 6600 * 100, places=5)
        self.assertEqual(candidate["dependence_b_pct"], 100)

    def test_full_sample_window_preferred_over_early_ineligible_high_score(self):
        rows = alternating(spacing=10)
        rows.append(trade(32425, buyer=None, seller=None, volume=1000000))
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertEqual(candidate["count"], 6)
        self.assertLess(candidate["volume_share_pct"], 1)
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertIn("unattributed", candidate["context"]["comparison_population"])

    def test_ng_tn_unknown_boards_cannot_form_or_dilute_regular_candidate(self):
        rows = alternating()
        rows += [trade(32400, 99999, "AA", "BB", 100000, board) for board in ("NG", "TN", "UNKNOWN")]
        result = analyze_pair_price_patterns(rows)
        candidate = pair_candidate(result)
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["volume_share_pct"], 100)
        self.assertEqual(result["coverage"]["excluded_non_rg_count"], 3)

    def test_all_same_timestamp_has_no_price_or_alternation_evidence(self):
        rows = alternating(spacing=0)
        result = analyze_pair_price_patterns(rows)
        candidate = pair_candidate(result)
        self.assertIsNone(candidate["price_change_pct"])
        self.assertIsNone(candidate["alternation_pct"])
        self.assertIsNone(candidate["score"])
        self.assertEqual(candidate["distinct_timestamps"], 1)
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertTrue(any("print mixtures" in message for message in candidate["limitations"]))

    def test_tied_rows_and_reversed_tape_are_invariant(self):
        rows = alternating()
        rows += [trade(32400, 1020, "BB", "AA", 50),
                 trade(32460, 990, "BB", "AA", 500),
                 trade(32490, 1020, None, "DD", 400)]
        forward = analyze_pair_price_patterns(rows)
        reverse = analyze_pair_price_patterns(list(reversed(rows)))
        self.assertEqual(forward, reverse)

    def test_ambiguous_direction_buckets_do_not_create_alternation(self):
        rows = []
        for i in range(3):
            rows.extend([trade(32400 + i * 30, 1000 + i * 10, "AA", "BB"),
                         trade(32400 + i * 30, 1000 + i * 10, "BB", "AA")])
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertEqual(candidate["count"], 6)
        self.assertEqual(candidate["distinct_timestamps"], 3)
        self.assertEqual(candidate["ambiguous_direction_timestamps"], 3)
        self.assertIsNone(candidate["alternation_pct"])
        self.assertFalse(candidate["eligibility"]["eligible"])

    def test_inclusive_window_boundary_and_just_outside(self):
        rows = alternating(spacing=60)
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertEqual(candidate["count"], 6)
        self.assertEqual(candidate["window"]["start_seconds"], 32400)
        self.assertTrue(candidate["eligibility"]["eligible"])
        rows[-1]["t"] += .000001
        result = analyze_pair_price_patterns(rows)
        self.assertEqual(result["diagnostics"]["eligible_windows"], 0)
        self.assertFalse(pair_candidate(result)["eligibility"]["eligible"])

    def test_fractional_time_exact_boundary_is_inclusive(self):
        rows = alternating(start=32400.1, spacing=60)
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["count"], 6)

    def test_rolling_windows_cross_fixed_bucket_boundary(self):
        # A five-minute fixed bucket would split these six observations.
        rows = alternating(start=32690, spacing=10)
        result = analyze_pair_price_patterns(rows)
        self.assertTrue(pair_candidate(result)["eligibility"]["eligible"])

    def test_empty_no_rg_and_no_known_pair(self):
        for rows in ([], [trade(32400, board="NG")]):
            result = analyze_pair_price_patterns(rows)
            self.assertEqual(result["status"], "no_regular_trades")
            self.assertEqual(result["candidates"], [])
        result = analyze_pair_price_patterns([trade(32400, buyer=None), trade(32430, buyer="AA", seller="AA")])
        self.assertEqual(result["status"], "no_eligible_candidates")
        self.assertEqual(result["coverage"]["rg_volume_shares"], 200)
        self.assertEqual(result["candidates"], [])

    def test_return_cap_and_one_window_per_pair(self):
        rows = []
        for i in range(25):
            code = "B" + chr(65 + i)
            rows += [trade(32400 + j * 10, 1000 + j * 2,
                           "AA" if j % 2 == 0 else code, code if j % 2 == 0 else "AA") for j in range(8)]
        result = analyze_pair_price_patterns(rows)
        self.assertEqual(result["coverage"]["distinct_pairs"], 25)
        self.assertEqual(len(result["candidates"]), 20)
        self.assertEqual(len({(c["broker_a"], c["broker_b"]) for c in result["candidates"]}), 20)
        self.assertTrue(any("before display truncation" in w for w in result["warnings"]))

    def test_volume_balance_uses_direction_quantities(self):
        rows = alternating()
        for row in rows:
            if row["buyer"] == "AA":
                row["volume_shares"] = 900
        candidate = pair_candidate(analyze_pair_price_patterns(rows))
        self.assertEqual(candidate["reciprocity_pct"], 20)
        self.assertFalse(candidate["eligibility"]["eligible"])

    def test_custom_window_and_invalid_arguments(self):
        result = analyze_pair_price_patterns(alternating(spacing=60), window_seconds=600)
        self.assertTrue(pair_candidate(result)["eligibility"]["eligible"])
        for window in (0, -1, True, float("nan"), 90000):
            with self.subTest(window=window), self.assertRaises(ValueError):
                analyze_pair_price_patterns([], window)
        self.assertRaises(ValueError, analyze_pair_price_patterns, {})
        self.assertRaises(ValueError, analyze_pair_price_patterns, [trade(32400, volume=-1)])


if __name__ == "__main__":
    unittest.main()
