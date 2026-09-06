# INTENDFLASH — NCC AI Verification

Local college permission-letter verification using fast PaddleOCR + Ollama Gemma 3 vision.
This V11 build uses the whole genuine NCC letter as the document-structure reference,
keeps signature similarity as supporting evidence, and checks the permission write-up
for presence/content rather than handwriting identity.

## Primary verification — 85 points
1. Student name — 20
2. Student roll number — 20
3. Selected event/activity — 15
4. Authority signature/approval — 15
5. Permission write-up present — 15

All five are the most important checks. The permission write-up is checked for presence/content; it is **not** treated as a handwriting-identity reference.

## Secondary verification — 15 points
- NCC context — 3
- Attendance/permission wording — 3
- Dates — 3
- Authority details — 2
- Overall reference-format consistency — 4

The supplied full NCC letter is the **format/structure reference**. The supplied signature image is used only for supporting signature comparison. The write-up reference is not used as handwriting identity evidence.

Today's date is reported as a separate date check/warning and does not automatically invalidate a past permission letter.

## AI
The application uses the installed Ollama `gemma3:latest` vision model when available. PaddleOCR performs fast text extraction; Gemma 3 performs the higher-level document interpretation.

If Gemma or PaddleOCR is unavailable, the system reports `AI UNAVAILABLE — REVIEW REQUIRED` instead of pretending verification completed.


## Email gate
A lecturer email is sent only when all five primary checks pass (5/5):
name, roll number, event/activity, authority signature/approval, and permission write-up.
If any primary check fails, the submission is stored for review and no lecturer email is sent.
