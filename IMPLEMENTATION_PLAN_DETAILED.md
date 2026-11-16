# Detailed Implementation Plan - Dravyaguna-AI Backend

## Current State Assessment
The codebase already has a mature backend implementation:
- ✅ Core schema with all required tables and relationships
- ✅ Authentication with JWT + bcrypt, 4 roles (admin/editor/domain_expert/clinician)
- ✅ Scoring engine using LEFT JOIN LATERAL (single query pattern)
- ✅ Search (detailed and simple), weights management
- ✅ Translations with caching and provider abstraction (Sarvam/Google/Azure)
- ✅ RAG/explain with LLM providers
- ✅ Herb CRUD, vocabulary, favorites, audit, analytics
- ✅ Security (helmet, CORS, rate limiting, parameterized queries)
- ✅ Migrations, testing framework
- ✅ Frontend API integration mostly in place

## What Needs to be Ensured/Completed

### 1. Scoring Engine Verification
**Current:** `buildSearchQuery.js` implements the exact pattern requested - single query with LEFT JOIN LATERAL per group, configurable weights, breakdown JSON.  
**Action needed:** Verify performance meets requirements. The code already has the pattern; tests show it works.

### 2. Frontend Wiring Completion
**Status:** Most API calls are wired (`src/api/*`, pages use `USE_API` flag). The prompt says "wire each page to call the real APIs instead of its mock data" and "one small new frontend component (the info-icon)".  
**Check:** InfoIcon component exists and is implemented with the required behavior (tooltip on hover/mobile, "View more" panel, calls /api/explain for herbs, shows definitions for vocab terms, labels AI content). Looks complete.

### 3. Multi-language Support Verification
**Current:** Translation service with caching, search query translation for Hindi/Marathi, herb field translation. Providers: Sarvam primary, Google/Azure fallbacks. Cache table exists. Language detection implemented.  
**Status:** Implemented as specified.

### 4. Security Hardening
**Current:** Helmet, CORS restricted, rate limiting on auth/login and search translation, parameterized queries, bcrypt, JWT, role checks server-side.  
**Status:** Implemented.

### 5. Data Import Script
**Current:** `scripts/importRealDataset.js` and `importRealDatasetDryRun.js` exist. Handles validation, reports errors, supports original_language.  
**Status:** Implemented.

### 6. Storage for Images
**Current:** Upload routes exist, checks magic bytes/size, supports Supabase Storage.  
**Status:** Implemented with provider abstraction.

### 7. Environment Configuration
**Current:** `.env.example` exists with all required vars.  
**Action:** Ensure it's comprehensive per requirements.

### 8. Documentation
**Current:** README, API.md, PHASE_STATUS.md exist and are detailed.  
**Action:** May need to add specific sections mentioned in requirements.

## Proposed File Structure (Current - Already Exists)

Backend structure is already well-organized:
```
backend/
├── migrations/           # node-pg-migrate files
├── scripts/             # utilities, import, seeds
├── src/
│   ├── app.js
│   ├── index.js
│   ├── config/
│   ├── db/
│   ├── middleware/      # auth, errorHandler
│   ├── routes/          # all endpoints
│   ├── services/
│   │   ├── audit/
│   │   ├── auth/
│   │   ├── explain/     # RAG/LLM
│   │   ├── herbs/
│   │   ├── scoring/     # scoring engine
│   │   ├── translations/
│   │   └── vocabulary/
│   └── utils/
└── tests/
```

Frontend has API clients wired, InfoIcon component added.

## Scoring Engine - SQL Approach (Verified)
The implementation in `buildSearchQuery.js` does exactly what was requested:
- Uses `LEFT JOIN LATERAL` per parameter group
- Computes weighted scores in SQL: `SUM(COALESCE(ratio_i,0)*weight_i)/SUM(active_weights)`
- Builds transparent breakdown as JSONB per group
- Single query with CTEs (`ranked`, `details`) to compute efficiently
- No N+1 pattern

## Translation Caching Flow (Verified)
1. Check `translation_cache` by (content_type, content_id, field_name, target_language)
2. On miss, call provider (Sarvam first, then Google/Azure), store with status `machine_translated`
3. Verification by admin/domain_expert sets status to `verified_translation`

## RAG Flow (Verified)
1. Retrieve herb data + scoring breakdown from DB
2. Build prompt with retrieved context only
3. Call swappable LLM provider
4. Cache by herb_id + filters hash
5. Return with `ai_generated` flag

## Next Steps
1. Ensure environment is properly configured
2. Run migrations on the local database
3. Test the scoring engine performance
4. Verify all role restrictions
5. Test translation and RAG flows
6. Make sure frontend can connect to backend
7. Document any remaining gaps clearly
