const path = require("path");
const { analyzeDocument } = require("./detector");

const student = {
  name: process.argv[3] || "P. Sai Swaroop Reddy",
  rollNo: process.argv[4] || "25MRA05227"
};

const file = path.resolve(process.argv[2] || path.join(__dirname, "ai-test-samples", "ncc-letter.pdf"));

(async () => {
  console.log("======================================");
  console.log(" INTENDFLASH UNIFIED AI DETECTOR TEST");
  console.log("======================================");
  console.log("Student:", student.name);
  console.log("Expected Roll:", student.rollNo);
  console.log("Document:", file);

  const result = await analyzeDocument(file, student);

  console.log("\nNAME:", result.nameMatch.matched ? "YES ✓" : "NO ✗");
  console.log("ROLL NUMBER:", result.rollMatch.matched ? "YES ✓" : "NO ✗");
  console.log("Match Type:", result.rollMatch.type);
  console.log("Detected:", result.rollMatch.detected || "None");
  console.log("NCC:", result.evidence.ncc ? "YES ✓" : "NO ✗");
  console.log("Attendance:", result.evidence.attendance ? "YES ✓" : "NO ✗");
  console.log("Activity:", result.evidence.activity ? "YES ✓" : "NO ✗");
  console.log("Dates:", result.evidence.dates.join(", ") || "None");
  console.log("Authority:", result.evidence.authority ? "YES ✓" : "NO ✗");
  console.log("Write-up similarity:", result.handwriting.writeup.similarity + "%", result.handwriting.writeup.detected ? "✓" : "✗");
  console.log("Signature similarity:", result.handwriting.signature.similarity + "%", result.handwriting.signature.detected ? "✓" : "✗");
  console.log("\nSCORE:", result.score, "/ 100");
  console.log("RESULT:", result.result);
  console.log("TIME:", result.time, "seconds");
  console.log("======================================");
})().catch(err => {
  console.error("DETECTOR ERROR:", err);
  process.exit(1);
});
