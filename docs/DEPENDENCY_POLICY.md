# Dependency policy

- Add a package only for a concrete requirement in the authoritative implementation plan.
- Pin every direct dependency to an exact version and commit `pnpm-lock.yaml`.
- Use Node and pnpm versions pinned by `.node-version`, `packageManager` and `engines`.
- Review official release notes, security advisories, peer requirements, license and bundle/runtime impact before updates.
- Apply patch/minor updates through a dedicated reviewed change with `format:check`, `lint`, `typecheck`, `test`, `build`, browser smoke and dependency-audit evidence. CI keeps `pnpm audit --audit-level=moderate` as the primary gate and runs a pinned OSV-Scanner scan of the committed `pnpm-lock.yaml` only when npm's audit service has an explicit availability failure. Findings remain blocking; an unrecognized audit failure fails closed.
- Major updates require an explicit architecture/phase decision and migration notes; never let an automated update silently cross a major boundary.
- GitHub Actions are pinned to immutable commit SHAs with the release version recorded in comments.
- Dependency install scripts fail closed under pnpm's `strictDepBuilds`; only reviewed packages in `pnpm-workspace.yaml#allowBuilds` may execute them.
- Dependabot opens weekly grouped proposals; it does not merge or deploy them automatically.
- Do not run broad audit auto-fixes that can change major versions or product behaviour.
