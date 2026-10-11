# Global TypeScript and JavaScript Standards

Repository tooling, runtime targets, and framework conventions take precedence.

- Use `const` by default, `let` only when reassignment is required, and avoid `var`.
- Use strict equality and syntax supported by declared runtime targets.
- Prefer optional chaining and nullish coalescing when semantically correct.
- Prefer explicit domain types and avoid `any` unless there is a documented
  interoperability reason.
- For unknown external values, prefer `unknown`, then validate or narrow.
- Use unions, generics, branded types, and discriminated unions only when they improve
  clarity or correctness.
- Keep functions focused and avoid ambiguous boolean flags and hidden side effects.
- TypeScript types do not validate runtime data: validate API input, JSON, webhooks,
  environment variables, and third-party responses using the project's established
  mechanism.
- Handle rejected promises and avoid floating promises unless intentionally detached
  and documented.
- Avoid circular dependencies and imports that cross architecture boundaries through
  implementation internals.
- Preserve accessibility, browser compatibility, output escaping, and security
  boundaries in browser code.
- Avoid blocking the Node.js event loop with expensive synchronous request-path work.
