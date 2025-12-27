# HabitGPT Setup Guide

**Grow any habit in 29 days**

This guide covers the complete setup for HabitGPT, including Supabase database, Railway backend deployment, RevenueCat payments, and Expo mobile app.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Supabase Setup](#2-supabase-setup)
3. [Railway Backend Deployment](#3-railway-backend-deployment)
4. [RevenueCat Setup](#4-revenuecat-setup)
5. [Expo Mobile App Setup](#5-expo-mobile-app-setup)
6. [Google Authentication](#6-google-authentication)
7. [Testing](#7-testing)

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Expo Mobile    │────▶│  Railway API    │────▶│    Supabase     │
│  (React Native) │     │   (FastAPI)     │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│   RevenueCat    │     │   Gemini AI     │
│   (Payments)    │     │   (Coaching)    │
└─────────────────┘     └─────────────────┘
```

**Stack:**
- **Frontend:** Expo (React Native) - iOS & Android
- **Backend:** FastAPI (Python) on Railway
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini 2.5 Flash
- **Payments:** RevenueCat

---

## 2. Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Choose an organization and enter:
   - **Name:** `habitgpt`
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
4. Click **Create new project** (takes ~2 minutes)

### Step 2: Get Your Credentials

Once the project is ready:

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon (public) key:** For frontend
   - **service_role key:** For backend (keep this secret!)

### Step 3: Create Database Tables

Go to **SQL Editor** and run this complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_profile_id UUID,
    trial_started BOOLEAN DEFAULT FALSE,
    trial_start_date TIMESTAMPTZ,
    subscription_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ONBOARDING PROFILES TABLE
-- Stores answers from the 7 onboarding questions
-- =============================================
CREATE TABLE IF NOT EXISTS onboarding_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Q1: What do you want to change?
    primary_change_domain TEXT NOT NULL,
    -- Options: sleep_energy, focus_productivity, health_fitness, 
    --          spiritual_mental, discipline, relationships, specific
    
    -- Q2: When do you usually fail?
    failure_patterns TEXT[] DEFAULT '{}',
    -- Options: mornings, evenings, weekends, stressful_days, 
    --          miss_one_day, quit_no_reason
    
    -- Q3: How consistent are you?
    baseline_consistency_level TEXT NOT NULL,
    -- Options: very_inconsistent, somewhat_inconsistent, 
    --          mostly_consistent, extremely_consistent
    
    -- Q4: What usually stops you?
    primary_obstacle TEXT NOT NULL,
    -- Options: lack_motivation, forgetting, poor_planning, 
    --          low_energy, distractions, dont_know
    
    -- Q5: Daily effort available
    max_daily_effort_minutes INTEGER DEFAULT 10,
    -- Options: 5, 10, 20, 30
    
    -- Q6: How do you respond when you miss a day?
    miss_response_type TEXT NOT NULL,
    -- Options: guilty_give_up, try_again, ignore_drift, depends
    
    -- Q7: Coach style preference
    coach_style_preference TEXT DEFAULT 'adaptive',
    -- Options: gentle, structured, strict, adaptive
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HABIT INSTANCES TABLE
-- Each habit a user is building
-- =============================================
CREATE TABLE IF NOT EXISTS habit_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_name TEXT NOT NULL,
    habit_description TEXT,
    category TEXT NOT NULL,
    duration_days INTEGER DEFAULT 29,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- active, completed, paused
    completion_percentage FLOAT DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date TIMESTAMPTZ,
    
    -- Stores the AI-generated 29-day roadmap as JSON
    roadmap JSONB,
    
    -- Chat history with AI coach
    chat_history JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- RevenueCat subscription status
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_subscribed BOOLEAN DEFAULT FALSE,
    is_trial_active BOOLEAN DEFAULT FALSE,
    trial_end_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    product_id TEXT,
    will_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token TEXT,
    platform TEXT, -- ios, android
    daily_reminders BOOLEAN DEFAULT TRUE,
    morning_time TEXT DEFAULT '09:00',
    afternoon_time TEXT DEFAULT '14:00',
    evening_time TEXT DEFAULT '20:00',
    milestone_alerts BOOLEAN DEFAULT TRUE,
    streak_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_user_id ON onboarding_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_instances_user_id ON habit_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_instances_status ON habit_instances(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- =============================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- =============================================
-- Uncomment these if you want RLS enabled

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habit_instances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
```

Click **Run** to execute the SQL.

### Step 4: Verify Tables

Go to **Table Editor** in the sidebar. You should see:
- `users`
- `onboarding_profiles`
- `habit_instances`
- `subscriptions`
- `notification_preferences`

---

## 3. Railway Backend Deployment

### Step 1: Prepare Backend

The backend is located in `/backend` and includes these Railway-specific files:
- `Procfile` - Specifies the start command
- `railway.json` - Railway configuration
- `runtime.txt` - Python version
- `nixpacks.toml` - Build configuration

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. **Important:** Set the **Root Directory** to `/backend`

### Step 3: Configure Environment Variables

In Railway, go to your service → **Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Your service_role key | ✅ Yes |
| `GEMINI_API_KEY` | Your Gemini API key | ✅ Yes |
| `PORT` | `8001` | Optional (Railway sets this) |
| `REVENUECAT_WEBHOOK_SECRET` | Your webhook secret | Optional |

### Step 4: Deploy

1. Railway will auto-deploy when you push to GitHub
2. Or click **Deploy** manually
3. Wait for the build to complete (~2-3 minutes)

### Step 5: Get Your API URL

After deployment:
1. Go to **Settings** → **Networking**
2. Click **Generate Domain** to get a public URL
3. Your API will be at: `https://your-app.railway.app`

### Step 6: Test the Deployment

```bash
# Health check
curl https://your-app.railway.app/api/health

# Should return:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

---

## 4. RevenueCat Setup

### Step 1: Create RevenueCat Account

1. Go to [revenuecat.com](https://www.revenuecat.com) and sign up
2. Create a new project: **HabitGPT**

### Step 2: Configure Products (The Source of Truth)
**Crucial Concept**: You define price, trial, and auto-renew logic in the **App Stores**, not in RevenueCat. RevenueCat simply mirrors these settings.

#### A. Google Play Console (Android)
1.  **Create Subscription**:
    - Go to **Monetize** → **Subscriptions** → **Create subscription**.
    - **Product ID**: `habitgpt_monthly_599`
    - **Name**: "HabitGPT Monthly"
2.  **Add Base Plan**:
    - Click "Add base plan".
    - **Renewal Type**: Auto-renewing (this enables "Auto-pay").
    - **Price**: Set to $5.99 (or local equivalent).
3.  **Add Free Trial (The "Offer")**:
    - Inside the Base Plan, scroll to **Offers**.
    - Click **Add Offer**.
    - **Eligibility**: "New customer acquisition".
    - **Phase**: Select "Free Trial".
    - **Duration**: Set to `7 Days` (or your preferred trial length).
    - **Billing**: "Auto-renews after trial".

#### B. App Store Connect (iOS)
1.  **Create Auto-Renewable Subscription**:
    - Go to **Features** → **Subscriptions**.
    - Create a Group (e.g., "Premium Access").
2.  **Create Product**:
    - **Product ID**: `habitgpt_monthly_599`
    - **Duration**: 1 Month.
    - **Price**: Tier corresponding to $5.99.
3.  **Add Introductory Offer (Trial)**:
    - Scroll down to **Introductory Offers**.
    - Click **+**.
    - **Type**: Free Trial.
    - **Duration**: 7 Days.
    - **Territory**: Global.

#### C. Payment Modes & Processing
- **Who handles money?**: Apple and Google handle all credit card processing, currency conversion, and fraud checks. You do not need Stripe or PayPal.
- **Auto-Pay**: Since these are "Auto-Renewable Subscriptions", users are automatically charged at the end of the trial/period unless they cancel.

---

### Step 3: RevenueCat Configuration

**For iOS:**
1. Add iOS App with Bundle ID: `com.yourcompany.habitgpt`
2. Upload App Store Connect API Key

**For Android:**
1. Add Android App with Package Name: `com.yourcompany.habitgpt`
2. Upload Google Play Service Account JSON

### Step 4: Create Entitlement & Offering

1. **Entitlement:** Create `premium` entitlement
2. **Offering:** Create `default` offering with Monthly and Yearly packages

### Step 5: Configure Webhook

1. Go to **Project Settings → Webhooks**
2. Add webhook URL: `https://your-railway-app.railway.app/api/webhooks/revenuecat`
3. Enable all subscription events

### Step 6: Get API Keys

Copy these to your mobile app:
- **iOS Key:** Project → Apps → iOS → API Key
- **Android Key:** Project → Apps → Android → API Key

---

## 5. Expo Mobile App Setup

### Step 1: Install Dependencies

```bash
cd frontend
yarn install
```

### Step 2: Configure Environment Variables

Create/update `/frontend/.env`:

```env
# API - Use your Railway deployed URL
EXPO_PUBLIC_BACKEND_URL=https://your-app.railway.app

# Supabase (for future Google Auth)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxx

# Google OAuth (optional)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### Step 3: Update app.json

Update `/frontend/app.json` with your app details:

```json
{
  "expo": {
    "name": "HabitGPT",
    "slug": "habitgpt",
    "scheme": "habitgpt",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.habitgpt"
    },
    "android": {
      "package": "com.yourcompany.habitgpt"
    }
  }
}
```

### Step 4: Run Development

```bash
npx expo start
```

Scan QR code with Expo Go app on your phone.

### Step 5: Build for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

---

## 6. Google Authentication

### Step 1: Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project: **HabitGPT**
3. Enable **Google Identity Services API**

### Step 2: Create OAuth Credentials

Create OAuth 2.0 Client IDs for:
- **Web** - For Supabase callback
- **iOS** - Bundle ID: `com.yourcompany.habitgpt`
- **Android** - Package + SHA-1 fingerprint

### Step 3: Configure Supabase

1. Go to **Authentication → Providers → Google**
2. Enable and add Client ID + Secret
3. Copy the callback URL to Google Cloud console

---

## 7. Testing

### Test Backend Locally

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_key"
export GEMINI_API_KEY="your_gemini_key"

# Run server
uvicorn server:app --reload --port 8001
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:8001/api/health

# Create user
curl -X POST http://localhost:8001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Create onboarding profile
curl -X POST http://localhost:8001/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "primary_change_domain": "health_fitness",
    "failure_patterns": ["mornings", "weekends"],
    "baseline_consistency_level": "somewhat_inconsistent",
    "primary_obstacle": "lack_motivation",
    "max_daily_effort_minutes": 10,
    "miss_response_type": "try_again",
    "coach_style_preference": "gentle"
  }'
```

### Test Mobile App

1. Complete the 7-step onboarding
2. Chat with AI to select a habit
3. View the 29-day roadmap
4. Complete daily tasks

---

## Coach Styles Reference

| Style | Notification Tone | When Miss Day |
|-------|-------------------|---------------|
| **Gentle** | "You've got this! 🌅" | "It's okay, tomorrow is a fresh start 🌱" |
| **Structured** | "Your habit is scheduled. Plan accordingly." | "Let's make sure tomorrow counts." |
| **Strict** | "Execute." | "No excuses. Get it done." |
| **Adaptive** | "Based on your progress..." | "Let's adjust your approach." |

---

## Troubleshooting

### Backend Issues

```bash
# Check Railway logs
railway logs

# Local debugging
uvicorn server:app --reload --log-level debug
```

### Supabase Issues

- Verify service key has full access
- Check if tables exist in Table Editor
- Review SQL errors in Logs

### Mobile App Issues

```bash
# Clear cache
npx expo start --clear

# Check Metro bundler logs
# Look for red error screens in Expo Go
```

---

## Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **RevenueCat Docs:** [docs.revenuecat.com](https://docs.revenuecat.com)
- **Expo Docs:** [docs.expo.dev](https://docs.expo.dev)

---

**Happy Habit Building with HabitGPT! 🌱**
