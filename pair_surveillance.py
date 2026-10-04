"""Review reciprocal two-broker activity associated with rising timestamp VWAP.

This is a reproducible surveillance heuristic, not an exchange rule, manipulation
detector, or ownership inference. It requires a validated single-stock/session
tape. Only RG trades form signals; every uploaded RG print, including prints
with unknown counterparties, contributes to volume denominators. Deduplication
by actual trade ID is the upstream parser's responsibility.

Each pair is examined at every distinct pair timestamp in inclusive rolling
[timestamp-window_seconds, timestamp] windows. Timestamp buckets remove any
dependence on input order within a timestamp. Direction alternation is measured
only between adjacent buckets that each have one unambiguous direction. Price
change means the change in pair VWAP between the first and last buckets; it
does not imply that this pair caused a market price change.

Sorting and prefix queries cost O(N log N); sliding pair statistics cost O(N).
The strongest window per pair is retained, with at most twenty returned. Optional
nonpair endpoint context scans at most twenty windows, a bounded O(20N) pass.
"""

from __future__ import annotations

import bisect
import math
from collections import defaultdict


VERSION = "1.0"
CONFIG = {
    "min_pair_prints": 6,
    "min_distinct_timestamps": 3,
    "min_prints_each_direction": 2,
    "min_price_rise_pct": 0.5,
    "min_reciprocity_pct": 60.0,
    "min_volume_share_pct": 25.0,
    "min_comparable_direction_transitions": 2,
    "min_alternation_pct": 50.0,
    "high_score_min": 70.0,
    "max_candidates": 20,
}
WEIGHTS = {"reciprocity": 20, "dominance": 20, "dependence": 15,
           "alternation": 15, "price": 30}
_SUM_KEYS = ("count", "count_ab", "count_ba", "volume", "volume_ab", "volume_ba", "value")


def _clock(seconds):
    # Seconds are within a single validated trading session; retain fractions.
    seconds = max(0, seconds)
    hour, remainder = divmod(seconds, 3600)
    minute, second = divmod(remainder, 60)
    text = f"{int(hour):02d}:{int(minute):02d}:{second:09.6f}"
    return text.rstrip("0").rstrip(".")


