"""Conservative, dependency-free analysis of a single stock/session trade tape.

Broker codes describe intermediaries, not beneficial owners. A same-broker print,
a concentrated pair, or a reciprocal pair is an observation for review, never
proof of a cross, a wash trade, common ownership, or trading intent.
"""

from __future__ import annotations

import csv
import datetime as dt
from collections import defaultdict
from decimal import Decimal, InvalidOperation
import re

from pair_surveillance import analyze_pair_price_patterns
from group_surveillance import analyze_group_price_patterns
from tape_explanation import explain_tape


SAMPLE_LIMIT = 50
MAX_ROWS = 100_000
_MISSING = {"", "-", "--", "?", "N/A", "NA", "NULL", "NONE", "UNKNOWN"}
_ALIASES = {
    "time": {"time", "jam", "waktu", "tradetime"},
    "price": {"price", "harga", "hargatransaksi"},
    "lot": {"lot", "lots", "volumelot", "jmlot", "jumlahlot"},
    "volume": {"volume", "vol", "shares", "volumeshare", "volumeshares", "lembar", "volumelembar"},
    "quantity": {"qty", "quantity"},
    "buyer": {"buyer", "buy", "by", "bc", "pembeli", "beli", "brokerbeli", "buyerbroker"},
    "seller": {"seller", "sell", "sl", "sc", "penjual", "jual", "brokerjual", "sellerbroker"},
    "board": {"board", "brd", "papan", "pasar", "market"},
    "trade_id": {"tradeid", "id", "idtransaksi", "tradecode", "nomortransaksi"},
    "date": {"date", "tanggal", "tradedate"},
    "ticker": {"ticker", "symbol", "stock", "saham", "kode", "kodesaham"},
}
_HEADER_KEYS = {alias: key for key, aliases in _ALIASES.items() for alias in aliases}
_NUMERIC = {
    "en": re.compile(r"^[+]?(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+)(?:\.[0-9]+)?$"),
    "id": re.compile(r"^[+]?(?:[0-9]+|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,[0-9]+)?$"),
}
_BOARD = {
    "RG": "RG", "REGULAR": "RG", "REGULER": "RG", "PASAR REGULER": "RG",
    "NG": "NG", "NEGOTIATED": "NG", "NEGOSIASI": "NG", "PASAR NEGOSIASI": "NG",
    "TN": "TN", "TUNAI": "TN", "CASH": "TN", "PASAR TUNAI": "TN",
}


def _header_key(value):
    return _HEADER_KEYS.get(re.sub(r"[^a-z0-9]", "", value.lower()))


def _number(value, style):
    token = value.strip()
    if not _NUMERIC[style].fullmatch(token):
        raise ValueError(f"Invalid {style} number {token!r}; use valid grouping and decimal separators.")
    cleaned = token.replace(",", "") if style == "en" else token.replace(".", "").replace(",", ".")
    try:
        number = Decimal(cleaned)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid number {token!r}.") from exc
    if number <= 0 or number > Decimal("1000000000000000"):
        raise ValueError(f"Number {token!r} must be positive and at most 1,000,000,000,000,000.")
    return number


def _json_number(number):
    return int(number) if number == int(number) else float(number)


def _resolve_format(rows, requested):
    if requested != "auto":
        return requested
    evidence = set()
    ambiguous = []
    for line, data in rows:
        for key in ("price", "lot" if "lot" in data else "volume"):
            possibilities = {}
            for style in ("en", "id"):
                try:
                    possibilities[style] = _number(data.get(key, ""), style)
                except ValueError:
                    pass
            if len(possibilities) == 1:
                evidence.update(possibilities)
            elif len(possibilities) == 2 and possibilities["en"] != possibilities["id"]:
                ambiguous.append((line, data.get(key, "")))
    if len(evidence) > 1:
        raise ValueError("Mixed English and Indonesian number formats; normalize the entire tape to en or id before analyzing.")
    if evidence:
        return next(iter(evidence))
    if ambiguous:
        line, token = ambiguous[0]
        raise ValueError(f"Ambiguous number {token!r} on line {line}; choose number_format='en' (1,000.50) or 'id' (1.000,50).")
    return "plain"


