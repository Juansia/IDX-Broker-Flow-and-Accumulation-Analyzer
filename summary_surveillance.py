"""Descriptive broker-summary turnover checks, with no crossing inference.

The input is analyzer.py's validated, selected, deduplicated source snapshots.
Only single-date exports are used. Ranked buy/sell columns are independent lists,
not matched counterparties. Values are executed IDR; they do not identify shares
retained by a beneficial owner. A high gross-value/low-net-value relationship can
occur for many ordinary reasons and is only a reason to inspect a detailed tape.

Same-day balance = 200 * sum(min(day buy, day sell)) / sum(day buy + day sell),
restricted to active observations where BOTH sides were explicitly reported.
Missing sides are unknown, not proven zero. Coverage reports how much supplied
gross value that complete-side denominator covers. This calculation cannot turn
a buy-only day followed by a sell-only day into same-day two-sided turnover.
"""

from __future__ import annotations

import math
from collections import defaultdict

VERSION = "1.0"
CONFIG = {"min_same_day_balance_pct": 80.0, "min_gross_share_pct": 5.0,
          "min_high_balance_dates": 3, "min_balance_covered_gross_pct": 80.0,
          "max_top_observations": 20, "lot_size": 100}


def _number(value, label, optional=False):
    if value is None and optional:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a nonnegative canonical number.")
    try:
        number = float(value)
    except OverflowError as exc:
        raise ValueError(f"{label} exceeds supported numeric range.") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{label} must be finite and nonnegative.")
    return number


def _clean(value):
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("Summary diagnostic totals exceed supported numeric range.")
        return round(value, 6)
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    return value


def _lot_sum(rows, key):
    values = [row[key] for row in rows]
    return sum(values) if all(value is not None for value in values) else None


def _volume_fields(buy, sell, buy_lot, sell_lot):
    net_lot = buy_lot - sell_lot if buy_lot is not None and sell_lot is not None else None
    net_value = buy - sell
    return {"buy_lot": buy_lot, "sell_lot": sell_lot, "net_lot": net_lot,
        "avg_buy_price": buy / (buy_lot * CONFIG["lot_size"]) if buy_lot else None,
        "avg_sell_price": sell / (sell_lot * CONFIG["lot_size"]) if sell_lot else None,
        "net_value_volume_conflict": (net_value > 0 and net_lot < 0) or (net_value < 0 and net_lot > 0) if net_lot is not None else None}


