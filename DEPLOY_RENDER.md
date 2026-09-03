# Deploying KrishiConnect to Render

Two free Render web services, defined in `render.yaml` (Render Blueprint):

| Service | Runtime | What it does |
|---|---|---|
| `krishiconnect-api` | Python | FastAPI + SQLite. **Re-seeds the DB at every boot**, so the golden demo window (HOLD 5 days @ Aurangabad, ₹4,694/qtl) is always anchored to "today". |
| `krishiconnect-web` | Node | Next.js (production build). Calls the API directly via `NEXT_PUBLIC_API_URL`. |

## Step-by-step

1. **Push this folder to a GitHub repo** (the zip root *is* the repo root —
   `backend/`, `frontend/`, `docs/`, `render.yaml` at top level):
   ```bash
   git init && git add . && git commit -m "KrishiConnect prototype"
   git remote add origin https://github.com/<you>/krishiconnect.git
   git push -u origin main
   ```
   (Do NOT commit `frontend/node_modules` or `frontend/.next` — see `.gitignore`.)

2. **Render → New + → Blueprint** → select the repo. Render detects `render.yaml`
   and shows the two services.

3. When prompted for **`NEXT_PUBLIC_API_URL`** (krishiconnect-web), enter the API
   service URL — with the default names above that is:
   ```
   https://krishiconnect-api.onrender.com
   ```
   (If Render suffixes your service name, adjust accordingly — the API's URL is
   shown on its service page. Note: NO trailing slash, NO `/api` suffix.)

4. **Create Resources.** First deploys take a few minutes. Check
   `https://<api-url>/health` → `{"ok":true}` and the API's `/docs` for Swagger.

5. **If you got the URL wrong**, fix it after the fact: krishiconnect-web →
   Environment → edit `NEXT_PUBLIC_API_URL` → then **Manual Deploy →
   "Clear build cache & deploy"** (it is a *build-time* variable — a plain
   restart is not enough).

## Free-tier reality checks (read before the demo)

- **Cold starts:** free services sleep after ~15 min idle and take ~1 min to
  wake. The API adds ~10–15 s because it re-seeds SQLite at boot. Open both
  services a few minutes before judging.
- **Ephemeral disk:** anything created in the demo (lots, offers, grievances)
  is lost on wake/redeploy. By design the boot-seed re-anchors the golden
  window to the current date, which keeps the frozen demo script working at
  all times. If you want persistence instead, attach a paid Render Disk to the
  API service and remove the seed command from `startCommand`.
- **Timezone:** Render servers run UTC. The golden window anchors to the
  server's date; between 00:00–05:30 IST the laptop's "today" may be one day
  ahead of the anchor — analysis still works (the panel extends +60 days),
  only the "harvested today" label can differ. For a spotless demo, trigger a
  manual deploy (or restart) after 05:30 IST on demo day.
- **OTP** is still the demo `1234`; one-click demo logins work as usual.

## Local development is unchanged

`NEXT_PUBLIC_API_URL` unset → the frontend uses the same-origin `/api` proxy to
`127.0.0.1:8000` exactly as before (`uvicorn main:app` + `npm run dev`).
