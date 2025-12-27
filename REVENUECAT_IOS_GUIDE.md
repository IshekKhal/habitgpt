# The Absolute Beginner's Guide to RevenueCat on iOS

This guide assumes **zero prior knowledge**. We will go through every single click required to get payments working on your iOS app.

> [!IMPORTANT]
> **Prerequisites:**
> 1. You must have an **Apple Developer Account** ($99/year).
> 2. You must have accepted the **"Paid Applications Agreement"** in App Store Connect (Banking & Tax info must be filled out), otherwise you cannot create subscriptions.

---

## Part 1: Apple Ecosystem Setup (The Source of Truth)
Before RevenueCat knows anything, Apple needs to know what you are selling.

### Step 1: Agreements & Banking
1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. Click **Agreements, Tax, and Banking**.
3. Ensure the **"Paid Apps"** agreement is "Active".
   - If not, click to view and fill out your Bank Account and Tax forms.
   - *This can take 24 hours to approve.*

### Step 2: Create the App Entry
1. In App Store Connect, click **My Apps**.
2. Click **(+) New App**.
   - **Platforms**: iOS
   - **Name**: HabitGPT
   - **Language**: English (US)
   - **Bundle ID**: Select `com.abhishekkhanra.habitgpt` (If not there, go to Developer Portal -> Identifiers to create it first).
   - **SKU**: `habitgpt_ios_001` (This is internal, just a unique ID).
   - **Access**: Full Access.

### Step 3: Create Your Subscriptions (Products)
1. Inside your App page, go to the sidebar: **Monetization** -> **Subscriptions**.
2. **Subscription Groups**:
   - You need a group. Click **Create**.
   - Name: "HabitGPT Premium".
3. **Create a Subscription**:
   - Reference Name: "Monthly" (Internal name).
   - Product ID: `habitgpt_monthly_599`
     - *Note: Your code uses `599`, so let's stick to that.*
   - Click **Create**.
4. **Configure the Subscription**:
   - **Subscription Duration**: Select **1 Month**.
   - **Subscription Prices**: Click (+) -> Set to **$5.99 USD**.
   - **App Store Localization**:
     - Display Name: "Monthly Premium"
     - Description: "Unlimited access to AI Habit Coach"
   - **Review Information**:
     - Upload a screenshot.

5. **Create the Yearly Subscription** (Missing Piece!):
   - Go back to your "HabitGPT Premium" Group.
   - Click **Create Subscription**.
   - Reference Name: "Yearly".
   - Product ID: `habitgpt_yearly_5999` (Matches your code).
   - Click **Create**.
   - **Duration**: **1 Year**.
   - **Price**: **$59.99 USD** (or your preferred price).
   - **Localization**: "Yearly Premium", "Best Value: 12 months access".
   - **Introductory Offers**: You can add a trial here too if checking "One trial per group".

6. **Enable Auto-Renew?**:
   - **Good News**: You don't need to "enable" this. By selecting "Auto-Renewable Subscription" type in step 3 (which is the default for subscriptions), **Auto-Renew is ON by default**.
   - Users are automatically charged at the end of the period.
   - You only configure the *duration* (1 Month / 1 Year), and Apple handles the looping.

7. **Add Free Trial** (Optional but recommended):
   - Scroll to **Introductory Offers** (inside the Monthly or Yearly subscription).
   - Click (+).
   - Type: **Free Trial**.
   - Duration: **1 Week**.
   - Click **Save**.

### Step 4: Generate the "Shared Secret"
RevenueCat needs this password to talk to Apple.
1. Still in **Subscriptions**, look for **App-Specific Shared Secret** (usually on the Group page or main Subscriptions page).
2. Click **Manage**.
3. Click **Generate Apps-Specific Shared Secret**.
4. **COPY THIS CODE**. Save it in Notepad for a moment.

### Step 5: Generate App Store Connect API Key
RevenueCat uses this to sync logic.
1. Go to main [App Store Connect dashboard](https://appstoreconnect.apple.com).
2. Click **Users and Access**.
3. Tab: **Integrations**.
4. Menu: **Team Keys** (or App Store Connect API).
5. Click **(+)** to generate a key.
   - Name: "RevenueCat Key"
   - Access: **App Manager**.
6. **Download the `.p8` file**.
   - *WARNING: You can only download this ONCE. Do not lose it.*
   - Also copy the **Issuer ID** and **Key ID** visible on the screen.

---

## Part 2: RevenueCat Dashboard (The Middleman)
Now we tell RevenueCat about what we just did in Apple.

### Step 1: Create Project
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com).
2. **Create New Project** -> Name: "HabitGPT".

### Step 2: add iOS App
1. In the sidebar, go to **Project Settings** -> **Apps**.
2. Click **(+) New** -> **App Store**.
3. **App Bundle ID**: `com.abhishekkhanra.habitgpt`
4. **App Store Connect API Key**:
   - Upload the `.p8` file you downloaded.
   - Paste the **Issuer ID**.
   - Paste the **Key ID**.
