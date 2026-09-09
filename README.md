# ⚡ INTENDFLASH V1 — AI Document Verification

> Intelligent verification of college permission letters using OCR + vision AI.

INTENDFLASH combines **PaddleOCR** for fast text extraction with **Ollama Gemma 3 Vision** for higher-level document interpretation. The system is designed to verify important fields and supporting document evidence without pretending that uncertain results are genuine.

## ✨ How Verification Works

```text
📄 Permission Letter
        ↓
🔎 PaddleOCR — extract text
        ↓
🤖 Gemma 3 Vision — interpret document
        ↓
🧩 Primary + secondary evidence checks
        ↓
✅ Verified   |   ⚠️ Review Required
```

## 🎯 Verification Score

### Primary checks — 85 points

| Check | Points |
|---|---:|
| Student name | 20 |
| Student roll number | 20 |
| Selected event / activity | 15 |
| Authority signature / approval | 15 |
| Permission write-up present | 15 |

These five checks are the core of the verification decision.

### Secondary checks — 15 points

- NCC context — 3
- Attendance / permission wording — 3
- Dates — 3
- Authority details — 2
- Overall reference-format consistency — 4

The full genuine NCC letter is used as a **format and document-structure reference**. A supplied signature image is used only as supporting signature evidence; the system does not claim to establish handwriting identity from it.

## 🤖 AI Pipeline

- **PaddleOCR** — fast document text extraction
- **Ollama + Gemma 3 Vision** — document understanding and interpretation
- **Evidence-based scoring** — separates primary verification from supporting signals
- **Fail-safe behavior** — if required AI components are unavailable, the system reports `AI UNAVAILABLE — REVIEW REQUIRED` instead of fabricating a verification result

## 📧 Email Gate

A lecturer email is sent only when **all five primary checks pass (5/5)**:

`Name` → `Roll Number` → `Event/Activity` → `Authority Approval` → `Permission Write-up`

If any primary check fails, the submission is stored for review and no lecturer email is sent.

## 🛡️ Design Principles

- Evidence before confidence
- Human review when AI is unavailable or uncertain
- Clear separation between primary and secondary evidence
- No automatic invalidation solely because a permission date is in the past

## 🚀 Project Status

**Version:** V1  
**Focus:** AI-assisted college document verification  
**AI:** PaddleOCR + Ollama Gemma 3 Vision

---

Built to make document verification faster, clearer, and more accountable. ⚡