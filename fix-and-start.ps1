# Fix ESLint cache issues and start the development server
Write-Host "Fixing ESLint cache issues..." -ForegroundColor Yellow

# Set location to project directory
Set-Location "e:\hassan projects\orglink-panels\organsystem"

# Clear corrupted cache
if (Test-Path "node_modules\.cache") {
    Write-Host "Removing corrupted cache..." -ForegroundColor Red
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "Cache cleared successfully" -ForegroundColor Green
} else {
    Write-Host "No cache directory found" -ForegroundColor Blue
}

# Clear npm cache as well
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "Starting development server..." -ForegroundColor Green
npm run start:clean
