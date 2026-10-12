# Known Issues

## Phase 1 - Frontend Integration

### Backend: VERIFIED ✓
All backend APIs for Phase 1 are verified:
- Herb CRUD (create, update, verify, archive)
- Scoring Weights API
- Vocabulary Management (custom Karma/Indication)
- Admin Pages (Audit Log, Search Analytics, User & Role Management)
- Favorites and Saved Searches

### Frontend: IMPLEMENTED-UNVERIFIED
API client layer exists and is working. Pages need integration:

- Herb Library & Herb Detail: ✓ Uses API when VITE_USE_API=true
- Detailed Search: ✓ Uses API when VITE_USE_API=true
- Manage Herbs: Uses mock data, needs API integration
- Add/Edit Herb: Uses mock data, needs API integration
- Scoring Configuration: Page exists, needs API integration
- Vocabulary Management: No page exists
- Audit Log: No page exists
- Search Analytics: No page exists
- User & Role Management: No page exists
- Compare: Uses mock data, needs API integration
- Favorites: No API integration

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
- Excel-derived weight calculation test skipped due to data mismatch
- 63 herbs for Tikta+Ushna verified correctly
