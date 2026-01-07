# KMRL Deployment Script for Windows PowerShell
# This script helps deploy the KMRL website using Docker

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KMRL Website Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://docker.com" -ForegroundColor Yellow
    exit 1
}

# Check if Docker daemon is running
Write-Host "Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check again
    try {
        docker ps | Out-Null
        Write-Host "✓ Docker daemon is now running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Docker daemon still not running. Please start Docker Desktop manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker compose down 2>$null

Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Build and start
docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Services are starting up. Please wait 30-60 seconds for all services to be ready." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Access your website at:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost:8080" -ForegroundColor White
    Write-Host "  Backend API: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor Cyan
    Write-Host "  docker compose logs -f" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop services:" -ForegroundColor Cyan
    Write-Host "  docker compose down" -ForegroundColor White
    Write-Host ""
    
    # Wait a bit and check status
    Write-Host "Checking service status..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    docker compose ps
    
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the logs for details:" -ForegroundColor Yellow
    Write-Host "  docker compose logs" -ForegroundColor White
    exit 1
}

