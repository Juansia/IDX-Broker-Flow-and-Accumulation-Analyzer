"""Auditable IDX broker-flow analytics using only the Python standard library.

All quantities are gross executed buy/sell values in IDR and lots of 100 shares.
Buy VWAP = gross buy value / gross buy shares; net value / net shares is only an
implied net-flow ratio, never an investor cost basis. Broker firms aggregate many
customers and do not identify beneficial owners. Complete market net flow tends
to zero, so concentration uses *positive broker net flow*, not signed total flow.

Period exports remain period aggregates and cannot create daily observations.
Exact duplicate snapshots are ignored; conflicting/overlapping snapshots and
mixed boards are rejected. Consistency describes observed dates, not exchange
calendar completeness. Scores are explicit, uncalibrated research heuristics;
missing components are excluded and their missing weight reduces coverage.
"""

from __future__ import annotations

import csv
import io
import math
import re
from collections import defaultdict
from datetime import datetime

from summary_surveillance import analyze_summary_turnover

LOT_SIZE = 100
WEIGHTS = {"flow": 25, "concentration": 15, "consistency": 20,
           "price": 15, "volume": 15, "fundamentals": 10}


def parse_number(value, number_format="auto", *, optional=False, label="number"):
    """Parse finite numbers, including locale grouping and K/M/B/T suffixes.

    Auto recognizes comma/dot decimal pairs and repeated grouping separators.
    A single separator followed by three digits is grouping (except 0.xxx).
    Suffixed auto values use a single separator as decimal: 1.234B is 1.234e9.
    Choose en/id explicitly for ambiguous three-decimal values.
    """
    if number_format not in ("auto", "en", "id"):
        raise ValueError("number_format must be auto, en, or id.")
    if value is None or (isinstance(value, str) and value.strip() in ("", "-", "—", "N/A", "null")):
        if optional:
            return None
        raise ValueError(f"{label} is required.")
    if isinstance(value, bool):
        raise ValueError(f"{label} must be a number, not true/false.")
    if isinstance(value, (int, float)):
        try:
            result = float(value)
        except OverflowError as exc:
            raise ValueError(f"{label} exceeds the supported numeric range.") from exc
    elif isinstance(value, str):
        token = value.strip().replace("\u00a0", "")
        token = re.sub(r"^(?:IDR|Rp)\s*", "", token, flags=re.I).replace(" ", "")
        negative = token.startswith("(") and token.endswith(")")
        if negative:
            token = token[1:-1]
            if token.startswith(("-", "+")):
                raise ValueError(f"Invalid {label}: do not combine parentheses and an explicit sign.")
        multiplier = 1
        if token and token[-1].upper() in "KMBT":
            multiplier = {"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}[token[-1].upper()]
            token = token[:-1]
        locale = number_format
        if locale == "auto":
            if multiplier != 1 and token.count(".") + token.count(",") == 1:
                locale = "id" if "," in token else "en"
            elif "." in token and "," in token:
                locale = "id" if token.rfind(",") > token.rfind(".") else "en"
            elif "," in token:
                locale = "en" if re.fullmatch(r"[+-]?\d{1,3}(?:,\d{3})+", token) else "id"
            elif "." in token:
                locale = "id" if re.fullmatch(r"[+-]?[1-9]\d{0,2}(?:\.\d{3})+", token) else "en"
            else:
                locale = "en"
        decimal, group = (".", ",") if locale == "en" else (",", ".")
        parts = token.split(decimal)
        if len(parts) > 2 or (len(parts) == 2 and not parts[1].isdigit()):
            raise ValueError(f"Invalid {label}: {value!r}; check number_format.")
        whole = parts[0]
        if group in whole and not re.fullmatch(r"[+-]?\d{1,3}(?:" + re.escape(group) + r"\d{3})+", whole):
            raise ValueError(f"Invalid grouping in {label}: {value!r}.")
        normalized = whole.replace(group, "") + (("." + parts[1]) if len(parts) == 2 else "")
        if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d+)?|\.\d+)", normalized):
            raise ValueError(f"Invalid {label}: {value!r}.")
        result = float(normalized) * multiplier * (-1 if negative else 1)
    else:
        raise ValueError(f"{label} must be a number or numeric string.")
    if not math.isfinite(result):
        raise ValueError(f"{label} must be finite.")
    return result


