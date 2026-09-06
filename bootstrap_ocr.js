const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const venvPython = path.join(root, '.venv', 'Scripts', 'python.exe');

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, windowsHide: false });
  if (r.error) return { ok: false, code: -1, error: r.error.message };
  return { ok: r.status === 0, code: r.status };
}

function canRun(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: false, windowsHide: true });
  return !r.error && r.status === 0;
}

function pythonVersion(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: false, windowsHide: true });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || '').trim();
}

if (fs.existsSync(venvPython)) {
  if (canRun(venvPython, ['-c', 'import paddleocr, paddle'])) {
    console.log('PaddleOCR environment: READY');
    process.exit(0);
  }
  console.log('PaddleOCR environment exists but dependencies are incomplete. Repairing...');
} else {
  console.log('PaddleOCR environment not found. Creating a supported Python 3.12/3.11 environment...');
}

let launcher = null;
for (const ver of ['3.12', '3.11']) {
  if (canRun('py', [`-${ver}`, '--version'])) { launcher = ['py', `-${ver}`]; break; }
}

if (!launcher && canRun('python', ['--version'])) {
  const v = pythonVersion('python', ['--version']) || '';
  if (/Python 3\.(11|12)\./.test(v)) launcher = ['python'];
}

if (!launcher) {
  console.error('\nERROR: INTENDFLASH needs Python 3.11 or 3.12 for PaddleOCR.');
  console.error('Your system does not have a supported Python launcher available.');
  console.error('Install Python 3.12 from python.org, make sure the Python Launcher (py.exe) is installed, then run npm start again.');
  process.exit(1);
}

if (!fs.existsSync(venvPython)) {
  const r = run(launcher[0], [...launcher.slice(1), '-m', 'venv', '.venv']);
  if (!r.ok) {
    console.error('Could not create the Python virtual environment.');
    process.exit(1);
  }
}

let r = run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
if (!r.ok) process.exit(1);

r = run(venvPython, ['-m', 'pip', 'install', 'paddlepaddle==3.2.0', '-i', 'https://www.paddlepaddle.org.cn/packages/stable/cpu/']);
if (!r.ok) {
  console.error('PaddlePaddle installation failed. Check your internet connection and Python version.');
  process.exit(1);
}

r = run(venvPython, ['-m', 'pip', 'install', 'paddleocr==3.3.0']);
if (!r.ok) {
  console.error('PaddleOCR installation failed.');
  process.exit(1);
}

if (!canRun(venvPython, ['-c', 'import paddleocr, paddle'])) {
  console.error('PaddleOCR installation completed but the modules cannot be imported.');
  process.exit(1);
}

console.log('PaddleOCR environment: READY');
