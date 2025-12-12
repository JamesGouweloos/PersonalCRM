# Firebase CLI Deployment Guide

## Prerequisites

1. Firebase CLI installed (already installed: v14.22.0)
2. Logged into Firebase CLI
3. Project configured (`.firebaserc` already set to `personalcrm`)

## Deployment Steps

### 1. Enable App Hosting API (if needed)

If you get permission errors, enable the API:
1. Go to: https://console.cloud.google.com/apis/library/firebaseapphosting.googleapis.com?project=personalcrm-12a24
2. Click "Enable"
3. Wait a few minutes for propagation

### 2. Login to Firebase (if not already logged in)

```bash
firebase login
```

### 3. Deploy with Verbose Logging

Deploy the App Hosting app with detailed logging:

```bash
# Deploy with verbose output
firebase apphosting:backends:deploy --backend=YOUR_BACKEND_ID --verbose

# Or deploy and follow logs in real-time
firebase apphosting:backends:deploy --backend=YOUR_BACKEND_ID --debug
```

### 4. Find Your Backend ID

First, list your backends to find the ID:

```bash
firebase apphosting:backends:list
```

This will show output like:
```
Backend ID: abc123def456
Location: us-east4
Repository: https://github.com/JamesGouweloos/PersonalCRM.git
Branch: main
```

### 5. Monitor Build Progress

Once deployment starts, you can monitor it:

```bash
# Watch build logs in real-time
firebase apphosting:backends:get --backend=YOUR_BACKEND_ID

# Get detailed build logs
firebase apphosting:backends:get --backend=YOUR_BACKEND_ID --format=json
```

### 6. View Build Logs

```bash
# Get the latest build logs
firebase apphosting:backends:builds:list --backend=YOUR_BACKEND_ID

# Get specific build logs
firebase apphosting:backends:builds:get --backend=YOUR_BACKEND_ID --build=BUILD_ID
```

## Quick Deploy Script

Create a PowerShell script for easier deployment:

```powershell
# deploy.ps1
$backendId = firebase apphosting:backends:list --format=json | ConvertFrom-Json | Select-Object -First 1 -ExpandProperty name | ForEach-Object { $_.Split('/')[-1] }
Write-Host "Deploying backend: $backendId"
firebase apphosting:backends:deploy --backend=$backendId --debug
```

## Troubleshooting

### View Detailed Logs

```bash
# Enable debug mode
firebase apphosting:backends:deploy --backend=YOUR_BACKEND_ID --debug

# Get JSON output for parsing
firebase apphosting:backends:get --backend=YOUR_BACKEND_ID --format=json
```

### Check Backend Status

```bash
# List all backends
firebase apphosting:backends:list

# Get backend details
firebase apphosting:backends:get --backend=YOUR_BACKEND_ID
```

### Common Commands

```bash
# List backends
firebase apphosting:backends:list

# Deploy specific backend
firebase apphosting:backends:deploy --backend=BACKEND_ID

# Get backend info
firebase apphosting:backends:get --backend=BACKEND_ID

# List builds
firebase apphosting:backends:builds:list --backend=BACKEND_ID

# Get build logs
firebase apphosting:backends:builds:get --backend=BACKEND_ID --build=BUILD_ID
```

## Advantages of CLI Deployment

1. **Real-time logging**: See build progress as it happens
2. **Better error messages**: More detailed error output
3. **Debug mode**: `--debug` flag for verbose output
4. **Build inspection**: Can inspect specific builds and logs
5. **Faster iteration**: No need to push to GitHub for each test

## 🎯 Recommended: Firebase Console (Best Logging Experience)

**For the best logging experience, use Firebase Console web interface:**

### Steps:

1. **Go to Firebase Console**: 
   https://console.firebase.google.com/project/personalcrm-12a24/apphosting

2. **Click on your backend** (e.g., `personalcrm`)

3. **Click "Deploy" or "Redeploy"** button

4. **View real-time logs** - The Console shows:
   - ✅ Real-time build progress with live updates
   - ✅ Detailed error messages with full stack traces
   - ✅ Expandable log sections for each build step
   - ✅ Color-coded output (errors in red, warnings in yellow)
   - ✅ Build history with all previous deployments
   - ✅ Download build logs as text files
   - ✅ Filter logs by build step
   - ✅ Search within logs

5. **Monitor the build** - You'll see:
   - Build steps progress in real-time
   - Detailed output from each command
   - Error messages with line numbers
   - Environment variable values (masked secrets)

### Advantages of Console Deployment:

- ✅ **No API permission issues** - Works immediately
- ✅ **Better UI** - Visual progress indicators
- ✅ **Real-time updates** - See logs as they're generated
- ✅ **Better error display** - Formatted, color-coded errors
- ✅ **Build history** - See all previous builds
- ✅ **Easy navigation** - Click through different builds
- ✅ **Export logs** - Download full logs for analysis

### Quick Access:
- **Direct link**: https://console.firebase.google.com/project/personalcrm-12a24/apphosting
- **After deployment**: Click on any build to see full logs

## Notes

- The `apphosting.yaml` file in the repository root will be used
- Make sure you're in the repository root when running commands
- The backend ID is unique to your Firebase project
- Builds are immutable - each deployment creates a new build

