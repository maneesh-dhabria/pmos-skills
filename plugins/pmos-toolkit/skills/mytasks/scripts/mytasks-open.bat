@echo off
REM mytasks-open.bat — Windows launcher for the /mytasks web UI.
REM Precheck node, reuse a live serve.js via .pmos-serve.pid, else spawn fresh, open the browser.
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo mytasks-open: node not found - install Node ^>=18 ^(https://nodejs.org^) 1>&2
  exit /b 127
)
set "PID_FILE=.pmos-serve.pid"
set "PORT="
if exist "%PID_FILE%" (
  for /f "delims=" %%p in ('node -e "try{const j=JSON.parse(require('fs').readFileSync('.pmos-serve.pid','utf8'));process.stdout.write(String(j.port))}catch(e){}"') do set "PORT=%%p"
)
if "%PORT%"=="" (
  start "" /b node serve.js --port=0 --pid-file="%PID_FILE%" --idle=300
  for /l %%i in (1,1,20) do (
    if exist "%PID_FILE%" goto havepid
    ping -n 1 127.0.0.1 >nul
  )
  :havepid
  for /f "delims=" %%p in ('node -e "try{const j=JSON.parse(require('fs').readFileSync('.pmos-serve.pid','utf8'));process.stdout.write(String(j.port))}catch(e){}"') do set "PORT=%%p"
)
if "%PORT%"=="" (
  echo mytasks-open: serve.js did not write pid file 1>&2
  exit /b 1
)
set "URL=http://127.0.0.1:%PORT%/"
echo mytasks-open: opening %URL% 1>&2
start "" "%URL%"
endlocal
