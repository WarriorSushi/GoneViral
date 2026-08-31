# Deferred product ideas

These are useful product directions, not committed launch scope. Re-evaluate
them after the current staging phase and only promote them into an
implementation phase with explicit acceptance criteria.

## 50-entry leaderboard pages

When the board has enough real listings to justify a denser view, show up to 50
ranked entries on each homepage page. Add accessible numbered pagination with
previous/next controls, a clear current-page state, and range/total copy such as
`1–50 of 2,144`.

The paginated view must preserve the existing Main/Today and category filters,
deterministic rank ordering, and correct rank numbers across page boundaries.
Implement it using the existing keyset-cursor model described in
`goneviral-specs/03_DATABASE_PAYMENTS_AND_SECURITY.md`; do not make large-board
ranking correctness depend on offset pagination.

Keep the current compact leaderboard and open-position treatment for Phase 15.
The 50-entry layout and pagination are intentionally deferred until real board
density and usage make them useful.