5. **Shared Secret**:
   - Paste the "Shared Secret" code you copied in Part 1.
6. Click **Save Changes**.

### Step 3: Define Products (Mapping)
1. Sidebar -> **Product Configuration** -> **Products**.
2. Click **(+) New Product**.
   - **Identifier**: `habitgpt_monthly_599`.
   - **App Store Product ID**: `habitgpt_monthly_599`.
   - Click **Add**.
3. **Repeat for Yearly**:
   - Click **(+) New Product**.
   - **Identifier**: `habitgpt_yearly_5999`.
   - **App Store Product ID**: `habitgpt_yearly_5999`.
   - Click **Add**.

### Step 4: Define Entitlements (Permissions)
Entitlements are "what the user gets". We usually just have one: "premium".
1. Sidebar -> **Product Configuration** -> **Entitlements**.
2. Click **(+) New**.
3. Identifier: `premium`.
4. Description: "Full App Access".
5. Click **Add**.
6. Click on the new `premium` entitlement.
7. Click **Attach** to attach your product (`habitgpt_monthly_599`).
8. **Attach the Yearly product too** -> Click **Attach** -> Select `habitgpt_yearly_5999`.

### Step 5: Define Offerings (The Menu)
Offerings are "what you show on the paywall".
1. Sidebar -> **Product Configuration** -> **Offerings**.
2. Click **(+) New**.
3. Identifier: `default` (Keep it `default`, your code likely looks for this).
4. Description: "Standard Offering".
5. Click on `default`.
6. Click **(+) New Package**.
   - Identifier: `monthly`.
   - Description: "Monthly Subscription".
7. Click on the `monthly` package -> **Attach Product** -> Select `habitgpt_monthly_599`.
8. **Add Yearly Package**:
   - Click **(+) New Package**.
   - Identifier: `yearly` (Must key `yearly`, code looks for this).
   - Description: "Yearly Subscription".
   - Click on `yearly` package -> **Attach Product** -> Select `habitgpt_yearly_5999`.

### Step 6: Get Your Public API Key
1. Sidebar -> **Project Settings** -> **API Keys**.
2. Look for **Public API Keys**.
3. Copy the key that starts with `appl_...`.

---

## Part 3: Connecting Your Code
Now we connect your Expo app to the specific IDs we just set up.

### Step 1: Update [.env](file:///c:/Users/AbhishekKhanra/habitgpt/backend/.env)
Open [frontend/.env](file:///c:/Users/AbhishekKhanra/habitgpt/frontend/.env) (or create it) and paste:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_PASTE_YOUR_KEY_HERE
```

### Step 2: Verify [revenuecat.ts](file:///c:/Users/AbhishekKhanra/habitgpt/frontend/src/services/revenuecat.ts)
I checked your code in [frontend/src/services/revenuecat.ts](file:///c:/Users/AbhishekKhanra/habitgpt/frontend/src/services/revenuecat.ts) and it looks **perfect**.
It is already set up to:
1. Initialize with the key.
2. Fetch the "Monthly" package.
3. Check for the "premium" entitlement.

**One minor check:**
Line 18 in your code says:
```typescript
MONTHLY: 'habitgpt_monthly_599',
```
**Make sure this string matches EXACTLY what you typed in Apple Product ID.** If you typed `habitgpt_monthly_1999` in Apple, change it here to match.

---

## Part 4: Testing (The Fun Part)

### How to Test on iOS (Windows User)
Since you are on Windows, you cannot "run" the iOS simulator directly.
1. **Build a Dev Client**:
   ```bash
   eas build --platform ios --profile development
   ```
2. **Install on iPhone**: Download the build via the QR code or link provided by EAS.
3. **Create Sandbox Tester**:
   - Go to **App Store Connect** -> **Users and Access**.
   - Sidebar: **Sandbox Testers**.
   - Click (+).
   - Create a dummy account (e.g., `test1@habitgpt.com`).
     - *Tip: The email doesn't need to be real, but the password rules are strict.*
4. **On your iPhone**:
   - Open Settings -> App Store.
   - Scroll WAY down to **Sandbox Account**.
   - Sign in with the dummy account you just created.
5. **Run the App**:
   - Open the "HabitGPT" dev build.
   - Go to the Paywall.
   - Click "Subscribe".
   - You should see a prompt like "[Environment: Sandbox]".
   - Confirm purchase (FaceID/TouchID).
   - It should succeed!

> [!TIP]
> **Sandbox Behavior:**
> - A "1 Month" subscription renews every **5 minutes** in Sandbox.
> - It renews 5-6 times then automatically cancels (to let you test expiration).

---

## Part 5: Going Live
When you submit to the App Store:
1. Apple automatically switches from Sandbox to Production.
2. You do **NOT** need to change any code. The same `appl_` key works for both.
3. Just clean up your `console.log` statements if you want (optional).

**You are done! 🚀**
