import json
import unittest

from tape_analyzer import analyze_tape


class TapeAnalyzerTests(unittest.TestCase):
    def test_empty_and_zero_are_actionable(self):
        for text in ("", "time,price,lot", "09:00:00 0 5", "09:00:00 500 0"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                analyze_tape(text)

    def test_same_broker_is_candidate_not_directional_buy(self):
        result = analyze_tape("time,price,lot,buyer,seller,board\n09:00:00,1000,10,AA,AA,RG\n09:00:01,1005,5,BB,CC,RG")
        self.assertEqual(result["same_broker"]["count"], 1)
        self.assertEqual(result["same_broker"]["value"], 1_000_000)
        self.assertEqual(result["summary"]["directional_trade_count"], 1)
        self.assertNotIn("AA", [row["broker"] for row in result["top_brokers"]])
        self.assertEqual(result["trades"][0]["aggressor"], "unknown")
        self.assertIn("same_broker", result["trades"][0]["candidate_types"])
        json.dumps(result, allow_nan=False)

    def test_boards_retained_and_excluded(self):
        result = analyze_tape("time,price,lot,buyer,seller,board\n09:00,1000,10,AA,BB,NG\n09:01,1000,20,AA,BB,TN\n09:02,1000,3,AA,BB,RG\n09:03,1000,2,AA,BB,XY")
        self.assertEqual(result["summary"]["trade_count"], 4)
        self.assertEqual(result["negotiated"]["lot"], 10)
        self.assertEqual(result["cash"]["lot"], 20)
        self.assertEqual(result["non_regular"]["lot"], 30)
        self.assertEqual(result["trades"][1]["candidate_types"], ["cash_board"])
        self.assertEqual(result["summary"]["directional_lot"], 3)
        self.assertEqual(result["summary"]["unknown_board_trade_count"], 1)
        self.assertEqual(result["summary"]["total_lot"], 35)

    def test_unknown_brokers_are_not_same_broker(self):
        result = analyze_tape("time,price,lot,buyer,seller,board\n09:00,1000,10,-,-,RG\n09:01,1000,5,ZZ,,RG\n09:02,1000,5,AA,ZZ,RG")
        self.assertEqual(result["same_broker"]["count"], 0)
        self.assertEqual(result["coverage"]["both_count"], 1)
        self.assertEqual(result["summary"]["directional_trade_count"], 1)
        self.assertEqual(result["trades"][1]["buyer"], "ZZ")
        self.assertIsNone(result["trades"][0]["buyer"])

    def test_numeric_formats_are_equivalent(self):
        english = analyze_tape('time,price,lot\n09:00,"1,250.00","1,000.50"', "en")
        indonesian = analyze_tape("jam;harga;lot\n09:00;1.250,00;1.000,50", "id")
        self.assertEqual(english["summary"], indonesian["summary"])
        self.assertEqual(english["summary"]["total_volume_shares"], 100050)
        self.assertEqual(analyze_tape("09:00 1.250,00 1.000,50")["input"]["resolved_number_format"], "id")

    def test_ambiguous_mixed_and_malformed_numbers(self):
        with self.assertRaisesRegex(ValueError, "Ambiguous"):
            analyze_tape("09:00 1,000 10")
        with self.assertRaisesRegex(ValueError, "Mixed"):
            analyze_tape("09:00 1,000.50 10\n09:01 1.000,50 10")
        for bad in ("1,00,000", "NaN", "Infinity", "1e8", "1.2.3", "-100", "0", "01,000"):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                analyze_tape(f"09:00 {bad} 1", "en")

    def test_auto_uses_consistent_decimal_evidence(self):
        result = analyze_tape("09:00 1,000 10\n09:01 1000.50 20")
        self.assertEqual(result["input"]["resolved_number_format"], "en")
        self.assertEqual(result["trades"][0]["price"], 1000)

    def test_reciprocal_pairs_use_actual_prints(self):
        text = "time,price,lot,buyer,seller,board\n09:00,1000,10,AA,BB,RG\n09:01,1010,7,BB,AA,RG\n09:01,1010,9,CC,DD,RG"
        result = analyze_tape(text)
        candidate = result["regular_pair_candidates"][0]
        self.assertTrue(candidate["reciprocal"])
        self.assertEqual(candidate["lot"], 17)
        self.assertEqual(candidate["count"], 2)
        self.assertEqual(len(result["regular_pair_candidates"]), 1)
        self.assertEqual(candidate["direction_counts"], {"AA>BB": 1, "BB>AA": 1})

    def test_duplicate_ids_dedup_but_identical_unidentified_prints_remain(self):
        text = "time,price,lot,buyer,seller,board,trade_id\n09:00,1000,10,AA,AA,RG,A1\n09:00,1000,10,AA,AA,RG,A1\n09:00,1000,10,AA,AA,RG,\n09:00,1000,10,AA,AA,RG,"
        result = analyze_tape(text)
        self.assertEqual(result["summary"]["trade_count"], 3)
        self.assertEqual(result["summary"]["raw_row_count"], 4)
        self.assertEqual(result["summary"]["duplicate_id_count"], 1)
        self.assertEqual(result["summary"]["total_lot"], 30)
        self.assertTrue(any("Deduplicated" in warning for warning in result["warnings"]))

    def test_conflicting_trade_id_is_not_silently_discarded(self):
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            analyze_tape("time,price,lot,trade_id\n09:00,1000,10,X\n09:01,1000,10,X")

    def test_volume_shares_conversion_and_indonesian_headers(self):
        result = analyze_tape("Jam\tHarga\tVolume (lembar)\tPembeli\tPenjual\tPasar\n09:00\t1000\t250\tAA\tBB\tReguler")
        self.assertEqual(result["input"]["volume_unit"], "shares")
        self.assertEqual(result["summary"]["total_lot"], 2.5)
        self.assertEqual(result["summary"]["total_value"], 250000)
        with self.assertRaisesRegex(ValueError, "whole number of shares"):
            analyze_tape("time,price,volume\n09:00,1000,1.5", "en")

    def test_invalid_rows_and_order_preserve_ties(self):
        result = analyze_tape("time,price,lot\n09:02,1000,1\n25:00,1000,2\n09:01,999,3\n09:01,998,4\nbad,1000,1\n09:00,1000\n09:03,0,1")
        self.assertEqual([row["line"] for row in result["trades"]], [4, 5, 2])
        self.assertEqual(result["summary"]["invalid_row_count"], 4)
        self.assertEqual([row["line"] for row in result["invalid_rows"]], [3, 6, 7, 8])
        self.assertEqual(result["summary"]["raw_row_count"], 7)

    def test_headerless_change_columns_and_missing_board(self):
        result = analyze_tape("09:00:01 1000 5 0.5% 30 AA AA\n09:00:02 1005 +5 +0.5% 20 AA BB NG")
        self.assertEqual(result["summary"]["total_lot"], 50)
        self.assertEqual(result["summary"]["unknown_board_trade_count"], 1)
        self.assertEqual(result["same_broker"]["count"], 1)
        self.assertEqual(result["negotiated"]["count"], 1)
        self.assertEqual(result["summary"]["directional_trade_count"], 0)

    def test_sample_caps_keep_full_counts(self):
        text = "time,price,lot,buyer,seller\n" + "\n".join("09:00,1000,1,AA,AA" for _ in range(60))
        result = analyze_tape(text)
        self.assertEqual(result["same_broker"]["count"], 60)
        self.assertEqual(len(result["same_broker"]["samples"]), 50)
        self.assertTrue(result["same_broker"]["samples_truncated"])

    def test_header_validation_and_multiple_stock_session(self):
        for text in ("time,price\n09:00,1000", "time,price,lot,volume\n09:00,1000,1,100", "time,price,lot,lot\n09:00,1000,1,1"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                analyze_tape(text)
        for field, values in (("ticker", ["BBRI", "BBCA"]), ("date", ["2026-10-01", "2026-10-02"])):
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "Multiple"):
                analyze_tape(f"time,price,lot,{field}\n09:00,1000,1,{values[0]}\n09:01,1000,1,{values[1]}")

    def test_zero_sum_directional_broker_nets_and_no_cross_pairing(self):
        result = analyze_tape("time,price,lot,buyer,seller,board\n09:00,1000,10,AA,BB,RG\n09:00,1000,10,CC,DD,RG")
        self.assertEqual(sum(row["net_value"] for row in result["top_brokers"]), 0)
        self.assertEqual(sum(row["net_volume_shares"] for row in result["top_brokers"]), 0)
        self.assertEqual(result["regular_pair_candidates"], [])
        self.assertEqual(result["same_broker"]["count"], 0)

    def test_headerless_by_sl_codes_and_percent_without_suffix(self):
        result = analyze_tape("09:00 1000 10 BY SL RG\n09:01 1000 0 0 7 BY SL RG")
        self.assertEqual(result["summary"]["total_lot"], 17)
        self.assertEqual(result["trades"][0]["buyer"], "BY")
        self.assertEqual(result["trades"][1]["seller"], "SL")

    def test_tsv_preserves_empty_trailing_optional_column(self):
        result = analyze_tape("time\tprice\tlot\tbuyer\tseller\n09:00\t1000\t10\tAA\t")
        self.assertEqual(result["summary"]["trade_count"], 1)
        self.assertIsNone(result["trades"][0]["seller"])

    def test_single_stock_session_metadata_is_exposed(self):
        result = analyze_tape("time,price,lot,ticker,date\n09:00,1000,1,bbri,02/10/2026")
        self.assertEqual(result["input"]["ticker"], "BBRI")
        self.assertEqual(result["input"]["date"], "2026-10-02")

    def test_qty_header_requires_explicit_unit(self):
        text = "Time\tStock\tBrd\tPrice\tQty\tBT\tBC\tSC\tST\t\n16:14:58\tSDMU\tRG\t76\t199\tD\tYP\tDR\tD\t"
        with self.assertRaisesRegex(ValueError, "Qty/quantity.*quantity_unit"):
            analyze_tape(text)
        lots = analyze_tape(text, quantity_unit="lot")
        shares = analyze_tape(text, quantity_unit="shares")
        self.assertEqual(lots["input"]["ticker"], "SDMU")
        self.assertEqual(lots["input"]["quantity_unit_source"], "explicit_qty_selection")
        self.assertEqual(lots["trades"][0]["buyer"], "YP")
        self.assertEqual(lots["trades"][0]["seller"], "DR")
        self.assertEqual(lots["trades"][0]["board"], "RG")
        self.assertEqual(lots["summary"]["total_volume_shares"], 19900)
        self.assertEqual(shares["summary"]["total_volume_shares"], 199)
        self.assertEqual(lots["summary"]["total_value"], shares["summary"]["total_value"] * 100)
        self.assertTrue(any("Qty has no unit" in message for message in lots["warnings"]))

    def test_redundant_blank_export_heading_requires_consistent_row_width(self):
        text = "Time\t\tStock\tBrd\tPrice\tQty\tBT\tBC\tSC\tST\t\n16:14:58\tSDMU\tRG\t76\t199\tD\tYP\tDR\tD\t"
        result = analyze_tape(text, quantity_unit="lot")
        self.assertEqual(result["trades"][0]["buyer"], "YP")
        self.assertEqual(result["trades"][0]["price"], 76)
        self.assertIn("Removed 1 blank", result["input"]["header_adjustment"])
        # A real blank data column is preserved when row/header widths match.
        result = analyze_tape(text.replace("16:14:58\tSDMU", "16:14:58\t\tSDMU"), quantity_unit="shares")
        self.assertIsNone(result["input"]["header_adjustment"])
        self.assertEqual(result["trades"][0]["seller"], "DR")

    def test_qty_export_keeps_identical_prints_and_ignores_bt_st(self):
        text = "Time\tStock\tBrd\tPrice\tQty\tBT\tBC\tSC\tST\t\n" + "\n".join([
            "16:14:58\tSDMU\tRG\t76\t1\tD\tXL\tDR\tF\t",
            "16:14:58\tSDMU\tRG\t76\t1\tD\tXL\tDR\tF\t",
            "16:14:57\tSDMU\tRG\t77\t10\tF\tYP\tYP\tD\t",
        ])
        result = analyze_tape(text, quantity_unit="lot")
        self.assertEqual(result["summary"]["trade_count"], 3)
        self.assertEqual(result["summary"]["duplicate_id_count"], 0)
        self.assertEqual(result["summary"]["same_broker_candidate_count"], 1)
        self.assertEqual(result["summary"]["total_lot"], 12)
        self.assertEqual([trade["line"] for trade in result["trades"]], [4, 2, 3])
        self.assertEqual(result["coverage"]["both_pct"], 100)
        self.assertTrue(all(trade["trade_id"] is None for trade in result["trades"]))

    def test_quantity_unit_validation_and_explicit_header_conflict(self):
        for unit in ("auto", "LOTS", 100, False, [], {}):
            with self.subTest(unit=unit), self.assertRaisesRegex(ValueError, "quantity_unit"):
                analyze_tape("09:00 1000 100", quantity_unit=unit)
        with self.assertRaisesRegex(ValueError, "conflicts"):
            analyze_tape("time,price,lot\n09:00,1000,100", quantity_unit="shares")
        with self.assertRaisesRegex(ValueError, "Supply only one"):
            analyze_tape("time,price,Qty,lot\n09:00,1000,100,1", quantity_unit="shares")
        result = analyze_tape("09:00 1000 100", quantity_unit="shares")
        self.assertEqual(result["summary"]["total_lot"], 1)
        self.assertEqual(result["input"]["quantity_unit_source"], "explicit_headerless")

    def test_quantity_csv_alias_and_lot_share_invariant_ratios(self):
        lines = ["time,price,quantity,BC,SC,Brd"]
        for i in range(6):
            buyer, seller = ("AA", "BB") if i % 2 == 0 else ("BB", "AA")
            lines.append(f"09:00:{i * 5:02d},{1000 + i * 10},100,{buyer},{seller},RG")
        text = "\n".join(lines)
        lots = analyze_tape(text, quantity_unit="lot")
        shares = analyze_tape(text, quantity_unit="shares")
        for key in ("score", "volume_share_pct", "reciprocity_pct", "price_change_pct", "eligibility"):
            self.assertEqual(lots["pair_price_surveillance"]["candidates"][0][key], shares["pair_price_surveillance"]["candidates"][0][key])

    def test_qty_tape_exposes_three_broker_group_surveillance(self):
        lines = ["Time,Stock,Brd,Price,Qty,BT,BC,SC,ST"]
        directions = [("AA", "BB"), ("BB", "CC"), ("CC", "AA")]
        for index in range(12):
            buyer, seller = directions[index % 3]
            lines.append(f"09:00:{index * 4:02d},SDMU,RG,{1000 + index * 5},100,D,{buyer},{seller},F")
        result = analyze_tape("\n".join(lines), quantity_unit="lot")
        self.assertEqual(result["schema_version"], 4)
        surveillance = result["group_price_surveillance"]
        self.assertEqual(surveillance["status"], "candidates_found")
        group = surveillance["candidates"][0]
        self.assertEqual(group["brokers"], ["AA", "BB", "CC"])
        self.assertTrue(group["eligibility"]["eligible"])
        self.assertEqual(group["count"], 12)
        self.assertEqual(group["volume_share_pct"], 100)
        self.assertGreater(group["price_change_pct"], 0)
        json.dumps(result, allow_nan=False)


if __name__ == "__main__":
    unittest.main()
