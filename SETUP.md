# HabitGPT Setup Guide

**Grow any habit in 29 days**

This guide covers the complete setup for HabitGPT, including Supabase, RevenueCat, and Google Authentication.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Supabase Setup](#2-supabase-setup)
3. [RevenueCat Setup](#3-revenuecat-setup)
4. [Google Authentication](#4-google-authentication)
5. [Gemini AI Setup](#5-gemini-ai-setup)
6. [Running the App](#6-running-the-app)

---

## 1. Environment Variables

### Backend (.env)

```env
# MongoDB (Already configured in container)
MONGO_URL=mongodb://localhost:27017/habitgpt_db
DB_NAME=habitgpt_db

# Gemini AI (Required for habit coaching)
GEMINI_API_KEY=your_gemini_api_key

# RevenueCat Webhook Secret (Optional)
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

### Frontend (.env)

```env
# API Configuration
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Supabase (Optional - for Google Auth)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_android_key
```

---

## 2. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### SQL Schema Setup

Run these SQL commands in Supabase SQL Editor to create the required tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Onboarding profiles table (HabitGPT specific)
CREATE TABLE IF NOT EXISTS onboarding_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    primary_change_domain TEXT NOT NULL, -- sleep_energy, focus_productivity, health_fitness, etc.
    failure_patterns TEXT[] DEFAULT '{}', -- mornings, evenings, weekends, etc.
    baseline_consistency_level TEXT NOT NULL, -- very_inconsistent, somewhat_inconsistent, etc.
    primary_obstacle TEXT NOT NULL, -- lack_motivation, forgetting, poor_planning, etc.
    max_daily_effort_minutes INTEGER DEFAULT 10, -- 5, 10, 20, 30
    miss_response_type TEXT NOT NULL, -- guilty_give_up, try_again, ignore_drift, depends
    coach_style_preference TEXT DEFAULT 'adaptive', -- gentle, structured, strict, adaptive
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit instances table
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
    roadmap JSONB,
    chat_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
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

-- Notification preferences table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_user_id ON onboarding_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_instances_user_id ON habit_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_instances_status ON habit_instances(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Onboarding profiles policies
CREATE POLICY "Users can read own onboarding profile" ON onboarding_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding profile" ON onboarding_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding profile" ON onboarding_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Habit instances policies
CREATE POLICY "Users can read own habits" ON habit_instances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON habit_instances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habit_instances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habit_instances
    FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can read own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can read own notifications" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);
```

---

## 3. RevenueCat Setup

### Create RevenueCat Account

1. Go to [revenuecat.com](https://www.revenuecat.com)
2. Create a new project called "HabitGPT"

### Configure Products

Create these products in App Store Connect / Google Play Console:

| Product ID | Name | Price | Duration |
|------------|------|-------|----------|
| `habitgpt_monthly_1999` | HabitGPT Monthly | $19.99 | Monthly |
| `habitgpt_yearly_15999` | HabitGPT Yearly | $159.99 | Yearly |

### RevenueCat Configuration

1. **Add iOS App:**
   - Bundle ID: `com.yourcompany.habitgpt`
   - App Store Connect API Key

2. **Add Android App:**
   - Package Name: `com.yourcompany.habitgpt`
   - Google Play Service Account JSON

3. **Create Entitlement:**
   - Identifier: `premium`
   - Attach both products to this entitlement

4. **Create Offering:**
   - Identifier: `default`
   - Add Monthly and Yearly packages

5. **Webhook Configuration:**
   - URL: `https://your-backend-url/api/webhooks/revenuecat`
   - Events: All subscription events

### Get API Keys

Copy these keys to your `.env`:
- iOS: App Settings → API Keys → iOS key
- Android: App Settings → API Keys → Android key

---

## 4. Google Authentication

### Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: "HabitGPT"

### Enable APIs

- Google+ API
- Google Identity Services API

### Create OAuth Credentials

**Web Client:**
- Authorized JavaScript origins: Your frontend URL
- Authorized redirect URIs: Your Supabase callback URL

**Android Client:**
- Package name: `com.yourcompany.habitgpt`
- SHA-1 certificate fingerprint (from `keytool`)

**iOS Client:**
- Bundle ID: `com.yourcompany.habitgpt`

### Supabase Google Provider

1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Add Client ID and Client Secret from Google Cloud

---

## 5. Gemini AI Setup

### Get Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key
3. Add to backend `.env` as `GEMINI_API_KEY`

### Model Configuration

HabitGPT uses `gemini-2.5-flash` for:
- Habit clarification conversations
- 29-day roadmap generation
- Personalized task creation

---

## 6. Running the App

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
npx expo start
```

### Testing

1. Scan QR code with Expo Go app
2. Complete 7-step onboarding:
   - Q1: What do you want to change? (sets habit domain)
   - Q2: When do you fail? (predicts failure points)
   - Q3: How consistent are you? (controls difficulty)
   - Q4: What stops you? (maps to reminders)
   - Q5: Daily effort available (sets task intensity)
   - Q6: Miss response (defines recovery logic)
   - Q7: Coach style (controls tone & notifications)
3. Chat with HabitGPT to select a habit
4. Start free trial and view 29-day roadmap

---

## Coach Style Configuration

The app supports 4 coach styles that affect notifications and AI responses:

| Style | Tone | Example Notification |
|-------|------|---------------------|
| Gentle | Warm, supportive | "Good morning! Ready to nurture your habit today? You've got this! 🌅" |
| Structured | Professional, organized | "Morning check-in: Your habit is scheduled for today. Plan accordingly." |
| Strict | Direct, no-nonsense | "Day started. Your habit awaits. Execute." |
| Adaptive | Context-aware | "Based on your progress, today's a great day to build momentum." |

---

## Troubleshooting

### Common Issues

1. **Gemini API errors**: Check API key is valid and has quota
2. **RevenueCat products not showing**: Verify products in App Store Connect / Play Console
3. **Google sign-in fails**: Check OAuth client IDs match platform
4. **Notifications not working**: Ensure push token is registered

### Support

For issues, check:
- Backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Frontend logs: Metro bundler console

---

**Happy Habit Building with HabitGPT!**
