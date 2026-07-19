@echo off
REM 雙擊即可啟動本機伺服器，並自動開啟瀏覽器。
start "" http://localhost:8000
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