def _date(value, label="date"):
    if not isinstance(value, str):
        raise ValueError(f"{label} is required as YYYY-MM-DD.")
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Invalid {label}: {value!r}; use YYYY-MM-DD.")


def _symbol(value, label):
    symbol = str(value or "").strip().upper()
    if not re.fullmatch(r"[A-Z][A-Z0-9.-]{1,11}", symbol):
        raise ValueError(f"A valid {label} is required; received {value!r}.")
    return symbol


def _nonnegative(value, fmt, label, optional=False):
    number = parse_number(value, fmt, optional=optional, label=label)
    if number is not None and number < 0:
        raise ValueError(f"{label} cannot be negative.")
    return number


def _empty_broker(code):
    return {"code": code, "buy_value": 0.0, "sell_value": 0.0,
            "buy_lot": 0.0, "sell_lot": 0.0}


def _add(target, row):
    for key in ("buy_value", "sell_value"):
        target[key] += row[key]
    for key in ("buy_lot", "sell_lot"):
        if target[key] is None or row[key] is None:
            target[key] = None
        else:
            target[key] += row[key]


def _header_key(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower().lstrip("\ufeff"))


def _read_table(text, name):
    if not isinstance(text, str) or not text.strip():
        raise ValueError(f"{name}: file is empty.")
    content = text.lstrip("\ufeff")
    lines = [line for line in content.splitlines() if line.strip()]
    delimiter = "\t" if "\t" in "\n".join(lines[:5]) else (";" if ";" in lines[0] else ",")
    try:
        return [row for row in csv.reader(io.StringIO(content), delimiter=delimiter, strict=True)
                if any(cell.strip() for cell in row)]
    except csv.Error as exc:
        raise ValueError(f"{name}: invalid CSV/TSV: {exc}") from exc


def _canonical_source(rows, name, fmt):
    grouped = {}
    for line, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            raise ValueError(f"{name}: row {line} must be an object.")
        ticker = _symbol(row.get("ticker"), "ticker")
        day = _date(row.get("date"), f"{name} row {line} date")
        code = _symbol(row.get("code"), "broker code")
        board = str(row.get("board") or "UNKNOWN").strip().upper()
        key = (ticker, day, board)
        source = grouped.setdefault(key, {"name": name, "ticker": ticker, "start": day,
            "end": day, "board": board, "investor": "UNSPECIFIED", "data": {}})
        broker = {"code": code, "buy_reported": True, "sell_reported": True}
        for side in ("buy", "sell"):
            broker[side + "_value"] = _nonnegative(row.get(side + "_value"), fmt, f"{name} row {line} {side}_value")
            broker[side + "_lot"] = _nonnegative(row.get(side + "_lot"), fmt, f"{name} row {line} {side}_lot", True)
            if broker[side + "_lot"] == 0 and broker[side + "_value"] > 0:
                raise ValueError(f"{name} row {line}: positive {side} value cannot have zero lots.")
            if broker[side + "_value"] == 0 and broker[side + "_lot"] is not None and broker[side + "_lot"] > 0:
                raise ValueError(f"{name} row {line}: positive {side} lots cannot have zero value.")
        if code in source["data"]:
            raise ValueError(f"{name}: duplicate broker {code} on {day}; provide one aggregated row per broker/date/board.")
        source["data"][code] = broker
    return list(grouped.values())


