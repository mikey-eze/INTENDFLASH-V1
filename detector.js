const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const { analyzeWithVision, OLLAMA_MODEL } = require('./ai_vision');

const REFERENCE_DIR = path.join(__dirname, 'reference');
const SIGNATURE_REFERENCE = path.join(REFERENCE_DIR, 'ncc-signature.png');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function normalizeRoll(text) { return String(text||'').toUpperCase().replace(/\s+/g,'').replace(/O/g,'0').replace(/Q/g,'0').replace(/D/g,'0').replace(/I/g,'1').replace(/L/g,'1').replace(/[^A-Z0-9]/g,''); }
function normalizeCandidate(value, expected) {
  const s=String(value||'').toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9]/g,''); const e=String(expected||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(s.length!==e.length)return s; let out='';
  for(let i=0;i<s.length;i++){let c=s[i]; if(/\d/.test(e[i])){if(c==='S')c='5';if('OQD'.includes(c))c='0';if('IL'.includes(c))c='1';if(c==='Z')c='2';}out+=c;} return out;
}
function findRollNumber(text, expectedRoll){
  const e=String(expectedRoll||'').toUpperCase().replace(/[^A-Z0-9]/g,''); const raw=String(text||'').toUpperCase();
  const candidates=(raw.match(/[A-Z0-9]{5,24}/g)||[]).concat(raw.split(/\s+/));
  for(const token of candidates){if(normalizeCandidate(token,e)===e)return{matched:true,type:'OCR_MATCH',detected:e};}
  const compact=raw.replace(/[^A-Z0-9]/g,''); if(normalizeCandidate(compact,e).includes(e))return{matched:true,type:'OCR_COMPACT',detected:e};
  return{matched:false,type:'NONE',detected:null};
}
function normalizeNameWord(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S")
    .replace(/8/g, "B")
    .replace(/OO/g, "U")
    .replace(/[^A-Z]/g, "");
}
function nameWords(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[.,'’"()\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(normalizeNameWord)
    .filter(Boolean)
    .filter(w => w.length > 1); // ignore single-letter initials such as P.
}
function levenshtein(a,b){
  const prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++){
      cur[j]=Math.min(cur[j-1]+1, prev[j]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    for(let j=0;j<=b.length;j++) prev[j]=cur[j];
  }
  return prev[b.length];
}
function wordSimilarity(a,b){
  a=normalizeNameWord(a); b=normalizeNameWord(b);
  if(!a||!b) return 0;
  if(a===b) return 1;
  if(a.length<3||b.length<3) return 0;
  return 1-levenshtein(a,b)/Math.max(a.length,b.length);
}
function nameSimilarity(expected, detected) {
  const a=nameWords(expected), b=nameWords(detected);
  if(!a.length||!b.length) return {matched:false,similarity:0,overlap:0};
  let overlap=0, matchedWords=[];
  const compactDetected=b.join('');
  for(const ew of a){
    const exactInCompact=compactDetected.includes(ew);
    const best=Math.max(...b.map(dw=>wordSimilarity(ew,dw)));
    if(exactInCompact || best>=0.70){ overlap++; matchedWords.push(ew); }
  }
  const coverageExpected=overlap/a.length;
  const coverageDetected=overlap/b.length;
  // Require substantial coverage of the registered name. This allows:
  // "Sai Swarup Reddy Polu" <-> "P. Sai Swaroop Reddy"
  // while rejecting matches based on one common first/last name.
  const minimumOverlap=a.length>=4 ? 3 : Math.min(2,a.length);
  const matched =
    overlap>=minimumOverlap &&
    coverageExpected>=0.67 &&
    coverageDetected>=0.50;
  const similarity=Math.round(((coverageExpected+Math.min(1,coverageDetected))/2)*100);
  return {matched,similarity,expected,detected,overlap,matchedWords};
}
function findStudentName(text, expectedName){
  const expected=nameWords(expectedName);
  if(!expected.length) return {matched:false,detected:null,type:"NO_EXPECTED",similarity:0};
  const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let best={matched:false,detected:null,type:"NONE",similarity:0,overlap:0};
  for(const line of lines){
    const r=nameSimilarity(expectedName,line);
    if(r.similarity>best.similarity) best={...r,detected:line,type:"TOKEN_FUZZY"};
    if(r.matched) best={...r,detected:line,type:"TOKEN_FUZZY"};
  }
  return best;
}
function getIndiaToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function parseDateParts(value){
 const m=String(value||'').match(/(\d{1,2})\s*[-\/.]\s*(\d{1,2})\s*[-\/.]\s*(\d{2,4})/);
 if(m){let y=Number(m[3]);if(y<100)y+=2000;return {d:Number(m[1]),m:Number(m[2]),y};}
 const n=String(value||'').match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,12})\s+(\d{4})/);
 if(n){const months={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};const key=n[2].toLowerCase();const mm=months[key]||months[Object.keys(months).find(x=>x.startsWith(key))];if(mm)return{d:Number(n[1]),m:mm,y:Number(n[3])};}
 const n2=String(value||'').match(/([A-Za-z]{3,12})\s+(\d{1,2}),?\s+(\d{4})/);
 if(n2){const months={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};const key=n2[1].toLowerCase();const mm=months[key]||months[Object.keys(months).find(x=>x.startsWith(key))];if(mm)return{d:Number(n2[2]),m:mm,y:Number(n2[3])};}
 return null;
}
function dateMatchesToday(dates){
 const today=getIndiaToday();
 const [ty,tm,td]=today.split('-').map(Number);
 const parsed=dates.map(parseDateParts).filter(Boolean);
 const exact=parsed.some(x=>x.y===ty&&x.m===tm&&x.d===td);
 // If two dates are present and they form a sensible inclusive range, accept a permission period covering today.
 let range=false;
 for(let i=0;i<parsed.length;i++)for(let j=i+1;j<parsed.length;j++){
   const a=new Date(parsed[i].y,parsed[i].m-1,parsed[i].d),b=new Date(parsed[j].y,parsed[j].m-1,parsed[j].d),t=new Date(ty,tm-1,td);
   const lo=a<b?a:b,hi=a<b?b:a;if(t>=lo&&t<=hi)range=true;
 }
 return {today:`${String(td).padStart(2,'0')}-${String(tm).padStart(2,'0')}-${ty}`,matched:exact||range,mode:exact?'EXACT TODAY':range?'WITHIN PERMISSION PERIOD':'NO TODAY MATCH'};
}
function detectEvidence(text){
 const l=String(text||'').toLowerCase();
 const dates=(l.match(/\b\d{1,2}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,12}\s+\d{4}\b|\b[a-z]{3,12}\s+\d{1,2},?\s+\d{4}\b/g)||[]);
 return {
  ncc:/\bn\.?c\.?c\.?\b|national\s+cadet\s+corps|cadets?/.test(l),
  attendance:/attendance|present|absence|absent|consider.{0,80}attendance|provide.{0,80}attendance/.test(l),
  activity:/independence\s*day|tiranga\s*rally|rally|parade|camp|training|celebrat(?:ion|ions)|programme|program(?:me)?|function|participat(?:e|ion)|ceremony|ncc\s+activity/.test(l),
  dates:[...new Set(dates)],
  authority:/registrar|principal|dean|officer\s+commanding|commanding\s+officer|coordinator|ano|hod|head\s+of\s+department|authorized|authorised/.test(l)
 };
}