def _number(value, label, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a finite number in canonical trades.")
    try:
        result = float(value)
    except OverflowError as exc:
        raise ValueError(f"{label} exceeds supported numeric range.") from exc
    if not math.isfinite(result) or (positive and result <= 0):
        raise ValueError(f"{label} must be {'positive and ' if positive else ''}finite.")
    return result


def _prefix(rows):
    times, volumes, values = [], [0], [0.0]
    for row in rows:
        times.append(row["t"])
        volumes.append(volumes[-1] + row["volume_shares"])
        values.append(values[-1] + row["value"])
    return times, volumes, values


def _query(prefix, start, end):
    times, volumes, values = prefix
    left, right = bisect.bisect_left(times, start), bisect.bisect_right(times, end)
    return volumes[right] - volumes[left], values[right] - values[left], left, right


def _transition(first, second):
    comparable = int(first["direction"] != 0 and second["direction"] != 0)
    alternates = int(comparable and first["direction"] != second["direction"])
    return comparable, alternates


def _gates(metrics):
    return [
        ("pair_prints", metrics["count"], CONFIG["min_pair_prints"]),
        ("distinct_timestamps", metrics["distinct_timestamps"], CONFIG["min_distinct_timestamps"]),
        ("prints_a_buys_b", metrics["count_ab"], CONFIG["min_prints_each_direction"]),
        ("prints_b_buys_a", metrics["count_ba"], CONFIG["min_prints_each_direction"]),
        ("pair_vwap_rise_pct", metrics["price_change_pct"], CONFIG["min_price_rise_pct"]),
        ("reciprocity_pct", metrics["reciprocity_pct"], CONFIG["min_reciprocity_pct"]),
        ("uploaded_rg_volume_share_pct", metrics["volume_share_pct"], CONFIG["min_volume_share_pct"]),
        ("comparable_direction_transitions", metrics["comparable_direction_transitions"], CONFIG["min_comparable_direction_transitions"]),
        ("alternation_pct", metrics["alternation_pct"], CONFIG["min_alternation_pct"]),
    ]


def _score(metrics):
    change = metrics["price_change_pct"]
    scores = {"reciprocity": metrics["reciprocity_pct"],
        "dominance": metrics["volume_share_pct"],
        "dependence": min(metrics["dependence_a_pct"], metrics["dependence_b_pct"]),
        "alternation": metrics["alternation_pct"],
        "price": max(0, min(100, change / CONFIG["min_price_rise_pct"] * 50)) if change is not None else None}
    weight = sum(WEIGHTS[key] for key, value in scores.items() if value is not None)
    score = sum(WEIGHTS[key] * value for key, value in scores.items() if value is not None) / weight if weight and change is not None else None
    return score, weight, scores


def _round_result(value):
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("Surveillance numeric totals exceed the supported range.")
        return round(value, 6)
    if isinstance(value, dict):
        return {key: _round_result(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_round_result(item) for item in value]
    return value


def _nonpair_endpoints(rg_rows, pair, start, end, rg_prefix):
    _, _, left, right = _query(rg_prefix, start, end)
    buckets = {}
    for row in rg_rows[left:right]:
        if row["buyer"] and row["seller"] and tuple(sorted((row["buyer"], row["seller"]))) == pair:
            continue
        bucket = buckets.setdefault(row["t"], [0, 0.0])
        bucket[0] += row["volume_shares"]
        bucket[1] += row["value"]
    if not buckets:
        return {"nonpair_price_change_pct": None, "nonpair_distinct_timestamps": 0,
                "nonpair_first_timestamp": None, "nonpair_last_timestamp": None}
    times = sorted(buckets)
    first, last = buckets[times[0]], buckets[times[-1]]
    change = (last[1] / last[0] / (first[1] / first[0]) - 1) * 100 if len(times) >= 2 else None
    return {"nonpair_price_change_pct": change, "nonpair_distinct_timestamps": len(times),
            "nonpair_first_timestamp": _clock(times[0]), "nonpair_last_timestamp": _clock(times[-1])}


def _candidate(metrics, rg_rows, rg_prefix):
    score, coverage, scores = _score(metrics)
    gates = [{"name": name, "passed": actual is not None and actual + 1e-9 >= required,
              "actual": actual, "required": required} for name, actual, required in _gates(metrics)]
    eligible = all(gate["passed"] for gate in gates)
    if eligible:
        label = "High-priority review candidate" if score >= CONFIG["high_score_min"] else "Review candidate"
    elif metrics["price_change_pct"] is None:
        label = "Insufficient distinct-time price evidence"
    elif metrics["price_change_pct"] <= 0 and metrics["reciprocity_pct"] >= CONFIG["min_reciprocity_pct"]:
        label = "Reciprocal activity without rising-price evidence"
    else:
        label = "Does not meet review gates"
    context = {"rg_volume_shares": metrics["rg_volume"],
        "comparison_population": "Other or unattributed RG prints; unknown counterparties may include this pair.",
        "nonpair_volume_shares": metrics["rg_volume"] - metrics["volume"],
        "nonpair_volume_share_pct": 100 - metrics["volume_share_pct"],
        "pair_vwap": metrics["value"] / metrics["volume"],
        "nonpair_vwap": (metrics["rg_value"] - metrics["value"]) / (metrics["rg_volume"] - metrics["volume"]) if metrics["rg_volume"] > metrics["volume"] else None}
    context.update(_nonpair_endpoints(rg_rows, metrics["pair"], metrics["window_start"], metrics["window_end"], rg_prefix))
    descriptions = {
        "reciprocity": "100 × (1 − |A-buys-B volume − B-buys-A volume| / pair volume). Balanced quantities, not identified ownership.",
        "dominance": "Pair volume / all uploaded RG volume in the inclusive rolling window × 100; unknown-counterparty and same-broker RG prints stay in the denominator.",
        "dependence": "The smaller of each broker's pair-volume share of all uploaded RG volume involving that broker; each print counted once per broker.",
        "alternation": "Alternating directions / comparable adjacent distinct-timestamp bucket transitions × 100. Mixed-direction buckets make adjacent transitions unavailable.",
        "price": f"First-to-last pair timestamp-bucket VWAP change; score = clamp(change_pct / {CONFIG['min_price_rise_pct']} × 50, 0, 100). Unavailable with fewer than two timestamps.",
    }
    components = [{"name": name, "weight": WEIGHTS[name], "score": scores[name],
                   "available": scores[name] is not None, "evidence": descriptions[name]} for name in WEIGHTS]
    evidence = [f"{metrics['count']} actual pair prints across {metrics['distinct_timestamps']} distinct timestamps: {metrics['count_ab']} A-buys-B and {metrics['count_ba']} B-buys-A.",
                f"The pair represents {metrics['volume_share_pct']:.2f}% of uploaded RG volume in this window; two-way quantity balance is {metrics['reciprocity_pct']:.2f}%.",
                f"{metrics['alternating_transitions']} alternating direction transitions among {metrics['comparable_direction_transitions']} comparable adjacent timestamp transitions."]
    if metrics["price_change_pct"] is not None:
        evidence.append(f"Pair timestamp-bucket VWAP changed {metrics['price_change_pct']:.3f}% between {_clock(metrics['first_t'])} and {_clock(metrics['window_end'])}.")
    if context["nonpair_price_change_pct"] is not None:
        evidence.append(f"Other or unattributed RG timestamp-bucket VWAP changed {context['nonpair_price_change_pct']:.3f}% over its own observed endpoints within the same window; this is context, not an estimated counterfactual.")
    limitations = [
        "Broker identities represent intermediaries, not accounts or beneficial owners; reciprocal prints do not establish common ownership, wash trading, crossing, or intent.",
        "Pair VWAP change is price association, not proof the pair raised the market price; aggressor side and order-book impact are unknown.",
        "An uploaded tape may be incomplete. Opening/closing auction prints, normal liquidity provision, and order slicing may create similar patterns.",
        "Comparison prints include RG records with unknown counterparties, which may belong to this pair; the nonpair fields mean other or unattributed activity.",
        "One strongest window per pair is shown. Overlapping windows and different pairs are not independent events and their volumes must not be added.",
    ]
    if metrics["ambiguous_direction_timestamps"]:
        limitations.append(f"{metrics['ambiguous_direction_timestamps']} pair timestamps contain both directions; within-time ordering is unknown and those adjacent alternation comparisons are excluded.")
    if metrics["mixed_price_timestamps"]:
        limitations.append(f"{metrics['mixed_price_timestamps']} pair timestamps contain different prices. Changes in bucket VWAP may reflect changing print mixtures; no within-time price path is inferred.")
    return {"broker_a": metrics["pair"][0], "broker_b": metrics["pair"][1],
        "window": {"start": _clock(metrics["window_start"]), "end": _clock(metrics["window_end"]),
                   "start_seconds": metrics["window_start"], "end_seconds": metrics["window_end"],
                   "first_pair_timestamp": _clock(metrics["first_t"])},
        "count": metrics["count"], "distinct_timestamps": metrics["distinct_timestamps"],
        "count_a_buys_b": metrics["count_ab"], "count_b_buys_a": metrics["count_ba"],
        "volume_a_buys_b": metrics["volume_ab"], "volume_b_buys_a": metrics["volume_ba"],
        "volume_shares": metrics["volume"], "volume_share_pct": metrics["volume_share_pct"],
        "reciprocity_pct": metrics["reciprocity_pct"], "price_change_pct": metrics["price_change_pct"],
        "alternation_pct": metrics["alternation_pct"],
        "dependence_a_pct": metrics["dependence_a_pct"], "dependence_b_pct": metrics["dependence_b_pct"],
        "comparable_direction_transitions": metrics["comparable_direction_transitions"],
        "ambiguous_direction_timestamps": metrics["ambiguous_direction_timestamps"],
        "timestamp_coverage": {"distinct": metrics["distinct_timestamps"],
             "span_seconds": metrics["window_end"] - metrics["first_t"],
             "mixed_price_timestamps": metrics["mixed_price_timestamps"],
             "ambiguous_direction_timestamps": metrics["ambiguous_direction_timestamps"],
             "comparable_direction_transitions": metrics["comparable_direction_transitions"]},
        "score": score, "score_coverage_pct": coverage, "label": label, "components": components,
        "eligibility": {"eligible": eligible, "checks": gates},
        "evidence": evidence, "limitations": limitations, "context": context}


def analyze_pair_price_patterns(trades, window_seconds=300):
    """Analyze canonical tape rows; return ranked observations and explicit gates.

    Canonical rows contain t, price, volume_shares, buyer, seller, and board.
    Returned candidates include informative ineligible observations. Status and
    eligibility explicitly distinguish them from observations meeting all gates.
    All algorithm settings are generic research choices, not regulatory rules.
    """
    window_seconds = _number(window_seconds, "window_seconds", positive=True)
    if window_seconds > 86400:
        raise ValueError("window_seconds cannot exceed one day.")
    if not isinstance(trades, list):
        raise ValueError("trades must be a list of canonical validated tape rows.")
    rg_rows = []
    for index, trade in enumerate(trades):
        if not isinstance(trade, dict):
            raise ValueError(f"Trade {index + 1} must be an object.")
        if trade.get("board") != "RG":
            continue
        t = _number(trade.get("t"), f"trade {index + 1} t")
        if not 0 <= t < 86400:
            raise ValueError("Trade times must be seconds within one trading day.")
        price = _number(trade.get("price"), f"trade {index + 1} price", positive=True)
        volume = _number(trade.get("volume_shares"), f"trade {index + 1} volume_shares", positive=True)
        if not volume.is_integer() or volume > 2 ** 53 - 1:
            raise ValueError("Trade volume must be an exact positive whole share count.")
        buyer, seller = trade.get("buyer"), trade.get("seller")
        if any(code is not None and (not isinstance(code, str) or len(code) != 2 or not code.isalpha() or not code.isupper()) for code in (buyer, seller)):
            raise ValueError("Canonical broker codes must be uppercase two-letter codes or None.")
        value = price * int(volume)
        if not math.isfinite(value):
            raise ValueError("Trade value exceeds the supported numeric range.")
        rg_rows.append({"t": t, "price": price, "volume_shares": int(volume),
                        "value": value, "buyer": buyer, "seller": seller})
    # Secondary sorting makes tie sums reproducible even for reversed input.
    rg_rows.sort(key=lambda row: (row["t"], row["buyer"] or "", row["seller"] or "", row["price"], row["volume_shares"]))
    rg_prefix = _prefix(rg_rows)
    broker_rows = defaultdict(list)
    pair_groups = defaultdict(list)
    eligible_pair_count = eligible_pair_volume = 0
    known_both_volume = known_both_count = 0
    for row in rg_rows:
        for code in {row["buyer"], row["seller"]} - {None}:
            broker_rows[code].append(row)
        if row["buyer"] and row["seller"]:
            known_both_count += 1
            known_both_volume += row["volume_shares"]
        if not row["buyer"] or not row["seller"] or row["buyer"] == row["seller"]:
            continue
        eligible_pair_count += 1
        eligible_pair_volume += row["volume_shares"]
        pair = tuple(sorted((row["buyer"], row["seller"])))
        groups = pair_groups[pair]
        if not groups or groups[-1]["t"] != row["t"]:
            groups.append({"t": row["t"], **{key: 0 for key in _SUM_KEYS},
                           "min_price": row["price"], "max_price": row["price"]})
        group = groups[-1]
        direction = "ab" if row["buyer"] == pair[0] else "ba"
        group["count"] += 1
        group["count_" + direction] += 1
        group["volume"] += row["volume_shares"]
        group["volume_" + direction] += row["volume_shares"]
        group["value"] += row["value"]
        group["min_price"] = min(group["min_price"], row["price"])
        group["max_price"] = max(group["max_price"], row["price"])
    broker_prefix = {code: _prefix(rows) for code, rows in broker_rows.items()}
    best = []
    evaluated = eligible_windows = 0
    failed_gate_counts = defaultdict(int)
    for pair, groups in sorted(pair_groups.items()):
        for group in groups:
            group["direction"] = 0 if group["count_ab"] and group["count_ba"] else (1 if group["count_ab"] else -1)
            group["vwap"] = group["value"] / group["volume"]
        totals = {key: 0 for key in _SUM_KEYS}
        left = 0
        comparable = alternating = ambiguous = mixed_price = 0
        best_metrics = best_rank = None
        for right, group in enumerate(groups):
            for key in _SUM_KEYS:
                totals[key] += group[key]
            ambiguous += int(group["direction"] == 0)
            mixed_price += int(group["min_price"] != group["max_price"])
            if right > left:
                add_comparable, add_alternating = _transition(groups[right - 1], group)
                comparable += add_comparable
                alternating += add_alternating
            start = max(0, round(group["t"] - window_seconds, 6))
            while groups[left]["t"] < start:
                departing = groups[left]
                for key in _SUM_KEYS:
                    totals[key] -= departing[key]
                ambiguous -= int(departing["direction"] == 0)
                mixed_price -= int(departing["min_price"] != departing["max_price"])
                if left < right:
                    remove_comparable, remove_alternating = _transition(departing, groups[left + 1])
                    comparable -= remove_comparable
                    alternating -= remove_alternating
                left += 1
            rg_volume, rg_value, _, _ = _query(rg_prefix, start, group["t"])
            a_volume = _query(broker_prefix[pair[0]], start, group["t"])[0]
            b_volume = _query(broker_prefix[pair[1]], start, group["t"])[0]
            metrics = {**totals, "pair": pair, "window_start": start, "window_end": group["t"],
                "first_t": groups[left]["t"], "distinct_timestamps": right - left + 1,
                "rg_volume": rg_volume, "rg_value": rg_value,
                "volume_share_pct": totals["volume"] / rg_volume * 100,
                "reciprocity_pct": (1 - abs(totals["volume_ab"] - totals["volume_ba"]) / totals["volume"]) * 100,
                "dependence_a_pct": totals["volume"] / a_volume * 100,
                "dependence_b_pct": totals["volume"] / b_volume * 100,
                "alternation_pct": alternating / comparable * 100 if comparable else None,
                "comparable_direction_transitions": comparable, "alternating_transitions": alternating,
                "ambiguous_direction_timestamps": ambiguous, "mixed_price_timestamps": mixed_price,
                "price_change_pct": (group["vwap"] / groups[left]["vwap"] - 1) * 100 if right > left else None}
            gates = _gates(metrics)
            failed = [name for name, actual, required in gates if actual is None or actual + 1e-9 < required]
            for name in failed:
                failed_gate_counts[name] += 1
            eligible = not failed
            evaluated += 1
            eligible_windows += int(eligible)
            score, _, _ = _score(metrics)
            sample_complete = all(actual is not None and actual >= required for _, actual, required in gates[:4])
            rank = (eligible, sample_complete, len(gates) - len(failed),
                    score if score is not None else -1, totals["count"],
                    right - left + 1, totals["volume"], -group["t"])
            if best_rank is None or rank > best_rank:
                best_rank, best_metrics = rank, metrics
        best.append((best_rank, pair, best_metrics))
    best.sort(key=lambda item: (tuple(-float(value) for value in item[0]), item[1]))
    candidates = [_candidate(item[2], rg_rows, rg_prefix) for item in best[:CONFIG["max_candidates"]]]
    rg_volume = rg_prefix[1][-1]
    warnings = [
        "Research heuristic thresholds are configurable code defaults, not IDX rules, probabilities, or evidence of misconduct.",
        "Only uploaded RG prints enter signals. NG, TN, unknown boards, same-broker pairs, and missing-counterparty pairs cannot form a candidate; all uploaded RG prints remain in volume context.",
        "Input completeness and beneficial ownership are unknown; do not infer that two brokers caused a price rise or identify either broker as aggressor.",
        "Candidate observations include windows failing the explicit eligibility gates. Scores alone do not qualify a review candidate.",
        "This detector targets reciprocal two-broker patterns. One-way coordinated transfers need not reverse; failing these gates does not rule out other crossing or manipulation patterns.",
        "Only the strongest window per pair is returned; overlapping windows are dependent and their volumes must not be summed.",
    ]
    if len(best) > CONFIG["max_candidates"]:
        warnings.append(f"Returned the strongest {CONFIG['max_candidates']} of {len(best)} distinct pairs; every pair/window was evaluated before display truncation.")
    if not rg_rows:
        warnings.append("No uploaded RG prints are available; regular-market pair surveillance is unavailable.")
    if rg_rows and known_both_volume < rg_volume:
        warnings.append("Some RG counterparties are unknown; their volume remains in the denominator but cannot be attributed to a broker pair.")
    return _round_result({"version": VERSION, "config": {"window_seconds": window_seconds, **CONFIG,
              "score_weights": WEIGHTS, "window_boundary": "inclusive",
              "window_ranking": ["eligible", "minimum_sample_gates", "passed_gate_count", "score", "pair_print_count", "distinct_timestamps", "volume", "earliest_end"]},
        "coverage": {"input_count": len(trades), "rg_count": len(rg_rows), "rg_volume_shares": rg_volume,
            "eligible_pair_count": eligible_pair_count, "eligible_pair_volume_shares": eligible_pair_volume,
            "known_pair_volume_pct": eligible_pair_volume / rg_volume * 100 if rg_volume else None,
            "both_brokers_known_count": known_both_count,
            "both_brokers_known_volume_pct": known_both_volume / rg_volume * 100 if rg_volume else None,
            "excluded_non_rg_count": len(trades) - len(rg_rows), "evaluated_windows": evaluated,
            "distinct_pairs": len(pair_groups)},
        "status": "no_regular_trades" if not rg_rows else "candidates_found" if eligible_windows else "no_eligible_candidates",
        "diagnostics": {"evaluated_windows": evaluated, "eligible_windows": eligible_windows,
             "windows_not_eligible": evaluated - eligible_windows,
             "failed_gate_counts": dict(sorted(failed_gate_counts.items())),
             "returned_pairs": len(candidates), "eligible_pairs": sum(bool(item[0][0]) for item in best)},
        "candidates": candidates, "warnings": warnings})