def _split_lines(text):
    # Preserve trailing TSV empties (for example, an unavailable seller code).
    lines = [(n, raw.strip(" ")) for n, raw in enumerate(text.lstrip("\ufeff").splitlines(), 1) if raw.strip()]
    if not lines:
        raise ValueError("Paste running trades with columns time, price, and lot (or volume in shares).")
    first = lines[0][1]
    delimiter = next((d for d in ("\t", ";", "|") if d in first), None)
    if delimiter is None and "," in first:
        comma_cells = next(csv.reader([first]))
        if any(_header_key(c.strip()) in {"time", "price", "lot", "volume"} for c in comma_cells) or re.match(r"^\"?\d{1,2}:\d{2}(?::\d{2})?(?:\.[0-9]+)?\"?,", first):
            delimiter = ","
    parsed = []
    errors = []
    for line, raw in lines:
        try:
            cells = next(csv.reader([raw], delimiter=delimiter, strict=True)) if delimiter else re.split(r"\s+", raw)
            parsed.append((line, [cell.strip() for cell in cells]))
        except csv.Error as exc:
            errors.append({"line": line, "error": f"Invalid delimited row: {exc}."})
    return parsed, errors, len(lines)


def _rows(text, quantity_unit=None):
    parsed, errors, raw_count = _split_lines(text)
    if not parsed:
        raise ValueError("No readable rows. Use CSV, TSV, semicolons, or spaces with one trade per line.")
    header = [_header_key(cell) for cell in parsed[0][1]]
    # BY and SL can themselves be broker codes on a headerless data row.
    has_header = "time" in header or ("price" in header and bool({"lot", "volume", "quantity"} & set(header)))
    rows = []
    unit = quantity_unit or "lot"
    unit_source = "explicit_headerless" if quantity_unit else "headerless_lot_default"
    header_adjustment = None
    if has_header:
        # Some TXT exports insert an extra blank heading after Time while every
        # data row has the same shorter layout. Remove only unnamed interior
        # headings, and only when all data rows confirm that exact width.
        headings = parsed[0][1]
        last_named = max((i for i, cell in enumerate(headings) if cell), default=-1)
        compact_header = [key for i, key in enumerate(header) if headings[i] or i > last_named]
        if (len(compact_header) < len(header) and parsed[1:]
                and all(len(cells) == len(compact_header) for _, cells in parsed[1:])):
            header_adjustment = f"Removed {len(header) - len(compact_header)} blank interior header field(s); every data row has {len(compact_header)} columns. Trade cells were not shifted or removed."
            header = compact_header
        recognized = [key for key in header if key]
        if len(recognized) != len(set(recognized)):
            raise ValueError("Duplicate column names. Supply each of time, price, lot/volume/Qty, buyer, seller, board, and trade_id only once.")
        quantity_columns = {"lot", "volume", "quantity"} & set(recognized)
        if "time" not in header or "price" not in header or not quantity_columns:
            raise ValueError("Required columns: time (jam), price (harga), and lot OR volume (shares/lembar) OR Qty with an explicit quantity_unit.")
        if len(quantity_columns) > 1:
            raise ValueError("Supply only one of lot, volume (shares), or Qty to make the volume unit explicit.")
        if "quantity" in header:
            if quantity_unit is None:
                raise ValueError("The Qty/quantity header does not specify its unit. Choose quantity_unit='lot' (1 lot = 100 shares) or quantity_unit='shares' after checking the export's quantity unit.")
            unit = quantity_unit
            unit_source = "explicit_qty_selection"
            header = [("lot" if unit == "lot" else "volume") if key == "quantity" else key for key in header]
        else:
            unit = "lot" if "lot" in header else "shares"
            unit_source = "column_header"
            if quantity_unit is not None and quantity_unit != unit:
                raise ValueError(f"quantity_unit={quantity_unit!r} conflicts with the explicit {unit} column header; use the matching unit or omit quantity_unit.")
        raw_count -= 1
        for line, cells in parsed[1:]:
            if len(cells) != len(header):
                errors.append({"line": line, "error": f"Expected {len(header)} columns, found {len(cells)}; quote numbers containing CSV commas."})
                continue
            rows.append((line, {key: value for key, value in zip(header, cells) if key}))
    else:
        for line, cells in parsed:
            # Existing app paste: Jam Harga Change Change% Lot BY SL [Board].
            has_change = len(cells) >= 5 and (cells[3].endswith("%") or (
                len(cells) in (7, 8) and
                all(re.fullmatch(r"[A-Za-z]{2}", cell) or cell.upper() in _MISSING for cell in cells[5:7])
            ))
            quantity_index = 4 if has_change else 2
            remaining = cells[quantity_index + 1:]
            if len(cells) < quantity_index + 1 or len(remaining) not in (0, 1, 2, 3):
                errors.append({"line": line, "error": "Unsupported row layout; add a header: time price lot buyer seller board."})
                continue
            data = {"time": cells[0], "price": cells[1], "lot" if unit == "lot" else "volume": cells[quantity_index]}
            if len(remaining) == 1:
                if remaining[0].upper() not in _BOARD:
                    errors.append({"line": line, "error": "A single trailing field must be a board; add buyer/seller column headers for partial broker data."})
                    continue
                data["board"] = remaining[0]
            elif len(remaining) >= 2:
                data.update(buyer=remaining[0], seller=remaining[1])
                if len(remaining) == 3:
                    data["board"] = remaining[2]
            rows.append((line, data))
    if raw_count > MAX_ROWS:
        raise ValueError(f"Tape exceeds {MAX_ROWS:,} rows; split it into smaller single-session inputs.")
    return rows, errors, raw_count, unit, unit_source, header_adjustment


