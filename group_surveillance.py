"""Bounded, auditable three/four-broker circulation surveillance for RG tapes.

Signals describe observed group flow and timestamp-bucket price association;
they never establish common ownership, trading intent, or price causation.
All numeric thresholds are generic research defaults, not exchange rules.

Search selects the twelve brokers with greatest known different-counterparty RG
participation volume, discovers globally strongly connected groups of size 3/4,
then examines at most 100 groups. Fifty slots per size are reserved before unused
slots are filled by internal volume. Every distinct internal timestamp is tested
in an inclusive rolling window; no timestamp or trade subsampling is used.
Membership/group caps and omitted volume are reported, so absence of a candidate
is never an exhaustive market finding. Same-broker and unknown-counterparty RG
prints remain in the overall window denominator and price context.
"""

from __future__ import annotations

import heapq
import itertools
import math
from collections import defaultdict

from pair_surveillance import _clock, _number, _prefix, _query, _round_result


VERSION = "1.0"
CONFIG = {
    "max_pool_brokers": 12, "max_groups": 100, "reserved_groups_per_size": 50,
    "max_candidates": 20, "group_sizes": [3, 4],
    "min_internal_prints": {"3": 9, "4": 12}, "min_distinct_timestamps": 3,
    "min_member_buy_prints": 2, "min_member_sell_prints": 2,
    "min_member_participation_pct": 20.0, "min_member_balance_pct": 40.0,
    "min_group_balance_pct": 60.0, "min_material_edge_volume_pct": 1.0,
    "min_volume_share_pct": 25.0, "min_price_rise_pct": 0.5,
    "require_positive_rg_price_change": True, "high_score_min": 70.0,
}
WEIGHTS = {"balance": 20, "dominance": 20, "dependence": 15,
           "participation": 15, "price": 30}


def _strongly_connected(outgoing, incoming, size):
    target = (1 << size) - 1
    for adjacency in (outgoing, incoming):
        visited, pending = 1, 1
        while pending:
            bit = pending & -pending
            pending ^= bit
            found = adjacency[bit.bit_length() - 1] & ~visited
            visited |= found
            pending |= found
        if visited != target:
            return False
    return True


def _edge_connectivity(edge_volume, size, threshold):
    outgoing, incoming = [0] * size, [0] * size
    material = 0
    for seller in range(size):
        for buyer in range(size):
            volume = edge_volume[seller * size + buyer]
            if seller != buyer and volume > 0 and volume + 1e-9 >= threshold:
                outgoing[seller] |= 1 << buyer
                incoming[buyer] |= 1 << seller
                material += 1
    return _strongly_connected(outgoing, incoming, size), material


def _canonical_rows(trades):
    if not isinstance(trades, list):
        raise ValueError("trades must be a list of canonical validated tape rows.")
    rows = []
    for index, trade in enumerate(trades):
        if not isinstance(trade, dict):
            raise ValueError(f"Trade {index + 1} must be an object.")
        if trade.get("board") != "RG":
            continue
        t = _number(trade.get("t"), "canonical trade t")
        price = _number(trade.get("price"), "canonical trade price", positive=True)
        volume = _number(trade.get("volume_shares"), "canonical trade volume_shares", positive=True)
        if not 0 <= t < 86400 or not volume.is_integer() or volume > 2 ** 53 - 1:
            raise ValueError("Canonical trades require times within one day and exact positive whole share quantities.")
        buyer, seller = trade.get("buyer"), trade.get("seller")
        if any(code is not None and (not isinstance(code, str) or len(code) != 2 or not code.isalpha() or not code.isupper()) for code in (buyer, seller)):
            raise ValueError("Canonical broker codes must be uppercase two-letter codes or None.")
        value = price * int(volume)
        if not math.isfinite(value):
            raise ValueError("Trade value exceeds the supported numeric range.")
        rows.append({"t": t, "price": price, "volume_shares": int(volume),
                     "value": value, "buyer": buyer, "seller": seller})
    rows.sort(key=lambda row: (row["t"], row["buyer"] or "", row["seller"] or "", row["price"], row["volume_shares"]))
    return rows