def analyze_summary_turnover(sources):
    """Analyze validated internal source snapshots; return descriptive tables.

    A source has start/end ISO dates and data keyed by broker code. Rows contain
    buy_value, sell_value, buy_lot, sell_lot and optional buy_reported/sell_reported
    flags. Call after source selection/deduplication/overlap checks in analyzer.
    """
    if not isinstance(sources, list):
        raise ValueError("Summary diagnostic sources must be a list.")
    snapshots = {}
    excluded_periods = 0
    for source in sources:
        if not isinstance(source, dict) or not source.get("start") or not source.get("end"):
            raise ValueError("Summary diagnostic sources require start/end dates.")
        if source["start"] != source["end"]:
            excluded_periods += 1
            continue
        day = source["start"]
        if day in snapshots:
            raise ValueError("Duplicate daily source supplied to summary diagnostics; deduplicate snapshots first.")
        if not isinstance(source.get("data"), dict):
            raise ValueError("Summary source data must map broker codes to validated rows.")
        snapshots[day] = source["data"]
    dates = sorted(snapshots)
    daily = []
    by_broker = defaultdict(list)
    by_date = {}
    incomplete_count = missing_lot_count = 0
    total_gross = covered_gross = 0.0
    for day in dates:
        rows = []
        for code, row in sorted(snapshots[day].items()):
            buy_reported = row.get("buy_reported", True)
            sell_reported = row.get("sell_reported", True)
            if not isinstance(buy_reported, bool) or not isinstance(sell_reported, bool):
                raise ValueError("Reported-side flags must be true/false.")
            buy = _number(row.get("buy_value"), "buy_value")
            sell = _number(row.get("sell_value"), "sell_value")
            if (not buy_reported and buy != 0) or (not sell_reported and sell != 0):
                raise ValueError("An unreported side cannot carry a nonzero supplied value.")
            buy_lot = _number(row.get("buy_lot"), "buy_lot", True) if buy_reported else None
            sell_lot = _number(row.get("sell_lot"), "sell_lot", True) if sell_reported else None
            complete = buy_reported and sell_reported
            gross, net = buy + sell, buy - sell
            balance = 200 * min(buy, sell) / gross if complete and gross else None
            volume_fields = _volume_fields(buy, sell, buy_lot, sell_lot)
            buy_price, sell_price = volume_fields["avg_buy_price"], volume_fields["avg_sell_price"]
            observation = {"date": day, "code": code,
                "buy_value": buy if buy_reported else None, "sell_value": sell if sell_reported else None,
                "gross_value": gross, "net_value": net,
                "absolute_net_to_gross_pct": abs(net) / gross * 100 if complete and gross else None,
                "same_day_balance_pct": balance, "gross_share_pct": None,
                "buy_reported": buy_reported, "sell_reported": sell_reported, "complete_sides": complete,
                "average_price_gap_pct": (sell_price / buy_price - 1) * 100 if buy_price and sell_price else None,
                **volume_fields}
            rows.append(observation)
            by_broker[code].append(observation)
            incomplete_count += int(not complete)
            missing_lot_count += int(buy_lot is None or sell_lot is None)
            total_gross += gross
            if complete:
                covered_gross += gross
        day_gross = sum(row["gross_value"] for row in rows)
        for row in rows:
            row["gross_share_pct"] = row["gross_value"] / day_gross * 100 if day_gross else None
        by_date[day] = {row["code"]: row for row in rows}
        daily.extend(rows)
    brokers = []
    for code, observations in by_broker.items():
        buy = sum(row["buy_value"] or 0 for row in observations)
        sell = sum(row["sell_value"] or 0 for row in observations)
        gross, net = buy + sell, buy - sell
        complete = [row for row in observations if row["complete_sides"]]
        complete_gross = sum(row["gross_value"] for row in complete)
        balanced_value = sum(min(row["buy_value"], row["sell_value"]) for row in complete)
        balance = 200 * balanced_value / complete_gross if complete_gross else None
        covered_pct = complete_gross / gross * 100 if gross else None
        high_balance_dates = sum(row["same_day_balance_pct"] is not None and row["same_day_balance_pct"] >= CONFIG["min_same_day_balance_pct"] for row in complete)
        switches = comparable_pairs = 0
        for previous, current in zip(dates, dates[1:]):
            a, b = by_date[previous].get(code), by_date[current].get(code)
            if not a or not b or not a["complete_sides"] or not b["complete_sides"] or a["net_value"] == 0 or b["net_value"] == 0:
                continue
            comparable_pairs += 1
            switches += int((a["net_value"] > 0) != (b["net_value"] > 0))
        gross_share = gross / total_gross * 100 if total_gross else None
        checklist = [("same_day_balance_pct", balance, CONFIG["min_same_day_balance_pct"]),
                     ("gross_share_pct", gross_share, CONFIG["min_gross_share_pct"]),
                     ("high_balance_dates", high_balance_dates, CONFIG["min_high_balance_dates"]),
                     ("balance_covered_gross_pct", covered_pct, CONFIG["min_balance_covered_gross_pct"])]
        checks = [{"name": name, "actual": actual, "required": required,
                   "passed": actual is not None and actual + 1e-9 >= required} for name, actual, required in checklist]
        quantity = _volume_fields(buy, sell, _lot_sum(observations, "buy_lot"), _lot_sum(observations, "sell_lot"))
        evidence = [f"Observed gross value is buy plus sell value across {len(observations)} reported dates; aggregate net value is their difference, not an investor holding change.",
            f"Same-day balance uses only {len(complete)} complete-side observations; it weights daily overlap by their supplied gross value and cannot infer matching trades.",
            f"{switches} net-value role switches across {comparable_pairs} comparable adjacent uploaded-date pairs. Missing, incomplete, and zero-net observations break the comparison."]
        if quantity["net_value_volume_conflict"]:
            evidence.append("Value/share direction disagree: aggregate net rupiah and net lots have opposite signs. Positive net buy value does not establish accumulation of shares.")
        if len(complete) != len(observations):
            evidence.append("At least one broker side is unreported. Aggregate value figures are supplied subtotals; missing sides are unknown and excluded from balance and role comparisons.")
        brokers.append({"code": code, "buy_value": buy, "sell_value": sell,
            "gross_value": gross, "net_value": net,
            "absolute_net_to_gross_pct": abs(net) / gross * 100 if gross else None,
            "same_day_balance_pct": balance, "balance_covered_gross_pct": covered_pct,
            "gross_share_pct": gross_share, "observed_dates": len(observations),
            "active_dates": sum(row["gross_value"] > 0 for row in observations),
            "both_sides_reported_dates": len(complete), "one_side_unreported_dates": len(observations) - len(complete),
            "net_buy_days": sum(row["net_value"] > 0 for row in complete),
            "net_sell_days": sum(row["net_value"] < 0 for row in complete),
            "net_zero_days": sum(row["net_value"] == 0 for row in complete),
            "role_switches": switches, "comparable_adjacent_pairs": comparable_pairs,
            "role_switch_pct": switches / comparable_pairs * 100 if comparable_pairs else None,
            "high_balance_dates": high_balance_dates, "review_flag": all(check["passed"] for check in checks),
            "checks": checks, "evidence": evidence, **quantity})
    brokers.sort(key=lambda broker: (-broker["gross_value"], broker["code"]))
    watchlist = [broker for broker in brokers if broker["review_flag"]]
    def observation_rank(row):
        balanced = row["same_day_balance_pct"] is not None and row["same_day_balance_pct"] >= CONFIG["min_same_day_balance_pct"]
        substantial = row["gross_share_pct"] is not None and row["gross_share_pct"] >= CONFIG["min_gross_share_pct"]
        return (-int(balanced and substantial), -(row["gross_share_pct"] or 0),
                -(row["same_day_balance_pct"] if row["same_day_balance_pct"] is not None else -1), row["date"], row["code"])
    top = sorted(daily, key=observation_rank)[:CONFIG["max_top_observations"]]
    warnings = [
        "Broker summaries contain independent ranked buy/sell lists, not matched counterparties. They cannot identify crossing, wash trades, circulation between specific brokers, shared ownership, or price lifting.",
        "These are value-based descriptive checks, not a crossing percentage, probability, manipulation detector, or change to the accumulation score.",
        "Gross participation uses all supplied broker buy-plus-sell value. The same execution appears on both sides of a complete market summary; this denominator is not one-sided exchange turnover.",
        "Same-day balance uses only active dates with both broker sides explicitly reported. Its value coverage is shown separately; missing broker sides and missing dates are unknown, not proven zeros.",
        "Net rupiah is affected by execution prices as well as quantities. It does not by itself establish shares accumulated, investor retention, inventory, or profit.",
        "Role switches compare adjacent uploaded dates with complete, nonzero net values. They are not consecutive exchange-session claims; zero, missing, or incomplete observations are not bridged.",
        "Research watchlist thresholds are generic prioritization rules for tape follow-up, not exchange rules or a verdict about any broker.",
    ]
    if excluded_periods:
        warnings.append(f"Excluded {excluded_periods} date-range export(s): same-day turnover and daily role changes cannot be reconstructed from period totals.")
    if incomplete_count:
        warnings.append(f"{incomplete_count} broker-date observations lack an explicitly reported side; daily balance is unavailable for them and aggregate balance shows its covered gross-value percentage.")
    if missing_lot_count:
        warnings.append(f"{missing_lot_count} broker-date observations have incomplete lot quantities; affected average prices, net lots, and value/share sign comparisons remain unavailable.")
    return _clean({"version": VERSION, "status": "no_daily_data" if not dates else "watchlist_available" if watchlist else "no_watchlist_matches",
        "config": CONFIG.copy(), "coverage": {"observed_dates": len(dates), "dates": dates,
            "broker_day_observations": len(daily), "excluded_period_exports": excluded_periods,
            "observed_two_sided_value": total_gross, "balance_covered_gross_pct": covered_gross / total_gross * 100 if total_gross else None,
            "one_side_unreported_observations": incomplete_count, "missing_lot_observations": missing_lot_count,
            "watchlist_count": len(watchlist), "broker_count": len(brokers)},
        "brokers": brokers, "daily_observations": daily, "top_observations": top,
        "watchlist": watchlist, "warnings": warnings,
        "methodology": {"same_day_balance": "200 × sum of same-day min(buy value, sell value) / sum of same-day gross value, using only complete reported sides.",
            "balance_coverage": "Gross value on complete-side dates / all supplied broker gross value × 100.",
            "absolute_net_to_gross": "100 × abs(sum buy value − sum sell value) / sum(buy value + sell value); a supplied-value ratio, not ownership retention.",
            "average_price_gap": "100 × (sell VWAP / buy VWAP − 1); execution averages only, without matched trades, sequencing, or profit attribution.",
            "top_observations": "Daily balance ≥80% and gross share ≥5% first; then daily gross participation, balance, date, and broker. Display capped at 20, full daily table retained."},
        "data_requirements": ["Running trades for the same ticker, dates, and board with time, price, explicit lot/share quantity units, buyer broker, and seller broker.",
            "Trade IDs for reliable duplicate handling, complete exports, and sufficient timestamp resolution for ordering distinct executions.",
            "Account/order linkage or documented cross-execution records to establish actual crossing or common ownership; summaries and broker codes alone cannot do so."]})