async function prepareImages(documentPath,tempDir){
 const ext=path.extname(documentPath).toLowerCase(); const images=[]; let first;
 if(ext==='.pdf'){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'); const {createCanvas}=require('@napi-rs/canvas');
  const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(documentPath)),useSystemFonts:true}).promise;
  for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const vp=p.getViewport({scale:2.5});const c=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height));await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;const raw=c.toBuffer('image/png');const rp=path.join(tempDir,`page-${i}.png`);fs.writeFileSync(rp,raw);const ep=path.join(tempDir,`page-${i}-enhanced.png`);await sharp(raw).resize({width:1800,withoutEnlargement:true}).grayscale().normalize().sharpen().png().toFile(ep);images.push(ep);if(!first)first=raw;}
 } else if(['.png','.jpg','.jpeg'].includes(ext)){const raw=fs.readFileSync(documentPath);const rp=path.join(tempDir,'document.png');fs.writeFileSync(rp,raw);const ep=path.join(tempDir,'document-enhanced.png');await sharp(raw).resize({width:1800,withoutEnlargement:true}).grayscale().normalize().sharpen().png().toFile(ep);images.push(ep);first=raw;} else throw new Error('Unsupported file type: '+ext);
 return {images,first};
}
function pythonCommand(){const c=[path.join(__dirname,'.venv','Scripts','python.exe'),path.join(__dirname,'.venv','bin','python'),process.env.PYTHON||'python'];return c.find(x=>x==='python'||x===process.env.PYTHON||fs.existsSync(x))||'python';}
function runPaddleOCR(images){return new Promise((resolve,reject)=>{const td=fs.mkdtempSync(path.join(os.tmpdir(),'intendflash-paddle-'));const rq=path.join(td,'request.json');fs.writeFileSync(rq,JSON.stringify({images}));const child=spawn(pythonCommand(),[path.join(__dirname,'paddle_ocr.py'),rq],{windowsHide:true});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>{try{fs.rmSync(td,{recursive:true,force:true});}catch(_){} if(code!==0)return reject(new Error(err||out||`PaddleOCR exit ${code}`));try{const j=JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop()||'{}');if(!j.ok)throw new Error(j.error||'PaddleOCR failed');resolve(j);}catch(e){reject(new Error(e.message+'\n'+out));}});});}
function collectText(o){return(o.pages||[]).flatMap(p=>(p.items||[]).map(i=>i.text)).join('\n');}

