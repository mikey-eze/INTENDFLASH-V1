require("dotenv").config();

const express = require("express");
const { OLLAMA_MODEL } = require("./ai_vision");
const session = require("express-session");
const multer = require("multer");
const { analyzeDocument } = require("./detector");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const app = express();
const PORT = 5000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

// File upload middleware. Keep this defined before any route uses upload.single().
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only PDF, JPG, JPEG and PNG files are allowed."));
  }
});

app.set("view engine", "ejs");
app.set("views", path.join(ROOT, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));

// PDF.js standard fonts are served over HTTP so Node/PDF.js can fetch them
// without trying to use unsupported file:// font URLs.
const PDF_STANDARD_FONTS = path.join(
  ROOT,
  "node_modules",
  "pdfjs-dist",
  "standard_fonts"
);
app.use(
  "/pdf-standard-fonts",
  express.static(PDF_STANDARD_FONTS, {
    fallthrough: false,
    maxAge: "7d"
  })
);

app.use(session({
  secret: "college-permission-portal-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const dbFile = path.join(DATA, "database.json");

const initialStudents = [];
const lecturers = [
  "Dr. Kata Sreelakshmi",
  "Dr. Ashwini Kumar Mishra",
  "Dr. N. Krishnaiah",
  "Dr. Senthil Kumar K",
  "Dr. P. Kavitha",
  "Dr. Prasath B",
  "Mr. A. Kumar",
  "Mrs. G. Vasundara Devi",
  "Mr. Aleemullahkhan Pathan",
  "Mr. Chollangi Venkata Ramu"
];
const timetable = {
  MON: [
    {
      start: "09:10",
      end: "10:10",
      code: "COA",
      subject: "Computer Organization and Architecture",
      lecturer: "Dr. Ashwini Kumar Mishra",
      type: "lecture"
    },
    {
      start: "10:10",
      end: "11:10",
      code: "DBMS",
      subject: "Database Management Systems",
      lecturer: "Dr. N. Krishnaiah",
      type: "lecture"
    },
    {
      start: "11:10",
      end: "12:10",
      code: "LIBRARY",
      subject: "Library",
      lecturer: "",
      type: "activity"
    },
    {
      start: "13:00",
      end: "14:00",
      code: "APT",
      subject: "Aptitude",
      lecturer: "Mr. Chollangi Venkata Ramu",
      type: "lecture"
    },
    {
      start: "14:00",
      end: "15:00",
      code: "AOA",
      subject: "Analysis of Algorithms",
      lecturer: "Dr. P. Kavitha",
      type: "lecture"
    },
    {
      start: "15:00",
      end: "17:00",
      code: "DSUP LAB",
      subject: "Data Science Using Python Laboratory",
      lecturer: "Dr. Prasath B / Mr. A. Kumar",
      type: "lab"
    }
  ],

  TUE: [
    {
      start: "09:10",
      end: "10:10",
      code: "DMS",
      subject: "Discrete Mathematical Structures",
      lecturer: "Dr. Kata Sreelakshmi",
      type: "lecture"
    },
    {
      start: "10:10",
      end: "11:10",
      code: "AOA",
      subject: "Analysis of Algorithms",
      lecturer: "Dr. P. Kavitha",
      type: "lecture"
    },
    {
      start: "11:10",
      end: "12:10",
      code: "OOP",
      subject: "Object Oriented Programming",
      lecturer: "Dr. Senthil Kumar K",
      type: "lecture"
    },
    {
      start: "13:00",
      end: "15:00",
      code: "DBMS LAB",
      subject: "Database Management Systems Laboratory",
      lecturer: "Dr. N. Krishnaiah / Mrs. G. Vasundara Devi",
      type: "lab"
    },
    {
      start: "15:00",
      end: "17:00",
      code: "HOLISTIC HOUR",
      subject: "Holistic Hour",
      lecturer: "",
      type: "activity"
    }
  ],

  WED: [
    {
      start: "09:10",
      end: "10:10",
      code: "OOP",
      subject: "Object Oriented Programming",
      lecturer: "Dr. Senthil Kumar K",
      type: "lecture"
    },
    {
      start: "10:10",
      end: "11:10",
      code: "DBMS",
      subject: "Database Management Systems",
      lecturer: "Dr. N. Krishnaiah",
      type: "lecture"
    },
    {
      start: "11:10",
      end: "12:10",
      code: "COA",
      subject: "Computer Organization and Architecture",
      lecturer: "Dr. Ashwini Kumar Mishra",
      type: "lecture"
    },
    {
      start: "13:00",
      end: "14:00",
      code: "MOOC",
      subject: "MOOC",
      lecturer: "Mr. Aleemullakhan Pathan",
      type: "activity"
    },
    {
      start: "14:00",
      end: "15:00",
      code: "DMS",
      subject: "Discrete Mathematical Structures",
      lecturer: "Dr. Kata Sreelakshmi",
      type: "lecture"
    },
    {
      start: "15:00",
      end: "17:00",
      code: "HOLISTIC HOUR",
      subject: "Holistic Hour",
      lecturer: "",
      type: "activity"
    }
  ],

  THU: [
    {
      start: "09:10",
      end: "10:10",
      code: "OOP",
      subject: "Object Oriented Programming",
      lecturer: "Dr. Senthil Kumar K",
      type: "lecture"
    },
    {
      start: "10:10",
      end: "11:10",
      code: "DSUP",
      subject: "Data Science Using Python",
      lecturer: "Dr. Prasath B / Mr. A. Kumar",
      type: "lecture"
    },
    {
      start: "11:10",
      end: "12:10",
      code: "DMS",
      subject: "Discrete Mathematical Structures",
      lecturer: "Dr. Kata Sreelakshmi",
      type: "lecture"
    },
    {
      start: "13:00",
      end: "14:00",
      code: "MENTOR",
      subject: "Mentor",
      lecturer: "",
      type: "activity"
    },
    {
      start: "14:00",
      end: "15:00",
      code: "COA",
      subject: "Computer Organization and Architecture",
      lecturer: "Dr. Ashwini Kumar Mishra",
      type: "lecture"
    },
    {
      start: "15:00",
      end: "17:00",
      code: "OOPS LAB",
      subject: "Object Oriented Programming Laboratory",
      lecturer: "Dr. Senthil Kumar K / Mr. A. Kumar",
      type: "lab"
    }
  ],

  FRI: [
    {
      start: "09:10",
      end: "10:10",
      code: "AOA",
      subject: "Analysis of Algorithms",
      lecturer: "Dr. P. Kavitha",
      type: "lecture"
    },
    {
      start: "10:10",
      end: "12:10",
      code: "CERTIFICATION I",
      subject: "NSDC - Certification Course I",
      lecturer: "",
      type: "activity"
    },
    {
      start: "13:00",
      end: "14:00",
      code: "DMS",
      subject: "Discrete Mathematical Structures",
      lecturer: "Dr. Kata Sreelakshmi",
      type: "lecture"
    },
    {
      start: "14:00",
      end: "15:00",
      code: "DBMS",
      subject: "Database Management Systems",
      lecturer: "Dr. N. Krishnaiah",
      type: "lecture"
    },
    {
      start: "15:00",
      end: "17:00",
      code: "AOA LAB",
      subject: "Analysis of Algorithms Laboratory",
      lecturer: "Dr. P. Kavitha / Mr. Aleemullakhan Pathan",
      type: "lab"
    }
  ],

  SAT: []
};

function getCurrentClass() {
  const now = new Date();

  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = days[now.getDay()];

  const classes = timetable[today] || [];

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  for (const item of classes) {
    const [startHour, startMinute] = item.start.split(":").map(Number);
    const [endHour, endMinute] = item.end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    ) {
      return {
        ...item,
        day: today,
        live: true
      };
    }
  }

  return null;
}
const MAIL_USER = process.env.MAIL_USER?.trim();
const MAIL_PASSWORD = process.env.MAIL_PASSWORD?.trim();
const LECTURER_EMAIL = process.env.LECTURER_EMAIL?.trim();
const OOP_FACULTY_EMAIL = process.env.OOP_FACULTY_EMAIL?.trim();

console.log("Mail user configured:", !!MAIL_USER);
console.log("Vision AI model:", OLLAMA_MODEL);
console.log("OOP faculty configured:", !!OOP_FACULTY_EMAIL);

if (!MAIL_USER || !MAIL_PASSWORD) {
  console.error("❌ EMAIL CONFIGURATION IS MISSING");
}

const mailTransporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD
  }
});

