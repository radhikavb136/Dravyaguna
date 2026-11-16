# Vocabulary review report (read-only)

Generated **2026-10-24** from `backend/scripts/vocab_review.csv` via `npm run vocab:review:report`. **No `approved_canonical` values were invented or applied.**

## Summary

| Metric | Value |
|--------|------:|
| Total rows | **657** |
| Pending expert approval | **657** |
| Rows with `approved_canonical` set | **0** |
| Pending rows with non-empty `suggestion` only | **47** |

## By category

| Category | Rows |
|----------|-----:|
| karma | 231 |
| indication | 426 |

## Workflow (safe)

1. Domain experts fill **`approved_canonical`** only from approved sources (not from automated `suggestion` alone).
2. Export a review slice: `npm run vocab:review:export-pending` (writes CSV with empty `approved_canonical` column preserved).
3. Dry-run import: `npm run vocab:approved:dry-run`.
4. Apply only on an owner-approved database: `npm run vocab:approved:apply`.

## Highest-frequency pending tokens (for prioritization)

| Category | Raw token | Occurrence count | Suggestion (not auto-applied) |
|----------|-----------|------------------|-------------------------------|
| karma | Shothahara | 68 | — |
| karma | Kushtaghna | 48 | Kusthaghna |
| indication | shotha | 37 | — |
| indication | agnimandya | 35 | — |
| indication | Arsha | 35 | — |
| indication | Krimi | 34 | — |
| karma | Vedanasthapana | 32 | — |
| indication | kushtha | 31 | — |
| karma | Medohara | 24 | — |
| karma | Vajikarana | 23 | — |

Re-run the JSON report anytime: `cd backend && npm run vocab:review:report`.
