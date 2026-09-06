# INTENDFLASH V10 — Primary Verification Gate

## Current rules

The five primary checks are worth 85 points:

- Student name — 20
- Roll number — 20
- Selected event/activity — 15
- Authority signature/approval — 15
- Permission write-up — 15

### Hard email gate

A lecturer email is sent ONLY when all five primary checks pass.

If any primary check fails:

- Result is ACCESS DENIED
- Lecturer email is NOT sent
- Submission remains stored for review
- The failed primary checks are shown to the student/system

### Name matching

The detector uses meaningful name-token comparison so variants such as:

`Sai Swarup Reddy Polu`

and

`P. Sai Swarup Reddy`

can match when the meaningful tokens overlap strongly.

Standalone initials are ignored during this comparison.

### Important distinction

The permission write-up is checked for presence/content, not handwriting similarity.

The whole NCC letter is the format reference.

Authority signature similarity is supporting evidence only.

Ollama model: Gemma 3 (`gemma3:latest`).
