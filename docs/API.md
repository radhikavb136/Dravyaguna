# Dravyaguna API Documentation

## Base URL
```
http://localhost:4000
```

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
    "role": "clinician"
  },
  "token": "jwt_token_here"
}
```

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
  "rasa": ["Tikta"],
  "guna": ["Laghu"],
  "virya": "Ushna",
  "vipaka": "Madhura",
  "karma": ["Deepana"],
  "indications": ["agnimandya"],
  "dhatu": [
    {"dhatu": "Rasa", "score": 5}
  ],
  "mala": [
    {"mala": "Purisha", "effect": "decreases"}
  ],
  "srotas": ["Rasavaha"],
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
    "rasa": ["Tikta"],
    "guna": ["Laghu"],
    "karma": ["Deepana"],
    "indication": ["agnimandya"],
    "virya": ["Ushna"],
    "vipaka": ["Madhura"],
    "dhatu": ["Rasa"],
    "mala": ["Purisha · decreases"],
    "srotas": ["Rasavaha"],
    "avayava": [],
    "dosha": ["Vata · pacifies"],
    "prabhava": ["substring"]
  },
  "lang": "en-IN",
  "limit": 50,
  "offset": 0
}
```

**Filter Format:**
- Dosha: `"Dosha · effect"` where effect is `pacifies` or `increases`
- Mala: `"Mala · effect"` where effect is `increases` or `decreases`

**Response:**
```json
{
  "lang": "en-IN",
  "results": [
    {
      "id": "uuid",
      "code": "HERB_REC_0001",
      "english_name": "Heart leaved moon seed",
      "botanical_name": "Cardiospermum halicacabum",
      "part_used": "Seed",
      "prabhava": "Specific action",
      "status": "reviewed",
      "image_url": "https://example.com/image.jpg",
      "match_percentage": 100.0,
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