// CSE-E roll number range
const CSE_E_START = 25_105_221;
const CSE_E_END = 25_105_275;

function getStudentClass(rollNo) {
  const match = rollNo.match(/^25MRA(\d+)$/i);

  if (!match) return "Unknown";

  const number = Number(match[1]);

  if (number >= 5221 && number <= 5275) {
    return "CSE-E";
  }

  return "Unknown";
}

function loadDB() {
  if (!fs.existsSync(dbFile)) {
    const fresh = {
      students: [...initialStudents],
      requests: []
    };

    for (let i = 5221; i <= 5275; i++) {
      fresh.students.push({
        rollNo: `25MRA0${i}`,
        password: "student123",
        name: `Student ${i}`,
        department: "CSE",
        className: "CSE-E",
        mustChangePassword: true
      });
    }

    saveDB(fresh);
    return fresh;
  }

  const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));

  // Add missing CSE-E students only when needed.
  let changed = false;

  for (let i = 5221; i <= 5275; i++) {
    const rollNo = `25MRA0${i}`;

    if (!db.students.some(s => s.rollNo === rollNo)) {
      db.students.push({
        rollNo,
        password: "student123",
        name: `Student ${i}`,
        department: "CSE",
        className: "CSE-E",
        mustChangePassword: true
      });
      changed = true;
    }
  }

  if (changed) saveDB(db);

  return db;
}

