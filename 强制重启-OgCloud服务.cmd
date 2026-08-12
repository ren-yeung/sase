@echo off
chcp 65001 >nul
cd /d C:\Users\10032\WorkBuddy\anquan
echo 正在关闭占用 4173 端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4173"') do taskkill /PID %%a /F
timeout /t 2 /nobreak >nul
echo 正在启动 OgCloud 本地服务...
start "" "C:\Users\10032\WorkBuddy\anquan\双击启动-OgCloud服务.cmd"