async function makeMask(buffer, mode){const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});const out=Buffer.alloc(info.width*info.height);for(let i=0,p=0;i<data.length;i+=4,p++){const r=data[i],g=data[i+1],b=data[i+2];let k=false;if(mode==='blue')k=b>r*1.05&&b>g*1.01&&b<250;else if(mode==='green')k=g>r*1.04&&g>b*1.01&&g<250;else{k=Math.max(r,g,b)<180;}out[p]=k?255:0;}return sharp(out,{raw:{width:info.width,height:info.height,channels:1}}).png().toBuffer();}
async function feature(buffer,modes){let best=null;for(const m of modes){const mask=await makeMask(buffer,m);const x=await sharp(mask).trim({background:{r:0,g:0,b:0}}).resize(192,128,{fit:'contain',background:{r:0,g:0,b:0}}).raw().toBuffer();let ink=0;for(const v of x)if(v>127)ink++;if(ink<30)continue;const v=new Float32Array(x.length);for(let i=0;i<x.length;i++)v[i]=x[i]>127?1:0;best=best&&best.ink>ink?best:{v,ink};}return best;}
function dice(a,b){let i=0,aa=0,bb=0;for(let k=0;k<a.length;k++){aa+=a[k];bb+=b[k];if(a[k]&&b[k])i++;}return aa+bb?2*i/(aa+bb):0;}
async function compareReference(candidateBuffer,referencePath,modes){const [a,b]=await Promise.all([feature(candidateBuffer,modes),feature(fs.readFileSync(referencePath),modes)]);if(!a||!b)return{detected:false,similarity:0};return{detected:true,similarity:Math.round(dice(a.v,b.v)*100)};}
async function detectApprovalEvidence(pageBuffer, vision) {
  const normalized=await sharp(pageBuffer).resize(669,825,{fit:'fill'}).png().toBuffer();

  // These are PRESENCE regions only. We never use the write-up as a handwriting identity reference.
  const writeupRegion=await sharp(normalized).extract({left:0,top:540,width:430,height:285}).png().toBuffer();
  const signatureRegion=await sharp(normalized).extract({left:220,top:520,width:449,height:305}).png().toBuffer();

  const writeFeature=await feature(writeupRegion,['blue','dark']);
  const signatureFeature=await feature(signatureRegion,['green','blue','dark']);

  const writeupInkDetected=!!writeFeature;
  const visualSignatureDetected=!!signatureFeature;

  let signatureSimilarity=0;
  if (visualSignatureDetected && fs.existsSync(SIGNATURE_REFERENCE)) {
    const comparison=await compareReference(signatureRegion,SIGNATURE_REFERENCE,['green','blue','dark']);
    signatureSimilarity=comparison.similarity||0;
  }

  const visionWriteup=vision?.permission_writeup_present === true;
  const visionSignature=vision?.signature_present === true;

  const writeup={
    detected:writeupInkDetected || visionWriteup,
    similarity:null,
    method:visionWriteup?'gemma-vision':writeupInkDetected?'visual-ink-presence':'not-detected'
  };

  const signature={
    // Signature PRESENCE is the primary check. Similarity is supporting evidence only.
    detected:visualSignatureDetected || visionSignature,
    similarity:signatureSimilarity,
    method:visionSignature?'gemma-vision':visualSignatureDetected?'visual-ink-presence':'not-detected',
    referenceUsed:fs.existsSync(SIGNATURE_REFERENCE),
    referenceNote:'Visual similarity supports review; it does not prove authenticity.'
  };

  return {writeup,signature};
}

function finalScore(roll,name,evidence,approval,vision){
  const primary = {
    name: !!name.matched,
    roll: !!roll.matched,
    event: !!evidence.activity,
    signature: !!approval.signature.detected,
    writeup: !!approval.writeup.detected
  };

  const secondary = {
    ncc: !!evidence.ncc,
    attendance: !!evidence.attendance,
    dates: Array.isArray(evidence.dates) && evidence.dates.length>0,
    authority: !!evidence.authority,
    format: vision?.format_match === true
  };

  let score=0;
  score += primary.name ? 20 : 0;
  score += primary.roll ? 20 : 0;
  score += primary.event ? 15 : 0;
  score += primary.signature ? 15 : 0;
  score += primary.writeup ? 15 : 0;
  score += secondary.ncc ? 3 : 0;
  score += secondary.attendance ? 3 : 0;
  score += secondary.dates ? 3 : 0;
  score += secondary.authority ? 2 : 0;
  score += secondary.format ? 4 : 0;

  const primaryPassed=Object.values(primary).every(Boolean);
  const secondaryPassed=Object.values(secondary).every(Boolean);
  const result=!vision || !vision.available
    ? 'AI UNAVAILABLE — REVIEW REQUIRED'
    : primaryPassed
      ? 'APPEARS VALID'
      : 'INVALID';

  return {score, result, primary, secondary, primaryPassed, secondaryPassed};
}

