# INTENDFLASH

### AI-Assisted College Permission Letter Verification System

INTENDFLASH is a college academic permission portal designed to help lecturers quickly evaluate student permission letters using **fast OCR, AI-assisted document verification, document structure analysis, and multi-factor verification scoring**.

The system is currently focused on **NCC permission letters** and is designed to assist the lecturer rather than replace the lecturer's final decision.

---

## Overview

College permission letters often need to be manually checked for multiple pieces of information such as:

* Student identity
* Roll number
* Event or activity
* Authority approval
* Permission/attendance request
* Dates
* Document structure and consistency

INTENDFLASH combines OCR and AI-assisted analysis to organize these checks into a structured verification process.

The system uses:

**PaddleOCR → Structured Extraction → Gemma 3 → Verification → Scoring → Lecturer Review**

---

## Key Features

* Student login and authentication
* Pre-registered student profiles
* First-login password change
* NCC permission letter submission
* PDF and image document uploads
* Fast OCR using PaddleOCR
* AI-assisted verification using Gemma 3
* Student name verification
* Roll number verification
* Event/activity detection
* Authority signature/approval detection
* Permission write-up verification
* NCC document structure analysis
* Date and consistency checks
* AI-generation likelihood assessment
* Document modification/suspicion assessment
* 100-point verification score
* Clear verification verdicts
* Lecturer notification through Outlook email
* Original permission letter attachment
* Human-in-the-loop final decision

---

# Verification System

INTENDFLASH does not determine whether a document is genuine from a single keyword or OCR result.

Instead, it evaluates multiple independent signals.

### Primary Verification — 85 Points

| Verification Check             | Points |
| ------------------------------ | -----: |
| Student Name                   |     20 |
| Roll Number                    |     20 |
| Event / Activity               |     15 |
| Authority Signature / Approval |     15 |
| Permission Write-up            |     15 |
| **Primary Total**              | **85** |

### Secondary Verification — 15 Points

| Verification Check              | Points |
| ------------------------------- | -----: |
| NCC Context                     |      3 |
| Attendance / Permission Wording |      3 |
| Dates                           |      3 |
| Authority Details               |      2 |
| Overall NCC Format Consistency  |      4 |
| **Secondary Total**             | **15** |

### Final Score

**Primary Verification + Secondary Verification = 100 Points**

The primary checks are kept separate from the secondary checks so that a minor secondary inconsistency does not automatically destroy strong primary evidence.

---

# Primary Verification Checks

## 1. Student Name — 20 Points

The system searches the uploaded document for the student's name.

Priority areas include:

* Cadet/student table
* Main letter text
* Other relevant identity sections

The detected name is compared with the registered name of the logged-in student.

Reasonable OCR errors may be tolerated, but a different student's name should not pass verification.

---

## 2. Roll Number — 20 Points

The system identifies the student's roll number and compares it with the roll number associated with the logged-in account.

OCR normalization can handle common recognition errors, for example:

```text
Expected:
25MRA05228

Possible OCR errors:
2SMRA05228
25MRAOS228
```

However, fuzzy matching must not allow another student's roll number to pass.

This is particularly important because an NCC document may contain multiple cadets.

---

## 3. Event / Activity — 15 Points

The system identifies the NCC event or activity described in the permission letter.

Examples include:

* Independence Day celebrations
* Tiranga Rally
* NCC parade
* Other NCC activities

Simply detecting the word `NCC` is not sufficient.

The document must contain meaningful evidence of an actual event or activity. Gemma 3 can assist with interpreting the event after OCR extraction.

---

## 4. Authority Signature / Approval — 15 Points

The system checks for evidence of authority approval.

The verification considers:

* Whether an approval/signature exists
* Whether it appears in the expected approval area
* Whether associated authority information is present
* Whether a registered reference signature is available for comparison

Signature similarity is treated as **supporting evidence**, not mathematical proof that a person physically signed the document.

---

## 5. Permission Write-up — 15 Points

The permission/attendance write-up is an important part of the document.

INTENDFLASH checks:

* Whether the write-up is present
* Whether it appears in the expected area
* Whether its content indicates permission or attendance consideration
* Whether it supports the student's request

The system does **not** treat handwriting style as the reference format and does not score the handwriting based on visual handwriting similarity.

---

# NCC Reference Document

The genuine NCC permission letter is used as the reference for **document structure and institutional format**.

The reference structure may include:

