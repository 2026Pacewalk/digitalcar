@echo off
REM ── Starts the local DigitalCarda MySQL database (port 3307) ──
REM Leave this window OPEN while you use the app. Close it to stop the database.
echo Starting local MySQL for DigitalCarda on port 3307...
echo (Keep this window open. Press Ctrl+C or close it to stop the database.)
echo.
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --basedir="C:\Program Files\MySQL\MySQL Server 8.4" --datadir="%~dp0.localdb\data" --port=3307 --mysqlx=0 --console
