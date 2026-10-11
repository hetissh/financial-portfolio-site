# Global Engineering Standards

These are shared defaults for all repositories. Repository-specific instructions,
architecture, and coding standards override these rules when they are explicit.

## Core principles

- Inspect before editing.
- Understand existing behavior before changing it.
- Make the smallest correct change.
- Preserve unrelated behavior.
- Prefer simple, explicit, maintainable solutions.
- Follow existing architecture and framework conventions.
- Do not rewrite working code merely because a rewrite is easier.
- Do not invent files, commands, APIs, schemas, dependencies, or configuration.
- Search for existing implementations before creating new ones.

## Scope discipline

Do not perform unrelated refactors, renames, formatting sweeps, dependency upgrades,
architecture changes, or file moves. Separate behavior changes from structural
cleanup when practical.

## Structure

Prefer meaningful boundaries based on domain, feature, or responsibility. Avoid
catch-all directories that become dumping grounds. Keep source, generated output,
configuration, tests, scripts, and documentation clearly separated when the
framework permits it. Do not reorganize a repository simply to match a preferred
template.

## Functions and modules

- Keep functions focused.
- Avoid hidden side effects.
- Prefer explicit inputs and outputs.
- Reduce deep nesting with guard clauses when this improves readability.
- Group related parameters in typed objects/structs/dataclasses when appropriate.
- Avoid ambiguous boolean flag parameters.
- Split files when they contain genuinely separate responsibilities, not merely
  because they exceed an arbitrary line count.

## Duplication and abstraction

Do not duplicate business rules. Extract shared logic when callers genuinely share
the same concept. Do not create abstractions merely because two blocks happen to look
similar. Avoid premature generalization.

## Errors and observability

- Never silently swallow meaningful failures.
- Catch only errors that can be handled meaningfully.
- Preserve original causes when wrapping errors.
- Use specific/domain errors when they improve handling.
- Do not expose secrets or sensitive internal details in user-facing errors.
- Logs should identify the operation, safe record identifiers, outcome, reason for
  failure, and useful timing information.
- Never log credentials, secret tokens, private keys, or unnecessary sensitive data.

## External systems

Assume external systems can time out, rate-limit, return malformed responses, retry
events, deliver duplicates, or partially fail. Where relevant, design for stable
identifiers, idempotency, bounded retries, backoff, timeouts, pagination,
reconciliation, and traceability.

## Compatibility and performance

Respect declared runtime/platform targets and do not silently raise minimum versions.
Identify consumers before changing public interfaces. Measure before optimizing and
watch for N+1 queries, duplicate network calls, unbounded reads, unnecessary
rerenders, and repeated expensive work.

## Repository documentation bootstrap and tracking

Every repository must maintain current architecture and coding-standard
documentation.

Before creating new documentation, search for an existing equivalent. Equivalent
architecture docs may include `docs/architecture.md`, `docs/ARCHITECTURE.md`,
`ARCHITECTURE.md`, ADR documentation, or an established architecture section in
project docs. Equivalent coding-standard docs may include `docs/coding-standards.md`,
`docs/CODING_STANDARDS.md`, `STYLE_GUIDE.md`, or an established relevant section in
`CONTRIBUTING.md`.

If no equivalent exists, create:

- `docs/architecture.md`
- `docs/coding-standards.md`

Do not create duplicate documentation merely because an equivalent file uses a
different name.

Keep these documents synchronized with the repository. Update architecture docs when
a verified change affects components, boundaries, data flow, integrations,
persistence, deployment, source-of-truth ownership, or failure/retry/idempotency
behavior. Update coding standards when a verified change affects tooling, runtime
versions, naming or organization conventions, dependency policy, verification
commands, or project-specific deviations.

Do not rewrite these documents on every task. Update them only when new verified
information or a real project change makes them incomplete or incorrect. Never invent
architecture or conventions just to fill a template.