def _broker(value):
    code = value.strip().upper()
    if code in _MISSING:
        return None
    if not re.fullmatch(r"[A-Z]{2}", code):
        raise ValueError(f"Broker {value!r} must be a two-letter code or blank/'-' when unavailable.")
    return code


def _trade(line, data, style):
    time = data["time"]
    match = re.fullmatch(r"([0-9]{1,2}):([0-9]{2})(?::([0-9]{2})(\.[0-9]{1,6})?)?", time)
    if not match:
        raise ValueError(f"Invalid time {time!r}; use HH:MM[:SS[.ffffff]].")
    hour, minute, second = [int(part or 0) for part in match.groups()[:3]]
    if hour > 23 or minute > 59 or second > 59:
        raise ValueError(f"Invalid clock time {time!r}.")
    t = Decimal(hour * 3600 + minute * 60 + second) + Decimal(match[4] or "0")
    price = _number(data["price"], style)
    amount = _number(data.get("lot", data.get("volume", "")), style)
    shares = amount * 100 if "lot" in data else amount
    if shares != shares.to_integral_value():
        raise ValueError("Volume must represent a whole number of shares (lot × 100).")
    if shares > 2**53 - 1:
        raise ValueError("Volume exceeds the exact integer range supported by browser clients.")
    raw_board = data.get("board", "").strip().upper()
    board = _BOARD.get(raw_board, "UNKNOWN" if raw_board in _MISSING else raw_board)
    if len(board) > 40:
        raise ValueError("Board name must have at most 40 characters.")
    trade_id = data.get("trade_id", "").strip()
    if trade_id.upper() in _MISSING:
        trade_id = None
    elif len(trade_id) > 100:
        raise ValueError("Trade ID must have at most 100 characters.")
    ticker = data.get("ticker", "").strip().upper() or None
    if ticker and not re.fullmatch(r"[A-Z0-9][A-Z0-9.-]{0,19}", ticker):
        raise ValueError("Ticker must use letters, digits, dots, or hyphens.")
    date = data.get("date", "").strip() or None
    if date:
        parsed_date = None
        for date_format in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                parsed_date = dt.datetime.strptime(date, date_format).date().isoformat()
                break
            except ValueError:
                pass
        if parsed_date is None:
            raise ValueError("Date must be YYYY-MM-DD or DD/MM/YYYY.")
        date = parsed_date
    buyer, seller = _broker(data.get("buyer", "")), _broker(data.get("seller", ""))
    same = bool(buyer and buyer == seller)
    types = (["same_broker"] if same else []) + (["negotiated"] if board == "NG" else []) + (["cash_board"] if board == "TN" else [])
    return {
        "line": line, "time": time, "t": _json_number(t), "date": date, "ticker": ticker,
        "price": _json_number(price), "lot": _json_number(shares / 100),
        "volume_shares": int(shares), "value": _json_number(price * shares),
        "buyer": buyer, "seller": seller, "board": board, "trade_id": trade_id,
        "candidate_types": types, "aggressor": "unknown",
        "directional_eligible": bool(board == "RG" and buyer and seller and not same),
    }


