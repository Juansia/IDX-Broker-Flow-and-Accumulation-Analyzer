# IDX Broker Flow Accumulation Analyzer

Local Python analysis of Indonesian broker summaries and running trades, with an Indonesian-language dashboard. The new **Akumulasi Python** tab uses a dependency-free Python engine. Existing dashboard tabs remain available with their original JavaScript methods; their scores are separate from the new engine.

## Run

Double-click **Jalankan Aplikasi.bat**, or use Python 3.10+:

```powershell
python app.py
# Optional:
python app.py --port 9000 --no-browser
```

Open <http://localhost:8765>. No pip packages or API keys are required for the new analysis. The Windows launcher also detects the bundled Codex Python runtime, if present. Opening `index.html` directly does not start the Python API.

## Workflow

1. In **Akumulasi Python**, choose several IPOT broker-summary files, or load the existing RAJA/BBRI examples from this workspace.
2. Select a ticker if the uploads contain multiple stocks. Choose the number format: English `1,234.50`, Indonesian `1.234,50`, or automatic detection.
3. Optionally supply dated prices/volumes, fundamentals, and one stock/session of running trades.
4. Analyze, inspect the score components and evidence coverage, then export broker CSV or the complete JSON result.

Optional confirmation inputs are kept separately per ticker during the current browser session. Switching stocks restores that stock's inputs, preventing another stock's prices or fundamentals from carrying over. Reloading the page clears these unsaved inputs.

For tape-only analysis, expand **Running trade & kandidat crossing**, use **Buka file running trade** or **Muat SDMU · 24 Sep 2026**, and click **Periksa crossing tape**. Confirm the quantity unit and session date first. The SDMU button loads the existing TXT file, selects its comma-thousands number format, and suggests the date from its filename; it leaves the ambiguous `Qty` unit unselected. The synthetic scenarios are separate examples and are labeled as such.

The broker-summary sample buttons use single-date exports. There are 19 RAJA single-date files and four BBRI single-date files. `Bbri/1007 BBRIToBroker.csv` has Start **2026-07-10** and End **2026-07-11**: it is a period export. Uploading it manually includes its aggregate flows but does not create daily observations. Overlapping periods are rejected; identical duplicate snapshots are ignored with a warning.

Dates come from export metadata, never from filenames. No prices or fundamental values are fabricated from the supplied broker summaries.

## Input formats

IPOT's tab-separated `BY BLot BVal BAvg # SL SLot SVal SAvg` format, including its ticker, Start, End, investor, and board metadata, is supported. CSV and semicolon delimiters, UTF-8 BOMs, and quoted grouped numbers are also supported. Avoid mixing investor scopes or trading boards in one analysis.

An alternative broker CSV uses one aggregated row per date/ticker/broker/board:

```csv
date,ticker,code,buy_value,sell_value,buy_lot,sell_lot,board
2026-07-10,DEMO,CC,3000000,1000000,30,10,RG
2026-07-10,DEMO,XL,1000000,3000000,10,30,RG
```

Values are rupiah; volumes here are lots. Empty lot fields remain unknown. For numeric suffixes in broker input, `M` means million, `B` billion, `K` thousand, and `T` trillion. Explicit number formats are preferable for ambiguous decimals.

Optional price CSV (volumes in shares; averages must use prior sessions):

```csv
date,close,prev_close,volume,avg_volume
2026-07-10,1010,1000,4000,3500
```

`close` is required for each supplied price row. Leave unavailable optional fields empty. Supply a closing price on the analysis end date and either a previous close or an earlier dated close for price validation. Outside-period observations are excluded and reported. The baseline window is shown in the evidence; supplied averages are not independently verified against historical market data.

Optional running-trade CSV, showing **synthetic** same-broker and ordinary prints:

```csv
date,ticker,time,price,lot,buyer,seller,board,trade_id
2026-07-10,DEMO,09:00:01,1000,10,CC,CC,RG,example-1
2026-07-10,DEMO,09:00:02,1010,20,CC,XL,RG,example-2
```

Use `volume` or `shares` instead of `lot` for share quantities. Common Indonesian headers and headerless `Jam Harga Change Change% Lot BY SL` are supported. Headerless volume is interpreted as lots. Include board codes where available: `RG` regular, `NG` negotiated, `TN` cash. Missing board/broker codes stay unknown. Choose an explicit English/Indonesian numeric format when tape separators are ambiguous. A tape must contain one stock and one session; split multi-session files first.

