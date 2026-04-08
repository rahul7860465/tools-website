@echo off
cd /d "%~dp0"
echo Starting Ollama bridge on http://127.0.0.1:11435 ...
npm run ai:bridge
