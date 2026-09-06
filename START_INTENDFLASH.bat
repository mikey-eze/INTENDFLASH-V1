@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo INTENDFLASH - GEMMA 3 AI STARTUP
echo =============================================

echo [1/3] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found.
  pause
  exit /b 1
)
node --version

echo [2/3] Checking Ollama Gemma 3...
where ollama >nul 2>nul
if errorlevel 1 (
  echo ERROR: Ollama was not found.
  echo Install Ollama, then run this file again.
  pause
  exit /b 1
)
ollama list
echo.
ollama list | findstr /i "gemma3" >nul 2>nul
if errorlevel 1 (
  echo ERROR: gemma3 was not found in Ollama.
  echo Expected installed model: gemma3:latest
  pause
  exit /b 1
)

echo [3/3] Starting INTENDFLASH...
echo PaddleOCR will be installed automatically by npm start if needed.
echo Vision AI: Ollama Gemma 3
echo =============================================
npm start
pause
