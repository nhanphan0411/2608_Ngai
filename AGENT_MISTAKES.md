# AGENT_MISTAKES

Mistake memory for future repository edits.

Initialized on 2026-03-24.

## Rules

- Read this file before any repository edit task.
- Record each detected mistake occurrence.
- Deduplicate by normalized `pattern` + `scope_tags` + `prevention_rule`.
- Update matching entries instead of creating duplicates.
- `active` means keep checking for this pattern in future work.
- `resolved` means keep the lesson, but do not treat it as currently open.

## Entry Shape

```md
### MISTAKE-YYYYMMDD-001

- status: active | resolved
- severity: low | medium | high
- scope_tags: [code, docs, tests, config, infra, planning]
- pattern: normalized mistake pattern
- prevention_rule: specific action that prevents recurrence
- validation_check: deterministic pass/fail check
- first_seen: YYYY-MM-DD
- last_seen: YYYY-MM-DD
- occurrence_count: 1
- evidence:
  - file:relative/path:line
  - commit:hash
```

### MISTAKE-20260710-001

- status: resolved
- severity: medium
- scope_tags: [tests, config]
- pattern: installer test ran from the source repository instead of its isolated target
- prevention_rule: installer tests must change into the temporary project and stop on the first failed assertion
- validation_check: `tests/install.sh` passes without creating `.agents` or `.claude` in the source repository
- first_seen: 2026-07-10
- last_seen: 2026-07-10
- occurrence_count: 1
- evidence:
  - file:tests/install.sh:15

### MISTAKE-20260807-001

- status: resolved
- severity: high
- scope_tags: [docs, data, planning]
- pattern: corpus field labeled protected terms mixed exact identifiers, paraphrasable critical concepts, and introduced support terms
- prevention_rule: store unreviewed items as term candidates and require an explicit qualified-reviewer disposition before claiming term preservation or advancing evidence level
- validation_check: corpus has no `protected_terms` key; every domain-review record must classify each candidate as preserve exact, preserve and gloss, preserve concept, introduce for support, reject, or uncertain
- first_seen: 2026-08-07
- last_seen: 2026-08-07
- occurrence_count: 1
- evidence:
  - file:research/yasashii-nihongo/corpus-schema.json
  - file:research/yasashii-nihongo/examples.jsonl

### MISTAKE-20260807-002

- status: resolved
- severity: low
- scope_tags: [tests]
- pattern: prototype test command included recursive temporary-directory deletion that the command policy rejected before execution
- prevention_rule: omit destructive cleanup from ad hoc test commands unless cleanup is necessary and explicitly permitted; allow system-temporary scratch data to expire normally
- validation_check: the replacement test command contains no deletion operation and completes its positive and negative assertions
- first_seen: 2026-08-07
- last_seen: 2026-08-07
- occurrence_count: 1
- evidence:
  - tool:exec_command rejection before the prototype script tests ran
  - tool:replacement script tests passed with scratch data under the system temporary directory

### MISTAKE-20260807-003

- status: resolved
- severity: medium
- scope_tags: [docs, tests]
- pattern: self-forward-test candidate introduced bunsetsu-like spacing without recipient-profile evidence
- prevention_rule: use normal Japanese spacing by default and add bunsetsu spacing only when the named recipient, requested profile, or prior evidence supports it
- validation_check: routine forward-test output contains no inserted spaces between ordinary Japanese phrase units
- first_seen: 2026-08-07
- last_seen: 2026-08-07
- occurrence_count: 1
- evidence:
  - file:research/yasashii-nihongo/prototype-forward-test.md

### MISTAKE-20260807-004

- status: resolved
- severity: medium
- scope_tags: [code, tests]
- pattern: surface numeric tokenizer split an Arabic amount with a Japanese scale unit into separate tokens
- prevention_rule: order compound currency units before their shorter suffixes and retain a regression assertion for scaled amounts such as `300万円`
- validation_check: `compare_surface.py` extracts `300万円` as one token and never emits separate `300` and `万円` tokens for that input
- first_seen: 2026-08-07
- last_seen: 2026-08-07
- occurrence_count: 1
- evidence:
  - file:skills/yasashii-nihongo/scripts/compare_surface.py
  - file:research/yasashii-nihongo/prototype-forward-test.md

### MISTAKE-20260807-005

- status: resolved
- severity: medium
- scope_tags: [tests, config]
- pattern: commit command ran after a staged whitespace check reported failures because the command sequence did not stop on error
- prevention_rule: run staged validation and commit under `set -euo pipefail`, with the commit command reachable only after every check succeeds
- validation_check: `git diff --cached --check` exits successfully before each subsequent commit
- first_seen: 2026-08-07
- last_seen: 2026-08-07
- occurrence_count: 1
- evidence:
  - commit:6e90924
  - file:research/yasashii-nihongo/atomic-model.md
  - file:research/yasashii-nihongo/domain-profiles.md
