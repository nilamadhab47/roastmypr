# Contributing to RoastMyPR 🔥

Thanks for wanting to help! RoastMyPR roasts pull requests, so yes, your PR will
probably get roasted too. Lovingly. It's tradition.

## How the roast works (30 seconds)

1. The extension grabs the PR diff.
2. Claude writes a short roast + archetype + GIF ideas.
3. **Jev** (a separate model from TypeSafe) checks every roast against the real diff
   before it ships: roast the code not the person, no invented files, safe to post,
   a punchline not a linter essay. That's why the jokes stay funny *and* on point.
4. Giphy brings the reaction GIF.

## Run it locally

- Postgres: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`
- `cd server && cp .env.example .env`
  - set `DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres`
  - set `ROASTMYPR_MOCK=1` so you can roast without Anthropic or Giphy keys
  - leave `TYPESAFE_API_KEY` empty, Jev politely sits this one out (fail-open)
- `npm install && npm run dev` and copy the **demo key** it prints
  (that key is inserted into the store; inventing `rmpr_beta_…` headers will 401)
- `npm test` in `server/` (`node --test`)
- Chrome → `chrome://extensions` → Developer mode → Load unpacked → **repo root**
- Options → paste the demo key
- For a **local API**, set **API URL (advanced)** to `http://localhost:3002` (or whatever `PORT` is). The shipped `manifest.json` does **not** include localhost (Chrome Web Store review). Use `manifest.dev.json` while developing: copy its extra `host_permissions` into your local `manifest.json`, then **do not commit that**. Reload the extension.

Open any GitHub PR → Roast tab on the right.

## Picking an issue

- Look for `good first issue` / `help wanted`.
- Comment with a 2–3 line plan. That's your claim. One issue at a time, please.
- No PR within 7 days? The issue goes back in the pool. No hard feelings.
- "Can I work on this?" with no plan = not a claim. Bots, we see you. 👀

## PR checklist

- Small and focused. One idea per PR.
- `cd server && npm test` passes.
- UI change? Before/after screenshot or a 10-sec clip.
- Roast/archetype/GIF change? Paste one real public PR + the roast you got.
- Roast the code, not the person.
- No secrets. Never commit `.env` or keys.

## House rules

- Roast the code, never the person. In the product and in reviews.
- Never commit `.env` or keys.
- Be kind. The roasting is for the code; humans get hugs.

## License

By contributing, you agree your work is released under the MIT License.
