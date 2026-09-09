# ⚡ INTENDFLASH V1 — AI Document Verification

> **AI-assisted college permission-letter verification using OCR, vision AI, and evidence-based scoring.**

[![AI](https://img.shields.io/badge/AI-PaddleOCR%20%2B%20Gemma%203%20Vision-blue)](https://github.com/mikey-eze/INTENDFLASH-V1)
[![Version](https://img.shields.io/badge/version-V1-green)](https://github.com/mikey-eze/INTENDFLASH-V1)

INTENDFLASH combines **PaddleOCR** for text extraction with **Ollama + Gemma 3 Vision** for higher-level document interpretation. The system focuses on evidence-based verification and human review rather than treating uncertain AI output as truth.

## ✨ Verification Pipeline

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

### Secondary checks — 15 points

- NCC context — 3
- Attendance / permission wording — 3
- Dates — 3
- Authority details — 2
- Overall reference-format consistency — 4

The reference letter is used for document structure and formatting context. Signature imagery is treated only as supporting evidence; the system does not claim to establish handwriting identity from it.

## 🤖 AI Stack

- **PaddleOCR** — document text extraction
- **Ollama + Gemma 3 Vision** — document understanding
- **Evidence-based scoring** — separates primary verification from supporting signals
- **Fail-safe behavior** — unavailable AI results in `AI UNAVAILABLE — REVIEW REQUIRED` rather than a fabricated decision

## 📧 Email Gate

A lecturer email is sent only when **all five primary checks pass (5/5)**:

`Name` → `Roll Number` → `Event/Activity` → `Authority Approval` → `Permission Write-up`

If a primary check fails, the submission is stored for review and no lecturer email is sent.

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

Built to make document verification **faster, clearer, and more accountable.** ⚡
