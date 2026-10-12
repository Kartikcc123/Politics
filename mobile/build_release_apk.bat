@echo off
set GRADLE_USER_HOME=D:\.gradle
set TEMP=D:\tmp
set TMP=D:\tmp
if not exist D:\tmp mkdir D:\tmp
if not exist D:\.gradle mkdir D:\.gradle
echo === BUILDING UNIVERSAL FAT RELEASE APK (FOR ALL PHONES / ARCHITECTURES) ===
call flutter build apk --release --no-tree-shake-icons
if %ERRORLEVEL% EQU 0 (
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "..\Politics-app-universal-release.apk"
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "..\Politics-app-release.apk"
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "D:\Politics-app-release.apk"
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "D:\Politics-app-universal-release.apk"
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "..\..\Politics-app-release.apk"
    echo === UNIVERSAL BUILD COMPLETED SUCCESSFULLY AND COPIED TO D DRIVE ===
) else (
    echo === BUILD FAILED ===
)
