@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\.bin\next.cmd" (
  echo Thor Guard Translator still needs its one-time setup.
  echo.
  echo Please return to Codex and say: Finish setting up my Thor Guard app.
  echo You will not need to type any commands.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:3000 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto ready

start "Thor Guard Translator" /min cmd /c "npm run dev > thor-guard.log 2>&1"
echo Opening Thor Guard Translator...

for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:3000 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto ready
  timeout /t 1 /nobreak >nul
)

echo The app took too long to start. Please return to Codex for help.
pause
exit /b 1

:ready
start "" "http://localhost:3000"
exit /b 0
