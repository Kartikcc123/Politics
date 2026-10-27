@echo off
cd /d "%~dp0"
if exist "dist\Politics CRM-win32-x64\Politics CRM.exe" (
  start "" "dist\Politics CRM-win32-x64\Politics CRM.exe"
) else if exist "Politics CRM.exe" (
  start "" "Politics CRM.exe"
)
exit
