# Dravyaguna API Documentation

## Base URL
```
http://localhost:4000
```

## Health

`GET /api/health` (also available as `GET /health`) checks database connectivity and returns `200 {"status":"ok","database":"ok"}` or `503 {"status":"error","database":"unavailable"}`. No authentication is required.

## Authentication
All API endpoints (except `/api/auth/login` and `/api/auth/register`) require JWT authentication via the `Authorization: Bearer <token>` header.

## Role Mapping
Frontend roles map to backend roles as follows:
- `Admin` → `admin`
- `Doctor` → `clinician`
- `Ayurvedic Reviewer` → `domain_expert`
- `Editor` → `editor`

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "User Name",
  "role": "clinician"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "role": "clinician",
    "status": "active",
    "created_at": "2026-10-12T10:00:00Z"
  }
}
```

Public registration always creates a clinician and ignores any supplied role. The user signs in separately to receive a JWT.

### POST /api/auth/login
Authenticate a user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "clinician"
  },
  "token": "jwt_token_here"
}
```

---

## Account Endpoints

All account routes require a valid JWT and act only on the authenticated account.

### GET /api/account
Returns account identity, role/status, preferred language, and stored preferences.

### PATCH /api/account/profile
Updates `fullName` (1–120 characters) and `displayName` (1–80 characters). Email is read-only here.

### PATCH /api/account/preferences
Accepts `language` (`en-IN`, `hi-IN`, `mr-IN`, `sa-IN`) and/or a validated `preferences` object. Search preferences include `defaultSearch` (`simple` or `detailed`) and `resultsPerPage` (10–100); preference updates are merged into the account record.

### POST /api/account/password
Changes the authenticated account password. Requires `currentPassword` and `newPassword` (10–128 characters); the current password is verified before storing a new hash.

---

## Herb Endpoints

### GET /api/herbs
List herbs with pagination and status filter.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `status` (optional): `draft`, `reviewed`, `verified`, `archived`

