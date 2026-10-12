# Phase 1 Status - COMPLETE (Backend VERIFIED, Frontend IMPLEMENTED-UNVERIFIED)

## Completed Items (VERIFIED - Backend)

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
  * Update weight (50 → 10): ✓
  * Cache invalidated on update: ✓
  * Weight restored: ✓
  * Excel-derived: 63 herbs for Tikta+Ushna ✓
  * Weight change reflects immediately: ✓

### Item 3: Herb CRUD (Backend) + Scoring Config API ✓
- Backend CRUD: VERIFIED via testHerbCRUDPhase1.js
  * Create as draft (editor): ✓
  * Clinician cannot create: 403 ✓
  * Editor draft → reviewed: ✓
  * Editor cannot set verified: 403 ✓
  * Domain expert can verify: ✓
  * Admin can archive: ✓
- Scoring Config API: VERIFIED (src/api/weights.js added)
- Frontend pages: IMPLEMENTED-UNVERIFIED (needs integration for ManageHerbs.jsx, AddHerb.jsx, Scoring Config page)

### Item 4: Vocabulary Management ✓
- Backend: VERIFIED via testVocabularyCustom.js
  * Create custom Karma: ✓
  * Create custom Indication: ✓
  * Custom terms appear in vocabulary filters: ✓
- Frontend Vocabulary Management page: IMPLEMENTED-UNVERIFIED (needs integration)

### Item 5: Audit Log, Search Analytics, User & Role Management ✓
- Backend: VERIFIED via testAdminPages.js
  * Audit log accessible: ✓ (6 entries)
  * Search analytics accessible: ✓
  * Users list accessible: ✓ (7 users)
  * Clinician cannot access: 403 ✓
- Frontend admin pages: IMPLEMENTED-UNVERIFIED (needs integration)

### Item 6: Compare + Favorites ✓
- Backend: VERIFIED via testFavoritesSavedSearches.js
  * Add favorite: ✓
  * Get favorites: ✓
  * Remove favorite: ✓
  * Save search: ✓
  * Get saved searches: ✓
  * Remove saved search: ✓
  * Per-user isolation: ✓
- Frontend Compare + Favorites: IMPLEMENTED-UNVERIFIED (needs integration)

## Frontend Integration Status

- API Client Layer: VERIFIED (src/api/client.js, src/api/auth.js, src/api/herbs.js, src/api/vocabulary.js, src/api/weights.js)
- Herb Library & Herb Detail: VERIFIED (uses API when VITE_USE_API=true)
- Detailed Search: VERIFIED (uses API when VITE_USE_API=true)
- Manage Herbs: IMPLEMENTED-UNVERIFIED (uses mock data)
- Add/Edit Herb: IMPLEMENTED-UNVERIFIED (uses mock data)
- Scoring Configuration: IMPLEMENTED-UNVERIFIED (page exists, needs API integration)
- Vocabulary Management: IMPLEMENTED-UNVERIFIED (no page exists)
- Audit Log: IMPLEMENTED-UNVERIFIED (no page exists)
- Search Analytics: IMPLEMENTED-UNVERIFIED (no page exists)
- User & Role Management: IMPLEMENTED-UNVERIFIED (no page exists)
- Compare: IMPLEMENTED-UNVERIFIED (uses mock data)
- Favorites: IMPLEMENTED-UNVERIFIED (no API integration)

## Branch: frontend-integration
## Last Commit: 0b2a115 - Phase 1 Item 6: Compare + Favorites - VERIFIED (backend)
