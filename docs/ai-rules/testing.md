# Global Testing Standards

Repository-specific test conventions and commands take precedence.

- Test behavior that matters to users or system contracts.
- Keep tests deterministic and readable.
- For changed behavior, add or update relevant tests.
- For bug fixes, add a regression test first when practical.
- Use unit tests for business rules, validation, transformations, edge cases, and
  deterministic utilities.
- Use integration tests for real application boundaries such as persistence, routing,
  serialization, queues, and filesystem behavior.
- For APIs, cover valid input, invalid input, auth, authorization, not-found,
  conflicts, idempotency, upstream failures, and retry behavior as relevant.
- For UI, cover critical user flows and meaningful loading, success, empty, error,
  pending, responsive, keyboard, and focus states.
- Control clocks, randomness, UUIDs, network responses, and other nondeterminism when
  needed to avoid flaky tests.
- Never use sensitive production data as test fixtures.
- Never claim tests passed unless they were actually run.
- If only a subset was run, name that subset.