**Role Visibility:**
- Clinicians: only `reviewed`, `verified`
- Editors/Admins/Domain Experts: all statuses

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "HERB_REC_0001",
      "english_name": "Heart leaved moon seed",
      "botanical_name": "Cardiospermum halicacabum",
      "sanskrit_name": "Lakshmana",
      "local_name": "Lakshmana",
      "family": "Sapindaceae",
      "part_used": "Seed",
      "prabhava": "Specific action",
      "status": "reviewed",
      "image_url": "https://example.com/image.jpg",
      "rasa": ["Tikta", "Kashaya"],
      "guna": ["Laghu", "Snigdha"],
      "virya": "Ushna",
      "vipaka": "Madhura",
      "karma": ["Deepana", "Pachana"],
      "indications": ["agnimandya", "aruchi"],
      "dhatu": [
        {"dhatu": "Rasa", "score": 5},
        {"dhatu": "Rakta", "score": 5}
      ],
      "mala": [
        {"mala": "Purisha", "effect": "decreases"},
        {"mala": "Mutra", "effect": "increases"}
      ],
      "srotas": ["Rasavaha", "Raktavaha"],
      "avayava": [],
      "dosha_actions": [
        {"dosha": "vata", "effect": "pacifies"}
      ],
      "raw_karma": "Deepana, Pachana",
      "raw_indication": "agnimandya, aruchi"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 176
  }
}
```

### GET /api/herbs/:id
Get a single herb by ID.

**Query Parameters:**
- `lang` (optional, default: `en-IN`): `en-IN`, `hi-IN`, `mr-IN`, `sa-IN`

**Response:** Same shape as single herb object in list response.

### POST /api/herbs
Create a new herb (editor+ only).

**Authorization:** Editor, Admin, Domain Expert

**Request:**
```json
{
  "code": "HERB_REC_0177",
  "english_name": "New Herb",
  "sanskrit_name": "Sanskrit Name",
  "botanical_name": "Botanical Name",
  "local_name": "Local Name",
  "family": "Family",
  "part_used": "Part Used",
  "prabhava": "Prabhava",
  "rasa": ["tikta"],
  "guna": ["laghu"],
  "virya": "ushna",
  "vipaka": "madhura",
  "karma": ["deepana"],
  "indications": ["jwara"],
  "dhatu": [
    {"term": "rasa", "score": 5}
  ],
  "mala": [
    {"term": "purisha", "effect": "decreases"}
  ],
  "srotas": ["rasavaha"],
  "avayava": [],
  "dosha_actions": [
    {"dosha": "vata", "effect": "pacifies"}
  ],
  "raw_karma": "Deepana",
  "raw_indication": "agnimandya"
}
```

**Response:** Created herb object with `status: "draft"`.

### PUT /api/herbs/:id
Update an existing herb (editor+ only).

**Authorization:** Editor, Admin, Domain Expert

**Status Restrictions:**
- Editors can move `draft ↔ reviewed`
- Editors cannot set `verified`
- Domain Experts/Admins use `/api/herbs/:id/verify` for verification

**Request:** Same shape as create, partial updates supported.

**Response:** Updated herb object.

### POST /api/herbs/:id/verify
Verify a herb (domain_expert+ only).

**Authorization:** Domain Expert, Admin

**Response:** Herb object with `status: "verified"`.

### DELETE /api/herbs/:id
Soft delete a herb (admin only).

**Authorization:** Admin only

**Response:** Herb object with `status: "archived"`.

---

## Search Endpoints

### POST /api/search/detailed
Detailed search with scoring and filters.

**Request:**
```json
{
  "filters": {
    "rasa": ["tikta"],
    "guna": ["laghu"],
    "karma": ["deepana"],
    "indication": ["jwara"],
    "virya": ["ushna"],
    "vipaka": ["madhura"],
    "dhatu": ["rasa"],
    "mala": ["purisha"],
    "srotas": ["rasavaha"],
    "avayava": [],
    "dosha": [{"dosha": "vata", "effect": "pacifies"}],
    "prabhava": ["substring"]
  },
  "lang": "en-IN",
  "limit": 50,
  "offset": 0
}
```

**Filter Format:**
- Rasa, Guna, Virya, Vipaka, Karma, Indication, Dhatu, Mala, Srotas, Avayava: array of **stable slugs** (not display labels, not numeric IDs). Labels are accepted only during transition and logged as deprecated.
- Dosha: array of `{ "dosha", "effect" }` (`pacifies` | `increases`)
- Prabhava: array of substrings for text search

**Response:**
```json
{
  "lang": "en-IN",
  "results": [
    {
      "id": "uuid",
      "code": "HERB_REC_0001",
      "englishName": "Heart leaved moon seed",
      "botanicalName": "Cardiospermum halicacabum",
      "partUsed": "Seed",
      "prabhava": "Specific action",
      "status": "reviewed",
      "imageUrl": "https://example.com/image.jpg",
      "matchPercentage": 100.0,
      "breakdown": [
        {
          "group": "rasa",
          "weight": 20,
          "ratio": 1.0,
          "items": [
            {"id": 358, "label": "Tikta", "matched": true}
          ]
        }
      ]
    }
  ],
  "meta": {
    "dbDurationMs": 43.1,
    "unresolved": {},
    "activeFilterGroups": 2
  }
}
```

---

## Vocabulary Endpoints

### POST /api/search/simple
Search text and optional clinical filters with the same weighted ranking as detailed search. English Latin-script matching is enabled. Hindi/Devanagari and other unsupported input is not translated yet and returns a `note`; supplied filters are still evaluated.

**Request:** `{ "query": "fever", "lang": "en-IN", "filters": { "rasa": ["tikta"] }, "limit": 50, "offset": 0 }`. A query or at least one non-empty filter is required.

**Response:** `{ "lang": "en-IN", "results": [], "matched_terms": [{ "term": "...", "canonical": "...", "vocabulary": "karma", "similarity": 1, "matchType": "approved_synonym" }], "unmatched_tokens": [], "meta": { "language": "en-IN", "matched_terms": [], "unmatched_tokens": [], "query": "..." } }`.

Only existing canonical Karma/Indication vocabulary and `term_synonyms` rows with `approval_status: "approved"` are eligible. Existing synonym rows default to `draft` after migration 012. Exact approved synonyms are preferred; PostgreSQL trigram suggestions require similarity at least `0.45`, are filtered to at least 80% of the strongest candidate for that token, and remain request-only (no vocabulary/herb link is written). `backend/data/search-synonyms-starter.csv` is a draft for expert review and is not imported. Search analytics logging runs asynchronously.

### GET /api/vocabulary/filters
Get all vocabulary terms for frontend filters.

**Response:**
```json
{
  "rasa": [{"id": 1, "slug": "tikta", "label": "Tikta"}],
  "guna": [{"id": 1, "slug": "laghu", "label": "Laghu"}],
  "virya": [{"id": 1, "slug": "ushna", "label": "Ushna"}],
  "vipaka": [{"id": 1, "slug": "madhura", "label": "Madhura"}],
  "karma": [{"id": 1, "slug": "deepana", "label": "Deepana"}],
  "indications": [],
  "dhatu": [{"id": 1, "slug": "rasa", "label": "Rasa"}],
  "mala": [{"id": 1, "slug": "purisha", "label": "Purisha"}],
  "srotas": [{"id": 1, "slug": "rasavaha", "label": "Rasavaha"}],
  "avayava": [],
  "hasOrganData": false
}
```

### POST /api/vocabulary/karma
Create a custom Karma term (editor+).

**Authorization:** Editor, Admin, Domain Expert. Editing, merging, and deleting existing terms is admin-only.

**Request:**
```json
{
  "canonical_en": "CustomKarma"
}
```

**Response:**
```json
{
  "id": 27,
  "canonical_en": "CustomKarma",
  "slug": "customkarma",
  "is_custom": true
}
```

### POST /api/vocabulary/indications
Create a custom Indication term (editor+).

**Authorization:** Editor, Admin, Domain Expert

**Request:**
```json
{
  "canonical_en": "CustomIndication"
}
```

**Response:** Same shape as Karma.

---

## Scoring Weights Endpoints

### GET /api/scoring/weights
Get current scoring weights.

**Response:**
```json
{
  "weights": {
    "rasa": 20,
    "guna": 18,
    "virya": 12,
    "vipaka": 10,
    "prabhava": 8,
    "dosha": 15,
    "dhatu": 6,
    "mala": 3,
    "srotas": 8,
    "avayava": 6,
    "karma": 10,
    "indication": 15
  }
}
```

### PUT /api/scoring/weights
Update scoring weights (admin/domain_expert only).

**Authorization:** Admin, Domain Expert

**Request:**
```json
{
  "parameter_group": "rasa",
  "weight": 25
}
```

**Response:**
```json
{
  "weights": {
    "rasa": 25,
    ...
  }
}
```

### PUT /api/scoring/weights/bulk
Updates a set of scoring weights atomically (admin/domain_expert only). Unknown parameter names reject the entire update. Successful updates are written to the audit log.

**Request:** `{ "weights": { "rasa": 20, "virya": 12 } }`

---

## Admin Endpoints

### GET /api/audit-log
Get audit log entries (admin only).

**Authorization:** Admin only

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "actor_id": "uuid",
      "action": "create",
      "entity_type": "herb",
      "entity_id": "uuid",
      "before_json": null,
      "after_json": {...},
      "created_at": "2026-10-12T10:00:00Z"
    }
  ]
}
```

