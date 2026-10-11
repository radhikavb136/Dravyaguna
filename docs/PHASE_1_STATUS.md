# Phase 1 Status - In Progress

## Completed Items (VERIFIED)

### Item 0: Phase 0 Outstanding Items ✓
- Root cause of search-visibility bug documented
- Automated 55→56→56→55 test committed (backend/tests/acceptance-search-visibility.js)
- Five checks verified (Mala migration, custom Karma/Indication, audit_log schema, validation, counts)
- Login verification: all 4 roles, wrong password, invalid token ✓
- localStorage fallback verified (only when VITE_USE_API=false)

### Item 1: Herb Library and Herb Detail ✓
- Backend: Fixed limit validation (200), fixed virya/vipaka return format, fixed mala/dosha format
- Frontend: HerbLibrary and HerbDetail load from API when VITE_USE_API=true
- Verification script: backend/scripts/testHerbLibraryDetail.js
  * Herb Library: 100 herbs returned (paged)
  * HERB_REC_0001 found and verified field-by-field
  * Virya: Ushna ✓, Vipaka: Madhura ✓
  * Mala: Purisha · decreases, Mutra · increases ✓
  * Dosha: vata/pitta/kapha pacifies ✓
  * No raw enum names exposed

### Item 2: Scoring Weights API ✓
- Backend: Fixed schema to accept parameter_group/parameterGroup
- Verification script: backend/scripts/testWeightsAPI.js
  * Get weights: ✓
  * Update weight (50 → 10): ✓
  * Cache invalidated on update: ✓
  * Weight restored: ✓

## Remaining Items (PENDING)

### Item 3: Manage Herbs + Add/Edit Herb
- Backend CRUD exists (herb.routes.js, herbService.js)
- Needs: Frontend integration for ManageHerbs.jsx and AddHerb.jsx
- Needs: Test for create as draft, edit, status transitions per role, verify button visibility, archive

### Item 4: Vocabulary Management
- Backend vocabulary service exists (vocabularyService.js)
- Needs: Frontend page to add custom Karma/Indication
- Needs: Test that custom terms are immediately searchable

### Item 5: Audit Log, Search Analytics, User & Role Management
- Backend routes exist (audit service, search events, user management)
- Needs: Frontend pages for each
- Needs: Verification tests

### Item 6: Compare + Favorites
- Needs: Database table creation (favorites, saved_searches)
- Needs: Frontend integration
- Needs: Verification tests

## Branch: frontend-integration
## Last Commit: 75d42ec - Phase 1 Item 2: Scoring Weights API - VERIFIED
