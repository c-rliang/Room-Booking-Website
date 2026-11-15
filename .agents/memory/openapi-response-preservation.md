---
name: OpenAPI response preservation
description: Why optional planning results must be explicit in the generated response contract
---

Declare every planning-result field consumed by the UI explicitly in OpenAPI, including optional blockers, form answers, date checks and permit details.

**Why:** The workspace's Orval/Zod generator strips undeclared object properties even when the containing schema says `additionalProperties: true`. Treating that flag as passthrough silently loses policy warnings and blockers at the API boundary.

**How to apply:** After extending tool output, update the response contract and regenerate. Exercise the HTTP response, not just the rules engine, to confirm the fields survive validation.