The tab-separated TXT layout `Time Stock Brd Price Qty BT BC SC ST` is also supported: `Stock` identifies the ticker, `Brd` the board, `BC` the buyer broker, and `SC` the seller broker. `BT` and `ST` are not used as broker codes. A `Qty` or `quantity` header does **not** state whether quantities are lots or shares. Choose the confirmed unit in the dashboard, or provide `quantity_unit="lot"` or `quantity_unit="shares"` to the Python/API call; the parser rejects an unspecified unit for these headers. A supplied unit must agree with an explicit `lot` or `volume`/`shares` header. The resolved unit and its source are recorded in the result.

For `SDMU/Running trade 24 09 2026.txt`, the `Qty` unit must be confirmed from the export source before reporting absolute shares or rupiah amounts. No unit is established by the filename or by integer-looking quantities. If rows contain no date, supply `session_date` in `YYYY-MM-DD` format through the API or the dashboard's session-date input. This separate date is recorded as user-supplied metadata; it must match a date already present in the tape.

Fundamental inputs use percentage points for ROE and profit growth (enter `15` for 15%) and multiples for debt/equity and P/E. `as_of` is the date the information became publicly available, not simply the fiscal period end. Fundamentals published after the analysis end are excluded. Thresholds are generic and need sector context, particularly for banks.

## Calculations

- **Net value:** gross buy value minus gross sell value, grouped by broker.
- **Net volume:** buy lots minus sell lots; the share equivalent is displayed in the output.
- **Buy VWAP:** total buy value divided by total buy shares, with proper volume weighting across dates. Missing lot quantities make affected VWAPs unavailable.
- **Net-flow implied price:** net value divided by net shares, reported separately in JSON. This ratio can be unusual or negative and is not an investor's acquisition cost.
- **Concentration:** top-three positive broker nets divided by all positive broker nets; HHI is the sum of their squared shares, on a 0–1 scale. The positive-net/gross-buy ratio has a separate denominator.
- **Consistency:** net-buy days divided by uploaded distinct single dates. Period exports are excluded. Missing sessions are not filled in, and a broker absent from a snapshot has no observed net buy that day.

Both sides of a complete market's trades normally sum to the same value. The aggregate buy-minus-sell total is a reconciliation check, not market inflow. Partial top-broker exports can distort net values and concentration; results describe only supplied rows. Broker codes represent intermediaries serving many clients, not identifiable owners or investor types.

