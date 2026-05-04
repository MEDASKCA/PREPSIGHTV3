@echo off
cd /d C:\Users\forda\PrepSightSaaS\prepsight-portal-vnext
set PORT=3000
call npm.cmd run dev >> dev-3000.console.log 2>&1
