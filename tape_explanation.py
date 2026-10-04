"""Traceable explanations of existing tape observations, not a second detector.

Uses only normalized prints and already-ranked pair/group windows. Transfer
arrows always run from seller to buyer; no order-book aggressor is inferred.
"""

from collections import defaultdict
import math

from pair_surveillance import _clock, _round_result


_CHECK_LABELS = {
    "pair_prints": "Jumlah transaksi pasangan",
    "internal_prints": "Jumlah transaksi internal kelompok",
    "distinct_timestamps": "Jumlah waktu berbeda",
    "prints_a_buys_b": "Transaksi A membeli dari B",
    "prints_b_buys_a": "Transaksi B membeli dari A",
    "pair_vwap_rise_pct": "Kenaikan VWAP pasangan (%)",
    "reciprocity_pct": "Keseimbangan volume dua arah (%)",
    "uploaded_rg_volume_share_pct": "Pangsa volume RG dalam jendela (%)",
    "comparable_direction_transitions": "Transisi arah yang dapat dibandingkan",
    "alternation_pct": "Pergantian arah (%)",
    "minimum_member_buy_prints": "Minimum transaksi beli tiap anggota",
    "minimum_member_sell_prints": "Minimum transaksi jual tiap anggota",
    "minimum_member_participation_pct": "Minimum partisipasi tiap anggota (%)",
    "minimum_member_balance_pct": "Minimum keseimbangan tiap anggota (%)",
    "group_balance_pct": "Keseimbangan kelompok (%)",
    "material_edge_strong_connectivity": "Semua anggota terhubung melalui arus material",
    "group_timestamp_vwap_rise_pct": "Kenaikan VWAP kelompok (%)",
    "positive_matched_rg_timestamp_vwap_change": "VWAP seluruh RG naik pada waktu pembanding yang sama",
}


def _vwap(rows):
    volume = sum(row["volume_shares"] for row in rows)
    return math.fsum(row["price"] * row["volume_shares"] for row in rows) / volume if volume else None


def _change(first, last, distinct):
    return (last / first - 1) * 100 if distinct and first and last is not None else None


def _example(trades, kind, candidate):
    brokers = candidate.get("brokers") or [candidate["broker_a"], candidate["broker_b"]]
    members = set(brokers)
    window = candidate["window"]
    rg = [row for row in trades if row["board"] == "RG"
          and window["start_seconds"] <= row["t"] <= window["end_seconds"]]
    internal = [row for row in rg if row["buyer"] in members and row["seller"] in members
                and row["buyer"] != row["seller"]]
    # Candidates originate from these same prints; do not create an empty example.
    if not internal:
        return None
    volume = sum(row["volume_shares"] for row in internal)
    rg_volume = sum(row["volume_shares"] for row in rg)
    first_t, last_t = min(row["t"] for row in internal), max(row["t"] for row in internal)
    first_vwap = _vwap([row for row in internal if row["t"] == first_t])
    last_vwap = _vwap([row for row in internal if row["t"] == last_t])
    rg_first = _vwap([row for row in rg if row["t"] == first_t])
    rg_last = _vwap([row for row in rg if row["t"] == last_t])
    internal_change = _change(first_vwap, last_vwap, first_t != last_t)
    rg_change = _change(rg_first, rg_last, first_t != last_t)
    edge_rows = defaultdict(list)
    for row in internal:
        edge_rows[row["seller"], row["buyer"]].append(row)
    edges = []
    for (seller, buyer), rows in sorted(edge_rows.items()):
        edge_volume = sum(row["volume_shares"] for row in rows)
        edges.append({"seller": seller, "buyer": buyer, "count": len(rows),
                      "volume_shares": edge_volume, "share_of_internal_pct": edge_volume / volume * 100,
                      "vwap": _vwap(rows)})
    flows = []
    for broker in brokers:
        buy = sum(row["volume_shares"] for row in internal if row["buyer"] == broker)
        sell = sum(row["volume_shares"] for row in internal if row["seller"] == broker)
        flows.append({"broker": broker, "buy_volume_shares": buy, "sell_volume_shares": sell,
                      "net_volume_shares": buy - sell,
                      "balance_pct": 200 * min(buy, sell) / (buy + sell) if buy + sell else None})
    balance = (1 - sum(abs(row["net_volume_shares"]) for row in flows) / (2 * volume)) * 100
    eligible = candidate["eligibility"]["eligible"]
    failed = [{**check, "label": _CHECK_LABELS.get(check["name"], check["name"])}
              for check in candidate["eligibility"]["checks"] if not check["passed"]]
    evidence = [
        {"label": "Transaksi internal teramati", "value": len(internal), "unit": "prints",
         "explanation": "Hanya transaksi RG dengan dua broker berbeda di dalam kelompok ini."},
        {"label": "Pangsa seluruh volume RG", "value": volume / rg_volume * 100, "unit": "%",
         "explanation": "Penyebut mencakup semua RG dalam jendela, termasuk kode sama atau broker yang tidak diketahui."},
        {"label": "Keseimbangan arus internal", "value": balance, "unit": "%",
         "explanation": "Dihitung dari jumlah absolut net lembar tiap anggota. Ini bukan persentase transaksi crossing."},
        {"label": "Perubahan VWAP internal", "value": internal_change, "unit": "%",
         "explanation": "Membandingkan rata-rata tertimbang pada waktu internal pertama dan terakhir; urutan dalam waktu yang sama tidak ditebak."},
        {"label": "Perubahan VWAP seluruh RG", "value": rg_change, "unit": "%",
         "explanation": "Memakai tepat dua waktu yang sama dengan VWAP internal, bukan harga pembukaan/penutupan harian."},
    ]
    interpretation = ("Pola memenuhi syarat penelitian untuk ditinjau. Arus dan harga berkaitan dalam jendela ini; penyebab kenaikan harga belum diketahui."
                      if eligible else "Aktivitas ini teramati, tetapi belum memenuhi seluruh syarat pola sirkulasi yang disertai kenaikan harga.")
    limitations = [
        "Panah penjual → pembeli menunjukkan transfer teramati, bukan urutan putaran saham yang sama atau pihak yang menggerakkan harga.",
        "Arus anggota di sini hanya terhadap sesama anggota. Net terhadap seluruh pasar dapat berbeda.",
        "Banyak nasabah dapat memakai broker yang sama. Data ini tidak mengidentifikasi rekening, pemilik, atau koordinasi.",
    ]
    if rg_change is not None and rg_change <= 0 and internal_change is not None and internal_change > 0:
        context_note = "VWAP internal naik, tetapi seluruh RG pada dua waktu yang sama tidak naik. Jangan menyimpulkan kelompok menaikkan harga pasar."
        interpretation = context_note + " " + interpretation
        limitations.append(context_note)
    if kind == "pair":
        limitations.append("Detektor pasangan menilai kenaikan VWAP pasangan. Pembanding seluruh RG membantu menilai apakah harga pasar pada waktu yang sama juga naik.")
    if candidate.get("timestamp_coverage", {}).get("mixed_price_timestamps", 0):
        limitations.append("Ada waktu berisi beberapa harga; perubahan campuran transaksi dapat mengubah VWAP tanpa menunjukkan urutan kenaikan.")
    return {"kind": kind, "brokers": brokers, "eligible": eligible, "window": dict(window),
            "headline": "Memenuhi syarat untuk ditinjau" if eligible else "Belum memenuhi semua syarat",
            "interpretation": interpretation, "evidence": evidence, "failed_checks": failed,
            "edges": edges, "member_flows": flows,
            "price_context": {"first_time": _clock(first_t), "last_time": _clock(last_t),
                              "internal_first_vwap": first_vwap, "internal_last_vwap": last_vwap,
                              "internal_change_pct": internal_change, "rg_first_vwap": rg_first,
                              "rg_last_vwap": rg_last, "rg_change_pct": rg_change},
            "limitations": limitations}


