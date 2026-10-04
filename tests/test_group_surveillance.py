import json
import unittest

from group_surveillance import analyze_group_price_patterns


def trade(t, price=1000, buyer="BB", seller="AA", volume=100, board="RG"):
    return {"t": t, "price": price, "volume_shares": volume, "buyer": buyer,
            "seller": seller, "board": board, "value": price * volume, "line": int(t) + 1}


def cycle(brokers=("AA", "BB", "CC"), repeats=3, spacing=20, start=32400, volume=100):
    return [trade(start + i * spacing, 1000 + i * 2,
                  brokers[(i + 1) % len(brokers)], brokers[i % len(brokers)], volume)
            for i in range(len(brokers) * repeats)]


def find_group(result, brokers=("AA", "BB", "CC")):
    return next(candidate for candidate in result["candidates"] if candidate["brokers"] == list(brokers))


class GroupSurveillanceTests(unittest.TestCase):
    def test_three_member_cycle_without_any_reciprocal_pair_qualifies(self):
        result = analyze_group_price_patterns(cycle())
        candidate = find_group(result)
        self.assertEqual(result["status"], "candidates_found")
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["count"], 9)
        self.assertEqual(candidate["balance_pct"], 100)
        self.assertEqual(candidate["member_min_balance_pct"], 100)
        self.assertEqual(candidate["score"], 100)
        self.assertTrue(candidate["strongly_connected"])
        self.assertEqual(candidate["material_edge_count"], 3)
        self.assertEqual([m["net_volume_shares"] for m in candidate["member_flows"]], [0, 0, 0])
        self.assertGreater(candidate["rg_price_change_pct"], 0)
        json.dumps(result, allow_nan=False)

    def test_four_member_cycle_qualifies(self):
        brokers = ("AA", "BB", "CC", "DD")
        candidate = find_group(analyze_group_price_patterns(cycle(brokers)), brokers)
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["count"], 12)
        self.assertEqual(candidate["member_min_participation_pct"], 50)
        self.assertEqual(candidate["proper_subgroup_max_volume_share_pct"], 50)

    def test_a_pair_alone_does_not_create_a_group(self):
        result = analyze_group_price_patterns(cycle(("AA", "BB"), repeats=5))
        self.assertEqual(result["coverage"]["discovered_groups"], 0)
        self.assertEqual(result["candidates"], [])

    def test_dominant_pair_cannot_be_padded_with_tiny_third_member(self):
        rows = cycle(volume=1)
        rows += [trade(32400 + i * 20, 1000 + i * 2, "AA" if i % 2 else "BB", "BB" if i % 2 else "AA", 1000) for i in range(9)]
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertLess(candidate["member_min_participation_pct"], 20)
        self.assertGreater(candidate["proper_subgroup_max_volume_share_pct"], 80)

    def test_individual_absolute_nets_avoid_tautological_zero_group_net(self):
        rows = cycle()
        for row in rows:
            if row["seller"] == "AA":
                row["volume_shares"] = 900
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertEqual(sum(m["net_volume_shares"] for m in candidate["member_flows"]), 0)
        self.assertLess(candidate["balance_pct"], 60)
        self.assertFalse(candidate["eligibility"]["eligible"])

    def test_member_balance_blocks_small_returns_despite_high_group_balance(self):
        rows = []
        for i in range(6):
            rows.append(trade(32400 + i * 20, 1000 + i * 2,
                              "AA" if i % 2 else "BB", "BB" if i % 2 else "AA", 500))
        for i, (buyer, seller, volume) in enumerate((("AA", "CC", 450), ("AA", "CC", 450),
                                                    ("CC", "BB", 50), ("CC", "BB", 50)), 6):
            rows.append(trade(32400 + i * 20, 1000 + i * 2, buyer, seller, volume))
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertGreater(candidate["balance_pct"], 60)
        self.assertGreaterEqual(candidate["member_min_participation_pct"], 20)
        self.assertEqual(candidate["member_min_balance_pct"], 20)
        self.assertFalse(candidate["eligibility"]["eligible"])

    def test_disconnected_pairs_with_dust_bridges_fail_material_connectivity(self):
        rows = []
        for i in range(6):
            rows.append(trade(32400 + i * 20, 1000 + i * 2,
                              "AA" if i % 2 else "BB", "BB" if i % 2 else "AA", 500))
            rows.append(trade(32400 + i * 20, 1000 + i * 2,
                              "CC" if i % 2 else "DD", "DD" if i % 2 else "CC", 500))
        rows += [trade(32520, 1020, "BB", "CC", 1), trade(32540, 1022, "CC", "BB", 1)]
        candidate = find_group(analyze_group_price_patterns(rows), ("AA", "BB", "CC", "DD"))
        self.assertFalse(candidate["strongly_connected"])
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["balance_pct"], 100)

    def test_rising_group_with_flat_or_falling_matched_rg_price_cannot_qualify(self):
        for falling in (False, True):
            rows = cycle()
            rows += [trade(row["t"], 3000 - (row["price"] - 1000) * (2 if falling else 1),
                           None, None, 100) for row in list(rows)]
            with self.subTest(falling=falling):
                result = analyze_group_price_patterns(rows)
                candidate = find_group(result)
                self.assertGreater(candidate["price_change_pct"], 0)
                self.assertLessEqual(candidate["rg_price_change_pct"], 0)
                self.assertFalse(candidate["eligibility"]["eligible"])
                self.assertEqual(candidate["label"], "Group VWAP rise without RG price confirmation")

    def test_same_time_order_is_ignored_and_single_timestamp_price_is_null(self):
        rows = cycle(spacing=0)
        result = analyze_group_price_patterns(rows)
        self.assertEqual(result, analyze_group_price_patterns(list(reversed(rows))))
        candidate = find_group(result)
        self.assertIsNone(candidate["price_change_pct"])
        self.assertIsNone(candidate["rg_price_change_pct"])
        self.assertIsNone(candidate["score"])
        self.assertFalse(candidate["eligibility"]["eligible"])

    def test_three_timestamps_with_mixed_prices_is_reorder_invariant(self):
        rows = cycle()
        for index, row in enumerate(rows):
            row["t"] = 32400 + index // 3 * 30
        self.assertEqual(analyze_group_price_patterns(rows), analyze_group_price_patterns(list(reversed(rows))))
        self.assertTrue(find_group(analyze_group_price_patterns(rows))["eligibility"]["eligible"])

    def test_unknown_and_same_broker_rg_volume_stays_in_denominator(self):
        rows = cycle()
        rows += [trade(32400, buyer=None, seller=None, volume=9000),
                 trade(32400, buyer="AA", seller="AA", volume=9000)]
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertFalse(candidate["eligibility"]["eligible"])
        self.assertAlmostEqual(candidate["volume_share_pct"], 900 / 18900 * 100, places=5)
        aa = candidate["member_flows"][0]
        self.assertAlmostEqual(aa["dependence_pct"], 600 / 9600 * 100, places=5)

    def test_nonregular_boards_neither_form_nor_dilute_group(self):
        rows = cycle()
        rows += [trade(32400, 9999, "AA", "BB", 100000, board) for board in ("NG", "TN", "UNKNOWN")]
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["volume_share_pct"], 100)

    def test_inclusive_fractional_boundary_and_just_outside(self):
        rows = cycle(start=32400.1, spacing=37.5)
        candidate = find_group(analyze_group_price_patterns(rows))
        self.assertTrue(candidate["eligibility"]["eligible"])
        self.assertEqual(candidate["count"], 9)
        rows[-1]["t"] += .000001
        self.assertFalse(find_group(analyze_group_price_patterns(rows))["eligibility"]["eligible"])

    def test_broker_pool_cap_is_disclosed(self):
        high = tuple("A" + chr(65 + i) for i in range(12))
        rows = cycle(high, repeats=1, spacing=1, volume=100000)
        rows += cycle(("XA", "YA", "ZA"), spacing=1, volume=10)
        result = analyze_group_price_patterns(rows)
        self.assertEqual(result["coverage"]["eligible_broker_count"], 15)
        self.assertEqual(result["coverage"]["excluded_broker_count"], 3)
        self.assertFalse(result["coverage"]["search_exhaustive_within_uploaded_tape"])
        self.assertEqual(result["coverage"]["excluded_broker_touched_rg_volume_shares"], 90)
        self.assertTrue(any("Broker cap retained" in warning for warning in result["warnings"]))

    def test_group_cap_reserves_both_sizes_and_exposes_omissions(self):
        brokers = ["A" + chr(65 + i) for i in range(12)]
        rows = [trade(32400 + i, 1000 + i, buyer, seller)
                for i, (buyer, seller) in enumerate((b, s) for b in brokers for s in brokers if b != s)]
        result = analyze_group_price_patterns(rows)
        self.assertEqual(result["coverage"]["discovered_groups"], 715)
        self.assertEqual(result["coverage"]["searched_groups"], 100)
        self.assertEqual(result["coverage"]["groups_omitted_by_cap"], 615)
        self.assertEqual(len(result["candidates"]), 20)
        self.assertFalse(result["coverage"]["search_exhaustive_within_uploaded_tape"])
        self.assertEqual(result["config"]["endpoint_sampling"], "none")

    def test_uniform_quantity_rescaling_does_not_change_signals(self):
        original = cycle()
        scaled = [dict(row, volume_shares=row["volume_shares"] * 100) for row in original]
        a, b = find_group(analyze_group_price_patterns(original)), find_group(analyze_group_price_patterns(scaled))
        for key in ("score", "balance_pct", "volume_share_pct", "price_change_pct", "rg_price_change_pct", "member_min_participation_pct"):
            self.assertEqual(a[key], b[key])
        self.assertEqual(b["volume_shares"], a["volume_shares"] * 100)

    def test_no_rg_invalid_parameters_and_ineligible_small_cycle(self):
        self.assertEqual(analyze_group_price_patterns([])["status"], "no_regular_trades")
        self.assertEqual(analyze_group_price_patterns([trade(32400, board="NG")])["candidates"], [])
        candidate = find_group(analyze_group_price_patterns(cycle(repeats=1)))
        self.assertFalse(candidate["eligibility"]["eligible"])
        for window in (0, -1, True, float("nan"), 90000):
            with self.subTest(window=window), self.assertRaises(ValueError):
                analyze_group_price_patterns([], window)


if __name__ == "__main__":
    unittest.main()
