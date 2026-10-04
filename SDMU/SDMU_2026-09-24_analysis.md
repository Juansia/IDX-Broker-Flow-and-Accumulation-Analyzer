# SDMU — supplied running trades, 24 September 2026

## Finding

The supplied tape contains recurring three/four-broker circulation patterns coinciding with local price rises. The initial detector flags 18 overlapping groups among 100 groups searched. This supports a review list, not a conclusion that these brokers coordinated, shared owners, or caused the price movement. No pair passes every criterion of the stricter two-broker alternation screen.

## Source and session context

- Source: `Running trade 24 09 2026.txt`. The date comes from the filename supplied by the user; individual rows contain no date.
- 31,109 valid SDMU/RG prints, 52 broker codes and 5,132 distinct timestamps. No rows were excluded by the parser.
- First timestamp bucket: 08:58:00 at 90. Last bucket: 16:14:58 at 76. The observed first-to-last change is **−15.56%**, despite local rising windows.
- Individual trade prices range from 76 to 116. Only two prints reach 116, at 15:26:12; the entire six-print timestamp has a weighted price of about 115.048. The first 76 print appears at 15:47:52.
- 28,961 prints (93.09%) share their timestamp with other prints. Within-second ordering is unknown; the detector uses timestamp buckets rather than assuming a sequence.
- 4,912 same-broker prints represent 20.33% of recorded quantity. Broker equality does not establish account-owner equality.
- Repeated rows without trade IDs are retained: 2,709 identical-row extras may be distinct executions or duplicated source data. The file alone cannot resolve that ambiguity.
- The header has an extra blank field after Time. It was removed from the heading only after all 31,109 data rows confirmed the shorter layout; source cells and the original file were unchanged.
- **Qty unit remains unconfirmed.** All quantity-based figures below use the raw exported quantities. Lots, shares and rupiah turnover are deliberately unreported. A uniform multiplication by 100 does not change these percentages or weighted prices.

## Strongest group windows

The table uses the strongest eligible window retained for each group. Group-price change is from the first to last **internal timestamp-bucket VWAP**, which may occur after the window starts. Matched RG change uses all regular-market prints at those same two timestamps. Volume share uses the complete five-minute window.

| Brokers | Five-minute window | Internal prints | Share of uploaded RG quantity | Group balance | Group VWAP change | Matched RG change | Review score |
|---|---|---:|---:|---:|---:|---:|---:|
| CP / XL / YP | 14:22:42–14:27:42 | 59 | 41.50% | 81.42% | +0.98% | +0.98% | 75.11/100 |
| CC / CP / XL | 15:31:59–15:36:59 | 482 | 32.98% | 98.25% | +2.04% | +2.10% | 74.69/100 |
| CP / MG / XL | 15:22:52–15:27:52 | 461 | 39.99% | 87.26% | +1.80% | +1.80% | 74.42/100 |
| CC / CP / MG / XL | 15:31:42–15:36:42 | 720 | 39.22% | 90.76% | +1.92% | +0.95% | 73.55/100 |
| CC / CP / XL / YP | 15:31:59–15:36:59 | 783 | 44.66% | 87.84% | +2.04% | +2.10% | 73.15/100 |

The score ranks review priority; it is not a probability of manipulation. These five examples share members and may reuse trades. The 18 qualifying groups and 828 qualifying rolling windows are **not independent incidents**.

## Example: CP / XL / YP

Its selected window is 14:22:42–14:27:42; the first observed internal print is 14:23:02. There are 59 internal prints across 41 distinct timestamps.

| Member | Share of internal quantity involved | Two-way quantity balance | Internal involvement / all broker participation |
|---|---:|---:|---:|
| CP | 65.78% | 78.68% | 51.91% |
| XL | 59.24% | 92.30% | 52.14% |
| YP | 74.98% | 75.21% | 91.88% |

Participation counts both endpoints of an internal trade, so member participation sums to 200%. Group balance uses the sum of the absolute individual net flows, avoiding the misleading fact that signed internal net flows always sum to zero.

## Why the pair-only screen is insufficient

The full-session CP–XL relationship is the largest distinct-broker pair: 5,425 prints and 14.34% of recorded quantity, with 94.81% two-way balance. That daily aggregate does not establish a rising-price episode. Its selected pair window, 14:57:30–15:02:30, has 20.51% of uploaded RG quantity and fails the initial 25% volume-share requirement, despite meeting the other pair checks. A three-broker cycle can qualify at group level even when its constituent pairs fail a pair-specific dominance or alternation rule.

## Algorithm and coverage

Three/four-broker candidates require sufficient prints and timestamps, meaningful buying and selling by each member, material directed cycles, balanced individual flows, at least 25% of uploaded RG quantity, a group VWAP rise of at least 0.5%, and a positive matched RG price change. Full formulas and thresholds are in `../README.md`. Thresholds were not adjusted to make SDMU qualify and have not been calibrated against labeled market-abuse cases.

The search used the top 12 of 52 brokers by distinct-counterparty RG participation: CP, XL, YP, MG, CC, AK, XC, PD, BQ, XA, KK, YB. It discovered 715 globally connected combinations within that pool, searched 100 of them, and evaluated 143,950 windows without timestamp subsampling. 615 discovered combinations and 40 brokers were outside the rolling group search. About 8.41% of uploaded RG quantity touches at least one broker outside the pool. All uploaded RG quantity still remains in each denominator.

The pair detector separately evaluated 12,371 windows across 415 distinct broker pairs. No pair met all of its initial criteria. Neither result rules out one-way coordinated activity or smaller groups missed by the bounded group search.

## Interpretation limits

Broker codes identify intermediaries serving multiple clients. Normal order execution, liquidity provision, auctions and order splitting can produce similar patterns. The tape has no account IDs, beneficial ownership, order IDs, order-book depth, aggressor labels, or completeness guarantee. Observed price association cannot establish intent or causality. Subsequent price declines also do not prove an earlier manipulation scheme.

Use this output to choose windows for more detailed review. Do not automatically delete these trades from accumulation statistics or treat the scores as buy/sell signals.

Full machine-readable output: `SDMU_2026-09-24_surveillance.json` (quantity fields explicitly use raw Qty).

Source SHA-256: `b52f85c874cbfe98a4e0927d693b2d375f28f878e86578580e8ae7264b391987`