def _parse_file(file, fmt):
    if not isinstance(file, dict):
        raise ValueError("Each files entry must contain name and text.")
    name = str(file.get("name") or "upload")
    table = _read_table(file.get("text"), name)
    canonical_keys = [_header_key(cell) for cell in table[0]]
    if all(key in canonical_keys for key in ("date", "ticker", "code", "buyvalue", "sellvalue")):
        keymap = {"buyvalue": "buy_value", "sellvalue": "sell_value", "buylot": "buy_lot", "selllot": "sell_lot"}
        keys = [keymap.get(key, key) for key in canonical_keys]
        records = []
        for lineno, values in enumerate(table[1:], 2):
            if len(values) != len(keys):
                raise ValueError(f"{name} line {lineno}: expected {len(keys)} columns; quote grouped numbers in comma CSV.")
            records.append(dict(zip(keys, values)))
        return _canonical_source(records, name, fmt)
    header_index = next((i for i, row in enumerate(table)
                         if {"by", "sl", "bval", "sval"}.issubset({_header_key(c) for c in row})), None)
    if header_index is None:
        raise ValueError(f"{name}: expected an IPOT BY/BLot/BVal/SL/SLot/SVal header or canonical date,ticker,code,buy_value,sell_value CSV.")
    metadata = {}
    for row in table[:header_index]:
        for i, cell in enumerate(row[:-1]):
            key = _header_key(cell)
            if key in ("start", "end", "board", "investor"):
                metadata[key] = row[i + 1].strip()
            if key.endswith("tobrokercode"):
                metadata["ticker"] = row[i + 1].strip()
    ticker = _symbol(metadata.get("ticker"), f"{name} ticker metadata")
    start = _date(metadata.get("start"), f"{name} Start metadata")
    end = _date(metadata.get("end"), f"{name} End metadata")
    if end < start:
        raise ValueError(f"{name}: End precedes Start.")
    indices = {_header_key(cell): i for i, cell in enumerate(table[header_index])}
    data = {}
    seen = set()
    for line, row in enumerate(table[header_index + 1:], header_index + 2):
        def cell(key):
            index = indices.get(key)
            return row[index].strip() if index is not None and index < len(row) else ""
        if len(row) > len(indices):
            raise ValueError(f"{name} line {line}: too many columns; quote grouped numbers in comma CSV.")
        for side, code_key, value_key, lot_key in (("buy", "by", "bval", "blot"), ("sell", "sl", "sval", "slot")):
            raw_code = cell(code_key)
            if not raw_code:
                if cell(value_key) or cell(lot_key):
                    raise ValueError(f"{name} line {line}: {side} numbers have no broker code.")
                continue
            code = _symbol(raw_code, f"{name} line {line} broker code")
            if (side, code) in seen:
                raise ValueError(f"{name}: duplicate {side} broker {code}; check the export.")
            seen.add((side, code))
            broker = data.setdefault(code, _empty_broker(code))
            broker.setdefault("buy_reported", False)
            broker.setdefault("sell_reported", False)
            broker[side + "_reported"] = True
            value = _nonnegative(cell(value_key), fmt, f"{name} line {line} {side} value")
            lot = _nonnegative(cell(lot_key), fmt, f"{name} line {line} {side} lots", True)
            if lot == 0 and value > 0:
                raise ValueError(f"{name} line {line}: positive {side} value cannot have zero lots.")
            if value == 0 and lot is not None and lot > 0:
                raise ValueError(f"{name} line {line}: positive {side} lots cannot have zero value.")
            broker[side + "_value"] = value
            broker[side + "_lot"] = lot
    if not data:
        raise ValueError(f"{name}: no broker rows found.")
    return [{"name": name, "ticker": ticker, "start": start, "end": end,
             "board": metadata.get("board", "UNKNOWN").upper(),
             "investor": metadata.get("investor", "UNSPECIFIED"), "data": data}]


