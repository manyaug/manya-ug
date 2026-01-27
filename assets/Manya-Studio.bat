@echo off
TITLE Manya Studio Launcher
COLOR 0A

echo ==========================================
echo      STARTING MANYA STUDIO SYSTEM...
echo ==========================================
echo.
echo 1. Starting Database Server (Port 3001)...
echo 2. Starting Interface (Port 5173)...
echo.

:: 1. Navigate to your project folder
cd "C:\Users\HP\OneDrive\Desktop\Manya-p7\cms-studio"

:: 2. Open the browser automatically after 5 seconds (giving server time to start)
timeout /t 5 >nul
start http://localhost:5173

:: 3. Run the Unified Command
npm start