The lot conversion follows [IDX trading units](https://www.idx.id/en/products-services/trading-hours-and-mechanism/): a regular/cash market lot contains 100 shares. Negotiated trades can use non-round-lot share amounts.

## Transparent accumulation score

The score is a configurable-in-code **research heuristic**, not a calibrated probability, prediction, or backtested trading strategy. The output contains the evidence and formula for every component.

| Component | Weight | Formula |
|---|---:|---|
| Broker flow | 25 | `clamp(400 × positive broker net / gross buys)` |
| Concentration | 15 | Top-three share of positive broker net, as a percentage |
| Consistency | 20 | Net-weighted buying-day percentage of top three daily-data net buyers; requires at least two distinct dates |
| Price | 15 | `clamp(50 + 5 × price return in percentage points)` |
| Volume | 15 | `clamp(50 × mean(volume / prior average volume))` |
| Fundamentals | 10 | Mean of available metric scores; its weight is prorated by the fraction of four supplied metrics |

`clamp` bounds a component to 0–100. Fundamental metric scores are `clamp(5 × ROE)`, `clamp(50 + 2.5 × growth)`, `clamp(100 − 50 × D/E)` and `clamp(100 − (P/E − 5) × 100/35)`. Negative D/E and nonpositive P/E receive zero.

The final score is the weighted mean of **available** components. Evidence coverage is the available weight out of 100; missing components do not get an invented neutral score. For example, summary data alone across multiple dates normally supplies only 60% of configured evidence. Coverage measures available categories, not statistical confidence or completeness of all exchange sessions. Read it together with warnings and source details. Concentration and high turnover can also occur without accumulation.

## Crossing observations

### Reading RAJA broker summaries before a tape is available

The **Membaca crossing dari broker summary** section now separates observed
turnover from net flow. `summary_surveillance.py` produces the separate
`summary_surveillance` result; it does not change the accumulation score.
The supplied RAJA example comprises 19 daily exports. These are unmatched
broker totals: the buyer and seller on the same ranked export row are **not**
counterparties. Summary-only crossing assessment is unavailable, not a finding
that no crossing occurred.

For each broker the section shows combined buy-plus-sell value, signed net
value and net lots, the absolute net/gross ratio, and daily two-sided balance.
Positive net rupiah can coexist with negative net lots when average buy/sell
prices differ; the app highlights this disagreement instead of calling it
share accumulation. Lots remain unknown where required quantities are missing.

Same-day balance is `200 × sum(min(daily buy, daily sell)) / sum(daily buy + daily sell)`
using only dates with both broker sides explicitly reported. An omitted side
is unknown for this diagnostic, not evidence of zero trading. Balance coverage
shows how much supplied gross value those complete observations cover.
Computing balance day by day prevents buying on one day and selling on another
from appearing to be balanced activity within a day. Average buy/sell price
gaps describe different baskets of trades; they do not match transactions.

The descriptive watchlist uses disclosed research settings: at least 80%
same-day balance, 5% of uploaded two-sided gross value, three complete active
dates with at least 80% balance, and 80% coverage of supplied gross value by
complete-side observations. These settings select where to inspect a tape;
they are not a crossing score or fraud probability. Role switches compare
only adjacent uploaded dates where both sides are reported and each net is
nonzero. Missing rows, incomplete sides, and zero nets break a comparison;
uploaded dates are not assumed to be consecutive exchange sessions. Period
exports are excluded from all daily diagnostics.

Use **Muat RAJA → Analisis akumulasi**, then select a broker to see its daily
breakdown. To investigate actual 2–4 broker relationships, supply a complete
RAJA running-trade session containing time, price, quantity/unit, buyer,
seller, and board. The existing tape checks then use actual counterparties.

The tape report flags actual prints with equal buyer/seller broker codes, shows negotiated and cash boards separately, and summarizes repeated, reciprocal, or concentrated broker pairs. These are candidates for review; broker IDs alone do not establish common ownership, wash trading, or crossing intent. Overlapping candidate counts must not be added together.

Only explicit `RG` prints with two different known brokers contribute to the tape's directional broker-net totals. Buy/sell broker roles do not identify the aggressor. Tape observations are reported separately and do not automatically boost or penalize the accumulation score. Duplicate trade IDs are deduplicated when their data agrees; identical prints without IDs remain separate trades. Invalid rows and excluded coverage are reported.

### Explaining a tape result

Tape schema version 4 adds `explanation_report`, built by `tape_explanation.py`.
It explains one representative pair window and one group window using their
existing eligibility and ranking, without comparing their scores or adding
overlapping counts. Failed checks have readable labels. Observed transfer
edges run **seller → buyer**, show counts, shares and weighted prices, and
reconcile to the internal trades and each member's internal net volume.
An aggregated cycle does not prove that the same shares moved through those
brokers in chronological order. Member flows here concern internal trades,
not the broker's total market position.

Participant VWAP and all-RG VWAP are compared at exactly the same first/last
participant timestamps. The all-RG calculation includes equal-broker and
unattributed prints; NG/TN trades are excluded. One timestamp cannot establish
a price change, and tied timestamps are aggregated without inventing order.
The pair detector can pass when its own VWAP rises but the all-RG comparison
does not: the explanation highlights this, while preserving the documented
pair criteria. The group detector already requires positive matched RG change.
Neither result establishes that the brokers caused prices to rise.

## Two-broker activity associated with a price rise

`pair_surveillance.py` examines a supplied running-trade session for reciprocal trading between two brokers during a rising-price window. It reports **candidates for review**, not confirmed crossing, coordinated accounts, or a finding that the pair caused the price increase. Broker codes identify intermediaries; the same pair may represent many unrelated clients.

This analysis requires transaction-level time, price, quantity, buyer, seller, and board information. Broker summaries contain each broker's totals without matching buyers to sellers. The supplied RAJA/BBRI summaries alone therefore cannot establish a two-broker pattern, and no real broker-pair verdict is inferred from them.

The detector evaluates inclusive rolling windows of **300 seconds**, ending at each distinct timestamp at which a pair trades. An unordered pair is formed only from explicit `RG` trades between two different known broker codes. All regular-market trades in the window, including those with missing broker codes or equal buyer/seller codes, remain in the market-volume denominator. `NG`, `TN`, and unknown-board trades are excluded from these regular-market calculations.

For brokers A and B, `Vab` means shares bought by A from B and `Vba` means shares bought by B from A within the window. The detector combines several observable features:

| Feature | Calculation or interpretation |
|---|---|
| Reciprocal volume balance | `100 × 2 × min(Vab, Vba) / (Vab + Vba)`; 100% means equal quantities in both directions |
| Pair share of regular-market volume | `100 × (Vab + Vba) / all RG shares in the window` |
| Dependence on the pair | Calculate the pair's share of each broker's total RG participation, then use the smaller share; a same-broker print counts once in that broker's participation |
| Direction alternation | `100 × direction switches / comparable transitions`; adjacent distinct timestamps are comparable only when each bucket has one direction; mixed-direction buckets are ambiguous |
| Pair price change | Percentage change from the first timestamp bucket's pair VWAP to the last bucket's pair VWAP |

Grouping equal timestamps prevents input row order from creating artificial alternation or a price rise. Other or unattributed RG volume and price observations provide comparison context. This comparison includes prints with unknown counterparties, which may actually belong to the pair; it is not a verified independent control group. An association between pair activity and price movement does not establish causation.

The default review criteria require at least **6 pair prints**, **3 distinct timestamps**, and **2 prints in each direction**. They also require a pair price increase of at least **0.5%**, reciprocal volume balance of at least **60%**, pair volume share of at least **25%**, and at least **2 comparable direction transitions** with **50% alternation**. These are uncalibrated research settings, not exchange rules, estimated fraud probabilities, or validated trading signals. A short or incomplete tape limits both coverage and interpretation.

The separate pair-review score weights reciprocal balance **20**, pair volume share **20**, dependence **15**, alternation **15**, and price change **30**. The first four components use their percentages directly. The price component is `clamp(50 × price_change_pct / min_price_rise_pct)` on a 0–100 scale. With the default 0.5% minimum, a 0.5% rise earns 50 price points and a 1% rise earns 100. The score is normalized over available components and reports its own evidence coverage. Fewer than two distinct timestamps leave the price change and overall score unavailable. Dependence contributes to scoring but is not a separate eligibility gate.

A window passing every review criterion is labeled **Review candidate**; a passing window with a score of at least **70** is labeled **High-priority review candidate**. A high score cannot override failed criteria. The report can also show windows that fail review criteria, together with their failed checks, so a displayed pair is not automatically a review candidate.

The report retains one strongest window per pair, with up to 20 reported pairs. Ranking first prioritizes windows passing all review criteria, then those meeting all four minimum-sample checks (6 prints, 3 timestamps, and 2 prints in each direction), then the number of passed criteria, and then the score. Further ties favor more prints, more distinct timestamps, greater pair volume, and finally the earliest window end. This prevents a short, incomplete window with a higher score from hiding a fuller observation that fails a review criterion. Windows and pairs can overlap, so their volumes and candidate counts must not be summed as independent events. Raw broker flow, tape prints, and the accumulation score remain visible; this surveillance does not automatically subtract suspicious volume or change the accumulation score.

The rule is specific to reciprocal, alternating activity. One-way matched trading and other price-lifting patterns may not satisfy it. Normal liquidity provision, order splitting, and auction activity can also produce similar observations. **No eligible candidates** means these criteria were not met in the supplied tape; it does not establish that manipulation is absent.

The Python entry point is `analyze_pair_price_patterns(trades, window_seconds=300)`, where `trades` is the normalized `result["trades"]` list returned by `analyze_tape`. The integrated tape result exposes the report as `pair_price_surveillance`. The dashboard's **Periksa crossing tape** action analyzes a supplied tape without requiring broker summaries. Its synthetic scenario is labeled as an example and does not represent any real broker's activity.

## Three/four-broker circulation associated with a price rise

`group_surveillance.py` adds `group_price_surveillance` to every tape result. It can detect a cycle such as A → B → C → A even when no individual pair trades in both directions. Arrows describe shares transferred from seller broker to buyer broker; they do not identify aggressor orders, account owners, or coordinated intent.

The search selects the 12 brokers with the largest distinct-counterparty RG participation, discovers strongly connected three/four-member groups, and examines up to 100 groups ranked by total internal volume. Up to 50 slots are reserved for each group size before filling unused slots. Every distinct internal timestamp of each selected group ends an inclusive five-minute window. There is no timestamp sampling. The output discloses the pool, omitted brokers, affected volume, omitted groups and evaluated windows; this bounded search can miss smaller or less active groups.

Each window requires all of the following research criteria:

- At least 9 internal prints for three members or 12 for four, at three or more distinct timestamps.
- Every member has at least two buy prints and two sell prints, participation of at least 20% of internal volume, and quantity balance of at least 40% (`2 × min(buy, sell) / (buy + sell)`).
- Directed relationships carrying at least 1% of internal volume form a strongly connected graph. Tiny return trades cannot establish this connection by themselves.
- Group balance is at least 60%: `100 × (1 − sum(abs(member buy − member sell)) / (2 × internal volume))`. The sum of signed internal net flows is always zero, so that sum is never used as evidence.
- Internal trades account for at least 25% of all uploaded RG quantity in the window. Same-broker prints and missing counterparties stay in the denominator.
- Group timestamp-bucket VWAP rises at least 0.5%, and all-RG VWAP rises at the **same first and last group timestamps**. This comparison supports price association, not causation.

The score weights balance 20%, volume share 20%, minimum member dependence 15%, participation 15%, and group price change 30%. Participation compares the least involved member with equal involvement (`200 / member count` percent); the price component is capped at 100 and reaches 100 at a 1% rise. All eligibility checks must pass regardless of score. One strongest window per group is retained and at most 20 are displayed. Pair/group windows and memberships overlap; counts, volumes and scores must not be summed as independent events. These settings have not been calibrated or backtested as trading signals.

Use **Running trade & kandidat crossing → Buka file running trade**, or **Muat SDMU · 24 Sep 2026**, then select the exported Qty unit and press **Periksa crossing tape**. The SDMU loader uses English comma grouping and a session date from the filename; neither is inferred as trade-row metadata. TXT exports with a redundant unnamed interior heading are normalized only when every data row confirms the shorter width, and the adjustment is reported. The original file is unchanged. **Ekspor tape JSON** saves the full report; four-broker and three-broker synthetic scenarios are also available. The price chart uses observed one-minute VWAPs and leaves gaps rather than inventing prices for empty periods.

The SDMU example's quantity unit was unconfirmed when the included analysis was generated. `SDMU/SDMU_2026-09-24_surveillance.json` therefore uses raw Qty weights and explicitly renames quantity fields. It contains no inferred lots, shares, or rupiah turnover. A uniform lot/share conversion leaves its ratios and weighted prices unchanged. See `SDMU/SDMU_2026-09-24_analysis.md` for the findings and limitations.

## Python/API use

```python
from pathlib import Path
from analyzer import analyze_payload
from tape_analyzer import analyze_tape

path = Path("RAJA/1007 RAJAToBroker.csv")
result = analyze_payload({
    "files": [{"name": path.name, "text": path.read_text(encoding="utf-8-sig")}],
    "number_format": "en",
})
print(result["brokers"][0])
```

`POST /api/analyze` accepts JSON with `files`, optional `ticker`, `broker_rows`, `prices`, `fundamentals`, `number_format`, `running_trade`, `quantity_unit`, and `session_date`. It returns the analysis directly, with an optional `tape` result. `POST /api/tape` accepts `{"running_trade":"...","number_format":"en"}`, plus `quantity_unit` when needed and optional `session_date`, and returns a complete tape result, including `pair_price_surveillance`, without broker-summary inputs. Invalid requests return HTTP 400 with `{"error":"..."}`. `GET /api/health`, `/api/samples`, and `/api/sample?name=...` support the local UI. `GET /api/tape-sample` returns the allowlisted SDMU TXT file with a date explicitly sourced from its filename.

The server binds only to loopback, limits request size to 16 MiB, serves an explicit asset/sample list, and restricts the retained legacy proxy to allowlisted HTTPS providers (including redirects). New uploaded analysis data stays in local browser memory and the local Python process; export results to keep them. Existing tabs retain their original browser storage and online-fetch features.

## Verification

```powershell
python -m unittest discover -s tests -v
node --check analyzer-ui.js
```

Tests cover actual supplied exports, value/volume arithmetic, parsing, duplicates, period/date alignment, incomplete evidence, crossing candidates, and HTTP request boundaries. Pair-surveillance checks use synthetic trade scenarios; they do not establish crossing in the supplied broker-summary files. Live provider availability and predictive returns are not asserted by these tests.
