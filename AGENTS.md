<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Active Phase 15 staging continuation

While Phase 15 private staging remains in progress on
`codex/phase-15-staging`, read
`docs/PHASE_15_STAGING_CURRENT_STATE.md` before repeating certification or
asking the owner to repeat manual provider/browser work. That file is a
sanitized operational checkpoint, not a replacement for the authoritative
specifications or runbooks. Update it after material external-state changes.
Never store secret values, credentials, magic links, MFA material, webhook
bodies, payment-card data, or backup passphrases in it.

## Interactive terminal boundary on this Windows host

Codex cannot expose an interactive terminal prompt that the owner can reliably
use. Never launch a command that requires the owner to type a passphrase,
credential, MFA value, destructive confirmation, or other interactive input.
Instead, stop immediately before that command, give the owner the exact
PowerShell command to run in their own terminal, and wait for their sanitized
result. Never ask the owner to paste a secret into chat. Codex may continue to
run authorized non-interactive commands and checks normally.

## Phase boundaries and handoff

After completing and committing any implementation-plan phase, stop before the
next phase. Use a fresh task for the next phase unless the user explicitly asks
to continue in the current task. End the completion report with a compact,
delta-only prompt that the user can paste into the fresh task. The prompt must
state:

- what phase and commit were completed;
- what was implemented and verified;
- the exact next-phase scope and explicit out-of-scope boundary;
- the authoritative specification documents and authority order;
- unresolved risks, credentials, approvals, infrastructure, or human gates;
- required commands, tests, visual checks, commit boundary, and reporting rules;
- that no production credentials, approvals, public activity, or test results may
  be fabricated.

Point to committed specifications, runbooks, and evidence by path instead of
copying their contents into the handoff. Do not repeat repository invariants,
acceptance criteria, command matrices, or provider instructions that the next
task can read from those authoritative files. Inline only new external state,
owner decisions, unresolved gates, and facts that are not recorded safely in the
repository.

Apply this convention starting with the Phase 2 handoff after Phase 1. Do not
begin the next phase in the same task unless the user explicitly asks.

## Efficient execution without lowering quality

- Preserve scope, model/reasoning setting, security review, test coverage, and
  acceptance criteria. Never save usage by skipping work or weakening a gate.
- Verify the baseline once, then map the exact specification sections, code,
  tests, and commands needed. Search headings and symbols first; read full files
  when required. Do not reread unchanged material without a new ambiguity or
  failure.
- Batch independent read-only inspections and checks, preferably in parallel.
  Keep calls separate when a result changes the next decision, approval is
  required, or external state changes.
- Use bounded output: `rg`, targeted ranges, summaries, failure excerpts,
  `git diff --stat`, and targeted diffs. Inspect the complete diff once before
  commit. Keep verbose successful logs in ignored artifacts when useful.
- Run focused affected tests while editing. Run each mandated full baseline or
  final suite at its boundary, not after every edit. After failure, rerun the
  affected check first and then the required final suite.
- Reuse helpers, fixtures, adapters, and docs. Avoid duplicate investigations.
  Use subagents only when the user or an applicable skill explicitly requests
  them, with independent scopes and minimum context.
- In a long phase, checkpoint after each coherent workstream or provider. If the
  task compacts while substantial work remains, stop at the next safe checkpoint
  with a delta-only continuation prompt unless the user explicitly prioritizes
  uninterrupted execution.
- Handle one external provider and approval boundary at a time; do not recheck
  settled state unless it may have changed or the current gate requires it.
