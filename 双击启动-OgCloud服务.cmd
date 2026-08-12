@echo off
chcp 65001 >nul
cd /d C:\Users\10032\WorkBuddy\anquan
netstat -ano | findstr ":4173" >nul
if %errorlevel% equ 0 (
    echo [警告] 4173 端口已被占用，服务可能已在运行。
    echo 如果页面打不开，请双击"强制重启-OgCloud服务.cmd"。
    pause
    exit /b 1
)
"C:\Users\10032\.workbuddy\binaries\node\versions\22.22.2\node.exe" server/server.js
pause
