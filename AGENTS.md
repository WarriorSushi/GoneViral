<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Phase completion handoff

After completing and committing any implementation-plan phase, stop before the
next phase and end the completion report with a self-contained prompt that the
user can paste into a new chat to begin the next phase. The prompt must state:

- what phase and commit were completed;
- what was implemented and verified;
- the exact next-phase scope and explicit out-of-scope boundary;
- the authoritative specification documents and authority order;
- unresolved risks, credentials, approvals, infrastructure, or human gates;
- required commands, tests, visual checks, commit boundary, and reporting rules;
- that no production credentials, approvals, public activity, or test results may
  be fabricated.

Apply this convention starting with the Phase 2 handoff after Phase 1. Do not
begin the next phase in the same task unless the user explicitly asks.
