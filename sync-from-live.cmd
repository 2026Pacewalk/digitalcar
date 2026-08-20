@echo off
REM ============================================================
REM  PULL the LIVE digitalcarda.in database DOWN into your local
REM  MySQL (127.0.0.1:3307). ONE-WAY: online is the source of truth.
REM
REM   digitalcarda.in (prod)  ==snapshot==>  your local copy
REM
REM  Your local edits ALWAYS stay local and NEVER touch production
REM  — the app talks to localhost:3307, and this only OVERWRITES
REM  that local copy with a fresh snapshot from live.
REM
REM  No passwords needed: it uses the mycarda_deploy SSH key on this
REM  machine and reads the DB password from the server's own .env.
REM  Make sure local MySQL (start-database.cmd) is running first.
REM ============================================================
cd /d "%~dp0"
node scripts\sync-from-live.mjs
echo.
pause