def _buckets(group, pair_rows):
    index = {code: i for i, code in enumerate(group)}
    streams = [pair_rows.get(pair, []) for pair in itertools.combinations(group, 2)]
    buckets = []
    for row in heapq.merge(*streams, key=lambda item: (item["t"], item["buyer"], item["seller"], item["price"], item["volume_shares"])):
        if not buckets or buckets[-1]["t"] != row["t"]:
            buckets.append({"t": row["t"], "count": 0, "volume": 0, "value": 0.0,
                            "edges": {}, "min_price": row["price"], "max_price": row["price"]})
        bucket = buckets[-1]
        bucket["count"] += 1
        bucket["volume"] += row["volume_shares"]
        bucket["value"] += row["value"]
        edge = (index[row["seller"]], index[row["buyer"]])
        data = bucket["edges"].setdefault(edge, [0, 0])
        data[0] += 1
        data[1] += row["volume_shares"]
        bucket["min_price"] = min(bucket["min_price"], row["price"])
        bucket["max_price"] = max(bucket["max_price"], row["price"])
    for bucket in buckets:
        bucket["vwap"] = bucket["value"] / bucket["volume"]
        bucket["edges"] = [(seller, buyer, data[0], data[1]) for (seller, buyer), data in sorted(bucket["edges"].items())]
    return buckets


def _gates(metrics):
    return [
        ("internal_prints", metrics["count"], CONFIG["min_internal_prints"][str(metrics["size"])]),
        ("distinct_timestamps", metrics["distinct"], CONFIG["min_distinct_timestamps"]),
        ("minimum_member_buy_prints", min(metrics["buy_counts"]), CONFIG["min_member_buy_prints"]),
        ("minimum_member_sell_prints", min(metrics["sell_counts"]), CONFIG["min_member_sell_prints"]),
        ("minimum_member_participation_pct", metrics["min_participation"], CONFIG["min_member_participation_pct"]),
        ("minimum_member_balance_pct", metrics["min_balance"], CONFIG["min_member_balance_pct"]),
        ("group_balance_pct", metrics["balance"], CONFIG["min_group_balance_pct"]),
        ("material_edge_strong_connectivity", metrics["connected"], True),
        ("uploaded_rg_volume_share_pct", metrics["share"], CONFIG["min_volume_share_pct"]),
        ("group_timestamp_vwap_rise_pct", metrics["change"], CONFIG["min_price_rise_pct"]),
        ("positive_matched_rg_timestamp_vwap_change", metrics["rg_change"] is not None and metrics["rg_change"] > 0, True),
    ]


def _passed(actual, required):
    return actual is not None and actual + 1e-9 >= required


def _scores(metrics):
    change = metrics["change"]
    scores = {"balance": metrics["balance"], "dominance": metrics["share"],
        "dependence": min(metrics["dependence"]),
        "participation": min(100.0, metrics["min_participation"] / (200 / metrics["size"]) * 100),
        "price": min(100.0, max(0.0, change / CONFIG["min_price_rise_pct"] * 50)) if change is not None else None}
    available_weight = sum(WEIGHTS[key] for key, value in scores.items() if value is not None)
    score = sum(WEIGHTS[key] * value for key, value in scores.items() if value is not None) / available_weight if change is not None else None
    return score, available_weight, scores


