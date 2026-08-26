# Annualized Price Change in Price History

The Price History modal currently shows total % change since the first recorded price, with no regard for how long ago that price was. For 4670.3 that reads "+10.0%" even though the $2.00 price is from 1/1/2023 — over 3.5 years ago. Real annual inflation there is roughly 2.7%/yr.

## What changes

In the Price History modal stats bar:

- Keep: Current Price, Min Price, Max Price, Price Change.
- Replace the single "% Change" tile with two tiles:
  - **Total Change** — the existing cumulative % (e.g. +10.0%), with the period underneath in small text (e.g. "over 3.7 yrs").
  - **Annual Change** — the annualized rate (CAGR), e.g. +2.7% / yr.
- Fix a display bug in the current % tile: it renders a stray `$` in front of the percentage.

## Calculation

Annualized rate = ((endPrice / startPrice) ^ (1 / years)) − 1, where years = days between the earliest history date and today ÷ 365.25.

Guard rails:
- If the span is under 1 year, show the total change as the annual figure and label the period ("over 7 mo") rather than extrapolating a misleading annualized number.
- If startPrice is 0 or there is no history, show "—".
- Positive green / negative red, matching current styling; 1 decimal place.

## Technical notes

Single file: `src/components/settings/PriceHistoryModal.tsx`. Extend `calculateVolatility()` to also return `years` and `annualizedPercent`, and change the stats grid from `grid-cols-5` to `grid-cols-6`.
