# Known Issues

## Phase 1 - Frontend Integration

### Search Match Percentage
- Backend search returns match_percentage but frontend search results don't currently display it
- This is not critical for functionality but should be added for user feedback

### Herb Detail Display
- Mala displays as "Purisha · decreases" format (correct)
- Dosha displays as "vata: pacifies" format (correct)
- No raw enum names are exposed

### Frontend Pages Not Yet Integrated
- Manage Herbs (ManageHerbs.jsx) - uses mock data
- Add/Edit Herb (AddHerb.jsx) - uses mock data
- Vocabulary Management - no frontend page yet
- Audit Log viewer - no frontend page yet
- Search Analytics - no frontend page yet
- User & Role Management - no frontend page yet
- Compare + Favorites - needs database table

### Database Tables Needed
- favorites table (user_id, herb_id, created_at)
- saved_searches table (user_id, name, filters_json, created_at)

## Backend Issues

### Historical Git Issue
- First backend commit (e4e2af9) included embedded PostgreSQL files
- Files were removed from working tree in later commit
- Historical commit still exists in local history and pushed branch
- Do not rewrite history without explicit user approval

### Indication Terms Empty
- indication_terms table is empty (0 terms)
- Imported dataset had 426 unknown indication tokens in vocab_review.csv
- Need to apply approved mappings from vocab_review.csv