def _derive(row):
    result = dict(row)
    result["net_value"] = row["buy_value"] - row["sell_value"]
    for side in ("buy", "sell"):
        lots = row[side + "_lot"]
        shares = None if lots is None else lots * LOT_SIZE
        result[side + "_shares"] = shares
        result["avg_" + side + "_price"] = row[side + "_value"] / shares if shares else None
    result["net_lot"] = row["buy_lot"] - row["sell_lot"] if row["buy_lot"] is not None and row["sell_lot"] is not None else None
    result["net_shares"] = result["net_lot"] * LOT_SIZE if result["net_lot"] is not None else None
    result["net_flow_implied_price"] = result["net_value"] / result["net_shares"] if result["net_shares"] else None
    return result


def _clamp(value):
    return max(0.0, min(100.0, value))


def _clean(value):
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("Input totals exceed the supported numeric range.")
        return round(value, 6)
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    return value


def analyze_payload(payload):
    """Validate uploads and return a JSON-safe evidence-based analysis dictionary."""
    if not isinstance(payload, dict):
        raise ValueError("Analysis request must be a JSON object.")
    fmt = payload.get("number_format", "auto")
    if fmt not in ("auto", "en", "id"):
        raise ValueError("number_format must be auto, en, or id.")
    warnings = []
    files = payload.get("files", [])
    canonical = payload.get("broker_rows", [])
    files = [] if files is None else files
    canonical = [] if canonical is None else canonical
    if not isinstance(files, list) or not isinstance(canonical, list):
        raise ValueError("files and broker_rows must be arrays.")
    sources = [source for file in files for source in _parse_file(file, fmt)]
    sources.extend(_canonical_source(canonical, "broker_rows", fmt))
    if not sources:
        raise ValueError("Provide at least one broker-summary file or broker_rows record.")
    tickers = sorted({source["ticker"] for source in sources})
    selected = _symbol(payload["ticker"], "selected ticker") if payload.get("ticker") else None
    if selected:
        if selected not in tickers:
            raise ValueError(f"Ticker {selected} was not found; available: {', '.join(tickers)}.")
        omitted = [t for t in tickers if t != selected]
        if omitted:
            warnings.append(f"Selected {selected}; excluded uploads for {', '.join(omitted)}.")
        sources = [source for source in sources if source["ticker"] == selected]
    elif len(tickers) > 1:
        raise ValueError(f"Mixed tickers ({', '.join(tickers)}); select one ticker explicitly.")
    ticker = selected or tickers[0]
    boards = {source["board"] for source in sources}
    if len(boards) > 1:
        raise ValueError(f"Mixed trading boards ({', '.join(sorted(boards))}); analyze one board at a time.")
    if "UNKNOWN" in boards:
        warnings.append("Trading board is unspecified; supply a consistent board in canonical rows when known.")
    elif boards != {"RG"}:
        warnings.append(f"Board {next(iter(boards))}: interpret flows separately from the regular market.")
    investor_filters = {source["investor"].upper() for source in sources}
    if len(investor_filters) > 1:
        raise ValueError("Mixed investor filters; use exports with the same investor scope.")
    unique = []
    for source in sorted(sources, key=lambda item: (item["start"], item["end"])):
        duplicate = False
        for previous in unique:
            if source["start"] <= previous["end"] and source["end"] >= previous["start"]:
                if source["start"] == previous["start"] and source["end"] == previous["end"] and source["data"] == previous["data"]:
                    warnings.append(f"Ignored duplicate snapshot {source['name']} ({source['start']} to {source['end']}).")
                    duplicate = True
                    break
                raise ValueError(f"Overlapping or conflicting snapshots: {previous['name']} ({previous['start']} to {previous['end']}) and {source['name']} ({source['start']} to {source['end']}). Remove the duplicate/overlapping export to avoid double counting.")
        if not duplicate:
            unique.append(source)
    sources = unique
    start, end = min(s["start"] for s in sources), max(s["end"] for s in sources)
    single_sources = [s for s in sources if s["start"] == s["end"]]
    days = sorted({s["start"] for s in single_sources})
    period_exports = sum(s["start"] != s["end"] for s in sources)
    if period_exports:
        warnings.append(f"{period_exports} date-range export(s) included in aggregate flow only; excluded from daily consistency because session-level data is unknown.")
    warnings.append("Consistency uses only uploaded distinct single dates; missing sessions are not inferred.")
    warnings.append("Metrics describe the supplied rows. A broker side absent from an export is treated as zero; use complete buy and sell lists because truncated lists can distort net flow and concentration. A broker absent on an observed date counts as no net-buy day.")
    warnings.append("A broker can represent many clients; these flows do not establish beneficial ownership or intent.")
    aggregates = {}
    daily_rows = defaultdict(dict)
    for source in sources:
        for code, row in source["data"].items():
            _add(aggregates.setdefault(code, _empty_broker(code)), row)
            if source["start"] == source["end"]:
                daily_rows[source["start"]][code] = row
    brokers = sorted((_derive(row) for row in aggregates.values()), key=lambda row: (-row["net_value"], row["code"]))
    positive = sum(max(0, row["net_value"]) for row in brokers)
    leaders = [row for row in brokers if row["net_value"] > 0][:3]
    leader_codes = {row["code"] for row in leaders}
    for broker in brokers:
        positive_days = sum(rows.get(broker["code"], {}).get("buy_value", 0) > rows.get(broker["code"], {}).get("sell_value", 0) for rows in daily_rows.values())
        broker.update(net_buy_days=positive_days, observed_days=len(days),
                      consistency_pct=positive_days / len(days) * 100 if days else None,
                      positive_net_share_pct=max(0, broker["net_value"]) / positive * 100 if positive else None)
    total = _empty_broker("TOTAL")
    for row in aggregates.values():
        _add(total, row)
    totals = _derive(total)
    totals.pop("code")
    if totals["buy_lot"] is None or totals["sell_lot"] is None:
        warnings.append("Some lot quantities are missing. Affected totals, VWAPs, and net-share metrics remain unavailable; values are not converted into invented volume.")
    gross_buy = totals["buy_value"]
    if max(totals["buy_value"], totals["sell_value"]) > 0 and abs(totals["net_value"]) / max(totals["buy_value"], totals["sell_value"]) > .01:
        warnings.append("Buy and sell values differ by over 1%; the uploads may be partial or investor-filtered. Concentration refers only to the supplied data.")
    top3_pct = sum(row["net_value"] for row in leaders) / positive * 100 if positive else None
    concentration = {"top3_positive_net_pct": top3_pct,
        "hhi_positive_net": sum((max(row["net_value"], 0) / positive) ** 2 for row in brokers) if positive else None,
        "positive_net_to_gross_buy_pct": positive / gross_buy * 100 if gross_buy else None}
    daily = []
    for day in days:
        rows = daily_rows[day]
        buy, sell = sum(r["buy_value"] for r in rows.values()), sum(r["sell_value"] for r in rows.values())
        daily.append({"date": day, "buy_value": buy, "sell_value": sell, "net_value": buy - sell,
            "positive_net_value": sum(max(0, r["buy_value"] - r["sell_value"]) for r in rows.values()),
            "leader_net_value": sum(r["buy_value"] - r["sell_value"] for code, r in rows.items() if code in leader_codes)})
    components = []
    def component(name, score, evidence, fraction=1):
        available = score is not None
        components.append({"name": name, "weight": WEIGHTS[name], "score": score,
            "available": available, "evidence": evidence,
            "effective_weight": WEIGHTS[name] * fraction if available else 0})
    component("flow", _clamp(positive / gross_buy * 400) if gross_buy else None,
              f"Positive broker net / gross buys = {positive / gross_buy * 100:.2f}%; score = min(100, ratio × 400)." if gross_buy else "Gross buy value is zero; no flow ratio can be calculated.")
    component("concentration", top3_pct,
              f"Top three brokers account for {top3_pct:.2f}% of positive broker net flow; this percentage is the component score." if top3_pct is not None else "No positive broker net flow; concentration is undefined.")
    daily_aggregates = defaultdict(lambda: {"net": 0.0, "positive_days": 0})
    for rows in daily_rows.values():
        for code, row in rows.items():
            net = row["buy_value"] - row["sell_value"]
            daily_aggregates[code]["net"] += net
            daily_aggregates[code]["positive_days"] += int(net > 0)
    consistent_leaders = sorted((r for r in daily_aggregates.values() if r["net"] > 0), key=lambda r: -r["net"])[:3]
    consistency = sum(r["net"] * r["positive_days"] / len(days) for r in consistent_leaders) / sum(r["net"] for r in consistent_leaders) * 100 if len(days) >= 2 and consistent_leaders else None
    component("consistency", consistency,
              f"Positive-net-weighted buying-day percentage for the top three net buyers in {len(days)} distinct single-date snapshots; ranges excluded." if consistency is not None else "Requires at least two distinct single-date snapshots and a positive cumulative net buyer.")

    prices_raw = payload.get("prices", [])
    prices_raw = [] if prices_raw is None else prices_raw
    if not isinstance(prices_raw, list):
        raise ValueError("prices must be an array of daily observations.")
    prices = {}
    for index, row in enumerate(prices_raw, 1):
        if not isinstance(row, dict):
            raise ValueError(f"Price row {index} must be an object.")
        day = _date(row.get("date"), f"price row {index} date")
        if day < start or day > end:
            warnings.append(f"Ignored price observation {day}: outside analyzed period {start} to {end}.")
            continue
        if day in prices:
            raise ValueError(f"Duplicate price date {day}; provide one observation per day.")
        close = _nonnegative(row.get("close"), fmt, f"price {day} close")
        if not close:
            raise ValueError(f"Price {day} close must be greater than zero.")
        parsed = {"date": day, "close": close}
        for key in ("prev_close", "volume", "avg_volume"):
            parsed[key] = _nonnegative(row.get(key), fmt, f"price {day} {key}", True)
        if parsed["prev_close"] == 0 or parsed["avg_volume"] == 0:
            raise ValueError(f"Price {day}: prev_close and avg_volume must be positive when provided.")
        prices[day] = parsed
    ordered_prices = [prices[day] for day in sorted(prices)]
    price_score = None
    price_evidence = "Requires a closing price on the analysis end date and either an opening-period previous close or an earlier close within the period."
    price_return = None
    if ordered_prices and end in prices:
        first = ordered_prices[0]
        baseline = first["prev_close"] if first["prev_close"] is not None else (first["close"] if len(ordered_prices) >= 2 else None)
        if baseline:
            price_return = (prices[end]["close"] / baseline - 1) * 100
            price_score = _clamp(50 + price_return * 5)
            price_evidence = f"Close return over supplied price window {first['date']} to {end}: {price_return:.2f}%; score = clamp(50 + return_percent × 5, 0, 100)."
            if first["date"] != start:
                warnings.append(f"Price validation begins {first['date']}, later than broker period start {start}; it covers only that supplied window.")
    component("price", price_score, price_evidence)
    volume_rows = [row for row in ordered_prices if row["volume"] is not None and row["avg_volume"] is not None]
    volume_ratio = sum(row["volume"] / row["avg_volume"] for row in volume_rows) / len(volume_rows) if volume_rows else None
    component("volume", _clamp(volume_ratio * 50) if volume_ratio is not None else None,
              f"Mean volume / supplied prior-volume baseline = {volume_ratio:.2f}× over {len(volume_rows)} observations; score = min(100, ratio × 50). Units must match and baseline must use prior sessions." if volume_ratio is not None else "Requires volume and a positive prior-session avg_volume baseline on aligned price observations.")

    fundamentals = payload.get("fundamentals")
    fundamentals_used = None
    fundamental_score = None
    fundamental_fraction = 0
    fundamental_evidence = "No dated fundamentals supplied; no fundamental points are assumed."
    if fundamentals is not None and not isinstance(fundamentals, dict):
        raise ValueError("fundamentals must be an object.")
    if fundamentals:
        if not fundamentals.get("as_of"):
            warnings.append("Fundamentals excluded: as_of must be their public-availability date.")
        else:
            as_of = _date(fundamentals["as_of"], "fundamentals as_of")
            if as_of > end:
                warnings.append(f"Fundamentals excluded: public-availability date {as_of} is after analysis end {end}.")
            else:
                fundamentals_used = {"as_of": as_of}
                metric_scores = []
                descriptions = []
                for key in ("roe", "net_profit_growth", "debt_to_equity", "pe"):
                    value = parse_number(fundamentals.get(key), fmt, optional=True, label=f"fundamental {key}")
                    fundamentals_used[key] = value
                    if value is None:
                        continue
                    if key == "roe":
                        score = _clamp(value * 5)
                    elif key == "net_profit_growth":
                        score = _clamp(50 + value * 2.5)
                    elif key == "debt_to_equity":
                        score = _clamp(100 - value * 50) if value >= 0 else 0
                    else:
                        score = _clamp(100 - (value - 5) * 100 / 35) if value > 0 else 0
                    metric_scores.append(score)
                    descriptions.append(f"{key}={value:g} → {score:.1f}")
                if metric_scores:
                    fundamental_score = sum(metric_scores) / len(metric_scores)
                    fundamental_fraction = len(metric_scores) / 4
                    fundamental_evidence = f"Publicly available {as_of}; {len(metric_scores)}/4 metrics: {'; '.join(descriptions)}. ROE and growth are percentage points; D/E and P/E are multiples. Negative equity or nonpositive P/E receive zero. Fixed cross-sector heuristics require sector context."
                    warnings.append("Fundamental thresholds are generic research heuristics; debt/equity and valuation norms differ materially by sector, especially banks.")
    component("fundamentals", fundamental_score, fundamental_evidence, fundamental_fraction)
    coverage = sum(row["effective_weight"] for row in components)
    score = sum(row["score"] * row["effective_weight"] for row in components if row["available"]) / coverage if coverage else None
    missing = [row["name"] for row in components if not row["available"]]
    if missing:
        warnings.append("Unavailable score evidence: " + ", ".join(missing) + ". Missing components receive no assumed neutral score; inspect evidence coverage.")
    result = {"ticker": ticker, "period": {"start": start, "end": end,
              "observed_days": len(days), "period_exports": period_exports},
        "totals": totals, "brokers": brokers, "daily": daily,
        "concentration": concentration,
        "summary_surveillance": analyze_summary_turnover(sources),
        "score": {"value": score, "coverage_pct": coverage,
                  "label": "Insufficient evidence" if score is None else ("Limited evidence coverage" if coverage < 60 else "Strong heuristic evidence" if score >= 75 else "Mixed heuristic evidence" if score >= 45 else "Weak heuristic evidence"),
                  "components": components,
                  "interpretation": "Weighted score of available evidence, not a calibrated probability or a trading recommendation. Coverage is the percentage of configured evidence weight supplied. High concentration can reflect a few intermediary firms, not coordinated ownership."},
        "warnings": list(dict.fromkeys(warnings)),
        "sources": [{"name": s["name"], "ticker": s["ticker"], "start": s["start"], "end": s["end"],
                     "board": s["board"], "investor": s["investor"], "rows": len(s["data"]),
                     "kind": "daily" if s["start"] == s["end"] else "period"} for s in sources],
        "context": {"prices_used": ordered_prices, "fundamentals_used": fundamentals_used,
                    "price_return_pct": price_return, "volume_ratio": volume_ratio,
                    "lot_size": LOT_SIZE}}
    return _clean(result)