async function analyzeDocument(documentPath,student){
 const start=Date.now();const td=fs.mkdtempSync(path.join(os.tmpdir(),'intendflash-doc-'));
 try{
  console.log('');console.log('========================================');console.log('🤖 INTENDFLASH AI VERIFICATION STARTED');console.log('========================================');console.log('📄 Document:',path.basename(documentPath));
  const {images,first}=await prepareImages(documentPath,td);console.log('🖼️ Pages prepared:',images.length);
  console.log('🔤 Starting PaddleOCR...');const ocr=await runPaddleOCR(images);const text=collectText(ocr);console.log('✅ PaddleOCR finished | characters:',text.length,'| blocks:',(ocr.pages||[]).reduce((n,p)=>n+(p.items||[]).length,0));console.log('');console.log('----------- OCR PREVIEW -----------');console.log(text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,' ').slice(0,2500)||'[NO OCR TEXT]');console.log('-----------------------------------');
  const roll=findRollNumber(text,student.rollNo);const nameOCR=findStudentName(text,student.name);const evidenceOCR=detectEvidence(text);console.log('🔍 OCR checks:',JSON.stringify({expectedName:student.name,detectedName:nameOCR.detected,name:nameOCR.matched,expectedRoll:student.rollNo,roll:roll.matched,ncc:evidenceOCR.ncc,attendance:evidenceOCR.attendance,activity:evidenceOCR.activity,dates:evidenceOCR.dates.length,authority:evidenceOCR.authority}));
  console.log('🧠 Starting REAL vision AI:',OLLAMA_MODEL);let vision={available:false};try{vision=await analyzeWithVision(first,text,student);vision.available=true;console.log('✅ Vision AI completed.');}catch(e){console.log('❌ Vision AI unavailable:',e.message);vision={available:false,error:e.message};}
  const visionName=findStudentName(String(vision.name_seen||''),student.name);
  const name={...nameOCR,matched:nameOCR.matched||vision.name_match===true||visionName.matched,detected:nameOCR.detected||vision.name_seen||visionName.detected};
  const mergedDates=evidenceOCR.dates.length?evidenceOCR.dates:(vision.dates_seen||[]);
  const todayMatch=dateMatchesToday(mergedDates);
  const mergedEvidence={...evidenceOCR,ncc:evidenceOCR.ncc||(vision.ncc_context===true),attendance:evidenceOCR.attendance||(vision.attendance_permission===true),activity:evidenceOCR.activity||(vision.activity_event===true),authority:evidenceOCR.authority||(vision.authority_present===true),eventSeen:vision.event_seen||'',formatMatch:vision.format_match===true,dates:mergedDates,todayMatch};
  console.log('✍️ Comparing reference write-up/signature...');const approval=await detectApprovalEvidence(first,vision);console.log(`   Permission write-up: ${approval.writeup.detected?'DETECTED':'NOT DETECTED'} | Signature: ${approval.signature.similarity}%`);
  const mergedRoll={...roll,matched:roll.matched||vision.roll_match===true};
  const validation=finalScore(mergedRoll,name,mergedEvidence,approval,vision);
  console.log('📅 TODAY CHECK:', todayMatch.today, '—', todayMatch.mode);console.log('🧾 FINAL ID CHECK:', JSON.stringify({name:name.matched,detectedName:name.detected,roll:mergedRoll.matched,detectedRoll:mergedRoll.detected,event:mergedEvidence.activity,signature:approval.signature.detected,writeup:approval.writeup.detected}));console.log('========================================');console.log(`🎯 FINAL: ${validation.score}/100 — ${validation.result}`);console.log('========================================');
  return {score:validation.score,result:validation.result,nameMatch:name,rollMatch:mergedRoll,evidence:mergedEvidence,approvalEvidence:approval,handwriting:approval,visionAI:vision,primaryChecks:validation.primary,secondaryChecks:validation.secondary,mandatoryChecks:validation.primary,ocrText:text,processingTimeMs:Date.now()-start,time:((Date.now()-start)/1000).toFixed(1)};
 }finally{try{fs.rmSync(td,{recursive:true,force:true});}catch(_){} }
}
module.exports={analyzeDocument,detectNCCLetter:analyzeDocument};
