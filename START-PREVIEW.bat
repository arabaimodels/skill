@echo off
cd /d "%~dp0"
start "" "http://localhost:8767/"
py -m http.server 8767
if errorlevel 1 python -m http.server 8767
pause
