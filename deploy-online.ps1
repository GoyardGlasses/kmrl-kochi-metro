# Online Deployment Helper Script
# This script helps prepare your project for online deployment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KMRL Online Deployment Preparation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is initialized
Write-Host "Checking Git repository..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    Write-Host "⚠ Git not initialized. Initializing..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✓ Git repository found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Generating secure JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "JWT_SECRET: $jwtSecret" -ForegroundColor Green
Write-Host ""
Write-Host "⚠ IMPORTANT: Save this JWT_SECRET! You'll need it for deployment." -ForegroundColor Yellow
Write-Host ""

# Check if code is committed
Write-Host "Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠ You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor White
    Write-Host ""
    $commit = Read-Host "Do you want to commit these changes? (y/n)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        git add .
        $message = Read-Host "Enter commit message (or press Enter for default)"
        if (-not $message) { $message = "Prepare for online deployment" }
        git commit -m $message
        Write-Host "✓ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "✓ All changes committed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Push to GitHub:" -ForegroundColor White
Write-Host "   git remote add origin <your-github-repo-url>" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Choose a deployment platform:" -ForegroundColor White
Write-Host "   - Railway.app (easiest): https://railway.app" -ForegroundColor Gray
Write-Host "   - Render.com (free tier): https://render.com" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Follow the guide in ONLINE_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "4. Set these environment variables:" -ForegroundColor White
Write-Host "   JWT_SECRET: $jwtSecret" -ForegroundColor Gray
Write-Host "   MONGODB_URI: <from-mongodb-atlas-or-railway>" -ForegroundColor Gray
Write-Host "   CORS_ORIGIN: <your-frontend-url>" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

