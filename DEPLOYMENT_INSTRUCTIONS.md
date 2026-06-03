# Indonesian Paper Corrector — Deployment Instructions

## Deploying to Cloudflare Pages

The frontend is hosted on **Cloudflare Pages**, the backend is hosted on
**Render** (Express). The two are connected by direct cross-origin calls;
there is no Cloudflare-side rewrite or proxy.

### 1. Cloudflare Pages project

- Cloudflare project name: **`eyd-paper-corrector`**
- Production URL: `https://eyd-paper-corrector.pages.dev` (or your custom
  domain, if configured under **Workers & Pages → eyd-paper-corrector →
  Custom domains**)
- GitHub repo: `rein3400/eyd`
- Production branch: `main` (auto-deploy on push)

### 2. Build settings

Set in **Workers & Pages → eyd-paper-corrector → Settings → Builds**:

- **Framework preset**: None (or Create React App)
- **Build command**: `npm install --prefix client && npm run build --prefix client`
- **Build output directory**: `client/build`
- **Root directory**: `/` (leave empty)
- **Node version**: 20 (or 18) — set via `NODE_VERSION=20` in the same panel
  if it isn't already the default.

### 3. Environment variables

In **Workers & Pages → eyd-paper-corrector → Settings → Environment
variables**, set the following for both **Production** and **Preview**:

| Key | Value | Notes |
|---|---|---|
| `REACT_APP_API_URL` | `https://eyd-jasa.onrender.com` | API **origin only** — do **not** include `/api` or a trailing slash. The source code appends `/api/...` for each endpoint. |
| `REACT_APP_GOOGLE_CLIENT_ID` | `<your-id>.apps.googleusercontent.com` | Get this from Google Cloud Console → APIs & Services → Credentials. |

CRA inlines these values at **build time** — a change here does **not**
auto-trigger a rebuild. You must push a new commit (or manually retrigger a
deploy from the dashboard) to pick up the new env var.

### 4. Custom domain (optional)

1. **Workers & Pages → eyd-paper-corrector → Custom domains → Set up a
   custom domain**.
2. Add the domain Cloudflare shows under your DNS to point at the project.
3. Cloudflare will issue a free TLS certificate automatically.

### 5. Manual redeploy (fallback)

If auto-deploy is broken (or you just changed an env var and want to
rebuild without a code change):

1. **Workers & Pages → eyd-paper-corrector → Deployments**.
2. Find the most recent deployment, click the `…` menu, **Retry
   deployment**. Or click **Create deployment** and pick the latest commit.

### 6. CORS

The Express backend on Render has `cors()` wide-open
(`server/server.js` line 47), so the CF Pages site can call Render
directly without any CF rewrites, no CF Worker, and no `_headers` file.

### 7. Post-deployment

- Visit `https://eyd-paper-corrector.pages.dev`.
- Upload a small DOCX. In DevTools → Network, confirm the request URL is
  `POST https://eyd-jasa.onrender.com/api/upload` (a **single** `/api` —
  not `/api/api/...`).
- If you see `/api/api/...` anywhere, the env var still has the
  `/api` suffix; fix it in the CF Pages dashboard and redeploy.

## Backend (Render)

The Express server is deployed separately. After CF Pages is up:

1. **render.com** → your service (`eyd-jasa`).
2. **Environment** tab → add `MINIMAX_API_KEY=<your-key>`.
3. **Settings → Build & Deploy**:
   - **Root Directory**: leave empty (or `server`, depending on your setup).
   - **Build Command**: `npm install` (the `postinstall` hook in
     root `package.json` will install sub-deps if you use the root).
   - **Start Command**: `node server/server.js`.
4. The service URL becomes the `REACT_APP_API_URL` origin set in step 3
   above (no `/api` suffix).

## Notes

- **API key rotation**: `MINIMAX_API_KEY` belongs on Render only. Never
  set it in Cloudflare Pages (it would be bundled into the static site
  and become public).
- **Free-tier limits**: Cloudflare Pages has no bandwidth cap on the
  free plan; Render's free web service spins down after 15 minutes of
  idle, so the first request after a quiet period can take 20–30 s for
  a cold start. Subsequent requests are fast.
- **Google OAuth origins**: in Google Cloud Console → APIs & Services →
  Credentials → your OAuth client ID, add
  `https://<your-pages-domain>.pages.dev` (and any custom domain) to
  **Authorized JavaScript origins**.
