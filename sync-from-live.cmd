@echo off
REM ============================================================
REM  PULL the LIVE digitalcarda.in database DOWN into your local
REM  MySQL (127.0.0.1:3307). ONE-WAY: online is the source of truth.
REM
REM   digitalcarda.in (prod)  ==snapshot==>  your local copy
REM
REM  Your local edits ALWAYS stay local and NEVER touch production
REM  — the app talks to localhost:3307, and this script only
REM  OVERWRITES that local copy with a fresh snapshot from live.
REM  (Do NOT use the 3310 tunnel line in .env; that writes to prod.)
REM
REM  Run this whenever you want your local data to match the live
REM  site. You'll be asked for the SERVER password once.
REM ============================================================
setlocal EnableExtensions

set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin"
set "DUMP=%~dp0.live-dump.sql"

REM --- Live DB password: from env var, else a gitignored .live-db-pass file ---
if "%LIVE_DB_PASSWORD%"=="" if exist "%~dp0.live-db-pass" set /p LIVE_DB_PASSWORD=<"%~dp0.live-db-pass"
if "%LIVE_DB_PASSWORD%"=="" (
  echo.
  echo  The live database password is not set.
  echo  Either set the LIVE_DB_PASSWORD environment variable, or create a file
  echo  named  .live-db-pass  next to this script containing just the password.
  echo.
  pause
  exit /b 1
)

REM --- Make sure the local MySQL is up ---
"%MYSQL_BIN%\mysql.exe" -h 127.0.0.1 -P 3307 -u root -proot -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Local MySQL (port 3307) is not running. Start it first ^(start-database.cmd^).
  echo.
  pause
  exit /b 1
)

echo.
echo  Dumping the LIVE database from digitalcarda.in ...
echo  ^(Enter the SERVER password when prompted.^)
echo.
ssh -p 22587 root@163.227.92.219 "MYSQL_PWD='%LIVE_DB_PASSWORD%' mysqldump --single-transaction --no-tablespaces --routines --triggers -u digitalcarda digitalcarda" > "%DUMP%"
if errorlevel 1 (
  echo  Dump failed ^(wrong server/DB password, or no connection^).
  if exist "%DUMP%" del "%DUMP%"
  pause
  exit /b 1
)

for %%A in ("%DUMP%") do set SIZE=%%~zA
if "%SIZE%"=="0" (
  echo  The dump is empty — check the live DB password. Aborting ^(local data untouched^).
  del "%DUMP%"
  pause
  exit /b 1
)

echo  Importing the snapshot into your local database ^(localhost:3307^) ...
"%MYSQL_BIN%\mysql.exe" -h 127.0.0.1 -P 3307 -u root -proot digitalcarda < "%DUMP%"
if errorlevel 1 (
  echo  Import failed.
  pause
  exit /b 1
)

del "%DUMP%"
powershell -NoProfile -Command "(Get-Date).ToString('o') | Set-Content -NoNewline '%~dp0.last-live-sync'" >nul 2>&1
echo.
echo  Done. Your local database now matches digitalcarda.in.
echo  Any local changes you had were replaced by the live snapshot.
echo.
pause