### GET /api/analytics/search
Get search analytics (admin and domain_expert).

**Authorization:** Admin, Domain Expert

**Response:**
```json
{
  "data": [
    {
      "date": "2026-10-12",
      "search_count": 45
    }
  ]
}
```

### GET /api/users
Get all users (admin only).

**Authorization:** Admin only

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "clinician",
      "status": "active",
      "created_at": "2026-10-12T10:00:00Z"
    }
  ]
}
```

### PATCH /api/users/:id/role
Update user role (admin only).

**Authorization:** Admin only

**Request:**
```json
{
  "role": "editor"
}
```

**Valid roles:** `admin`, `editor`, `domain_expert`, `clinician`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "editor"
}
```

An admin cannot change their own role. The last active admin cannot be demoted.

### PATCH /api/users/:id
Updates a user's `fullName` and/or `email` (admin only). Name/email validation, uniqueness, and audit logging are enforced server-side.

### POST /api/users
Create a user with a chosen role (admin only). Password minimum length 10.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass10",
  "fullName": "User Name",
  "role": "clinician"
}
```

Public `POST /api/auth/register` always creates a clinician and ignores any role field.

### PATCH /api/users/:id/status
Deactivate or reactivate (admin only). Stored status is `active` | `inactive`. Body may send `deactivated` as an alias for `inactive`. An admin cannot deactivate themselves. The last active admin cannot be deactivated. Inactive users cannot log in.

---

## Favorites and Saved Searches Endpoints

### GET /api/favorites
Get user's favorites.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "herb_id": "uuid",
      "code": "HERB_REC_0001",
      "english_name": "Heart leaved moon seed",
      "created_at": "2026-10-12T10:00:00Z"
    }
  ]
}
```

### POST /api/favorites
Add a favorite.

**Request:**
```json
{
  "herb_id": "uuid"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": "uuid",
  "herb_id": "uuid",
  "created_at": "2026-10-12T10:00:00Z"
}
```

### DELETE /api/favorites/:herb_id
Remove a favorite.

**Response:**
```json
{
  "message": "Favorite removed"
}
```

### GET /api/saved-searches
Get user's saved searches.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "name": "Tikta Herbs",
      "filters": {"rasa": ["Tikta"]},
      "created_at": "2026-10-12T10:00:00Z"
    }
  ]
}
```

### POST /api/saved-searches
Save a search.

**Request:**
```json
{
  "name": "Tikta Herbs",
  "filters": {
    "rasa": ["Tikta"]
  }
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "Tikta Herbs",
  "filters": {"rasa": ["Tikta"]},
  "created_at": "2026-10-12T10:00:00Z"
}
```

### DELETE /api/saved-searches/:id
Remove a saved search.

**Response:**
```json
{
  "message": "Saved search removed"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Herb not found"
}
```

### 400 Bad Request
```json
{
  "error": "Validation error details"
}
```

---

## Notes

- All datetime fields are in ISO 8601 format
- Herb IDs are UUIDs
- Status workflow: `draft` → `reviewed` → `verified`
- Soft delete sets status to `archived` (herb remains in database)
- Dosha effect values: `pacifies`, `increases` (frontend displays "pacifies/increases")
- Mala effect values: `increases`, `decreases` (frontend displays "increases/decreases")
