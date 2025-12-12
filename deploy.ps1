# Firebase App Hosting Deployment Script
# This script helps deploy with better logging

Write-Host "Firebase App Hosting Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
Write-Host "Checking Firebase login status..." -ForegroundColor Yellow
$loginStatus = firebase login:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please run: firebase login" -ForegroundColor Red
    exit 1
}

Write-Host "Logged in successfully!" -ForegroundColor Green
Write-Host ""

# Note: If you get permission errors, you may need to:
# 1. Enable App Hosting API in Google Cloud Console
# 2. Or use Firebase Console web interface for deployment
# 3. Or ensure your account has proper permissions

Write-Host "To deploy via CLI, you have a few options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Use Firebase Console (Recommended if CLI has permission issues)" -ForegroundColor Cyan
Write-Host "  1. Go to: https://console.firebase.google.com/project/personalcrm-12a24/apphosting" -ForegroundColor White
Write-Host "  2. Click on your backend" -ForegroundColor White
Write-Host "  3. Click 'Deploy' or 'Redeploy'" -ForegroundColor White
Write-Host "  4. View logs in the Console" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Enable App Hosting API (if you want CLI deployment)" -ForegroundColor Cyan
Write-Host "  1. Go to: https://console.cloud.google.com/apis/library/firebaseapphosting.googleapis.com?project=personalcrm-12a24" -ForegroundColor White
Write-Host "  2. Click 'Enable'" -ForegroundColor White
Write-Host "  3. Then run: firebase apphosting:backends:list" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Deploy via GitHub (Current method)" -ForegroundColor Cyan
Write-Host "  Push changes to GitHub and Firebase will auto-deploy" -ForegroundColor White
Write-Host "  View logs at: https://console.firebase.google.com/project/personalcrm-12a24/apphosting" -ForegroundColor White
Write-Host ""

# Try to list backends if API is enabled
Write-Host "Attempting to list backends..." -ForegroundColor Yellow
$backends = firebase apphosting:backends:list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Backends found!" -ForegroundColor Green
    Write-Host $backends
    Write-Host ""
    Write-Host "To deploy, run:" -ForegroundColor Cyan
    Write-Host "  firebase apphosting:backends:deploy --backend=BACKEND_ID --debug" -ForegroundColor White
} else {
    Write-Host "Cannot list backends (API may not be enabled or permission issue)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For better logging, use Firebase Console:" -ForegroundColor Cyan
    Write-Host "  https://console.firebase.google.com/project/personalcrm-12a24/apphosting" -ForegroundColor White
}