def _candidate(metrics):
    score, score_coverage, scores = _scores(metrics)
    checks = [{"name": name, "actual": actual, "required": required, "passed": _passed(actual, required)}
              for name, actual, required in _gates(metrics)]
    eligible = all(check["passed"] for check in checks)
    if eligible:
        label = "High-priority group review candidate" if score >= CONFIG["high_score_min"] else "Group review candidate"
    elif metrics["change"] is None:
        label = "Insufficient distinct-time price evidence"
    elif metrics["change"] <= 0:
        label = "Group activity without rising-price evidence"
    elif metrics["rg_change"] is not None and metrics["rg_change"] <= 0:
        label = "Group VWAP rise without RG price confirmation"
    else:
        label = "Does not meet group review gates"
    members = []
    for i, broker in enumerate(metrics["group"]):
        buy, sell = metrics["buys"][i], metrics["sells"][i]
        members.append({"broker": broker, "buy_volume_shares": buy, "sell_volume_shares": sell,
            "net_volume_shares": buy - sell, "buy_count": metrics["buy_counts"][i],
            "sell_count": metrics["sell_counts"][i], "participation_pct": (buy + sell) / metrics["volume"] * 100,
            "balance_pct": 2 * min(buy, sell) / (buy + sell) * 100 if buy + sell else 0,
            "dependence_pct": metrics["dependence"][i]})
    formulas = {
        "balance": "100 × (1 − sum of absolute individual broker internal net shares / (2 × internal volume)); the signed sum of group net shares is never used as evidence.",
        "dominance": "Internal group volume / all uploaded RG volume in the inclusive rolling window × 100, including unknown-counterparty and same-broker context.",
        "dependence": "Minimum across members of internal involvement / all uploaded RG volume involving that broker × 100; a same-broker print counts once in the external denominator.",
        "participation": "Minimum member involvement percentage / (200 / group size) × 100, capped at 100. Every internal trade involves two group members.",
        "price": "First-to-last group timestamp-bucket VWAP change; clamp(change_pct / 0.5 × 50, 0, 100). A separate gate requires positive all-RG VWAP change at those identical endpoint timestamps.",
    }
    components = [{"name": name, "weight": WEIGHTS[name], "score": scores[name],
                   "available": scores[name] is not None, "evidence": formulas[name]} for name in WEIGHTS]
    evidence = [
        f"{metrics['count']} observed internal prints across {metrics['distinct']} distinct timestamps, covering {metrics['share']:.2f}% of uploaded RG window volume.",
        f"Individual-net-based group balance is {metrics['balance']:.2f}%; minimum member two-way balance is {metrics['min_balance']:.2f}%.",
        f"Minimum member involvement is {metrics['min_participation']:.2f}% of internal volume; the strongest proper subgroup accounts for {100 - metrics['min_participation']:.2f}%.",
        f"{metrics['material_edges']} directed edges each represent at least {CONFIG['min_material_edge_volume_pct']}% of internal volume; strongly connected: {metrics['connected']}.",
    ]
    if metrics["change"] is not None:
        evidence.append(f"Group timestamp-bucket VWAP changed {metrics['change']:.3f}%; all uploaded RG VWAP changed {metrics['rg_change']:.3f}% at the exact same endpoint timestamps.")
    limitations = [
        "Broker codes identify intermediaries, not beneficial owners or accounts. A connected circulation pattern does not establish collusion, wash trading, crossing, intent, or price causation.",
        "Timestamp-bucket VWAP may change because trade composition changes; matching RG price movement confirms association only. Within-timestamp order and aggressor side are unknown.",
        "Group and pair windows overlap and are not independent. Their counts, volumes, or scores must not be summed as independent evidence.",
        "Top-broker and candidate-group caps can omit localized low-volume groups; inspect search coverage. No result rules out coordinated one-way trading or other patterns.",
    ]
    if metrics["mixed_prices"]:
        limitations.append(f"{metrics['mixed_prices']} internal timestamps contain multiple prices; no within-time price path is inferred.")
    other_volume = metrics["rg_volume"] - metrics["volume"]
    return {"brokers": list(metrics["group"]), "group_size": metrics["size"],
        "window": {"start": _clock(metrics["start"]), "end": _clock(metrics["end"]),
                   "start_seconds": metrics["start"], "end_seconds": metrics["end"],
                   "first_group_timestamp": _clock(metrics["first_t"])},
        "count": metrics["count"], "distinct_timestamps": metrics["distinct"],
        "volume_shares": metrics["volume"], "volume_share_pct": metrics["share"],
        "balance_pct": metrics["balance"], "price_change_pct": metrics["change"],
        "rg_price_change_pct": metrics["rg_change"], "member_min_participation_pct": metrics["min_participation"],
        "member_min_balance_pct": metrics["min_balance"], "dependence_min_pct": min(metrics["dependence"]),
        "proper_subgroup_max_volume_share_pct": 100 - metrics["min_participation"],
        "strongly_connected": metrics["connected"], "material_edge_count": metrics["material_edges"],
        "member_flows": members, "score": score, "score_coverage_pct": score_coverage, "label": label,
        "components": components, "eligibility": {"eligible": eligible, "checks": checks},
        "context": {"rg_volume_shares": metrics["rg_volume"],
            "other_or_unattributed_volume_shares": other_volume,
            "group_vwap": metrics["value"] / metrics["volume"],
            "other_or_unattributed_vwap": (metrics["rg_value"] - metrics["value"]) / other_volume if other_volume else None,
            "rg_first_timestamp_vwap": metrics["rg_first_vwap"], "rg_last_timestamp_vwap": metrics["rg_last_vwap"]},
        "timestamp_coverage": {"distinct": metrics["distinct"], "span_seconds": metrics["end"] - metrics["first_t"],
                               "mixed_price_timestamps": metrics["mixed_prices"]},
        "evidence": evidence, "limitations": limitations}


