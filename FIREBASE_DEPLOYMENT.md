# Firebase App Hosting Deployment Guide

## Issue
Firebase App Hosting doesn't support nested `package.json` files well. The Next.js app is in the `client` directory, but Firebase needs to build from a directory with a `package.json` at the root.

## Solution Options

### Option 1: Configure Firebase Console (Recommended)
1. In Firebase Console, go to App Hosting settings
2. Set the **Root Directory** to `client`
3. This tells Firebase to treat `client` as the project root
4. Firebase will then detect the Next.js app correctly

### Option 2: Use Root Package.json Scripts
The root `package.json` has been updated with build scripts that delegate to the `client` directory:
- `build`: Installs dependencies and builds the Next.js app
- `start`: Starts the Next.js production server
- `gcp-build`: Google Cloud Build script (same as build)

## Configuration Files

### `apphosting.yaml`
Located at the repository root. Configured to use root-level npm scripts.

### `client/.nvmrc`
Specifies Node.js version 18 for the build process.

### `client/project.toml`
Cloud Native Buildpacks configuration for proper detection.

## Environment Variables
Set these in Firebase Console → App Hosting → Environment Variables:
- `NEXT_PUBLIC_API_URL`: Your backend API URL (e.g., `https://your-backend.com/api`)

## Build Process
1. Firebase detects the project type (Next.js)
2. Runs `npm ci` in the client directory (via root build script)
3. Runs `npm run build` to create the Next.js standalone build
4. Starts the app with `npm start`

## Troubleshooting

### Error: "build step 2 pack failed" or "status code 51"
This error occurs when Firebase buildpacks fail to detect the project type. Solutions:

**CRITICAL: Set Root Directory in Firebase Console**
1. Go to Firebase Console → App Hosting → Your App → Settings
2. Find "Root Directory" or "Source Directory" setting
3. Set it to: `client`
4. Save and redeploy

**Why this is necessary:**
- Firebase buildpacks auto-detect project type by looking for `package.json` and framework files
- If building from root, it finds the Express backend `package.json` instead of Next.js
- Setting root directory to `client` makes Firebase treat it as the project root
- This allows proper Next.js detection and build

**Alternative (if root directory can't be changed):**
- The `apphosting.yaml` has been updated with explicit `cd client` commands
- However, buildpack detection may still fail before these commands run
- Root directory configuration is the recommended solution

### Build succeeds but app doesn't start
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that the standalone build was created (`client/.next/standalone`)
- Ensure `start` script points to the correct location

## Notes
- The Next.js app uses `output: 'standalone'` mode for optimal deployment
- All dependencies are installed fresh with `npm ci` for reproducible builds
- The build process uses npm (not pnpm) for Firebase compatibility

