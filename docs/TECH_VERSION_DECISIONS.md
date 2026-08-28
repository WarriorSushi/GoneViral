# Technical version decisions

**Verified:** 2026-08-28  
**Phase:** 2 — database foundation (the Phase 0 dependency selection remains recorded below)

All runtime and package versions are exact in `package.json`; the lockfile is the installation authority. Versions were queried from the npm registry on the verification date and checked against the official compatibility/release documentation below.

## Selected versions

| Component                     |        Exact version | Evidence and decision                                                                                                                                                               |
| ----------------------------- | -------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                       |            `24.20.0` | Current Node 24 LTS patch on the [official release table](https://nodejs.org/en/about/previous-releases). `.node-version` pins it.                                                  |
| pnpm                          |            `11.24.0` | Current npm registry release; pinned by `packageManager` and `engines`.                                                                                                             |
| Next.js                       |             `16.3.3` | Current Active LTS security patch. The [August 2026 security release](https://nextjs.org/blog/august-2026-security-release) requires 16.3.3.                                        |
| React / React DOM             |             `19.2.8` | Current React 19.2 patch, compatible with Next.js 16; [React 19.2 release line](https://react.dev/versions).                                                                        |
| TypeScript                    |              `6.0.3` | Newest release compatible with Next.js 16.3.3's current `typescript-eslint` peer range (`>=4.8.4 <6.1.0`). TypeScript 7.0.2 was rejected after peer verification.                   |
| Tailwind CSS / PostCSS plugin |              `4.3.3` | Current v4 packages; uses the official [`@tailwindcss/postcss` integration](https://tailwindcss.com/docs/upgrade-guide) and `@import "tailwindcss"`.                                |
| Zod                           |              `4.4.3` | Current stable runtime validation package.                                                                                                                                          |
| Drizzle ORM / Kit             | `0.45.2` / `0.31.10` | Current stable packages; implementation is deferred to Phase 2.                                                                                                                     |
| postgres.js                   |              `3.4.9` | Current stable driver; runtime use is deferred to Phase 2.                                                                                                                          |
| Supabase JS / SSR             | `2.112.4` / `0.12.5` | Current stable packages; auth clients and Proxy are deferred to Phase 6.                                                                                                            |
| Vitest / coverage             |             `4.1.11` | Current stable test runner and matching V8 provider.                                                                                                                                |
| Playwright                    |             `1.62.1` | Current stable browser-test package.                                                                                                                                                |
| Sentry Next.js                |            `10.71.0` | Current SDK pinned now; DSN/configuration and PII review remain Phase 13 work.                                                                                                      |
| ESLint / Next config          |  `9.39.5` / `16.3.3` | Newest pair satisfying the current Next lint plugin peer ranges. ESLint 10.9.1 was rejected after peer verification. Next.js 16 removed `next lint`, so CI invokes ESLint directly. |
| Prettier / Tailwind plugin    |    `3.9.6` / `0.8.1` | Current stable formatter packages.                                                                                                                                                  |

`drizzle-kit@0.31.10` currently reaches an old esbuild through its deprecated `@esbuild-kit` loader chain. `pnpm-workspace.yaml` narrowly overrides esbuild versions `<=0.24.2` to patched `0.25.12`, eliminating GHSA-67mh-4wv8-2f99 without changing Drizzle's public API. The full test/build suite verifies the override.

## Verified framework and platform rules

### Next.js 16

- `proxy.ts` replaces `middleware.ts`; it may live at the repository root or alongside `src/app`, and it is not a full authorization layer. GoneViral will add it with Supabase SSR in Phase 6, not as an empty Phase 0 pass-through. See the [Proxy guide](https://nextjs.org/docs/app/getting-started/proxy).
- `cookies()`, `headers()`, `draftMode()`, `params` and page `searchParams` are asynchronous-only in Next.js 16. See the [v16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16).
- Cache Components are opt-in with `cacheComponents: true`. Cached functions/components use `'use cache'`, `cacheLife` and `cacheTag`; `revalidateTag(tag, "max")` supplies stale-while-revalidate semantics, while `updateTag` is Server-Action-only for read-your-writes. See [Cache Components](https://nextjs.org/docs/app/getting-started/partial-prerendering) and [Revalidating](https://nextjs.org/docs/app/getting-started/revalidating).
- Database, payment, email and image-processing code will use the default Node.js runtime. Cache Components also require Node.js. Financial code will not opt into Edge.
- `instrumentation.ts` may export `register` and `onRequestError`; `NEXT_RUNTIME` selects runtime-specific initialization. The Phase 0 implementation logs only redacted, non-request-detail events. See the [instrumentation convention](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation).

### Tailwind CSS 4

- The PostCSS plugin is a separate `@tailwindcss/postcss` package.
- CSS uses `@import "tailwindcss"`; v3 `@tailwind` directives are removed.
- Tailwind v4 targets modern browsers (Chrome 111+, Safari 16.4+, Firefox 128+). See [Tailwind compatibility](https://tailwindcss.com/docs/compatibility).

### Drizzle, postgres.js and Supabase connections

- Drizzle supports an existing postgres.js client. postgres.js prepares statements by default; GoneViral will create the Phase 2 Supavisor transaction-pool client with `prepare: false`. See [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql).
- Drizzle Kit generates reviewed SQL with `drizzle-kit generate`. Starting in Phase 2, committed Supabase migrations are the single apply/history authority; `drizzle-kit migrate` is intentionally not used. See [Drizzle migrations](https://orm.drizzle.team/docs/migrations).
- Supabase recommends transaction-mode pooling for serverless/temporary clients and direct connections for migrations. Transaction mode does not support prepared statements. See [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
- The 2026 Supabase changelog was checked for breaking changes. New tables are no longer automatically exposed to the Data API by default; GoneViral still keeps domain tables in unexposed `app`/`private` schemas and grants no browser CRUD. See the [Supabase changelog](https://supabase.com/changelog).

### Supabase SSR Auth and keys

- Current SSR uses `@supabase/ssr`, `createServerClient`, bulk cookie `getAll`/`setAll`, PKCE cookies and a Next.js `proxy.ts` refresh path. Implementation belongs to Phase 6. See [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Browser code receives only the project URL and publishable key. `sb_secret_...` keys are server-only, bypass RLS through the service role and must never use a `NEXT_PUBLIC_` name. Legacy `anon`/`service_role` JWT keys are compatibility terminology. See [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

### Testing and Sentry

- Vitest 4 requires Node 20+ and Vite 6+; the standalone `vitest.config.ts` uses Node environment for Phase 0 unit tests. Async Server Components will be exercised through browser tests rather than shallow unit rendering. See [Vitest migration guidance](https://vitest.dev/guide/migration) and [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing).
- Playwright browser tests should run against the production build; its `webServer` support starts `next start`. See the [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright).
- `@sentry/nextjs` is pinned, but no DSN, source-map upload token or telemetry initialization is fabricated in Phase 0. Full server/client setup, `instrumentation-client.ts`, source maps and PII scrubbing are Phase 13 gates. See the [Sentry Next.js guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/).

### Vercel region

`vercel.json` sets the single default function region to Mumbai (`bom1`). Static assets remain global. Per-function overrides are available later if measured need appears. See [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json#regions).

## Deferred external evidence

There is no Supabase project, database, Vercel deployment, payment-provider account, email domain, legal approval or production credential. Their runtime behaviour cannot be tested in Phase 0 and is not claimed here.

## Phase 2 database verification

Phase 2 was exercised locally with Supabase CLI `2.116.0`, its PostgreSQL `17.6.1.165` image, Docker Desktop's Linux engine, Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, and postgres.js `3.4.9`.

- Runtime queries use a Supavisor transaction-pool connection with postgres.js `prepare: false`; migration and administrative checks use a separate direct connection.
- postgres.js's explicit `postgres.BigInt` mapping preserves 64-bit SQL integers as JavaScript `bigint` rather than strings.
- The Supabase Data API allowlist contains only `public` and `graphql_public`; `app` and `private` are verified as unreachable through real local Data API requests.
- Supabase database lint and all database advisors are required to pass after a clean reset.
- No hosted Supabase project, dedicated hosted login, production credential, or production behaviour is represented as verified.