def explain_tape(trades, pair_report, group_report, *, invalid_row_count=0):
    """Explain one representative observation per detector without rescreening."""
    rg = [row for row in trades if row["board"] == "RG"]
    volume = sum(row["volume_shares"] for row in rg)
    known_volume = sum(row["volume_shares"] for row in rg if row["buyer"] and row["seller"])
    same_volume = sum(row["volume_shares"] for row in rg if row["buyer"] and row["buyer"] == row["seller"])
    examples = []
    for kind, report in (("pair", pair_report), ("group", group_report)):
        candidates = report.get("candidates", [])
        selected = next((row for row in candidates if row["eligibility"]["eligible"]), candidates[0] if candidates else None)
        if selected:
            example = _example(rg, kind, selected)
            if example:
                examples.append(example)
    found = any(report.get("status") == "candidates_found" for report in (pair_report, group_report))
    limited = not group_report.get("coverage", {}).get("search_exhaustive_within_uploaded_tape", True)
    if not rg:
        status, title = "no_regular_trades", "Belum ada transaksi RG untuk membaca sirkulasi"
        summary = "Data di papan lain atau papan yang tidak diketahui tidak dianggap sebagai bukti pola reguler."
    elif found:
        status, title = "review_candidates", "Ada pola broker yang layak diperiksa lebih lanjut"
        summary = "Setidaknya satu jendela memenuhi syarat penelitian. Baca arus antarbroker, net tiap anggota, dan pembanding harga sebelum menafsirkan hasil."
    else:
        status, title = "criteria_not_met", "Belum ada pola yang memenuhi semua syarat pemeriksaan"
        summary = "Hasil ini tidak membuktikan crossing tidak terjadi. Pola satu arah, tape yang tidak lengkap, atau kelompok di luar batas pencarian dapat terlewat."
    limitations = [
        "Crossing yang disengaja dan tujuan menaikkan harga tidak dapat dipastikan hanya dari kode broker; identitas rekening dan riwayat order tidak tersedia.",
        "Pangsa volume berlaku pada tape yang diunggah. Gunakan seluruh transaksi saham pada sesi itu, bukan tape yang difilter untuk beberapa broker.",
        "Setiap contoh adalah satu jendela dari detektor terkait. Contoh dapat tumpang tindih dan tidak dijumlahkan sebagai kejadian terpisah.",
        "Skor dan ambang adalah heuristik penelitian, bukan probabilitas manipulasi atau rekomendasi transaksi.",
    ]
    if same_volume:
        limitations.append("Kode pembeli dan penjual yang sama menunjukkan transaksi melalui broker yang sama; belum tentu nasabah atau pemiliknya sama.")
    if limited:
        limitations.append("Pencarian kelompok dibatasi pada broker dan kelompok terpilih; lihat rincian cakupan pencarian.")
    if invalid_row_count:
        limitations.append(f"{invalid_row_count} baris tidak valid dikeluarkan; periksa kesalahan sumber sebelum mengandalkan hasil.")
    return _round_result({"version": "1.0", "status": status, "title": title, "summary": summary,
                          "coverage": {"regular_trade_count": len(rg),
                                       "known_counterparty_volume_pct": 100 * known_volume / volume if volume else None,
                                       "same_broker_rg_volume_pct": 100 * same_volume / volume if volume else None,
                                       "invalid_row_count": invalid_row_count, "group_search_limited": limited},
                          "examples": examples, "limitations": limitations})
