# iOS Launch & Workflow Guide for HabitGPT

This guide covers the end-to-end process of preparing your existing React Native (Expo) app for iOS, configuring all necessary services (Google, Firebase, RevenueCat), and launching it to the App Store.

> [!NOTE]
> This guide assumes you are starting from your Windows machine but may need access to a Mac for final verification (or use EAS Build service to build in the cloud).

## Phase 1: Codebase Preparation

Since you want a separate codebase for iOS, we will fork the project.

### 1.1 Duplicate the Project
Run this command in your terminal (one directory *above* [habitgpt](file:///c:/Users/AbhishekKhanra/habitgpt)) to create a clean copy:

```powershell
robocopy "c:\Users\AbhishekKhanra\habitgpt" "c:\Users\AbhishekKhanra\habitgpt-ios" /E /XD .git node_modules .expo android
```
*This copies everything except git history, large dependencies, and the android build folder.*

### 1.2 Clean Up Android & Unnecessary Files
In your new `habitgpt-ios` folder:
1. **Delete**: [frontend/gradle-8.10.2-all.zip](file:///c:/Users/AbhishekKhanra/habitgpt/frontend/gradle-8.10.2-all.zip) (Large file, ~227MB, not needed).
2. **Delete**: [frontend/google-services.json](file:///c:/Users/AbhishekKhanra/habitgpt/frontend/google-services.json) (This is for Android Firebase).
3. **Delete**: `frontend/android/` folder if it still exists (Prebuild folder).
4. **Delete**: `.expo/` and `.metro-cache/` folders if copied (Clear caches).
5.  **Optional**: Delete `backend/` folder.
    -   **Why?** Your backend runs on Railway. Apple only cares about your `frontend` code. You don't need the Python files on your Mac unless you plan to deploy server updates from there.

### 1.3 Install Dependencies
Open your terminal in `habitgpt-ios` and run:
```bash
npm install
# OR
yarn install
```

---

## Phase 2: Setting Up Your New Mac (From Scratch)

Since this is a brand new MacBook, you need to install the "Developer Tools" before you can do anything.

### 2.1 Install The Basics (Software)
1.  **VS Code** (Your Code Editor):
    -   Go to [code.visualstudio.com](https://code.visualstudio.com/).
    -   Download "Mac Universal" version.
    -   Install and open it.
2.  **Xcode** (Apple's Build Tool):
    -   Open the **App Store** on your Mac.
    -   Search for "Xcode".
    -   Click **Get/Install** (This is huge, ~12GB. Start this FIRST).
    -   **Important**: Once installed, open Xcode once to accept the license agreement.
3.  **Command Line Tools**:
    -   Open your Mac's **Terminal** (Cmd+Space -> Type "Terminal").
    -   Run: `xcode-select --install`
    -   Click "Install" on the popup.
    -   **Why both?** Xcode gives you the iOS Simulator. The "Command Line Tools" generally come with it, but this command guarantees your Terminal can find them. If it says "already installed", that's great!

### 2.2 Install Homebrew (The Mac App Installer)
Homebrew lets you install technical tools with one command.
1.  Open **Terminal**.
2.  Paste this command and hit Enter (it asks for your Mac password, type it even if you don't see stars):
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
3.  Follow the instructions on screen (it might ask you to run 2 more commands to "add brew to path").

### 2.3 Install Node.js & Watchman
Still in Terminal, run:
```bash
brew install node
brew install watchman
```

### 2.4 Setup Project on Mac
1.  **Download**: Get your `habitgpt-ios` folder from Google Drive.
2.  **Move**: Put it somewhere easy, like `Documents/habitgpt-ios`.
3.  **Open**: 
    -   Open VS Code.
    -   File -> Open Folder -> Select `habitgpt-ios`.
4.  **Install Global Tools**:
    -   Open VS Code Terminal (Terminal -> New Terminal).
    -   Run: `npm install -g eas-cli expo-cli`
5.  **Install Dependencies**:
    -   Run: `npm install`
6.  **Login to EAS**:
    -   Run: `eas login` (Log in with your Expo account).

---

## Phase 3: Apple Ecosystem Setup


### 2.1 Apple Developer Account
1. Go to [developer.apple.com](https://developer.apple.com).
2. Enroll in the Apple Developer Program ($99/year). *This is mandatory for App Store release.*

### 2.2 Create App ID
1. Go to [developer.apple.com/account](https://developer.apple.com/account) -> **Certificates, IDs & Profiles**.
2. Click **Identifiers** -> **+** -> **App IDs** -> **App**.
3. **Description**: HabitGPT
4. **Bundle ID**: `com.abhishekkhanra.habitgpt` (Must match `app.json`).
5. Enable Capabilities:
   - **Sign In with Apple** (Required if you use other social logins like Google).
   - **Push Notifications** (If you use them).
6. Click **Register**.

### 2.3 Create App in App Store Connect
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. **My Apps** -> **+** -> **New App**.
3. **Platforms**: iOS.
4. **Name**: "HabitGPT: 2026 Habit Planner".
5. **Subtitle** (Optional): "Resolution Roadmap & Tracker".
5. **Primary Language**: English (US).
6. **Bundle ID**: Select `com.abhishekkhanra.habitgpt`.
7. **SKU**: `habitgpt_ios_001`.
8. **Keywords**: `2026`, `Planner`, `Habit Tracker`, `Resolution`, `Goal Setting`, `Routine`.
9. **User Access**: Full Access.

---

---

## Phase 4: OAuth & Firebase Setup (iOS)

### 3.1 Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Select your `habitgpt` project.
3. **APIs & Services** -> **Credentials** -> **+ Create Credentials** -> **OAuth client ID**.
4. **Application type**: iOS.
5. **Name**: HabitGPT iOS.
6. **Bundle ID**: `com.abhishekkhanra.habitgpt`.
7. Click **Create**.
8. **Copy the iOS Client ID**. You will need this in your `.env`.

### 3.2 Firebase iOS Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Open your project.
3. Click **Add App** -> **iOS**.
4. **Bundle ID**: `com.abhishekkhanra.habitgpt`.
5. **App Nickname**: HabitGPT iOS.
6. Click **Register app**.
7. **Download** `GoogleService-Info.plist`.
8. Place this file in your `frontend/` root folder (next to `app.json`).
9. **Skip** the SDK setup steps (Expo handles this).

### 3.3 Configure `app.json`
Update `frontend/app.json` to link the plist file:

```json
"ios": {
  "bundleIdentifier": "com.abhishekkhanra.habitgpt",
  "googleServicesFile": "./GoogleService-Info.plist", // Add this line
  "usesAppleSignIn": true // Required for App Store if using Google Auth
}
```

### 3.4 Supabase Apple Sign-In (Critical)
If you use Google Auth, Apple REQUIRES you to also offer "Sign in with Apple".
1.  **Create Auth Key**:
    -   Go to [Apple Developer Keys](https://developer.apple.com/account/resources/authkeys/list).
    -   Click **(+)**.
    -   Name: "Supabase Auth Key".
    -   Check **Sign in with Apple**.
    -   Click **Configure** -> Select your Primary App ID (`com.abhishekkhanra.habitgpt`).
    -   Click **Register**.
    -   **Download the .p8 file** (Save it!).
    -   Note the **Key ID** and your **Team ID** (top right of screen).
2.  **Configure Supabase**:
    -   Go to Supabase Dashboard -> **Authentication** -> **Providers** -> **Apple**.
    -   **Enable Apple**.
    -   **Service ID**: Your Bundle ID (`com.abhishekkhanra.habitgpt`).
    -   **Team ID**: Your 10-char Team ID.
    -   **Key ID**: The ID from step 1.
    -   **Secret Key**: Paste the contents of the `.p8` file.
    -   Click **Save**.


---

---

## Phase 5: RevenueCat Implementation (iOS)

### 4.1 Detailed "Noob-Friendly" Guide
If you have never used RevenueCat or App Store Connect before, please pause here and follow the dedicated deep-dive guide I just created for you:

👉 **[Read the Full REVENUECAT_IOS_GUIDE.md](REVENUECAT_IOS_GUIDE.md)**

*Return here after you have your API Keys and Products set up.*

### 4.2 App Store Connect Config (Summary)
1. In [App Store Connect](https://appstoreconnect.apple.com), go to **Monetization** -> **Subscriptions**.
2. **Create Subscription Group**: "HabitGPT Premium".
3. **Create Subscriptions**:
   - **Monthly**:
     - Reference Name: "Monthly"
     - Product ID: `habitgpt_monthly_599`
     - Price: $5.99 Tier
   - **Yearly** (Critical for Planners):
     - Reference Name: "Yearly"
     - Product ID: `habitgpt_yearly_5999`
     - Price: $59.99 Tier
4. **App Store Connect API Key**:
   - Go to **Users and Access** -> **Integrations** -> **App Store Connect API**.
   - Create a Key with "App Manager" access.
   - Download the `.p8` file (Save this safely! You can only download it once).

### 4.2 RevenueCat Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com).
2. Select your project.
3. **Project Settings** -> **Apps** -> **+ New** -> **App Store**.
4. **App Bundle ID**: `com.abhishekkhanra.habitgpt`.
5. **App Store Connect API Key**: Upload the `.p8` file you just downloaded.
   - Enter Issuer ID and Key ID (from App Store Connect).
6. **Shared Secret**:
   - In App Store Connect -> App -> Subscriptions -> **App-Specific Shared Secret**.
   - Generate and paste into RevenueCat.
7. Click **Save Changes**.
8. **Copy the Public Info.plist Key** (starts with `appl_...`).

### 4.3 Update Environment Variables
Update your `frontend/.env`:
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_ios_key_here
```

---

## Phase 6: Building & Testing (Simulator/Device)

Since you are on Windows, you have two options:

### Option A: EAS Build (Recommended for Windows)
Build in the cloud and install on your iPhone.
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure` (Select iOS).
4. Run Build for Development (Simulator):
   ```bash
   eas build --profile development --platform ios --local
   # OR cloud build
   eas build --profile development --platform ios
   ```
   *Note: Local iOS build requires a Mac. Cloud build works from Windows.*

### Option B: Move to Mac
1. Copy the `habitgpt-ios` folder to your Mac.
2. Run `npm install`.
3. Run `npx expo run:ios`.
   - This opens the iOS Simulator.
   - Test Login, Subscription flow (Sandbox environment), and standard usage.

**RevenueCat Testing**:
- On Simulator/TestFlight, you use the "Apple Sandbox" environment.
- Subscriptions renew every few minutes (Monthly = ~5 mins) to allow quick testing of expiration.

---

## Phase 7: App Store Deployment

### 6.1 Create Production Build
From your terminal (Windows or Mac):
```bash
eas build --platform ios --profile production --auto-submit
```
- `--auto-submit` automatically uploads the binary to App Store Connect after building.
- You will need to log in with your Apple ID.

### 6.2 TestFlight (Beta Testing)
1. Once the build is uploaded, go to App Store Connect -> **TestFlight**.
2. You will see the build "Processing". Wait ~15 mins.
3. Add yourself to "Internal Testing".
4. Open **TestFlight App** on your iPhone -> Install HabitGPT.
5. **Verify EVERYTHING**:
   - Login flows.
   - Purchases (Real money is NOT charged in TestFlight, it's still Sandbox).
   - Restore Purchases.

### 6.3 Submit for Review
1. Go to **App Store** tab in App Store Connect.
2. Select the build you just verified.
3. Fill in metadata:
   - Screenshots (Use iOS Simulator to take these: 6.5" and 5.5" displays).
   - Privacy Policy URL. (Required. Create a simple Notion page or GitHub Gist saying "We collect email for login and do not sell data." -> Paste link).
   - Support URL. (Can be your Twitter/X profile or a simple "Contact Us" Google Form).
4. **Review Submission**:
   - Apple requires you to disclose data usage (Privacy Nutrition Label).
   - Since you use Google Auth, you MUST offer "Sign in with Apple" (Check your code for `AppleAuthentication` button fallback).
5. Click **Submit for Review**.
   - Review takes 24-48 hours.

### 6.4 Launch!
Once approved, the status changes to "Pending Developer Release" (if you chose manual release) or "Ready for Sale".
Click **Release This Version** to go live!
