# Phase 1 Status - IN PROGRESS (Backend VERIFIED, Frontend NOT STARTED for admin pages)

## Completed Items (VERIFIED)

### Item 0: Phase 0 Outstanding Items ✓
- Root cause of search-visibility bug documented
- Automated 55→56→56→55 test committed (backend/tests/acceptance-search-visibility.js)
- Five checks verified with commands (Mala migration, custom Karma/Indication, audit_log schema, validation, counts)
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
  * Frontend adapter verified: Mala shows term + effect, Dosha shows pacifies/increases, no raw enums ✓

### Item 2: Scoring Weights API ✓
- Backend: Fixed schema to accept parameter_group/parameterGroup
- Verification script: backend/scripts/testWeightsExcel.js
  * Get weights: ✓
  * Update weight (50 → 100): ✓
  * Cache invalidated on update: ✓
  * Weight restored: ✓
  * Excel-derived: 108 herbs for Tikta+Ushna (63 at 100%) ✓
  * Weight change reflects immediately: ✓
  * Partial matches restored: ✓

### Item 3: Herb CRUD (Backend) + Scoring Config API ✓
- Backend CRUD: VERIFIED via testHerbCRUDPhase1.js
  * Create as draft (editor): ✓
  * Clinician cannot create: 403 ✓
  * Editor draft → reviewed: ✓
  * Editor cannot set verified: 403 ✓
  * Domain expert can verify: ✓
  * Admin can archive: ✓
- Scoring Config API: VERIFIED (src/api/weights.js added)
- Frontend pages: NOT STARTED (uses mock data)

### Item 4: Vocabulary Management ✓
- Backend: VERIFIED via testVocabularyCustom.js
  * Create custom Karma: ✓
  * Create custom Indication: ✓
  * Custom terms appear in vocabulary filters: ✓
- Frontend Vocabulary Management page: NOT STARTED (uses local state)

### Item 5: Admin Pages ✓
- Backend: VERIFIED via testAdminPages.js
  * Audit log accessible: ✓ (6 entries)
  * Search analytics accessible: ✓
  * Users list accessible: ✓ (7 users)
  * Clinician cannot access: 403 ✓
- Frontend admin pages: NOT STARTED (uses mock data/localStorage)

### Item 6: Compare + Favorites ✓
- Backend: VERIFIED via testFavoritesSavedSearches.js
  * Add favorite: ✓
  * Get favorites: ✓
  * Remove favorite: ✓
  * Save search: ✓
  * Get saved searches: ✓
  * Remove saved search: ✓
  * Per-user isolation: ✓
- Frontend Compare + Favorites: NOT STARTED (uses localStorage)

## Remaining Issues (User Requested)

### Issue 5: Behavior Tests (BLOCKED - Need implementation)
- Editor creates custom Karma → immediately searchable
- Herb update writes audit_log row with before/after values
- API returns 400 for Dhatu score 7
- API returns 400 for Mala effect "pacifies"

### Issue 6: Dev-User Seed Script Safety (BLOCKED - Need implementation)
- Must not run when NODE_ENV=production
- Must not run against non-dev DATABASE_URL

### Issue 7: Manual Click-Through Checklist (BLOCKED - Need creation)
- One-page manual checklist per page and role

## Frontend Integration Status

- API Client Layer: VERIFIED (src/api/client.js, src/api/auth.js, src/api/herbs.js, src/api/vocabulary.js, src/api/weights.js)
- Herb Library & Herb Detail: VERIFIED (uses API when VITE_USE_API=true)
- Detailed Search: VERIFIED (uses API when VITE_USE_API=true)
- Manage Herbs: NOT STARTED (uses localStorage)
- Add/Edit Herb: NOT STARTED (uses localStorage)
- Scoring Configuration: NOT STARTED (hardcoded weights)
- Vocabulary Management: NOT STARTED (local state)
- Audit Log: NOT STARTED (local state)
- Search Analytics: NOT STARTED (localStorage)
- User & Role Management: NOT STARTED (mock data)
- Compare: NOT STARTED (localStorage)
- Favorites: NOT STARTED (localStorage)

## Branch: frontend-integration
## Last Commit: 968ce4a - Fix search partial matches and acceptance test
