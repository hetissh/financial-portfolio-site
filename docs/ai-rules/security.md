# Global Security Standards

Security and data-safety requirements override convenience and stylistic preference.

## Secrets

Never commit or expose passwords, API keys, OAuth secrets, access tokens, private
keys, production certificates, or secret-bearing connection strings. Use approved
environment, configuration, or secret-management mechanisms. If a real secret is
exposed, treat it as compromised and rotate it.

## Input and authorization

Treat HTTP requests, webhooks, files, third-party responses, message payloads,
environment variables, and user input as untrusted. Validate shape, type, values,
size, and business constraints as relevant. Enforce authorization server-side,
respect tenancy/resource ownership, and apply least privilege.

## Injection and output safety

Use parameterized SQL/query APIs. Escape or sanitize untrusted output according to
its destination context. Avoid dynamic execution such as `eval` unless explicitly
required and securely constrained.

## Sensitive data

Collect, store, copy, expose, and log only what the feature requires. Do not leak
sensitive values through logs, errors, analytics, debug output, or test fixtures.

## Web and file security

Preserve framework protections for CSRF, XSS, CORS, sessions, cookies, CSP, and
security headers. Validate user-controlled paths and filenames and prevent directory
traversal or unsafe file execution.
