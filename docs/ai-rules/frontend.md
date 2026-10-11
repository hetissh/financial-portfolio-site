# Global Frontend Standards

Repository framework and design-system conventions take precedence.

- Do not introduce a second state-management, routing, styling, form, or design-system
  stack for a small change without strong justification.
- Preserve semantic HTML, labels, keyboard support, focus management, ARIA, alt text,
  contrast, and reduced-motion behavior.
- Keep state ownership clear and prefer derived values over duplicated stored state.
- Extract components when they represent meaningful reusable UI or reduce real
  complexity, not only to reduce line count.
- Handle relevant loading, success, empty, error, retry, and pending states.
- Prevent accidental duplicate submissions where appropriate.
- Verify meaningful UI changes across relevant viewport sizes.
- Reuse project tokens and design-system primitives.
- Avoid unsafe HTML insertion with untrusted values.
- Watch for unnecessary rerenders, unstable keys, repeated expensive calculations,
  excessive bundle additions, and duplicate network requests.
