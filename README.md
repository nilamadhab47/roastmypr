# RoastMyPR

A Chrome extension that **roasts GitHub pull requests**.

Website: [https://roastmypr.xyz](https://roastmypr.xyz)

It is not a code-review bot. Reviewers already exist. RoastMyPR sits on the PR page, reads the diff, and delivers short, savage one-liners — then **[Jev](https://typesafe.ai)** scores the joke against the actual diff before you insert it on GitHub.

---

## What it does

On any GitHub pull request, a **Roast** tab appears on the right edge of the page. Open it and you get:

- **A roast, not a review** — punchy one-liners about the actual diff (bugs get hinted, not explained)
- **Jev-checked** — TypeSafe’s decision model scores the roast before it hits GitHub
- **Roast level** from 1 (light teasing) to 5 (career-reevaluation energy)
- **Another roast** and **Make it meaner** for the same PR
- **PR archetypes** like *The 2am Hotfix*, *The Copy-Paste Special*, *The Kitchen Sink*
- **Chaos score** — entertainment, not a quality metric
- **GIFs** that match the vibe, plus a search box if the suggestions miss
- **One-click insert** into GitHub’s comment box

The extension talks to a small Node API that calls [Claude](https://www.anthropic.com/) for the roast and [Giphy](https://giphy.com/) for reactions. Users never need their own Anthropic or Giphy keys — they use a RoastMyPR API key.

---

## Repo layout

```
roastmypr/
├── manifest.json      Chrome extension (Manifest V3)
├── content.js         Injected on github.com — hinge, drawer, roast UI
├── background.js      Service worker — API calls, GIF proxy, PR diff fetch
├── popup.html/.js     Toolbar popup (usage + open panel)
├── options.html/.js   Settings (paste API key)
├── content.css        Drawer styles (also inlined in content.js) 
```

---

## How it works

```
GitHub PR page
    │  content script (Shadow DOM drawer)
    ▼
background service worker
    │  host_permissions (github.com, giphy, API)
    ▼
RoastMyPR API  ──►  Claude (roast JSON)
               ──►  Jev (quality gate, fail-open)
               ──►  Giphy  (reaction GIFs)  
```

The content script never calls Claude or Giphy directly. GitHub’s CSP would block it. The background worker fetches the `.diff`, posts it to `/api/review`, then proxies GIF thumbnails as data URLs so they render inside the panel.

After Claude writes the roast, [Jev](https://typesafe.ai) scores that GitHub comment in one extra API call: is it a light review (clocks the obvious, stays a roast, safe to post)? Missing `TYPESAFE_API_KEY` or Jev downtime fails open — Insert still works. Hard misses retry Claude once. The panel shows **Jev · checked**; results also land on `roast.jev_gate`.

---

## Local setup

### 1. API server

```bash
cd server
cp .env.example .env   # add ANTHROPIC_API_KEY, GIPHY_API_KEY, optional TYPESAFE_API_KEY
npm install
npm run dev
```

On first start in development, the server prints a **demo API key** (`rmpr_beta_…`). Copy that.

Admin endpoints (optional):

```bash
# mint a key
curl -X POST http://localhost:3000/api/admin/keys \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier":"beta"}'
```

### 2. Point the extension at local (or production)

In `background.js`:

```js
const API_BASE_URL = 'http://localhost:3000';
// production: 'https://roastmypr-production.up.railway.app'
```

`manifest.json` already allows both localhost and the Railway host.

### 3. Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this repo root (not `server/`)
4. Open the extension **Options** page and paste your API key
5. Open any GitHub PR — the Roast tab is on the right edge

After code changes, click **Reload** on the extension card, then hard-refresh the PR page (`Cmd+Shift+R`).

---

## API (server)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | — | Uptime check |
| `GET` | `/api/validate` | `x-api-key` | Validate a user key |
| `GET` | `/api/user` | `x-api-key` | Tier + remaining quota |
| `POST` | `/api/review` | `x-api-key` | Roast a PR diff |
| `POST` | `/api/gifs` | `x-api-key` | Search Giphy by query list |
| `POST` | `/api/admin/keys` | `x-admin-key` | Mint keys |
| `GET` | `/api/admin/stats` | `x-admin-key` | Usage stats |

Free beta: **100 calls / hour** per key. Rate limits live in memory (swap for a database before you rely on this in production).

Production server: [roastmypr-production.up.railway.app](https://roastmypr-production.up.railway.app)

---

## Environment

See `server/.env.example`:

| Variable | Required | What it is |
|----------|----------|------------|
| `ANTHROPIC_API_KEY` | yes | Server-side Claude key (never shipped to the browser) |
| `GIPHY_API_KEY` | for GIFs | Server-side Giphy key |
| `ADMIN_KEY` | for admin routes | Secret to mint keys / read stats |
| `PORT` | no | Defaults to `3000` |
| `NODE_ENV` | no | `development` prints a demo key |
| `TYPESAFE_API_KEY` | for Jev | TypeSafe Jev quality gate |
| `DATABASE_URL` | yes | Railway Postgres connection string |

Do not commit `.env`.

---

## Product notes

- **Roast, then a light GitHub review.** The punchline is the review. If something is obvious (huge diff, leftover `console.log`, empty description), hint at it. Don’t write a patch or a bug list.
- **GIFs should feel like a reviewer reacting** to *this* PR, with at least one coding / merge-related search term.
- Users can search their own GIFs if the suggestions miss.
- Never punch down. Roast the code, not the person.

---

## Chrome Web Store

Not required to ship: a landing page or a custom domain.

Required: a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) ($5), listing screenshots, and a **privacy policy URL** (the extension reads PR diffs and calls the API).

Zip only the extension files — leave out `server/`, `node_modules/`, and `.env`:

```bash
zip -r roastmypr-extension.zip \
  manifest.json background.js content.js content.css \
  popup.html popup.js options.html options.js icons/
```

---

## License

MIT
