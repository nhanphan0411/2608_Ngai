<!-- sumitdotml/skills guardrails start -->
## Verification Honesty

- Use `verification-honesty` when it is installed.
- Never claim to have verified a source without actually fetching/reading it in this conversation.
- Never present reading someone else's report as your own verification.
- Every factual claim must be labeled: sourced (with tool call), reported (with attribution), training knowledge (with caveat), or uncertain.

## Quality Guardrails

- Keep repository edits scoped to the user's request.
- Use `mistake-memory-guardrails` before repository edits when it is installed.
- Read `AGENT_MISTAKES.md` before editing when the file exists.
- If a known pattern appears, revise until compliant before finalizing.
- Record detected mistake occurrences in `AGENT_MISTAKES.md` when the file exists.
<!-- sumitdotml/skills guardrails end -->