* From section
* To section
* Subject
* NCC context
* Permission request
* Attendance request
* Event/activity
* Cadet table
* Closing
* Authority/approval area

The reference is used to understand the overall institutional document structure.

It is **not** intended to make the system copy or compare student handwriting.

---

# AI & OCR Pipeline

INTENDFLASH uses two major intelligent components with different responsibilities.

```text
                 Student Upload
                       │
                       ▼
              PDF/Image Preprocessing
                       │
                       ▼
                   PaddleOCR
                       │
                       ▼
              Structured Extraction
                       │
                       ▼
                   Gemma 3
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Identity      Event       Approval
        Checks       Checks        Checks
          │            │            │
          └────────────┼────────────┘
                       ▼
                Verification Engine
                       │
                       ▼
                  100 Point Score
                       │
                       ▼
                 Lecturer Review
```

---

## PaddleOCR

PaddleOCR is used as the fast OCR layer.

Its responsibilities include:

* Text extraction
* Efficient image preprocessing
* Header/body/table extraction
* Name detection
* Roll number detection
* Date detection
* Event wording extraction

The system should avoid unnecessary repeated OCR passes and should not use the slower AI model as a replacement for basic OCR.

---

## Gemma 3

INTENDFLASH uses the locally installed:

```text
gemma3:latest
```

through Ollama.

Gemma 3 acts as the intelligent verification layer rather than the basic OCR engine.

It can assist with:

* Document structure interpretation
* Event/activity understanding
* Uncertain OCR resolution
* Permission/attendance wording analysis
* Contradiction detection
* Suspicious content analysis
* Structured verification reasoning

**Gemma 3 is required for the current project. Qwen is not used.**

---

# AI Generation & Modification Analysis

AI-generation analysis is kept separate from the main permission verification score.

The system may look for indicators such as:

* Unusually polished or generic writing
* Repetitive AI-like phrasing
* Inconsistent terminology
* Inconsistent fonts
* Spacing/alignment anomalies
* Suspicious pasted regions
* Altered table cells
* Inconsistent image/background regions
* Compression anomalies
* Added or removed content
* Available metadata

### AI Generation Likelihood

```text
LOW
MEDIUM
HIGH
```

### Modification Likelihood

```text
LOW
MEDIUM
HIGH
```

AI-generation likelihood is **not treated as proof** that a document is fake.

---

# Date & Consistency Checks

INTENDFLASH can detect:

* Letter date
* Permission/event dates
* Attendance dates
* Approval date, when readable

The detected permission period can be compared with the current date.

An expired permission period is treated as a **consistency warning**, not automatic proof that the document is fake.

Example:

```text
Letter Date:
08-08-2026 → 15-08-2026

Current Date:
02-09-2026

Result:
✓ Date detected
✓ Permission period detected
⚠ Current date outside permission period
```

This allows the lecturer to make the final judgment instead of relying on a single automated rule.

---

# Verification Verdicts

INTENDFLASH uses evidence-based verdict categories rather than claiming absolute authenticity.

Possible results include:

```text
APPEARS VALID
SUSPICIOUS
REVIEW REQUIRED
INVALID
AI UNAVAILABLE — REVIEW REQUIRED
```

If the AI verification layer is unavailable, the system must not silently return a fake-valid result.

The lecturer remains the final authority.

---

# Student Workflow

```text
1. Student Login
       ↓
2. Student Dashboard
       ↓
3. Select Permission Submission
       ↓
4. Upload NCC Permission Letter
       ↓
5. Document Preprocessing
       ↓
6. PaddleOCR Extraction
       ↓
7. Gemma 3 Verification
       ↓
8. Primary + Secondary Scoring
       ↓
9. Verification Result
       ↓
10. Lecturer Notification
       ↓
11. Lecturer Makes Final Decision
```

Student information such as name, roll number, event date, and permission date should not unnecessarily be entered manually when it can be obtained from the student's profile or uploaded document.

---

# Lecturer Notification

For the current implementation, **one email is sent for each submission**.

The email is designed to provide a quick human-readable summary rather than a large technical report.

The notification contains information such as:

```text
INTENDFLASH — NCC VERIFICATION

Student
Roll Number
Event

AI Score

Primary Evidence: X/5 Passed

✓ Name Matched
✓ Roll Number Matched
✓ Event Detected
✓ Authority Signature Detected
✓ Permission Write-up Detected

Secondary Checks

Warnings / Reasons
```

