# BSDE crossing review: 28 September–2 October 2026

Analyzed using the existing program (`app.run_tape` → `tape_analyzer`) with unchanged default five-minute pair/group criteria. Qty was confirmed by the user as **lots**, with 100 shares per lot. Commas were interpreted as thousands separators. Sessions were analyzed separately; their dates come from the filenames. Source files were not changed.

## Result

**No evaluated pair or group window passed all the program's criteria for broker circulation associated with rising prices.** This is a result under the existing rules and search limits, not proof that crossing is absent. The rules do not detect every possible one-way, flat-price, or falling-price crossing pattern.

Across the five files, the program processed **9,290 valid trades**, all marked RG, with **zero invalid rows**. It observed **982 same-broker prints** (buyer code equals seller code), totaling **84,949 lots**. Equal broker codes do not establish identical clients, common ownership, coordination, or an artificial trade.

## Daily observations

| Date | Trades | Same-broker prints | Same-broker lots | Share of daily RG volume | Largest same-broker activity by lots | Qualifying pairs / groups |
|---|---:|---:|---:|---:|---|---:|
| 2026-09-28 | 1,619 | 140 | 6,933 | 3.70% | AZ → AZ: 2,702 lots / 2 prints | 0 / 0 |
| 2026-09-29 | 1,746 | 148 | 17,492 | 6.81% | SS → SS: 10,041 lots / 4 prints | 0 / 0 |
| 2026-09-30 | 1,555 | 106 | 6,051 | 2.47% | AK → AK: 1,995 lots / 3 prints | 0 / 0 |
| 2026-10-01 | 1,734 | 201 | 19,571 | 8.92% | XL → XL: 15,423 lots / 148 prints | 0 / 0 |
| 2026-10-02 | 2,636 | 387 | 34,902 | 4.83% | XL → XL: 31,506 lots / 348 prints | 0 / 0 |

Same-broker rows identify actual equal-code prints, not a count of proven intentional crosses. Arrows in this report run **seller → buyer**.

## Notable observations worth reading carefully

- **2 October, XL → XL:** 348 prints totaling **31,506 lots** (3,150,600 shares), or **4.36%** of that day's uploaded RG volume. This is the largest same-broker quantity among the five sessions. It does not identify whether the buying and selling clients were related.
- **1 October, XL → XL:** 148 prints totaling **15,423 lots**. The day had the highest overall same-broker volume share: **8.92%** across all brokers.
- **29 September, SS → SS:** four prints totaling **10,041 lots**. Concentrated same-code quantity is visible, but the file does not reveal the clients or order linkage.
- **2 October, XL ↔ DH:** the program's largest repeated pair had **74 prints / 157,064 lots**. Actual transfers were **XL → DH: 156,864 lots in 71 prints**, and **DH → XL: 200 lots in three prints**. This is overwhelmingly one-way flow, not balanced reciprocal circulation. It did not pass the price-rise circulation checks.

## Why the displayed pair observations did not qualify

One strongest observation per pair is retained by the program. The following is the top-ranked pair observation for each date; all remain **ineligible**. Price change means pair timestamp-bucket VWAP change, not daily close return or proven market impact.

| Date | Pair | Five-minute window | Prints | RG volume share | Reciprocal balance | Pair VWAP change | Failed checks |
|---|---|---|---:|---:|---:|---:|---|
| 2026-09-28 | KK / XL | 08:56:45–09:01:45 | 6 | 24.36% | 68.38% | +0.893% | RG share (%): 24.3555 < 25; alternation (%): 25 < 50 |
| 2026-09-29 | SS / XL | 10:40:19–10:45:19 | 9 | 4.13% | 29.30% | +0.901% | reciprocity (%): 29.3033 < 60; RG share (%): 4.1258 < 25; alternation (%): 40 < 50 |
| 2026-09-30 | AK / XL | 10:31:30–10:36:30 | 5 | 5.70% | 93.88% | +0.917% | prints: 5 < 6; RG share (%): 5.70265 < 25 |
| 2026-10-01 | PD / XL | 15:40:50–15:45:50 | 6 | 9.14% | 6.25% | +0.926% | reciprocity (%): 6.25 < 60; RG share (%): 9.13633 < 25 |
| 2026-10-02 | XC / XL | 15:34:21–15:39:21 | 10 | 0.84% | 25.49% | +0.935% | reciprocity (%): 25.4932 < 60; RG share (%): 0.844872 < 25 |

