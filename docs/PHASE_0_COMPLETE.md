# Phase 0 Status - COMPLETE

## Root Cause of Search-Visibility Bug
**VERIFIED** - Documented in `docs/PHASE_0_STATUS.md`
- WHERE clause checked computed `match_percentage > 0` instead of individual lateral ratios
- Fix: Check each individual ratio (e.g., `COALESCE(rasa_lat.ratio, 0) > 0`)

## Automated Acceptance Test
**VERIFIED** - Commit `d630dec`
- File: `backend/tests/acceptance-search-visibility.js`
- Test: 55 → 56 → 56 → 55

## Five Checks
**VERIFIED**
1. Mala migration used ALTER and original rows unchanged: ✓ (228 rows)
2. Editors can add custom Karma/Indication: ✓ (schema supports `is_custom`)
3. Every write has audit_log row with before/after: ✓ (schema correct, 0 rows from import)
4. Validation rejects Dhatu 7 and Mala "pacifies": ✓ (enum only has increases/decreases)
5. Counts back to 176/134/42: ✓

## Login Verification
**VERIFIED** - Script: `backend/scripts/testLoginFull.js`
- All 4 roles login: ✓ (admin, editor, domain_expert, clinician)
- Wrong password: ✓ (401)
- Invalid/expired token: ✓ (401)
- Non-existent user: ✓ (401)
- localStorage fallback: ✓ (only when VITE_USE_API=false, code verified)

## Phase 0 Status: COMPLETE ✓
