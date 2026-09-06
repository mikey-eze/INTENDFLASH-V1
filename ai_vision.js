const fs = require('fs');
const http = require('http');
const sharp = require('sharp');
const path = require('path');

const OLLAMA_HOST = process.env.OLLAMA_HOST || '127.0.0.1';
const OLLAMA_PORT = Number(process.env.OLLAMA_PORT || 11434);
const REQUESTED_MODEL = (process.env.OLLAMA_MODEL || 'gemma3:latest').trim();
let resolvedModel = null;

function requestJson(method, path, body = null, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : JSON.stringify(body);
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path,
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      timeout: timeoutMs
    }, res => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', d => out += d);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Ollama HTTP ${res.statusCode}: ${out.slice(0, 600)}`));
        }
        try { resolve(JSON.parse(out)); }
        catch (_) { reject(new Error(`Invalid Ollama JSON: ${out.slice(0, 600)}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Ollama request timed out')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function postJson(path, body, timeoutMs) {
  return requestJson('POST', path, body, timeoutMs);
}

function extractJson(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch (_) {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (_) { return null; }
}

async function getInstalledModels() {
  const result = await requestJson('GET', '/api/tags', null, 10000);
  return Array.isArray(result.models) ? result.models : [];
}

async function modelHasVision(name) {
  try {
    const info = await postJson('/api/show', { name }, 10000);
    if (Array.isArray(info.capabilities) && info.capabilities.some(x => String(x).toLowerCase() === 'vision')) return true;
    const template = JSON.stringify(info).toLowerCase();
    return template.includes('vision') || template.includes('image') || /gemma3/i.test(name);
  } catch (_) {
    return /gemma3/i.test(name);
  }
}

async function resolveVisionModel() {
  if (resolvedModel) return resolvedModel;

  const models = await getInstalledModels();
  if (!models.length) throw new Error('No Ollama models are installed. Run "ollama list".');

  if (REQUESTED_MODEL && REQUESTED_MODEL.toLowerCase() !== 'auto') {
    const exact = models.find(m => m.name === REQUESTED_MODEL);
    if (!exact) throw new Error(`Configured Ollama model "${REQUESTED_MODEL}" is not installed.`);
    if (!(await modelHasVision(exact.name))) throw new Error(`Configured Ollama model "${exact.name}" does not appear to support vision.`);
    resolvedModel = exact.name;
    return resolvedModel;
  }

  // INTENDFLASH is configured for the user's installed Gemma 3 model.
  const gemma3 = models.filter(m => /gemma3/i.test(m.name));
  for (const model of gemma3) {
    if (await modelHasVision(model.name)) {
      resolvedModel = model.name;
      return resolvedModel;
    }
  }

  throw new Error('No vision-capable Gemma 3 model was found. Run "ollama list" and make sure gemma3 is installed.');
}

async function checkOllama() {
  try {
    const model = await resolveVisionModel();
    await postJson('/api/generate', {
      model,
      prompt: 'Reply only with OK.',
      stream: false,
      options: { temperature: 0 }
    }, 20000);
    return true;
  } catch (_) {
    return false;
  }
}

async function analyzeWithVision(imagePath, ocrText, student) {
  if (!fs.existsSync(imagePath)) throw new Error('AI image not found: ' + imagePath);
  const model = await resolveVisionModel();

  const documentBuffer = await sharp(imagePath)
    .resize({ width: 1280, height: 1650, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const referencePath = path.join(__dirname,'reference','ncc-reference-letter.png');
  let referenceImage=null;
  if(fs.existsSync(referencePath)){
    referenceImage=await sharp(referencePath)
      .resize({ width: 900, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 76 })
      .toBuffer();
  }

  const images=[documentBuffer.toString('base64')];
  if(referenceImage) images.push(referenceImage.toString('base64'));

  const prompt = `You are the intelligent document-verification layer for INTENDFLASH, a college NCC permission-letter system.

IMAGE 1 is the SUBMITTED permission letter.
IMAGE 2, when supplied, is the genuine NCC REFERENCE LETTER used ONLY for institutional DOCUMENT STRUCTURE / FORMAT comparison.

Inspect the ENTIRE submitted page yourself: header, body, cadet table, dates, authority area, signature/approval, and handwritten permission/attendance write-up.
OCR is supporting evidence only. Do not invent facts.

Registered student:
name="${student.name}"
roll="${student.rollNo}"

Return ONLY valid JSON with exactly:
{
  "document_type":"...",
  "name_match":true/false,
  "roll_match":true/false,
  "ncc_context":true/false,
  "attendance_permission":true/false,
  "activity_event":true/false,
  "dates_present":true/false,
  "authority_present":true/false,
  "signature_present":true/false,
  "format_match":true/false,
  "permission_writeup_present":true/false,
  "event_seen":"...",
  "name_seen":"...",
  "roll_seen":"...",
  "dates_seen":["..."],
  "reasons":["..."],
  "warnings":["..."]
}

Rules:
- name_match: find the registered student in the cadet/student table or relevant identity text. Allow minor OCR/spacing errors and initials, but do not accept a different student's name.
- roll_match: exact registered roll, allowing obvious OCR character confusions only. Do not accept a different roll number.
- ncc_context: meaningful NCC/National Cadet Corps/cadet evidence.
- attendance_permission: permission/attendance/absence consideration wording.
- activity_event: a real event/activity such as Independence Day, rally, parade, camp, training, celebration, programme, ceremony or participation.
- dates_present: at least one credible date. Put clearly readable dates in dates_seen.
- authority_present: authority identity/details or an approval area is visible.
- signature_present: a genuine-looking authority signature/approval mark is visibly present in the expected approval area. Typed authority text alone is NOT enough.
- permission_writeup_present: the handwritten permission/attendance note is visibly present in the expected approval/request area and its content supports the attendance/permission request. DO NOT judge handwriting identity or handwriting similarity.
- format_match: compare ONLY the overall institutional structure against IMAGE 2. Do not compare handwriting for this field.
- A signature similarity score is NOT part of this vision decision; signature visual comparison is supporting evidence handled separately.
- If today's date is outside an older permission period, do not call that fake by itself.

OCR TEXT:
${String(ocrText || '').slice(0,12000)}`;

  const result = await postJson('/api/generate', {
    model,
    prompt,
    images,
    stream:false,
    format:'json',
    keep_alive:'10m',
    options:{temperature:0, num_predict:420}
  }, 120000);

  const parsed=extractJson(result.response);
  if(!parsed) throw new Error('Gemma 3 returned no valid JSON');
  return {model,...parsed};
}

module.exports = {
  analyzeWithVision,
  checkOllama,
  getVisionModel: resolveVisionModel,
  get OLLAMA_MODEL() { return resolvedModel || (REQUESTED_MODEL.toLowerCase() === 'auto' ? 'auto (Gemma 3)' : REQUESTED_MODEL); }
};
