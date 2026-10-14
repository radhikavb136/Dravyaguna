# Manual Click-Through Checklist

## Startup Commands

**Backend:**
```bash
cd C:\Users\Radhika V Bhosale\Downloads\Dravyaguna\backend
node src/index.js
```

**Frontend (with VITE_USE_API=true):**
```bash
cd C:\Users\Radhika V Bhosale\Downloads\Dravyaguna
# Ensure .env contains: VITE_USE_API=true
npm run dev
```

**Required .env keys:**
- DATABASE_URL
- JWT_SECRET
- FRONTEND_ORIGIN

**Dev Users:**
- dev-admin@test.com / Dev123456 → admin
- dev-editor@test.com / Dev123456 → editor
- dev-expert@test.com / Dev123456 → domain_expert
- dev-clinician@test.com / Dev123456 → clinician

---

## Pages and Roles Checklist

### 1. Login Page
**All Roles:**
- [ ] Enter email and password
- [ ] Click login button
- [ ] Verify redirect to appropriate dashboard
- [ ] Verify JWT stored in localStorage
- [ ] Verify role displayed in UI

**Wrong Password:**
- [ ] Enter wrong password
- [ ] Verify error message shown
- [ ] Verify no localStorage fallback when VITE_USE_API=true

**Expired Token:**
- [ ] Manually expire JWT in localStorage
- [ ] Refresh page
- [ ] Verify auto-logout and redirect to login

---

### 2. Herb Library
**Clinician:**
- [ ] View list of herbs
- [ ] Verify only reviewed/verified herbs shown
- [ ] Click herb to view detail
- [ ] Verify herb detail loads

**Editor:**
- [ ] View list of herbs
- [ ] Verify all statuses shown (draft, reviewed, verified)
- [ ] Click herb to view detail
- [ ] Verify herb detail loads

**Admin:**
- [ ] View list of herbs
- [ ] Verify all statuses shown
- [ ] Click herb to view detail
- [ ] Verify herb detail loads

---

### 3. Herb Detail
**All Roles:**
- [ ] View herb details
- [ ] Verify Rasa, Guna, Virya, Vipaka displayed
- [ ] Verify Mala shows "increases"/"decreases" (not "pacifies")
- [ ] Verify Dosha shows "pacifies"/"increases" (not raw enum)
- [ ] Verify no raw enum names displayed

---

### 4. Detailed Search
**Clinician:**
- [ ] Select filters (Rasa, Guna, Karma, etc.)
- [ ] Click search
- [ ] Verify results returned
- [ ] Verify match percentages shown
- [ ] Test Tikta + Deepana → should show 55 herbs at 100%

**Editor:**
- [ ] Select filters
- [ ] Click search
- [ ] Verify results returned
- [ ] Verify draft herbs can appear

**Admin:**
- [ ] Select filters
- [ ] Click search
- [ ] Verify results returned
- [ ] Verify all statuses included

---

### 5. Manage Herbs (NOT STARTED - Uses Mock Data)
**Editor:**
- [ ] View herb list
- [ ] Click "Add Herb"
- [ ] Fill herb form
- [ ] Submit
- [ ] Verify herb created as draft
- [ ] Edit herb
- [ ] Move to reviewed

**Admin:**
- [ ] View herb list
- [ ] Soft delete herb
- [ ] Verify herb archived

**Clinician:**
- [ ] View herb list
- [ ] Verify cannot add/edit/delete

---

### 6. Add/Edit Herb (NOT STARTED - Uses Mock Data)
**Editor:**
- [ ] Fill all fields
- [ ] Submit
- [ ] Verify validation (Dhatu 0-5, Mala increases/decreases)
- [ ] Verify Dhatu 7 rejected with 400
- [ ] Verify Mala "pacifies" rejected with 400

**Admin:**
- [ ] Edit herb
- [ ] Change status
- [ ] Verify audit log row created with before/after

---

### 7. Scoring Configuration (NOT STARTED - Hardcoded Weights)
**Admin/Domain Expert:**
- [ ] View current weights
- [ ] Change a weight
- [ ] Submit
- [ ] Verify weight updated
- [ ] Run search to verify new weight reflected
- [ ] Restore original weight

**Editor/Clinician:**
- [ ] Verify cannot change weights (403)

---

### 8. Vocabulary Management (NOT STARTED - Local State)
**Admin/Domain Expert:**
- [ ] View vocabulary terms
- [ ] Add custom Karma term
- [ ] Verify term appears in filters
- [ ] Search with custom term
- [ ] Verify results returned
- [ ] Add custom Indication term
- [ ] Verify term appears in filters

**Editor/Clinician:**
- [ ] Verify cannot add terms (403)

---

### 9. Audit Log (NOT STARTED - Local State)
**Admin:**
- [ ] View audit log entries
- [ ] Verify actor, action, entity_type shown
- [ ] Verify before/after JSON displayed
- [ ] Filter by date or action

**Other Roles:**
- [ ] Verify cannot access (403)

---

### 10. Search Analytics (NOT STARTED - LocalStorage)
**Admin:**
- [ ] View search analytics
- [ ] Verify search counts by day
- [ ] Verify top searches shown

**Other Roles:**
- [ ] Verify cannot access (403)

---

### 11. User & Role Management (NOT STARTED - Mock Data)
**Admin:**
- [ ] View user list
- [ ] Change user role
- [ ] Verify role updated

**Other Roles:**
- [ ] Verify cannot access (403)

---

### 12. Compare (NOT STARTED - LocalStorage)
**All Roles:**
- [ ] Add herbs to comparison
- [ ] View comparison page
- [ ] Verify herbs compared side-by-side
- [ ] Remove herb from comparison

---

### 13. Favorites (NOT STARTED - LocalStorage)
**All Roles:**
- [ ] Add herb to favorites
- [ ] View favorites page
- [ ] Verify favorite herb shown
- [ ] Remove from favorites
- [ ] Verify per-user isolation

---

### 14. Saved Searches (NOT STARTED - LocalStorage)
**All Roles:**
- [ ] Save current search
- [ ] Name the search
- [ ] View saved searches
- [ ] Load saved search
- [ ] Remove saved search

---

## Notes

- Pages marked "NOT STARTED" use mock data/localStorage and need API integration
- Backend APIs are all VERIFIED and working
- Frontend API client layer is VERIFIED
- Only Herb Library, Herb Detail, Detailed Search, and AuthPage use the real API
