@echo off
echo Fixing ESLint cache issues...

REM Clear ESLint cache
if exist "node_modules\.cache" (
    echo Removing corrupted cache...
    rmdir /s /q "node_modules\.cache"
    echo Cache cleared successfully
) else (
    echo No cache directory found
)

REM Create a new cache directory
mkdir "node_modules\.cache" 2>nul

echo Starting development server...
npm start

pause