function saveDB(db) {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function currentStudent(req) {
  if (req._currentStudent !== undefined) return req._currentStudent;
  if (!req.session.rollNo) {
    req._currentStudent = null;
    return null;
  }

  const db = loadDB();
  req._currentStudent =
    db.students.find(s => s.rollNo === req.session.rollNo) || null;

  return req._currentStudent;
}

function requireLogin(req, res, next) {
  if (!currentStudent(req)) return res.redirect("/login");
  next();
}

function requireChangedPassword(req, res, next) {
  const student = currentStudent(req);
  if (student?.mustChangePassword && req.path !== "/change-password") {
    return res.redirect("/change-password");
  }
  next();
}

// =========================
// AUTHENTICATION
// =========================

app.get("/login", (req, res) => {
  if (currentStudent(req)) return res.redirect("/");
  res.render("login", { message: req.session.message || "" });
  delete req.session.message;
});

app.post("/login", (req, res) => {
  const rollNo = String(req.body.rollNo || "").trim().toUpperCase();
  const password = String(req.body.password || "");
  const db = loadDB();
  const student = db.students.find(s => String(s.rollNo || "").toUpperCase() === rollNo);

  if (!student || student.password !== password) {
    return res.status(401).render("login", { message: "Invalid roll number or password." });
  }

  req.session.rollNo = student.rollNo;
  req.session.message = "";

  return student.mustChangePassword
    ? res.redirect("/change-password")
    : res.redirect("/");
});

app.get("/change-password", requireLogin, (req, res) => {
  const student = currentStudent(req);
  res.render("change-password", { student, message: req.session.message || "" });
  delete req.session.message;
});

app.post("/change-password", requireLogin, (req, res) => {
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (newPassword.length < 6) {
    return res.status(400).render("change-password", {
      student: currentStudent(req),
      message: "Password must be at least 6 characters."
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).render("change-password", {
      student: currentStudent(req),
      message: "Passwords do not match."
    });
  }

  const db = loadDB();
  const student = db.students.find(s => s.rollNo === req.session.rollNo);
  if (!student) return res.redirect("/login");

  student.password = newPassword;
  student.mustChangePassword = false;
  saveDB(db);
  req.session.message = "Password changed successfully.";
  res.redirect("/");
});

// =========================
// STUDENT HOME
// =========================

app.get("/", requireLogin, requireChangedPassword, (req, res) => {
  const student = currentStudent(req);
  const db = loadDB();
  const currentClass = getCurrentClass();
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayNames[new Date().getDay()];
  const timetableToday = timetable[today] || [];
  const requests = db.requests.filter(r => r.rollNo === student.rollNo).slice().reverse();

  res.render("student", {
    student,
    message: req.session.message || "",
    timetable: timetableToday,
    currentClass,
    lecturers,
    requests
  });
  delete req.session.message;
});

function emailEscape(value) {
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function emailCheckCards(items) {
  return items.map(([label, ok, detail]) => `<div style="padding:10px 0;border-bottom:1px solid #edf0f4;"><div style="font-weight:700;font-size:13px;">${ok ? "✓" : "✗"} ${emailEscape(label)}</div>${detail ? `<div style="font-size:12px;color:#667085;margin-top:3px;">${emailEscape(detail)}</div>` : ""}</div>`).join("");
}


function normalizeNameTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[.,'’"()\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .filter(token => !/^[a-z]$/.test(token)); // ignore standalone initials such as "p"
}

function nameSimilarity(expected, detected) {
  const a = normalizeNameTokens(expected);
  const b = normalizeNameTokens(detected);

  if (!a.length || !b.length) return { matched: false, similarity: 0 };

  const setA = new Set(a);
  const setB = new Set(b);
  const overlap = [...setA].filter(x => setB.has(x)).length;

  // Require the document to contain the meaningful name tokens.
  // This handles "Sai Swarup Reddy Polu" vs "P. Sai Swarup Reddy"
  // while avoiding loose matches on only one common token.
  const coverageExpected = overlap / setA.size;
  const coverageDetected = overlap / setB.size;

  const matched =
    (overlap >= 2 && coverageExpected >= 0.75) ||
    (setA.size >= 3 && overlap >= 3 && coverageExpected >= 0.67);

  const similarity = Math.round(
    ((coverageExpected + coverageDetected) / 2) * 100
  );

  return { matched, similarity, expected, detected, overlap };
}

app.post("/submit", requireLogin, requireChangedPassword, upload.single("letter"), async (req, res) => {
  try {
    if (!req.file) {
      req.session.message = "Please upload a PDF, JPG, JPEG, or PNG permission letter.";
      return res.redirect("/");
    }

    if (!lecturers.includes(req.body.lecturer)) {
      req.session.message = "Please select the concerned lecturer.";
      return res.redirect("/");
    }

    const permissionType = (req.body.permissionType || "NCC").trim().toUpperCase();

    // For this release the only supported permission-letter type is NCC.
    if (permissionType !== "NCC") {
      req.session.message = "Only NCC permission letters are currently supported.";
      return res.redirect("/");
    }

    const student = currentStudent(req);
    const currentClass = getCurrentClass();

    console.log("\n🚀 SUBMISSION SENT TO REAL AI PIPELINE");
    console.log("   OCR engine: PaddleOCR");
    console.log("   Vision model:", OLLAMA_MODEL);
    console.log("   Student:", student.name, "|", student.rollNo);

    const aiResult = await analyzeDocument(req.file.path, {
      name: student.name,
      rollNo: student.rollNo
    });

    const result = {
      confidence: aiResult.score,
      status: `${aiResult.result} — AI Verification`,
      ai: aiResult
    };

    const db = loadDB();

    const request = {
      id: Date.now(),
      rollNo: student.rollNo,
      studentName: student.name,
      lecturer: req.body.lecturer,
      permissionType,
      letterFile: req.file.filename,
      confidence: result.confidence,
      algorithmStatus: result.status,
      aiResult: result.ai,
      lecturerStatus: "Pending",
      lecturerReason: "",
      attendanceStatus: "Pending",
      session: currentClass
        ? `${currentClass.code}-${currentClass.start}-${currentClass.end}`
        : "Not during a live class",
      createdAt: new Date().toLocaleString("en-IN")
    };

    db.requests.push(request);
    saveDB(db);

    /* =====================================================
       DETAILED LECTURER EMAIL
       The HTTP request completes only after sendMail resolves.
       There is no extra mail loop/background process.
    ===================================================== */

    const evidence = result.ai.evidence || {};
    const satisfied = [];
    const notSatisfied = [];

    const approval = result.ai.approvalEvidence || result.ai.handwriting || {};
    const checks = [
      ["PRIMARY · Student name match", result.ai.primaryChecks?.name ?? result.ai.nameMatch?.matched],
      ["PRIMARY · Student roll number match", result.ai.primaryChecks?.roll ?? result.ai.rollMatch?.matched],
      ["PRIMARY · Selected event/activity", result.ai.primaryChecks?.event ?? evidence.activity],
      ["PRIMARY · Authority signature/approval", result.ai.primaryChecks?.signature ?? approval.signature?.detected],
      ["PRIMARY · Permission write-up present", result.ai.primaryChecks?.writeup ?? approval.writeup?.detected],
      ["SECONDARY · NCC context", evidence.ncc],
      ["SECONDARY · Attendance / permission evidence", evidence.attendance],
      ["SECONDARY · Date information", Array.isArray(evidence.dates) && evidence.dates.length > 0],
      ["SECONDARY · Authority reference", evidence.authority],
      ["SECONDARY · Reference format consistency", result.ai.secondaryChecks?.format]
    ];

    for (const [label, ok] of checks) {
      (ok ? satisfied : notSatisfied).push(`${ok ? "✓" : "✗"} ${label}`);
    }

    
    // HARD EMAIL GATE:
    // Lecturer email is sent only when all five primary checks pass.
    const primaryChecksPassed = Boolean(result.ai.primaryChecks) &&
      Object.values(result.ai.primaryChecks).every(Boolean);

    if (!primaryChecksPassed) {
      req.session.message =
        `ACCESS DENIED — ${[
          result.ai.nameMatch?.matched ? null : "name",
          result.ai.rollMatch?.matched ? null : "roll number",
          evidence.activity ? null : "event",
          result.ai.handwriting?.signature?.detected ? null : "authority signature",
          result.ai.handwriting?.writeup?.detected ? null : "permission write-up"
        ].filter(Boolean).join(", ")} check failed. No lecturer email was sent.`;

      const deniedDb = loadDB();
      const savedRequest = deniedDb.requests.find(r => r.id === request.id);
      if (savedRequest) {
        savedRequest.emailStatus = "NOT SENT — PRIMARY CHECK FAILED";
        savedRequest.primaryChecksPassed = false;
        saveDB(deniedDb);
      }

      return res.redirect("/");
    }

const recipient = LECTURER_EMAIL || process.env.OOP_FACULTY_EMAIL;

    if (recipient && MAIL_USER && MAIL_PASSWORD) {
      const subject =
        `INTENDFLASH NCC Permission - ${student.name} (${student.rollNo}) - ${result.ai.result}`;

      const todayMatch = evidence.todayMatch || { today: "Unknown", matched: false, mode: "NO MATCH" };
      const primary = result.ai.primaryChecks || {};
      const secondary = result.ai.secondaryChecks || {};
      const checkRows = [
        ["Name", primary.name, result.ai.nameMatch?.detected || "Not detected"],
        ["Roll number", primary.roll, result.ai.rollMatch?.detected || "Not detected"],
        ["Event / activity", primary.event, evidence.eventSeen || result.ai.visionAI?.event_seen || "Not detected"],
        ["Authority signature", primary.signature, `${result.ai.approvalEvidence?.signature?.similarity ?? 0}% supporting similarity`],
        ["Permission write-up", primary.writeup, result.ai.approvalEvidence?.writeup?.method || "Not detected"],
        ["NCC context", secondary.ncc, ""],
        ["Attendance / permission", secondary.attendance, ""],
        ["Dates", secondary.dates, (evidence.dates || []).join(", ") || "None"],
        ["Authority details", secondary.authority, ""],
        ["Reference format", secondary.format, "Whole NCC structure"]
      ];

      const emailText = [
        "INTENDFLASH — NCC PERMISSION VERIFICATION",
        `Result: ${result.ai.result} | Score: ${result.ai.score}/100`,
        `Student: ${student.name} | Roll: ${student.rollNo}`,
        `Lecturer: ${req.body.lecturer} | Permission: ${permissionType}`,
        `Today's date: ${todayMatch.today} | Date check: ${todayMatch.mode}`,
        `Processing time: ${result.ai.time || "N/A"} seconds`,
        "",
        "CHECKS",
        ...checkRows.map(([label, ok, detail]) => `${ok ? "PASS" : "FAIL"} — ${label}${detail ? ` — ${detail}` : ""}`),
        "",
        "AI REASONS",
        result.ai.reasons?.length ? result.ai.reasons.map(x => `- ${x}`).join("\n") : "None",
        "",
        "WARNINGS",
        result.ai.warnings?.length ? result.ai.warnings.map(x => `- ${x}`).join("\n") : "None",
        "",
        "Final attendance approval remains with the lecturer. The AI result is an automated document check."
      ].join("\n");

      const verdictIsValid = result.ai.result === "APPEARS VALID";
      const primaryPassedCount = Object.values(primary).filter(Boolean).length;
      const emailHtml = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#17202a;">
      <div style="max-width:620px;margin:0 auto;padding:10px;">
        <div style="background:#111827;color:#fff;padding:16px;border-radius:12px;">
          <div style="font-size:11px;letter-spacing:1px;font-weight:700;opacity:.75;">INTENDFLASH</div>
          <div style="font-size:20px;font-weight:800;margin-top:3px;">NCC Permission Verification</div>
        </div>
        <div style="background:#fff;margin-top:8px;border:1px solid #e3e8ee;border-radius:12px;padding:16px;">
          <div style="font-size:11px;color:#667085;font-weight:700;letter-spacing:.6px;">AI VERDICT</div>
          <div style="font-size:21px;font-weight:800;margin-top:3px;">${emailEscape(result.ai.result)}</div>
          <div style="font-size:28px;font-weight:900;margin-top:2px;">${emailEscape(result.ai.score)}/100</div>

          <div style="margin-top:12px;padding:12px;background:#f7f9fb;border-radius:9px;font-size:13px;line-height:1.6;">
            <b>${emailEscape(student.name)}</b><br>
            ${emailEscape(student.rollNo)} · ${emailEscape(req.body.lecturer)}<br>
            ${emailEscape(permissionType)} · ${emailEscape(req.file.originalname)}
          </div>

          <div style="margin-top:12px;padding:12px;background:#f7f9fb;border-radius:9px;">
            <div style="font-size:14px;font-weight:800;">PRIMARY EVIDENCE: ${primaryPassedCount}/5</div>
            <div style="font-size:12px;color:#667085;margin-top:3px;">Name · Roll · Event · Signature · Permission write-up</div>
          </div>

          <div style="margin-top:16px;font-size:14px;font-weight:800;">PRIMARY CHECKS</div>
          <div style="margin-top:4px;">${emailCheckCards(checkRows.slice(0,5))}</div>

          <div style="margin-top:16px;font-size:14px;font-weight:800;">SECONDARY CHECKS</div>
          <div style="margin-top:4px;">${emailCheckCards(checkRows.slice(5))}</div>

          <div style="margin-top:14px;padding:11px;background:#f7f9fb;border-radius:9px;font-size:12px;line-height:1.6;">
            <b>Today:</b> ${emailEscape(todayMatch.today)}<br>
            <b>Date check:</b> ${emailEscape(todayMatch.mode)}<br>
            <b>Processing:</b> ${emailEscape(result.ai.time || "N/A")} sec
          </div>

          <div style="margin-top:16px;font-size:14px;font-weight:800;">REASONS</div>
          <div style="font-size:12px;line-height:1.55;margin-top:4px;">${(result.ai.reasons?.length ? result.ai.reasons : ["None"]).map(x=>`• ${emailEscape(x)}`).join("<br>")}</div>

          <div style="margin-top:14px;font-size:14px;font-weight:800;">WARNINGS</div>
          <div style="font-size:12px;line-height:1.55;margin-top:4px;">${(result.ai.warnings?.length ? result.ai.warnings : ["None"]).map(x=>`• ${emailEscape(x)}`).join("<br>")}</div>

          <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e8edf3;font-size:11px;color:#667085;line-height:1.5;">
            AI verification is supporting evidence only. Final attendance approval remains with the lecturer.
            The original permission letter is attached.
          </div>
        </div>
      </div></body></html>`;

      try {
        await mailTransporter.sendMail({
          from: MAIL_USER,
          to: recipient,
          subject,
          text: emailText,
          html: emailHtml,
          attachments: [
            {
              filename: req.file.originalname,
              path: req.file.path
            }
          ]
        });

        console.log("INTENDFLASH verification email sent to:", recipient);
        const sentDb = loadDB();
        const sentRequest = sentDb.requests.find(r => r.id === request.id);
        if (sentRequest) {
          sentRequest.emailStatus = "SENT";
          sentRequest.primaryChecksPassed = true;
          saveDB(sentDb);
        }
      } catch (mailError) {
        console.error("INTENDFLASH EMAIL ERROR:", mailError);
      }
    } else {
      console.log("INTENDFLASH email skipped: mail configuration/recipient missing.");
    }

    const resultLabel = `${result.ai.result} (${result.ai.score}/100)`;

    req.session.message =
      `NCC letter scanned: ${resultLabel}. ${recipient && MAIL_USER && MAIL_PASSWORD ? "Verification email processed." : "Email was not configured."}`;

    // Finish this request after the email attempt. The server itself stays running
    // so the application can receive the next student request.
    return res.redirect("/");

  } catch (err) {
    console.error(err);
    req.session.message = "The letter could not be processed.";
    return res.redirect("/");
  }
});
// =========================
// STUDENT PROFILE
// =========================

app.get("/profile", requireLogin, requireChangedPassword, (req, res) => {
  const student = currentStudent(req);
  if (!student) return res.redirect("/login");
  res.render("profile", { student, message: req.session.message || "" });
  delete req.session.message;
});

app.post("/profile", requireLogin, requireChangedPassword, (req, res) => {
  const db = loadDB();
  const student = db.students.find(s => s.rollNo === req.session.rollNo);
  if (!student) return res.redirect("/login");

  student.personalProfile = student.personalProfile || {};
  student.personalProfile.phone = String(req.body.phone || "").trim();
  student.personalProfile.personalEmail = String(req.body.personalEmail || "").trim();
  student.personalProfile.emergencyContact = String(req.body.emergencyContact || "").trim();
  saveDB(db);
  req.session.message = "Profile updated successfully.";
  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Friendly upload error handler.
app.use((err, _req, res, _next) => {
  console.error("INTENDFLASH REQUEST ERROR:", err);
  if (err instanceof multer.MulterError || err?.message?.includes("Only PDF")) {
    return res.status(400).send(`<h2>Upload error</h2><p>${String(err.message).replace(/[<>]/g, "")}</p><p><a href="/">Go back</a></p>`);
  }
  return res.status(500).send("Internal server error.");
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Academic Permission Portal running at http://127.0.0.1:${PORT}`);
});
