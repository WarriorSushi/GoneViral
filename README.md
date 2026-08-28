# GoneViral.in

GoneViral.in is a paid public sponsored leaderboard for the Indian internet. The repository is currently complete through **Phase 0 only**: reproducible engineering foundation and guardrails. Ranking, database, payment, ownership and moderation behaviour have not been implemented yet.

The authoritative specification pack starts at [`goneviral-specs/README_FOR_CODEX.md`](./goneviral-specs/README_FOR_CODEX.md). `00_DECISIONS_AND_PRODUCT_RULES.md` is canonical product law.

## Local prerequisites

- Node.js `24.20.0` (see `.node-version`)
- Corepack enabled
- pnpm `11.24.0` (pinned by `packageManager`)

```powershell
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` only when a later phase needs local integration values. Phase 0 does not require Supabase, Cashfree, Resend, Turnstile, Sentry or Vercel credentials.

## Commands

```powershell
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The local app is available at `http://localhost:3000`. No production integration is represented as configured or approved.

## Current external gates

- No Supabase development or production project exists yet.
- No Vercel project/deployment exists yet.
- Cashfree is a conditional candidate only; no merchant approval or credentials are assumed.
- Legal, privacy, refund and accounting launch approvals remain open.
