# Security notes

API keys are **never** created from a request header.

Valid keys exist only if they were issued by:

1. **Google login** — `ensureUserKey()` in `index.js` after `server/auth.js` creates a user
2. **Admin mint** — `POST /api/admin/keys` with `x-admin-key`
3. **Local demo key** — printed at startup when `NODE_ENV !== 'production'`, and inserted into the store

`x-api-key: rmpr_beta_…` that is not already in Postgres is rejected with `401 { "error": "invalid_api_key" }`. Prefix matching does not mint a key.

Admin routes (`/api/admin/keys`, `/api/admin/stats`) fail closed:

- `ADMIN_KEY` unset → `503 admin disabled`
- missing or wrong header → `401 Unauthorized`
- comparison uses `crypto.timingSafeEqual` on equal-length buffers

Set `ADMIN_KEY` on the Railway **roastmypr** server service before relying on admin mint in production.
