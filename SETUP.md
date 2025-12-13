# SkillGPT - Complete Setup Guide

SkillGPT is a React Native (iOS + Android) app that helps users learn any skill within 90 days with AI-powered personalized roadmaps, daily tasks, and progress tracking.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Required API Keys & Credentials](#required-api-keys--credentials)
3. [Environment Configuration](#environment-configuration)
4. [Supabase Setup & SQL Schemas](#supabase-setup--sql-schemas)
5. [Google OAuth Setup](#google-oauth-setup)
6. [RevenueCat Setup](#revenuecat-setup)
7. [Running the Application](#running-the-application)
8. [Feature Walkthrough](#feature-walkthrough)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** >= 18.x
- **Yarn** package manager
- **Python** >= 3.11
- **MongoDB** (local or cloud instance)
- **Expo CLI** (`npm install -g expo-cli`)
- **Expo Go App** on your mobile device (for testing)

---

## Required API Keys & Credentials

### 1. Google Gemini API Key (Required)
- **Purpose**: Powers the AI skill chat and roadmap generation
- **Get it from**: https://aistudio.google.com/app/apikey
- **Free tier**: Yes, with generous limits
- **Required for**: AI chat, skill disambiguation, roadmap generation

### 2. Supabase Credentials (Required for Auth)
- **Purpose**: User authentication with Google Sign-In, user data storage
- **Get it from**: https://supabase.com/dashboard
- **Required credentials**:
  - `SUPABASE_URL` - Your project URL
  - `SUPABASE_ANON_KEY` - Public anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-side key (keep secret)

### 3. Google OAuth Credentials (Required for Google Sign-In)
- **Purpose**: Allow users to sign in with their Google account
- **Get it from**: https://console.cloud.google.com/apis/credentials
- **Required credentials**:
  - `GOOGLE_WEB_CLIENT_ID` - For web/Expo Go testing
  - `GOOGLE_ANDROID_CLIENT_ID` - For Android builds
  - `GOOGLE_IOS_CLIENT_ID` - For iOS builds

### 4. RevenueCat Credentials (Required for Payments)
- **Purpose**: Handle subscriptions and in-app purchases
- **Get it from**: https://app.revenuecat.com/
- **Required credentials**:
  - `REVENUECAT_API_KEY` - Public SDK key
  - `REVENUECAT_APPLE_API_KEY` - For iOS App Store
  - `REVENUECAT_GOOGLE_API_KEY` - For Google Play Store

---

## Environment Configuration

### Backend Environment (`/app/backend/.env`)

```env
# MongoDB Connection
MONGO_URL="mongodb://localhost:27017"
DB_NAME="skillgpt_db"

# Google Gemini API Key (Required for AI features)
# Get your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Supabase Configuration (Required for authentication)
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google OAuth Configuration (Required for Google Sign-In)
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
GOOGLE_IOS_CLIENT_ID="your-ios-client-id.apps.googleusercontent.com"

# RevenueCat Configuration (Required for payments/subscriptions)
# Get from: https://app.revenuecat.com/
REVENUECAT_API_KEY="your-revenuecat-public-key"
REVENUECAT_APPLE_API_KEY="your-apple-api-key"
REVENUECAT_GOOGLE_API_KEY="your-google-api-key"
```

### Frontend Environment (`/app/frontend/.env`)

```env
# Expo Configuration (Auto-configured, do not modify)
EXPO_TUNNEL_SUBDOMAIN=your-subdomain
EXPO_PACKAGER_HOSTNAME=https://your-subdomain.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://your-subdomain.preview.emergentagent.com

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="your-ios-client-id.apps.googleusercontent.com"

# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_API_KEY="your-revenuecat-public-key"
```

---

## Supabase Setup & SQL Schemas

### Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for project to initialize

### Step 2: Run SQL Schemas

Go to **SQL Editor** in Supabase Dashboard and run the following schemas:

```sql
-- ============================================
-- SKILLGPT DATABASE SCHEMA FOR SUPABASE
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_profile_id UUID,
    trial_started BOOLEAN DEFAULT FALSE,
    trial_start_date TIMESTAMP WITH TIME ZONE,
    subscription_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- ============================================
-- ONBOARDING PROFILES TABLE
-- ============================================
CREATE TABLE onboarding_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,
    -- Options: school_student, college_student, working_professional, freelancer, unemployed, other
    age_range VARCHAR(20) NOT NULL,
    -- Options: under_16, 16_18, 19_22, 23_30, 31_45, 45_plus
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    daily_time_minutes INTEGER NOT NULL,
    -- Options: 30, 60, 120, 180+
    learning_preferences TEXT[] NOT NULL,
    -- Options: videos, articles, hands_on, quizzes, step_by_step
    learning_history_type VARCHAR(50) NOT NULL,
    -- Options: first_time, quit_midway, completed_one, independent
    motivation_type VARCHAR(50) NOT NULL,
    -- Options: career, personal_growth, academic, hobby, social
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_onboarding_user_id ON onboarding_profiles(user_id);

-- ============================================
-- SKILL INSTANCES TABLE
-- ============================================
CREATE TABLE skill_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    skill_description TEXT,
    category VARCHAR(100) NOT NULL,
    duration_days INTEGER DEFAULT 90,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    -- Options: active, completed, paused, abandoned
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    roadmap JSONB,
    -- Stores the full roadmap structure
    chat_history JSONB DEFAULT '[]',
    -- Stores AI chat conversation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_skill_instances_user_id ON skill_instances(user_id);
CREATE INDEX idx_skill_instances_status ON skill_instances(status);
CREATE INDEX idx_skill_instances_start_date ON skill_instances(start_date);

-- ============================================
-- DAILY TASKS TABLE
-- ============================================
CREATE TABLE daily_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_instance_id UUID REFERENCES skill_instances(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    resource_links TEXT[],
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rolled_over_from INTEGER,
    -- If task was rolled over from previous day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_daily_tasks_skill_instance ON daily_tasks(skill_instance_id);
CREATE INDEX idx_daily_tasks_day_number ON daily_tasks(day_number);
CREATE INDEX idx_daily_tasks_completed ON daily_tasks(completed);

-- ============================================
-- RESOURCES TABLE
-- ============================================
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_instance_id UUID REFERENCES skill_instances(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- Options: youtube, article, document, course
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for skill instance lookup
CREATE INDEX idx_resources_skill_instance ON resources(skill_instance_id);

-- ============================================
-- MILESTONES TABLE
-- ============================================
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_instance_id UUID REFERENCES skill_instances(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    achieved BOOLEAN DEFAULT FALSE,
    achieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for skill instance lookup
CREATE INDEX idx_milestones_skill_instance ON milestones(skill_instance_id);

-- ============================================
-- PAYMENTS TABLE (for RevenueCat tracking)
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    revenuecat_customer_id VARCHAR(255),
    subscription_status VARCHAR(50),
    -- Options: trial, active, expired, cancelled
    product_id VARCHAR(255),
    trial_end_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_reminders BOOLEAN DEFAULT TRUE,
    reminder_time TIME DEFAULT '09:00:00',
    milestone_alerts BOOLEAN DEFAULT TRUE,
    streak_notifications BOOLEAN DEFAULT TRUE,
    push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Onboarding profiles - users can only access their own
CREATE POLICY "Users can view own onboarding" ON onboarding_profiles
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own onboarding" ON onboarding_profiles
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own onboarding" ON onboarding_profiles
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Skill instances - users can only access their own
CREATE POLICY "Users can view own skills" ON skill_instances
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own skills" ON skill_instances
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own skills" ON skill_instances
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own skills" ON skill_instances
    FOR DELETE USING (user_id::text = auth.uid()::text);

-- Daily tasks - users can access tasks from their skill instances
CREATE POLICY "Users can view own tasks" ON daily_tasks
    FOR SELECT USING (
        skill_instance_id IN (
            SELECT id FROM skill_instances WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own tasks" ON daily_tasks
    FOR UPDATE USING (
        skill_instance_id IN (
            SELECT id FROM skill_instances WHERE user_id::text = auth.uid()::text
        )
    );

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_profiles_updated_at
    BEFORE UPDATE ON onboarding_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_instances_updated_at
    BEFORE UPDATE ON skill_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Configure Authentication

1. Go to **Authentication** > **Providers** in Supabase Dashboard
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID (Web)
   - Client Secret
4. Add authorized redirect URLs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `exp://your-expo-url`

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable **Google+ API** and **Google Identity Services**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in app information:
   - App name: "SkillGPT"
   - User support email
   - Developer contact email
4. Add scopes:
   - `email`
   - `profile`
   - `openid`

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Create THREE client IDs:

**Web Application:**
- Application type: Web application
- Name: "SkillGPT Web"
- Authorized JavaScript origins: Your Expo/app URLs
- Authorized redirect URIs: Your Supabase callback URL

**Android:**
- Application type: Android
- Name: "SkillGPT Android"
- Package name: Your app's package name (from app.json)
- SHA-1 certificate fingerprint: Run `expo credentials:manager`

**iOS:**
- Application type: iOS
- Name: "SkillGPT iOS"
- Bundle ID: Your app's bundle identifier (from app.json)

---

## RevenueCat Setup

### Step 1: Create RevenueCat Account

1. Go to https://app.revenuecat.com/
2. Sign up and create a new project

### Step 2: Configure App Store Connect (iOS)

1. In App Store Connect, create your subscription products
2. Add products in RevenueCat under **Products**
3. Configure entitlements

### Step 3: Configure Google Play Console (Android)

1. In Google Play Console, create your subscription products
2. Link to RevenueCat
3. Configure entitlements

### Step 4: Get API Keys

1. Go to **Project Settings** > **API Keys**
2. Copy the public SDK key for your app

### Products to Create:

| Product ID | Name | Price | Duration |
|------------|------|-------|----------|
| `skillgpt_monthly` | Monthly Subscription | $19.99 | 1 month |
| `skillgpt_yearly` | Yearly Subscription | $149.99 | 1 year |

---

## Running the Application

### Backend

```bash
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd /app/frontend

# Install dependencies
yarn install

# Start Expo
expo start --tunnel
```

### Testing on Device

1. Download **Expo Go** on your iOS/Android device
2. Scan the QR code from terminal or Expo Dev Tools
3. The app will load on your device

---

## Feature Walkthrough

### 1. Welcome Screen (`/`)

**Purpose:** Introduction to the app and CTA to start

**Elements:**
- App logo and name
- Tagline: "Master any skill in 90 days"
- Feature highlights (AI Roadmaps, Daily Tasks, Progress Tracking)
- "Get Started" button
- Trial messaging

**Flow:** Tap "Get Started" → Onboarding

---

### 2. Onboarding (7 Questions)

**Route:** `/onboarding/[step]` (steps 1-7)

**Question 1 - Primary Role:**
- School Student
- College Student
- Working Professional
- Freelancer / Creator
- Unemployed / Between Roles
- Other

**Question 2 - Age Range:**
- Under 16
- 16-18
- 19-22
- 23-30
- 31-45
- 45+

**Question 3 - Location:**
- Text input for country
- Auto-detected timezone

**Question 4 - Daily Time Commitment:**
- 15-30 minutes
- 30-60 minutes
- 1-2 hours
- 2+ hours

**Question 5 - Learning Style (Multi-select):**
- Watching videos
- Reading articles/books
- Hands-on tasks
- Quizzes & tests
- Step-by-step instructions

**Question 6 - Prior Learning Experience:**
- First time learning online
- Usually quit midway
- Completed at least one skill
- Learn independently often

**Question 7 - Motivation:**
- Career / Money
- Personal Growth
- Academic Requirement
- Hobby / Curiosity
- Social / Confidence

**Flow:** Complete all 7 → Authentication

---

### 3. Authentication (`/auth`)

**Purpose:** User sign-in after onboarding

**Options:**
- Google Sign-In (via Supabase)
- Email/Name sign-in (MVP fallback)

**Process:**
1. User completes onboarding
2. Onboarding profile saved to database
3. User authenticates with Google
4. User record created/updated
5. Onboarding profile linked to user
6. Redirect to Home

---

### 4. Home Screen (`/(tabs)/home`)

**Purpose:** Dashboard showing user's skills

**Empty State:**
- "Start Learning a New Skill" message
- Central "+" FAB button
- "Learn your first skill FREE for 90 days" banner

**With Skills:**
- Skill cards showing:
  - Skill name and category
  - Day X / 90
  - Completion percentage
  - Progress bar
  - "Continue Learning" button
- Long-press to delete skill

**Flow:** Tap "+" → Skill Chat

---

### 5. Skill Chat (`/skill-chat`)

**Purpose:** AI-powered skill selection and disambiguation

**Process:**
1. User types desired skill (e.g., "cooking")
2. AI asks clarifying questions:
   - "What kind of cooking?" (General, Baking, Specific Cuisine, etc.)
3. User selects option
4. AI narrows down further if needed
5. AI confirms final skill selection
6. "Ready for Roadmap" state triggers

**Example Flow:**
```
User: "I want to learn shooting"
AI: "When you say 'shooting,' which do you mean?
    1. Photography/videography
    2. Archery
    3. Firearms
    4. Something else"
User: "Firearms"
AI: "Which category?
    1. Handguns
    2. Rifles
    3. Shotguns
    4. General firearms safety"
User: "Handguns"
AI: "What's your goal?
    1. Safety & fundamentals
    2. Competitive shooting
    3. Tactical / defense
    4. Hobby / range practice"
User: "Safety & fundamentals"
AI: "Perfect! You're about to start a 90-day plan for:
    Handgun Shooting - Safety & Fundamentals
    Confirm to generate your roadmap?"
```

**Flow:** AI confirms → Payment Screen

---

### 6. Payment/Trial Screen (`/payment`)

**Purpose:** Convert free trial, collect payment info

**Elements:**
- "Your First Skill is FREE!" header
- Feature checklist
- Pricing card:
  - 90-Day Free Trial badge
  - $19.99/month after trial
  - Cancel anytime messaging
- Payment method placeholder (RevenueCat)
- "Start Learning Free" CTA

**Process:**
1. User sees trial offer
2. Adds payment method (RevenueCat)
3. Trial starts (90 days)
4. Skill instance created
5. Roadmap generated
6. Redirect to Roadmap screen

---

### 7. Skill Roadmap (`/skill-roadmap/[id]`)

**Purpose:** Detailed view of learning plan

**Tabs:**

**Tasks Tab:**
- Daily tasks list for selected day
- Checkbox to complete tasks
- Time estimate per task
- Resource links (YouTube, articles)
- Incomplete tasks roll over

**Resources Tab:**
- Curated learning resources
- YouTube videos
- Articles
- Documents
- External courses

**Milestones Tab:**
- Progress milestones (Day 7, 30, 60, 90)
- Achievement descriptions
- Completion status

**Progress Timeline:**
- Bar chart showing daily completion
- Scroll through days
- Visual progress indicator

**Day Selector:**
- Navigate between days
- See date for each day
- Track current day

---

### 8. Profile Screen (`/(tabs)/profile`)

**Purpose:** User settings and preferences

**Sections:**

**User Info:**
- Name and email
- Avatar

**Learning Profile:**
- Role
- Daily time commitment
- Location
- Learning style preferences

**Settings:**
- Notifications
- Subscription management
- Help & Support
- Terms & Privacy
- Log Out

---

## API Reference

### Base URL
```
http://localhost:8001/api
```

### Endpoints

#### Health Check
```
GET /api/
GET /api/health
```

#### Users
```
POST /api/users
  Body: { email, name, google_id?, avatar_url? }
  Returns: User object

GET /api/users/{user_id}
  Returns: User object

GET /api/users/email/{email}
  Returns: User object

PUT /api/users/{user_id}
  Body: { ...updates }
  Returns: Updated user object
```

#### Onboarding
```
POST /api/onboarding
  Body: {
    user_role, age_range, country, timezone,
    daily_time_minutes, learning_preferences[],
    learning_history_type, motivation_type
  }
  Returns: OnboardingProfile object

GET /api/onboarding/{profile_id}
  Returns: OnboardingProfile object

PUT /api/onboarding/{profile_id}/link-user?user_id={user_id}
  Links profile to authenticated user
```

#### Skill Chat
```
POST /api/skills/chat
  Body: {
    user_id, message, chat_history[],
    skill_instance_id?
  }
  Returns: {
    response: string,
    ready_for_roadmap: boolean,
    skill_name?: string,
    category?: string
  }
```

#### Skill Instances
```
POST /api/skills/instances
  Body: {
    user_id, skill_name, skill_description,
    category, duration_days?
  }
  Returns: SkillInstance with generated roadmap

GET /api/skills/instances/user/{user_id}
  Returns: SkillInstance[]

GET /api/skills/instances/{instance_id}
  Returns: SkillInstance

DELETE /api/skills/instances/{instance_id}
  Deletes skill instance
```

#### Tasks
```
PUT /api/skills/instances/{instance_id}/tasks/complete
  Body: { task_id, day_number }
  Returns: { completion_percentage }

GET /api/skills/instances/{instance_id}/daily-tasks/{day_number}
  Returns: DayPlan with tasks
```

#### Trial
```
POST /api/users/{user_id}/start-trial
  Starts 90-day free trial
  Returns: { trial_end_date }
```

---

## Troubleshooting

### "GEMINI_API_KEY not set" Warning
- Ensure your Gemini API key is in `/app/backend/.env`
- Restart the backend server after adding the key

### Google Sign-In Not Working
- Verify OAuth credentials in Supabase
- Check redirect URIs match your app
- Ensure Google provider is enabled in Supabase Auth

### AI Chat Returns Errors
- Check Gemini API key is valid
- Verify you haven't exceeded API rate limits
- Check backend logs for detailed errors

### Tasks Not Saving
- Verify MongoDB is running
- Check database connection string in `.env`
- Look for errors in backend logs

### App Not Loading on Device
- Ensure device is on same network
- Try using tunnel mode: `expo start --tunnel`
- Clear Expo Go app cache

---

## Project Structure

```
/app
├── backend/
│   ├── .env                 # Backend environment variables
│   ├── server.py            # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── .env                 # Frontend environment variables
│   ├── app/                 # Expo Router screens
│   │   ├── index.tsx        # Welcome screen
│   │   ├── _layout.tsx      # Root layout
│   │   ├── auth.tsx         # Authentication
│   │   ├── skill-chat.tsx   # AI chat
│   │   ├── payment.tsx      # Trial/payment
│   │   ├── onboarding/
│   │   │   └── [step].tsx   # Onboarding questions
│   │   ├── skill-roadmap/
│   │   │   └── [id].tsx     # Roadmap view
│   │   └── (tabs)/
│   │       ├── _layout.tsx  # Tab navigation
│   │       ├── home.tsx     # Home screen
│   │       └── profile.tsx  # Profile screen
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── constants/       # Theme, colors
│   │   ├── services/        # API client
│   │   └── store/           # Zustand state management
│   ├── app.json             # Expo configuration
│   └── package.json         # Node dependencies
├── SETUP.md                 # This file
└── test_result.md           # Testing documentation
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Review frontend logs: `tail -f /var/log/supervisor/expo.out.log`

---

**Happy Learning with SkillGPT!**