def _stats(trades, samples=False):
    shares = sum(row["volume_shares"] for row in trades)
    result = {
        "count": len(trades), "lot": _json_number(Decimal(shares) / 100),
        "volume_shares": shares,
        "value": _json_number(sum((Decimal(str(row["value"])) for row in trades), Decimal(0))),
    }
    if samples:
        result.update(samples=trades[:SAMPLE_LIMIT], samples_truncated=len(trades) > SAMPLE_LIMIT)
    return result


def analyze_tape(text, number_format="auto", quantity_unit=None):
    """Return JSON-safe tape observations; raise actionable ValueError on bad input.

    A ``Qty``/``quantity`` header requires an explicit ``quantity_unit`` of
    ``lot`` or ``shares``. Headerless input defaults to lots unless explicitly
    overridden; a ``volume``/``shares`` header means shares. Explicit RG prints
    with two different known brokers alone contribute
    to broker directional net totals. Aggressor side is never inferred.
    Invalid rows are reported and excluded. Repeated identical trade IDs are
    deduplicated; distinct or missing IDs never cause deduplication.
    """
    if not isinstance(text, str):
        raise ValueError("Tape text must be a string containing CSV, TSV, or pasted rows.")
    if not isinstance(number_format, str) or number_format not in {"auto", "en", "id"}:
        raise ValueError("number_format must be 'auto', 'en', or 'id'.")
    if quantity_unit not in (None, "lot", "shares"):
        raise ValueError("quantity_unit must be 'lot', 'shares', or omitted when the column header states the unit.")
    if len(text) > 20_000_000:
        raise ValueError("Tape text exceeds 20 MB; split it into smaller single-session inputs.")
    rows, invalid_rows, raw_count, unit, unit_source, header_adjustment = _rows(text, quantity_unit)
    resolved = _resolve_format(rows, number_format)
    trades, seen_ids, duplicate_ids = [], {}, []
    valid_count = 0
    for line, data in rows:
        try:
            trade = _trade(line, data, "en" if resolved == "plain" else resolved)
        except ValueError as exc:
            invalid_rows.append({"line": line, "error": str(exc)})
            continue
        valid_count += 1
        identity = trade["trade_id"]
        if identity is not None and identity in seen_ids:
            previous = seen_ids[identity]
            fields = ("t", "date", "ticker", "price", "volume_shares", "buyer", "seller", "board")
            if any(previous[key] != trade[key] for key in fields):
                raise ValueError(f"Conflicting rows for trade_id {identity!r} on lines {previous['line']} and {line}; resolve the conflict before analyzing.")
            duplicate_ids.append({"line": line, "trade_id": identity, "first_line": previous["line"]})
            continue
        if identity is not None:
            seen_ids[identity] = trade
        trades.append(trade)
    if not trades:
        detail = invalid_rows[0]["error"] if invalid_rows else "No trade rows were provided."
        raise ValueError(f"No valid running trades. {detail}")
    for field in ("ticker", "date"):
        values = {trade[field] for trade in trades if trade[field]}
        if len(values) > 1:
            raise ValueError(f"Multiple {field} values found; analyze one stock and one trading session at a time.")
    trades.sort(key=lambda trade: (trade["t"], trade["line"]))
    totals = _stats(trades)
    same = [row for row in trades if "same_broker" in row["candidate_types"]]
    negotiated = [row for row in trades if row["board"] == "NG"]
    cash = [row for row in trades if row["board"] == "TN"]
    non_regular = [row for row in trades if row["board"] in {"NG", "TN"}]
    regular = [row for row in trades if row["board"] == "RG"]
    unknown_board = [row for row in trades if row["board"] not in {"RG", "NG", "TN"}]
    directional = [row for row in trades if row["directional_eligible"]]
    directional_stats = _stats(directional)
    complete = [row for row in trades if row["buyer"] and row["seller"]]
    complete_stats = _stats(complete)
    pair_groups = defaultdict(list)
    for trade in complete:
        pair_groups[(trade["buyer"], trade["seller"], trade["board"])].append(trade)
    top_pairs = []
    for (buyer, seller, board), group in pair_groups.items():
        stat = _stats(group)
        top_pairs.append(dict(buyer=buyer, seller=seller, board=board, **stat,
                              volume_pct=100 * stat["volume_shares"] / totals["volume_shares"],
                              covered_volume_pct=100 * stat["volume_shares"] / complete_stats["volume_shares"]))
    top_pairs.sort(key=lambda pair: (-pair["value"], pair["buyer"], pair["seller"], pair["board"]))
    regular_groups = defaultdict(list)
    for trade in directional:
        regular_groups[tuple(sorted((trade["buyer"], trade["seller"])))].append(trade)
    pair_candidates = []
    for (broker_a, broker_b), group in regular_groups.items():
        stat = _stats(group)
        forward = sum(row["buyer"] == broker_a for row in group)
        reverse = len(group) - forward
        pct = 100 * stat["volume_shares"] / directional_stats["volume_shares"]
        reasons = []
        if len(group) >= 2:
            reasons.append("repeated_pair")
        if forward and reverse:
            reasons.append("reciprocal_pair")
        if len(directional) >= 5 and pct >= 25:
            reasons.append("concentrated_pair")
        if reasons:
            pair_candidates.append(dict(broker_a=broker_a, broker_b=broker_b, **stat,
                                        volume_pct=pct, reciprocal=bool(forward and reverse),
                                        direction_counts={f"{broker_a}>{broker_b}": forward, f"{broker_b}>{broker_a}": reverse},
                                        reasons=reasons, first_time=group[0]["time"], last_time=group[-1]["time"]))
            for row in group:
                row["candidate_types"].append("regular_pair_pattern")
    pair_candidates.sort(key=lambda pair: (-pair["value"], pair["broker_a"], pair["broker_b"]))
    broker_groups = defaultdict(lambda: {"buy": [], "sell": []})
    for trade in directional:
        broker_groups[trade["buyer"]]["buy"].append(trade)
        broker_groups[trade["seller"]]["sell"].append(trade)
    top_brokers = []
    for broker, group in broker_groups.items():
        buy, sell = _stats(group["buy"]), _stats(group["sell"])
        top_brokers.append({
            "broker": broker, "buy_count": buy["count"], "sell_count": sell["count"],
            "buy_lot": buy["lot"], "sell_lot": sell["lot"], "net_lot": _json_number(Decimal(buy["volume_shares"] - sell["volume_shares"]) / 100),
            "buy_volume_shares": buy["volume_shares"], "sell_volume_shares": sell["volume_shares"],
            "net_volume_shares": buy["volume_shares"] - sell["volume_shares"],
            "buy_value": buy["value"], "sell_value": sell["value"], "net_value": _json_number(Decimal(str(buy["value"])) - Decimal(str(sell["value"]))),
        })
    top_brokers.sort(key=lambda broker: (-abs(broker["net_value"]), broker["broker"]))
    buyer_rows = [row for row in trades if row["buyer"]]
    seller_rows = [row for row in trades if row["seller"]]
    same_stats, negotiated_stats = _stats(same, True), _stats(negotiated, True)
    candidate_stats = _stats([row for row in trades if row["candidate_types"]])
    warnings = [
        "Broker codes identify intermediaries, not beneficial owners. Candidates do not establish common ownership, wash trading, or crossing intent.",
        "Aggressor direction remains unknown; broker buy/sell roles are not aggressor-side evidence.",
        "Broker net totals use only explicit RG prints with two different known broker codes; pair-pattern candidates remain in these descriptive totals.",
        "Pair concentration is descriptive: a review candidate requires a repeated pair, or at least 25% of covered directional RG share volume when there are at least five eligible prints.",
    ]
    if unit_source == "explicit_qty_selection":
        warnings.append(f"Qty has no unit in its header; interpreted as {unit} using the explicit quantity_unit selection. One lot equals 100 shares; absolute volumes and values depend on this selection.")
    elif unit_source == "headerless_lot_default":
        warnings.append("Headerless quantity interpreted as lots (1 lot = 100 shares). Use a unit-bearing header or quantity_unit='shares' if the pasted quantity is shares.")
    elif unit_source == "explicit_headerless":
        warnings.append(f"Headerless quantity interpreted as {unit} using the explicit quantity_unit selection (1 lot = 100 shares).")
    if invalid_rows:
        warnings.append(f"Excluded {len(invalid_rows)} invalid row(s); review invalid_rows before relying on totals.")
    if duplicate_ids:
        warnings.append(f"Deduplicated {len(duplicate_ids)} repeated trade ID row(s). Identical prints without IDs remain separate trades.")
    if len(complete) < len(trades):
        warnings.append("Buyer/seller coverage is incomplete; missing broker codes are unknown and are never guessed.")
    if unknown_board:
        warnings.append(f"{len(unknown_board)} print(s) have missing/unrecognized board labels and are excluded from regular-market directional totals.")
    if non_regular:
        warnings.append("NG negotiated and TN cash-board prints are retained and flagged separately from directional totals. Board labels alone do not establish crossing intent.")
    if same:
        warnings.append("Same-broker candidates may overlap with NG/TN flags; candidate-category totals are not additive.")
    if header_adjustment:
        warnings.append(header_adjustment)
    pair_report = analyze_pair_price_patterns(trades)
    group_report = analyze_group_price_patterns(trades)
    return {
        "schema_version": 4,
        "pair_price_surveillance": pair_report,
        "group_price_surveillance": group_report,
        "explanation_report": explain_tape(trades, pair_report, group_report, invalid_row_count=len(invalid_rows)),
        "input": {"number_format": number_format, "resolved_number_format": resolved, "volume_unit": unit,
                  "quantity_unit": quantity_unit, "quantity_unit_source": unit_source,
                  "header_adjustment": header_adjustment,
                  "ticker": next((trade["ticker"] for trade in trades if trade["ticker"]), None),
                  "date": next((trade["date"] for trade in trades if trade["date"]), None)},
        "summary": {
            "raw_row_count": raw_count, "valid_row_count": valid_count,
            "invalid_row_count": len(invalid_rows), "duplicate_id_count": len(duplicate_ids),
            "trade_count": len(trades), "total_lot": totals["lot"], "total_volume_shares": totals["volume_shares"], "total_value": totals["value"],
            "regular_trade_count": len(regular), "negotiated_trade_count": len(negotiated), "cash_trade_count": len(cash), "non_regular_trade_count": len(non_regular), "unknown_board_trade_count": len(unknown_board),
            "same_broker_candidate_count": len(same), "same_broker_candidate_lot": same_stats["lot"], "same_broker_candidate_value": same_stats["value"],
            "directional_trade_count": len(directional), "directional_lot": directional_stats["lot"], "directional_value": directional_stats["value"],
            "candidate_count": candidate_stats["count"], "candidate_lot": candidate_stats["lot"], "candidate_value": candidate_stats["value"],
        },
        "coverage": {
            "buyer_count": len(buyer_rows), "seller_count": len(seller_rows), "both_count": len(complete),
            "buyer_pct": 100 * len(buyer_rows) / len(trades), "seller_pct": 100 * len(seller_rows) / len(trades), "both_pct": 100 * len(complete) / len(trades),
            "both_volume_pct": 100 * complete_stats["volume_shares"] / totals["volume_shares"],
            "directional_volume_pct": 100 * directional_stats["volume_shares"] / totals["volume_shares"],
        },
        "same_broker": same_stats, "negotiated": negotiated_stats, "cash": _stats(cash, True), "non_regular": _stats(non_regular, True),
        "top_pairs": top_pairs[:50], "regular_pair_candidates": pair_candidates[:50], "top_brokers": top_brokers,
        "trades": trades, "invalid_rows": sorted(invalid_rows, key=lambda row: row["line"]),
        "duplicate_ids": duplicate_ids, "warnings": warnings,
    }
