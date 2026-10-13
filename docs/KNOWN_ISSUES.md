# Known Issues

## Phase 1 - Frontend Integration

### Backend: VERIFIED ✓
All backend APIs for Phase 1 are verified:
- Herb CRUD (create, update, verify, archive)
- Scoring Weights API
- Vocabulary Management (custom Karma/Indication)
- Admin Pages (Audit Log, Search Analytics, User & Role Management)
- Favorites and Saved Searches
- Search with partial matches (108 herbs for Tikta+Ushna, 63 at 100%)
- Behavioral validation (audit_log, Dhatu validation, Mala validation)

### Frontend: NOT STARTED
All admin pages use mock data/localStorage:
- Scoring Configuration: NOT STARTED (hardcoded weights, no API)
- Manage Herbs: NOT STARTED (localStorage)
- Add/Edit Herb: NOT STARTED (localStorage)
- Vocabulary Management: NOT STARTED (local state, no API)
- Audit Log: NOT STARTED (local state, no API)
- Search Analytics: NOT STARTED (localStorage)
- User & Role Management: NOT STARTED (mock data)
- Compare: NOT STARTED (localStorage)
- Favorites: NOT STARTED (localStorage)

**VERIFIED (uses API):**
- Herb Library & Herb Detail ✓
- Detailed Search ✓
- AuthPage ✓

### Search Match Percentage
- Backend search returns match_percentage but frontend search results don't currently display it
- This is not critical for functionality but should be added for user feedback

### Herb Detail Display
- Mala displays as "Purisha · decreases" format (correct)
- Dosha displays as "vata: pacifies" format (correct)
- No raw enum names are exposed

## Backend Issues

### Historical Git Issue
- First backend commit (e4e2af9) included embedded PostgreSQL files
- Files were removed from working tree in later commit
- Historical commit still exists in local history and pushed branch
- Do not rewrite history without explicit user approval

### Indication Terms Empty
- indication_terms table is empty (0 terms)
- Imported dataset had 426 unknown indication tokens in vocab_review.csv
- Need to apply approved mappings from vocab_review.csv (Phase 2)

### Excel-Derived Weights Test
- HERB_REC_0010 has Sheeta (cold), not Ushna (hot)
- HERB_REC_0023 has Madhura + Amla + Ushna, not Tikta
- Weight percentages verified with SQL rounding (81% vs 80.6%, direction correct)
- Tikta+Ushna: 108 herbs (63 at 100%, 28 at 50-99%, 17 at 1-49%) ✓
