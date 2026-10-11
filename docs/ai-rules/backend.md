# Global Backend Standards

Repository framework and architecture conventions take precedence.

- Keep transport parsing, authentication, authorization, validation, business logic,
  persistence, external integrations, and serialization separated when practical.
- Do not let routes/controllers become large business-logic containers.
- Use appropriate methods, status codes, content types, validation, and error shapes.
- Validate all client, webhook, file, message, and third-party input.
- Use parameterized queries or safe ORM/query-builder APIs.
- Avoid N+1 queries and unbounded reads.
- Use transactions when mutations must succeed or fail together.
- Do not keep database transactions open across slow external calls unless required.
- Use the repository's migration mechanism and consider existing data, deployment
  ordering, compatibility, large-table impact, and recovery.
- Design retryable workflows for idempotency where practical.
- Use sensible timeouts, bounded retries, backoff, and rate-limit handling.
- Assume webhook delivery may be duplicated or retried.
- Scheduled/background jobs must account for duplicate execution, overlap, missed
  runs, partial completion, pagination, checkpoints, and retries.
- Never assume collection APIs return all records in one response.
- Preserve stable source/destination identifiers and enough state for reconciliation.