def analyze_group_price_patterns(trades, window_seconds=300):
    """Return bounded three/four-broker search observations with explicit gates."""
    window_seconds = _number(window_seconds, "window_seconds", positive=True)
    if window_seconds > 86400:
        raise ValueError("window_seconds cannot exceed one day.")
    rows = _canonical_rows(trades)
    rg_prefix = _prefix(rows)
    rg_volume = rg_prefix[1][-1]
    broker_rows, pair_rows = defaultdict(list), defaultdict(list)
    participation, directed_volume = defaultdict(int), defaultdict(int)
    timestamp_totals = defaultdict(lambda: [0, 0.0])
    for row in rows:
        bucket = timestamp_totals[row["t"]]
        bucket[0] += row["volume_shares"]
        bucket[1] += row["value"]
        for broker in {row["buyer"], row["seller"]} - {None}:
            broker_rows[broker].append(row)
        if not row["buyer"] or not row["seller"] or row["buyer"] == row["seller"]:
            continue
        pair = tuple(sorted((row["buyer"], row["seller"])))
        pair_rows[pair].append(row)
        participation[row["buyer"]] += row["volume_shares"]
        participation[row["seller"]] += row["volume_shares"]
        directed_volume[(row["seller"], row["buyer"])] += row["volume_shares"]
    pool = sorted(participation, key=lambda broker: (-participation[broker], broker))[:CONFIG["max_pool_brokers"]]
    pool_set = set(pool)
    discovered = []
    for size in CONFIG["group_sizes"]:
        for group in itertools.combinations(sorted(pool), size):
            edges = [directed_volume.get((seller, buyer), 0) for seller in group for buyer in group]
            connected, _ = _edge_connectivity(edges, size, 0)
            if connected:
                discovered.append((sum(edges), group))
    discovered.sort(key=lambda item: (-item[0], item[1]))
    selected = []
    for size in CONFIG["group_sizes"]:
        selected.extend([item for item in discovered if len(item[1]) == size][:CONFIG["reserved_groups_per_size"]])
    chosen = {group for _, group in selected}
    for item in discovered:
        if len(selected) >= CONFIG["max_groups"]:
            break
        if item[1] not in chosen:
            selected.append(item)
            chosen.add(item[1])
    selected.sort(key=lambda item: (-item[0], item[1]))
    prefixes = {broker: _prefix(broker_rows[broker]) for broker in pool}
    window_context = {}
    broker_window_volume = {broker: {} for broker in pool}
    timestamp_vwap = {t: value / volume for t, (volume, value) in timestamp_totals.items()}
    best = []
    evaluated = eligible_windows = 0
    failed_counts = defaultdict(int)
    for _, group in selected:
        buckets = _buckets(group, pair_rows)
        size = len(group)
        buys, sells, buy_counts, sell_counts = [0] * size, [0] * size, [0] * size, [0] * size
        edge_volume = [0] * (size * size)
        count = volume = mixed_prices = 0
        value = 0.0
        left = 0
        best_rank = best_metrics = None
        for right, bucket in enumerate(buckets):
            count += bucket["count"]
            volume += bucket["volume"]
            value += bucket["value"]
            mixed_prices += int(bucket["min_price"] != bucket["max_price"])
            for seller, buyer, edge_count, edge_shares in bucket["edges"]:
                buys[buyer] += edge_shares
                sells[seller] += edge_shares
                buy_counts[buyer] += edge_count
                sell_counts[seller] += edge_count
                edge_volume[seller * size + buyer] += edge_shares
            start = max(0, round(bucket["t"] - window_seconds, 6))
            while buckets[left]["t"] < start:
                old = buckets[left]
                count -= old["count"]
                volume -= old["volume"]
                value -= old["value"]
                mixed_prices -= int(old["min_price"] != old["max_price"])
                for seller, buyer, edge_count, edge_shares in old["edges"]:
                    buys[buyer] -= edge_shares
                    sells[seller] -= edge_shares
                    buy_counts[buyer] -= edge_count
                    sell_counts[seller] -= edge_count
                    edge_volume[seller * size + buyer] -= edge_shares
                left += 1
            end = bucket["t"]
            if end not in window_context:
                window_context[end] = _query(rg_prefix, start, end)[:2]
            window_volume, window_value = window_context[end]
            dependence = []
            for i, broker in enumerate(group):
                cache = broker_window_volume[broker]
                if end not in cache:
                    cache[end] = _query(prefixes[broker], start, end)[0]
                dependence.append((buys[i] + sells[i]) / cache[end] * 100 if cache[end] else 0)
            min_participation = min((buy + sell) / volume * 100 for buy, sell in zip(buys, sells))
            min_balance = min(2 * min(buy, sell) / (buy + sell) * 100 if buy + sell else 0 for buy, sell in zip(buys, sells))
            balance = (1 - sum(abs(buy - sell) for buy, sell in zip(buys, sells)) / (2 * volume)) * 100
            connected, material_edges = _edge_connectivity(edge_volume, size, volume * CONFIG["min_material_edge_volume_pct"] / 100)
            first_t = buckets[left]["t"]
            change = (bucket["vwap"] / buckets[left]["vwap"] - 1) * 100 if right > left else None
            rg_change = (timestamp_vwap[end] / timestamp_vwap[first_t] - 1) * 100 if right > left else None
            metrics = {"group": group, "size": size, "start": start, "end": end, "first_t": first_t,
                "count": count, "distinct": right - left + 1, "volume": volume, "value": value,
                "buys": buys[:], "sells": sells[:], "buy_counts": buy_counts[:], "sell_counts": sell_counts[:],
                "min_participation": min_participation, "min_balance": min_balance, "balance": balance,
                "dependence": dependence, "connected": connected, "material_edges": material_edges,
                "share": volume / window_volume * 100, "change": change, "rg_change": rg_change,
                "rg_volume": window_volume, "rg_value": window_value,
                "rg_first_vwap": timestamp_vwap[first_t], "rg_last_vwap": timestamp_vwap[end],
                "mixed_prices": mixed_prices}
            gates = _gates(metrics)
            failed = [name for name, actual, required in gates if not _passed(actual, required)]
            for name in failed:
                failed_counts[name] += 1
            eligible = not failed
            evaluated += 1
            eligible_windows += int(eligible)
            score, _, _ = _scores(metrics)
            complete_sample = all(_passed(actual, required) for _, actual, required in gates[:4])
            rank = (eligible, complete_sample, len(gates) - len(failed), score if score is not None else -1,
                    count, right - left + 1, volume, -end)
            if best_rank is None or rank > best_rank:
                best_rank, best_metrics = rank, metrics
        best.append((best_rank, group, best_metrics))
    best.sort(key=lambda item: (tuple(-float(value) for value in item[0]), item[1]))
    candidates = [_candidate(item[2]) for item in best[:CONFIG["max_candidates"]]]
    pool_internal_volume = sum(row["volume_shares"] for row in rows if row["buyer"] in pool_set and row["seller"] in pool_set and row["buyer"] != row["seller"])
    excluded_touched_volume = sum(row["volume_shares"] for row in rows if any(code and code not in pool_set for code in (row["buyer"], row["seller"])))
    excluded_broker_count = max(0, len(participation) - len(pool))
    omitted_groups = len(discovered) - len(selected)
    warnings = [
        "Group surveillance is an uncalibrated research heuristic, not an IDX rule, probability, or finding of collusion or manipulation.",
        "The search is bounded by broker participation rank and aggregate group volume. Localized low-volume groups can be omitted; inspect excluded broker volume and group counts.",
        "Only actual distinct-broker RG prints form internal group flows. All uploaded RG prints, including unknown counterparties and same-broker prints, remain in volume and timestamp-price context.",
        "Positive group and matched RG timestamp VWAP changes show association only; the data cannot establish that a group raised the price, shared ownership, or acted with coordinated intent.",
        "The algorithm targets materially two-way strongly connected groups. One-way coordinated transfers and other patterns may fail these gates; no candidate does not mean no manipulation.",
        "Overlapping group and pair windows are dependent and may reuse the same trades. Their counts, volumes, and scores must not be summed.",
        "All distinct internal timestamps of every selected group are evaluated. Returned observations include ineligible windows with explicit failed gates; missing price evidence stays unavailable.",
    ]
    if excluded_broker_count:
        warnings.append(f"Broker cap retained {len(pool)} of {len(participation)} eligible brokers; {excluded_touched_volume:,} uploaded RG shares involve at least one known broker outside the pool.")
    if omitted_groups:
        warnings.append(f"Group cap evaluated {len(selected)} of {len(discovered)} discovered strongly connected groups; {omitted_groups} groups were not searched over time.")
    if len(best) > CONFIG["max_candidates"]:
        warnings.append(f"Displayed {CONFIG['max_candidates']} of {len(best)} searched groups; each group's strongest observed window was ranked before display truncation.")
    if not rows:
        warnings.append("No RG prints are available; group surveillance is unavailable.")
    return _round_result({"version": VERSION, "config": {"window_seconds": window_seconds, **CONFIG,
        "score_weights": WEIGHTS, "window_boundary": "inclusive", "endpoint_sampling": "none",
        "group_selection": "Reserve up to 50 per size, then fill unused slots by aggregate internal volume.",
        "window_ranking": ["eligible", "minimum_sample_gates", "passed_gate_count", "score", "count", "timestamps", "volume", "earliest_end"]},
        "coverage": {"input_count": len(trades), "rg_count": len(rows), "rg_volume_shares": rg_volume,
            "eligible_broker_count": len(participation), "pool_brokers": pool,
            "excluded_broker_count": excluded_broker_count, "pool_internal_rg_volume_shares": pool_internal_volume,
            "excluded_broker_touched_rg_volume_shares": excluded_touched_volume,
            "discovered_groups": len(discovered), "searched_groups": len(selected),
            "groups_omitted_by_cap": omitted_groups, "evaluated_windows": evaluated,
            "search_exhaustive_within_uploaded_tape": not excluded_broker_count and not omitted_groups},
        "status": "no_regular_trades" if not rows else "candidates_found" if eligible_windows else "no_eligible_candidates",
        "diagnostics": {"eligible_windows": eligible_windows, "windows_not_eligible": evaluated - eligible_windows,
            "eligible_groups": sum(bool(item[0][0]) for item in best), "returned_groups": len(candidates),
            "failed_gate_counts": dict(sorted(failed_counts.items()))},
        "candidates": candidates, "warnings": warnings})