The original permission letter is attached to the email.

The lecturer remains responsible for the final approval decision.

---

# Technology Stack

## Backend

* Node.js
* Express.js
* EJS
* JSON / Local Database Storage
* Multer

## AI / OCR

* PaddleOCR
* Ollama
* Gemma 3 (`gemma3:latest`)

## Email

* Nodemailer
* Outlook / Microsoft 365

## Supported Documents

* PDF
* JPG
* JPEG
* PNG

The current project specification defines this technology stack and supported upload formats.

---

# Project Structure

```text
INTENDFLASH/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   │   ├── ocr/
│   │   ├── verification/
│   │   ├── gemma/
│   │   ├── signature/
│   │   └── email/
│   └── database/
│
├── frontend/
│   ├── views/
│   └── public/
│
├── ai/
│   ├── prompts/
│   └── verification/
│
├── reference/
│   └── ncc-reference-letter.png
│
├── uploads/
├── data/
│
├── docs/
│   ├── architecture.md
│   ├── verification-logic.md
│   ├── setup.md
│   └── screenshots/
│
├── scripts/
│
├── .env.example
├── .gitignore
├── package.json
├── LICENSE
└── README.md
```

> The exact implementation structure may differ depending on the current source code. This structure represents the intended organization of the project.

---

# Installation

## Prerequisites

Before running INTENDFLASH, install:

* Node.js
* npm
* Ollama
* PaddleOCR and its required environment/dependencies

The required Gemma model is:

```text
gemma3:latest
```

---

## Clone the Repository

```bash
git clone <repository-url>
cd INTENDFLASH
```

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create a local `.env` file using `.env.example` as a reference.

Do not commit real credentials or secrets to GitHub.

---

## Configure Gemma 3

INTENDFLASH uses:

```text
OLLAMA_MODEL=gemma3:latest
```

The application should communicate with the local Ollama installation.

---

## Run the Application

Use the start command defined in the project's `package.json`.

The application can then be accessed through the configured local server address.

> Setup commands should be updated to exactly match the final implementation before deployment.

---

# Environment Variables

Example configuration:

```env
PORT=3000

OLLAMA_MODEL=gemma3:latest
OLLAMA_URL=http://localhost:11434

LECTURER_EMAIL=

EMAIL_USER=
EMAIL_PASSWORD=
```

Never upload the real `.env` file or expose email credentials.

---

# Limitations

INTENDFLASH is an **AI-assisted verification system**, not an absolute authenticity detector.

Important limitations include:

* OCR can produce recognition errors.
* AI-generated writing detection cannot prove that a document was generated by AI.
* Visual signature similarity cannot prove who physically signed a document.
* A clean-looking document cannot be proven genuine from visual analysis alone.
* An expired permission period does not automatically mean a document is fake.
* AI verification results should be treated as evidence for review.
* The lecturer remains the final decision-maker.

These limitations are intentional parts of the system's verification philosophy.

---

# Future Improvements

Potential future improvements include:

* Genuine authority signature reference samples
* Improved signature comparison
* Additional permission types
* More advanced document manipulation analysis
* Expanded student/department support
* Improved document region detection
* More detailed verification analytics

Future functionality should be added only after the core verification pipeline is stable.

---

# Current Scope

### Permission Type

**NCC — National Cadet Corps**

### Current Class

**CSE-E**

### Student Range

```text
25MRA05221
      ↓
25MRA05275
```

Students are pre-registered by the college.

The current specification uses an initial password of:

```text
student123
```

Students are required to change the initial password during their first login.

---

# Core Project Goal

The immediate goal of INTENDFLASH is to build a reliable and fast document verification pipeline based on:

```text
FAST PADDLEOCR
        +
GEMMA 3 VISION
        +
85-POINT PRIMARY VERIFICATION
        +
15-POINT SECONDARY VERIFICATION
        +
NCC DOCUMENT STRUCTURE
        +
AUTHORITY SIGNATURE SUPPORT
        +
CLEAR OUTLOOK EMAIL
```

The verification logic should remain stable before unrelated features are introduced.

---

# Disclaimer

INTENDFLASH provides AI-assisted evidence and verification analysis.

It does **not** guarantee that a document is authentic and should not be used as the sole basis for an academic decision.

The final decision remains with the authorized lecturer or college authority.

---

# License

This project is licensed under the MIT License.

---

## INTENDFLASH

**Fast. Structured. AI-Assisted. Human-Verified.**
