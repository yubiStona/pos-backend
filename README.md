# Small-Mart POS — Backend

Express + TypeORM REST API (auth, products, stock, purchases, sales, reports, dashboard, settings).

## Local development
```bash
npm install
cp .env.example .env   # set FRONTEND_URL to your frontend's origin
npm run dev             # tsx watch server.ts, http://localhost:3000
npm run seed             # (optional, dev also auto-seeds on boot) admin/admin123, cashier/cashier123
```

## Production build
```bash
npm run build   # bundles server.ts -> dist/server.cjs
npm start        # node dist/server.cjs
```

## Database — IMPORTANT before deploying
By default this uses `sql.js` (SQLite) writing to a local file (`DB_DATABASE`). That file lives on
local/ephemeral disk. On serverless platforms (Vercel Functions) or most free container hosts, the
filesystem is wiped on every redeploy/cold start/restart — you WILL lose data. For any real deployment:
- Provision a free MySQL instance (Railway, Aiven, Clever Cloud, etc.) or swap in Postgres, and
- Set `DB_TYPE=mysql` (+ `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`) in your env.
`mysql2` is already included as a dependency for this.

## Deploy (Render, free tier — recommended over Vercel for this backend)
1. Push this folder to its own GitHub repo.
2. Render → New → Web Service → connect the repo.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add env vars: `NODE_ENV=production`, `FRONTEND_URL=https://<your-vercel-frontend>.vercel.app`,
   `JWT_SECRET=<something random>`, and DB_* vars pointing at a real MySQL instance.