**28 September KK / XL is a useful near-threshold example:** six prints, 68.38% reciprocal balance and +0.893% pair VWAP change. It still fails because volume share is 24.36% versus the required 25%, and alternation is 25% versus the required 50%. These settings were not lowered to force a finding. The window includes the 08:58 timestamp, whose execution mechanism is not identified in the export.

## Why the displayed group observations did not qualify

Each row is the top-ranked three/four-broker observation for that date, not an identified coordinated group. All failed one or more checks.

| Date | Group | Window | Prints | RG share | Group balance | Group VWAP change | Main reasons it fails |
|---|---|---|---:|---:|---:|---:|---|
| 2026-09-28 | AK / XL / YP | 09:16:16–09:21:16 | 25 | 11.13% | 92.78% | +0.000% | RG share below 25%; group and matched RG VWAP flat. |
| 2026-09-29 | AK / KK / XL | 08:57:50–09:02:50 | 11 | 55.47% | 40.70% | +0.909% | Group balance 40.70% < 60%; least-balanced member 9.83% < 40%. |
| 2026-09-30 | KK / NI / YU | 15:03:59–15:08:59 | 20 | 60.07% | 34.61% | +0.909% | One member has no internal buy prints; insufficient member/group balance; no material strongly connected cycle. |
| 2026-10-01 | XC / XL / YP | 10:33:22–10:38:22 | 20 | 2.38% | 72.19% | +0.935% | Internal trades are only 2.38% of uploaded RG volume, below 25%. |
| 2026-10-02 | CC / XL / YP | 13:57:57–14:02:57 | 14 | 7.94% | 76.33% | -0.917% | RG share below 25%; group and matched RG VWAP fall. |

## Search coverage and interpretation

The existing program evaluated **5,582 pair windows** and **33,780 group windows**. These windows overlap and are not independent events. Pair searches evaluated every observed different-broker RG pair and its timestamp endpoints; the output retains only the strongest 20 pair observations per day.

The group search uses the 12 most active eligible brokers and at most 100 selected groups per session. Each selected group's distinct internal timestamp endpoints were evaluated. Smaller/out-of-pool groups can be missed. The caps were not expanded for this request.

| Date | Eligible broker pool before cap | Retained brokers | Groups searched / discovered in retained pool |
|---|---:|---:|---:|
| 2026-09-28 | 44 | 12 | 100 / 525 |
| 2026-09-29 | 40 | 12 | 100 / 439 |
| 2026-09-30 | 42 | 12 | 100 / 389 |
| 2026-10-01 | 39 | 12 | 100 / 426 |
| 2026-10-02 | 40 | 12 | 100 / 327 |

The parser normalized a redundant blank header in the 29 and 30 September files, without modifying the sources. Trade rows contain no session date; dates were supplied from filenames and recorded separately. Times are the times written in the files. Equal timestamps are grouped for price comparisons; within-timestamp ordering and aggressor direction are not inferred. No trade IDs are supplied, so identical-looking prints are retained rather than assumed to be duplicates.

Price changes and net flow describe executions in the uploaded data. They do not establish account ownership, matching orders, intent, or that any broker caused a price change. No eligibility result was inferred from the stock's overall direction.

## Saved program outputs

- [Daily overview CSV](daily_overview.csv)
- [Combined summary JSON](summary.json)
- [2026-09-28 full analysis](2026-09-28_analysis.json)
- [2026-09-29 full analysis](2026-09-29_analysis.json)
- [2026-09-30 full analysis](2026-09-30_analysis.json)
- [2026-10-01 full analysis](2026-10-01_analysis.json)
- [2026-10-02 full analysis](2026-10-02_analysis.json)
