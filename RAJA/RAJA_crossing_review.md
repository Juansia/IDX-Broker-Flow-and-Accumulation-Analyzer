# RAJA: understanding turnover before investigating crossing

Analyzed the 19 supplied daily RG broker summaries dated **15 June–10 July 2026**.
Dates come from export metadata. This is a historical review of those files,
not a live market assessment. No RAJA transaction-level running trade was
available in the workspace for this review.

**Finding:** several brokers have substantial buying and selling on the same
day. The summaries do not identify their counterparties, so actual crossing
between two, three, or four brokers remains **unavailable for assessment**.
The independently ranked buyer/seller columns must not be paired by row.

## Why XL is a useful example

Across the supplied dates:

| Metric | XL |
|---|---:|
| Buy value | Rp500,278,975,000 |
| Sell value | Rp499,515,978,000 |
| Combined gross value | Rp999,794,953,000 |
| Net value | +Rp762,997,000 |
| Absolute net value / gross value | 0.0763% |
| Buy volume | 1,252,026 lots |
| Sell volume | 1,254,738 lots |
| Net volume | **−2,712 lots** |
| Share of all supplied two-sided gross value | 20.4077% |
| Weighted same-day value balance | 92.5855% |
| Dates with daily balance at least 80% | 17 of 19 |
| Net-value role switches | 7 of 18 comparable uploaded-date pairs |

XL bought and sold almost equal rupiah amounts, but sold more lots than it
bought. Its average buy price (Rp3,995.76) exceeded its average sell price
(Rp3,981.04). Thus its positive net value does **not** indicate net share
accumulation over these dates. Different clients and trades can create this
relationship; the price gap is not a realized-profit calculation.

The 92.5855% daily balance describes overlap between daily buying and selling
amounts. It does not mean 92.5855% of trades were crossed. Unlike balancing
the whole period's totals, it does not mistake buying on one day and selling
on another for same-day two-sided activity.

On **10 July**, XL bought Rp47,916,207,000 and sold Rp40,361,592,000, with
net volume **+17,115 lots** and daily balance 91.4422%. This also illustrates
why a single day's direction can differ from the full-period direction.

## Where to inspect a tape next

The app's disclosed turnover watchlist selects these brokers individually:

| Broker | Gross value (Rp billion) | Same-day balance | Share of supplied gross value | Net lots |
|---|---:|---:|---:|---:|
| XL | 999.795 | 92.59% | 20.41% | −2,712 |
| CC | 603.820 | 84.67% | 12.33% | −29,667 |
| YP | 367.084 | 90.93% | 7.49% | +10,400 |
| XC | 345.166 | 87.88% | 7.05% | −6,935 |

**These four names are not an inferred trading group.** Their counterparty
relationships are unknown. They individually meet descriptive criteria:
at least 80% weighted daily balance, 5% gross participation, three complete
dates with balance at least 80%, and 80% complete-side gross coverage.
All four have complete-side observations on all 19 supplied dates.

A complete RAJA running-trade session would let the app inspect:

1. Actual seller-to-buyer transfers and repeated exchanges between brokers.
2. Individual net shares relative to gross internal turnover in each five-minute window.
3. Two-broker reciprocity or material cycles among three/four brokers.
4. Internal VWAP and all-RG VWAP at exactly the same endpoint timestamps.
5. Failed criteria and coverage gaps, rather than treating any high score as a verdict.

Even qualifying tape patterns establish observations for review, not shared
account ownership, coordinated intent, or proof that the brokers caused a
price increase. The app does not infer those facts or alter the accumulation
score using these diagnostics.

## Coverage and reproducibility

There are 77 distinct broker codes and 1,080 broker-date observations. Buy
and sell totals each equal Rp2,449,557,426,000. The two-sided denominator is
Rp4,899,114,852,000; it counts both sides of executions and is not one-sided
exchange turnover. Reconciliation does not prove every row/session was supplied.

166 broker-date observations lack an explicitly reported side. They are
excluded from daily balance and role-switch calculations; missing quantities
remain unavailable. Complete-side observations cover 99.1448% of supplied
gross value. Only uploaded dates are observed; no missing sessions are filled.

To reproduce: run the local app, choose **Akumulasi Python → Muat RAJA →
Analisis akumulasi**, open the summary diagnostic, and select XL. Export
analysis JSON to retain the full `summary_surveillance` result and daily rows.
