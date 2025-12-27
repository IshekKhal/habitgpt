from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
import json
import google.generativeai as genai
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, APIRouter, HTTPException, Request

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_ANON_KEY', ''))

supabase: Optional[Client] = None

# Initialize Supabase only if valid credentials are provided
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith('https://'):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logging.info("Supabase connected successfully")
    except Exception as e:
        logging.warning(f"Failed to connect to Supabase: {e}")
        supabase = None
else:
    logging.warning("Supabase credentials not set or invalid. Database operations will fail.")

# Configure Gemini with user-provided API key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logging.warning("GEMINI_API_KEY not set. AI features will not work.")

# Create the main app
app = FastAPI(title="HabitGPT API", version="1.0.0")

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
async def root():
    return {"message": "HabitGPT API is running", "docs": "/docs"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== COACH STYLE CONFIGURATIONS ====================

COACH_STYLES = {
    'gentle': {
        'name': 'Gentle & Encouraging',
        'missed_day_message': "It's okay to have an off day. Tomorrow is a fresh start! 🌱",
        'reminder_tone': 'friendly',
        'streak_broken_message': "Don't worry about the streak. What matters is getting back on track.",
        'morning_notification': "Good morning! Ready to nurture your habit today? You've got this! 🌅",
        'afternoon_notification': "Gentle reminder — have you had a chance to work on your habit? No pressure! 💚",
        'evening_notification': "Winding down? Perfect time to check in on your habit. Every small step counts! ✨",
    },
    'structured': {
        'name': 'Structured & Firm',
        'missed_day_message': "You missed today's habit. Let's make sure tomorrow counts.",
        'reminder_tone': 'professional',
        'streak_broken_message': "Streak broken. Reset and recommit to your goal.",
        'morning_notification': "Morning check-in: Your habit is scheduled for today. Plan your time accordingly.",
        'afternoon_notification': "Afternoon update: Your daily habit task is pending. Complete it before evening.",
        'evening_notification': "Evening status: Finalize today's habit before midnight to maintain your streak.",
    },
    'strict': {
        'name': 'Strict & No-Excuses',
        'missed_day_message': "No excuses. You committed to this. Get it done.",
        'reminder_tone': 'direct',
        'streak_broken_message': "Streak lost. Start over. No shortcuts.",
        'morning_notification': "Day started. Your habit awaits. Execute.",
        'afternoon_notification': "Half the day is gone. Is your habit done? If not, do it now.",
        'evening_notification': "Final call. Complete your habit or accept the missed day.",
    },
    'adaptive': {
        'name': 'Adaptive',
        'missed_day_message': "Based on your pattern, let's adjust your approach. What got in the way?",
        'reminder_tone': 'dynamic',
        'streak_broken_message': "Let's analyze what went wrong and adapt your plan.",
        'morning_notification': "Good morning! Based on your progress, today's a great day to build momentum.",
        'afternoon_notification': "Checking in — how's the habit going? Let me know if you need to adjust.",
        'evening_notification': "Evening reflection: How did today go? Your feedback helps me help you better.",
    },
}

# ==================== PYDANTIC MODELS ====================

class OnboardingProfileCreate(BaseModel):
    primary_change_domain: str
    failure_patterns: List[str] = []
    baseline_consistency_level: str
    primary_obstacle: str
    max_daily_effort_minutes: int
    miss_response_type: str
    coach_style_preference: str

class OnboardingProfileResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    primary_change_domain: str
    failure_patterns: List[str] = []
    baseline_consistency_level: str
    primary_obstacle: str
    max_daily_effort_minutes: int
    miss_response_type: str
    coach_style_preference: str
    created_at: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    name: str
    google_id: Optional[str] = None
    apple_id: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    google_id: Optional[str] = None
    apple_id: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: Optional[bool] = False
    onboarding_profile_id: Optional[str] = None
    trial_started: Optional[bool] = False
    trial_start_date: Optional[str] = None
    subscription_active: Optional[bool] = False
    created_at: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    habit_instance_id: Optional[str] = None
    message: str
    chat_history: List[ChatMessage] = []

class HabitInstanceCreate(BaseModel):
    user_id: str
    habit_name: str
    habit_description: str
    category: str
    duration_days: int = 29

class TaskCompletionRequest(BaseModel):
    task_id: str
    day_number: int
    completed: Optional[bool] = True

class RegisterPushTokenRequest(BaseModel):
    user_id: str
    push_token: str
    platform: str

class UpdateNotificationPrefsRequest(BaseModel):
    daily_reminders: Optional[bool] = None
    morning_time: Optional[str] = None
    afternoon_time: Optional[str] = None
    evening_time: Optional[str] = None
    milestone_alerts: Optional[bool] = None
    streak_notifications: Optional[bool] = None

class UpdateSubscriptionRequest(BaseModel):
    is_subscribed: bool
    is_trial_active: Optional[bool] = None
    trial_end_date: Optional[str] = None
    expiration_date: Optional[str] = None
    product_id: Optional[str] = None
    will_renew: Optional[bool] = None

# ... (omitted sections)

@api_router.put("/habits/instances/{instance_id}/tasks/complete")
async def complete_task(instance_id: str, request: TaskCompletionRequest):
    """Mark a task as completed/uncompleted and update streaks"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        result = supabase.table('habit_instances').select('*').eq('id', instance_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Habit instance not found")
        
        habit_data = result.data[0]
        roadmap = habit_data.get('roadmap', {})
        
        # Find and update the task
        day_completed = False
        if roadmap:
            day_plans = roadmap.get('day_plans', [])
            for day_plan in day_plans:
                if day_plan.get('day_number') == request.day_number:
                    for task in day_plan.get('tasks', []):
                        if task.get('id') == request.task_id:
                            # Use provided status or default to True (complete)
                            task['completed'] = request.completed if request.completed is not None else True
                            if task['completed']:
                                task['completed_at'] = datetime.utcnow().isoformat()
                            else:
                                task.pop('completed_at', None)
                            break
                    
                    # Calculate day completion
                    tasks = day_plan.get('tasks', [])
                    completed_tasks = sum(1 for t in tasks if t.get('completed'))
                    day_plan['completion_percentage'] = (completed_tasks / len(tasks)) * 100 if tasks else 0
                    day_completed = day_plan['completion_percentage'] >= 100
                    break
            
            # Calculate overall completion
            total_tasks = sum(len(dp.get('tasks', [])) for dp in day_plans)
            completed_total = sum(sum(1 for t in dp.get('tasks', []) if t.get('completed')) for dp in day_plans)
            completion_percentage = (completed_total / total_tasks) * 100 if total_tasks > 0 else 0
        else:
            completion_percentage = habit_data.get('completion_percentage', 0)
        
        # Update streak if day is fully completed
        current_streak = habit_data.get('current_streak', 0) or 0
        longest_streak = habit_data.get('longest_streak', 0) or 0
        last_completed_date = habit_data.get('last_completed_date')
        
        if day_completed:
            current_streak, longest_streak = calculate_streak(habit_data, True)
            last_completed_date = datetime.utcnow().isoformat()
        else:
            # Re-calculate streak if unchecked? 
            # Complex, but for now assuming streak logic is additive.
            # If they uncheck the last task of the day, we theoretically should revert the streak.
            # But calculating streak from history is missing here. Keeping simple for now.
            pass
        
        # Update in database
        update_data = {
            'roadmap': roadmap,
            'completion_percentage': completion_percentage,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'last_completed_date': last_completed_date
        }
        
        supabase.table('habit_instances').update(update_data).eq('id', instance_id).execute()
        
        return {
            "status": "success",
            "completion_percentage": completion_percentage,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "task_completed": request.completed
        }
    except Exception as e:
        logger.error(f"Failed to toggle task: {e}")
        # Return 500 but with detail
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
    user_id: str
    push_token: str
    platform: str

class UpdateNotificationPrefsRequest(BaseModel):
    daily_reminders: Optional[bool] = None
    morning_time: Optional[str] = None
    afternoon_time: Optional[str] = None
    evening_time: Optional[str] = None
    milestone_alerts: Optional[bool] = None
    streak_notifications: Optional[bool] = None

class UpdateSubscriptionRequest(BaseModel):
    is_subscribed: bool
    is_trial_active: Optional[bool] = None
    trial_end_date: Optional[str] = None
    expiration_date: Optional[str] = None
    product_id: Optional[str] = None
    will_renew: Optional[bool] = None

# ==================== HELPER FUNCTIONS ====================

def get_gemini_model():
    """Get the Gemini model for chat"""
    try:
        # Use stable 2.5-flash model (User Requested)
        return genai.GenerativeModel('gemini-2.5-flash')
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {e}")
        raise HTTPException(status_code=500, detail=f"AI Model Error: {str(e)}")

def generate_uuid() -> str:
    return str(uuid.uuid4())

async def generate_habit_clarification(user_message: str, chat_history: List[Dict[str, str]], onboarding_profile: Optional[dict] = None):
    """Generate clarifying questions for habit selection using Gemini"""
    model = get_gemini_model()
    
    profile_context = ""
    coach_style = "adaptive"
    if onboarding_profile:
        coach_style = onboarding_profile.get('coach_style_preference', 'adaptive')
        failure_patterns = onboarding_profile.get('failure_patterns', [])
        if isinstance(failure_patterns, str):
            failure_patterns = [failure_patterns]
        profile_context = f"""
User Profile:
- Primary Change Domain: {onboarding_profile.get('primary_change_domain', 'unknown')}
- Failure Patterns: {', '.join(failure_patterns)}
- Consistency Level: {onboarding_profile.get('baseline_consistency_level', 'unknown')}
- Primary Obstacle: {onboarding_profile.get('primary_obstacle', 'unknown')}
- Daily Effort Available: {onboarding_profile.get('max_daily_effort_minutes', 10)} minutes
- Miss Response Type: {onboarding_profile.get('miss_response_type', 'unknown')}
- Preferred Coach Style: {coach_style}
"""
    
    history_text = ""
    for msg in chat_history:
        history_text += f"{msg['role'].upper()}: {msg['content']}\n"
    
    tone_guidance = {
        'gentle': "Be warm, encouraging, and supportive. Use positive language.",
        'structured': "Be clear, organized, and professional. Focus on planning.",
        'strict': "Be direct and no-nonsense. Focus on commitment and discipline.",
        'adaptive': "Adapt your tone based on the user's responses and needs.",
    }
    
    prompt = f"""You are an expert "2026 Success Strategist" for HabitGPT, but you must speak like a supportive, down-to-earth friend. 
    
    GOAL: Guide the user to a specific 29-day plan.
    
    CRITICAL RULES FOR YOUR TONE:
    1. NO "ROBOT TALK". Do not use words like "adherence", "optimal", "methodology", "execute", "parameters".
    2. USE SIMPLE ENGLISH. Talk like a normal human. Say "stick to it" instead of "maintain consistency". Say "easy start" instead of "minimal friction".
    3. NO MARKDOWN HEADERS. User hates `###` or `####`. NEVER use them. Use **bold** if you really need to emphasize a word, but mostly just text.
    4. NO FORMAL LABELS. Never say "STAGE 1" or "PROPOSAL". Just talk.
    
    {profile_context}
    
    CONVERSATION HISTORY:
    {history_text}
    
    USER'S LATEST MESSAGE: {user_message}
    
    YOUR PROCESS (Internal Only - DO NOT expose these labels to user):
    - If you need more info -> Ask 1 simple question.
    - If you are ready to propose plans -> "I've got two ideas for you:"
      - Idea A: [Simple Name] - [One sentence description]
      - Idea B: [Simple Name] - [One sentence description]
      - "Which one sounds better?"
    - If they chose a plan -> Confirm it and say why it's a good choice. THEN ASK: "I have everything I need. Are you ready for me to build your 29-day roadmap now?"
    - If input is just "Yes" or "Ready" (after you asked the above) -> THEN End with [READY_FOR_ROADMAP:Habit Name:Category].
    
    End with [READY_FOR_ROADMAP:Habit Name:Category] ONLY when the user has EXPLICITLY confirmed they are ready for you to build the plan. Do not trigger this just because they selected an option. Ask for permission first.
    
    Respond now as a helpful friend:"""

    response = model.generate_content(prompt)
    return response.text

async def generate_habit_roadmap(habit_name: str, category: str, duration_days: int, onboarding_profile: Optional[dict] = None):
    """Generate a complete 29-day roadmap for building a habit using Gemini"""
    model = get_gemini_model()
    
    daily_time = onboarding_profile.get('max_daily_effort_minutes', 10) if onboarding_profile else 10
    failure_patterns = onboarding_profile.get('failure_patterns', []) if onboarding_profile else []
    if isinstance(failure_patterns, str):
        failure_patterns = [failure_patterns]
    primary_obstacle = onboarding_profile.get('primary_obstacle', 'unknown') if onboarding_profile else 'unknown'
    consistency_level = onboarding_profile.get('baseline_consistency_level', 'somewhat_inconsistent') if onboarding_profile else 'somewhat_inconsistent'
    
    difficulty_note = ""
    if consistency_level in ['very_inconsistent', 'somewhat_inconsistent']:
        difficulty_note = "Start VERY simple. The first week should be almost impossibly easy."
    else:
        difficulty_note = "User is fairly consistent, but still start below their stated capacity."
    
    prompt = f"""Generate a detailed {duration_days}-day habit formation roadmap for: {habit_name} (Category: {category})

    USER CONTEXT:
    - Daily available time: {daily_time} minutes (START BELOW THIS)
    - Failure patterns to address: {', '.join(failure_patterns) if failure_patterns else 'none specified'}
    - Primary obstacle: {primary_obstacle}
    - Consistency level: {consistency_level}

    {difficulty_note}

    CORE REQUIREMENT:
    - This is a key pillar of the user's 2026 SUCCESS. Make it feel like a professional athlete's training plan.
    - Break every day's goal into 3-5 specific "Micro-Tasks". 
    - Example: Instead of just "Workout", generate: ["Put on gym clothes", "Fill water bottle", "Open the 15-min HIIT video", "Complete workout"].
    - This reduces friction by making the first steps trivial.

    - You MUST provide valid, clickable HTTP URLs in the 'resource_links' array for every task that implies content.
    - NEVER use specific YouTube Video IDs (like v=dQw4w9WgXcQ) because they might be deleted or unavailable.
    - INSTEAD, generate a specific YouTube Search URL. This is the MOST RELIABLE method.
    - Example: "https://www.youtube.com/results?search_query=10+minute+morning+meditation+for+beginners"
    - ONLY use a specific direct video link if you are 100% certain it is a timeless, official resource (like a TED Talk), otherwise default to Search Query.
    - 'resource_links' must be an array of strings, where each string is a full URL starting with "https://".

    Generate a JSON response with this EXACT structure:
    {{
        "overview": "Brief overview of the 29-day habit journey",
        "total_days": {duration_days},
        "milestones": [
            {{"day": 7, "title": "Week 1 Complete", "description": "Foundation established"}},
            {{"day": 14, "title": "2 Weeks Strong", "description": "Habit loop forming"}},
            {{"day": 21, "title": "3 Weeks - The Shift", "description": "Identity shifting"}},
            {{"day": 29, "title": "Graduation", "description": "Habit installed"}}
        ],
        "day_plans": [
            {{
                "day_number": 1,
                "tasks": [
                    {{
                        "id": "unique-id-1",
                        "title": "Micro-step 1",
                        "description": "Very small actionable step",
                        "estimated_minutes": 1,
                        "resource_links": ["https://www.youtube.com/watch?v=example"],
                        "completed": false
                    }},
                    {{
                        "id": "unique-id-2",
                        "title": "Main Action",
                        "description": "The actual habit",
                        "estimated_minutes": 10,
                        "resource_links": [],
                        "completed": false
                    }}
                ]
            }}
        ],
        "resources": [] 
    }}

    CRITICAL RULES:
    1. STRICT JSON format only.
    2. 3-5 Micro-tasks per day.
    3. Include URLs in 'resource_links' for tasks that need them.
    4. Gradually increase difficulty.
    
    Return ONLY the JSON, no markdown formatting:"""

    response = model.generate_content(prompt)
    response_text = response.text.strip()
    
    # Clean up response
    if response_text.startswith('```'):
        response_text = response_text.split('\n', 1)[1]
    if response_text.endswith('```'):
        response_text = response_text.rsplit('\n', 1)[0]
    if response_text.startswith('json'):
        response_text = response_text[4:]
    
    try:
        roadmap_data = json.loads(response_text)
        
        # Ensure all tasks have IDs
        for day_plan in roadmap_data.get('day_plans', []):
            for task in day_plan.get('tasks', []):
                if 'id' not in task:
                    task['id'] = generate_uuid()
                if 'completed' not in task:
                    task['completed'] = False
            if 'completion_percentage' not in day_plan:
                day_plan['completion_percentage'] = 0.0
        
        # Ensure all resources have IDs
        for resource in roadmap_data.get('resources', []):
            if 'id' not in resource:
                resource['id'] = generate_uuid()
        
        return roadmap_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse roadmap JSON: {e}")
        logger.error(f"Response text: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to generate roadmap")

async def generate_notification_content(user_name: str, habit_name: str, time_of_day: str, coach_style: str, tasks_remaining: int = 0):
    """Generate personalized notification content using Gemini"""
    model = get_gemini_model()
    
    tone_prompts = {
        'gentle': "warm, encouraging, and kind. Use emojis like 🌱 or 💚.",
        'structured': "clear, professional, and organized. Focus on the plan.",
        'strict': "direct, firm, and no-excuses. Call them out.",
        'adaptive': "friendly but firm, like a personal accountability partner.",
    }
    
    style_guide = tone_prompts.get(coach_style, tone_prompts['adaptive'])
    
    context = ""
    if time_of_day == 'morning':
        context = f"It is morning. Remind {user_name} to start their '{habit_name}'. Mention they have {tasks_remaining} micro-tasks likely waiting."
    elif time_of_day == 'evening':
        if tasks_remaining > 0:
            context = f"It is evening. {user_name} has NOT finished '{habit_name}' yet. Create a FOMO (Fear Of Missing Out) or urgent reminder. warn them about breaking the streak."
        else:
            context = f"It is evening. {user_name} has finished '{habit_name}'. Congratulate them briefly."
    else: # afternoon
        context = f"Afternoon check-in. Ask {user_name} if they've done '{habit_name}' yet. Keep it VERY subtle and low-pressure. Just a gentle nudge."

    prompt = f"""Write a single, punchy Push Notification (max 15 words).
    Context: {context}
    Tone: {style_guide}
    User Name: {user_name}
    
    Return ONLY the text of the notification."""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip().replace('"', '')
    except Exception as e:
        logger.error(f"AI Notification Gen Failed: {e}")
        # Fallbacks
        if time_of_day == 'morning': return f"Good morning {user_name}! Time for {habit_name}."
        if time_of_day == 'evening': return f"Don't break the streak, {user_name}! Finish {habit_name}."
        return f"Hi {user_name}, how is {habit_name} going?"

class NotificationGenRequest(BaseModel):
    user_name: str
    habit_name: str
    time_of_day: str
    coach_style: str
    tasks_remaining: int = 0

@api_router.post("/notifications/generate")
@limiter.limit("10/minute")
async def generate_notification(request: Request, notif_request: NotificationGenRequest):
    request_data = notif_request # Rename for clarity since first arg is now request object
    content = await generate_notification_content(
        request_data.user_name,
        request_data.habit_name,
        request_data.time_of_day,
        request_data.coach_style,
        request_data.tasks_remaining
    )
    return {"content": content}

def calculate_streak(habit_data: dict, completed_today: bool) -> tuple:
    """Calculate current and longest streak"""
    current_streak = habit_data.get('current_streak', 0) or 0
    longest_streak = habit_data.get('longest_streak', 0) or 0
    last_completed = habit_data.get('last_completed_date')
    
    today = datetime.utcnow().date()
    
    if completed_today:
        if last_completed:
            if isinstance(last_completed, str):
                last_date = datetime.fromisoformat(last_completed.replace('Z', '+00:00')).date()
            else:
                last_date = last_completed.date()
            days_diff = (today - last_date).days
            
            if days_diff == 0:
                pass
            elif days_diff == 1:
                current_streak += 1
            else:
                current_streak = 1
        else:
            current_streak = 1
        
        longest_streak = max(longest_streak, current_streak)
    
    return current_streak, longest_streak

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "HabitGPT API is running", "version": "1.0.0", "database": "Supabase"}

@api_router.get("/health")
async def health_check():
    db_status = "connected" if supabase else "not configured"
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "database": db_status}

# ==================== USER ROUTES ====================

class UserCreate(BaseModel):
    email: str
    name: str
    google_id: Optional[str] = None
    apple_id: Optional[str] = None
    avatar_url: Optional[str] = None
    id: Optional[str] = None  # Allow explicit ID provided by Supabase Auth

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    """Create a new user or return existing user by email"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Check if user exists
    result = supabase.table('users').select('*').eq('email', user_data.email).execute()
    
    if result.data and len(result.data) > 0:
        return UserResponse(**result.data[0])
    
    # Create new user
    new_user = {
        'id': user_data.id if user_data.id else generate_uuid(),
        'email': user_data.email,
        'name': user_data.name,
        'google_id': user_data.google_id,
        'apple_id': user_data.apple_id,
        'avatar_url': user_data.avatar_url,
        'onboarding_completed': False,
        'trial_started': False,
        'subscription_active': False,
    }
    
    result = supabase.table('users').insert(new_user).execute()
    return UserResponse(**result.data[0])

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('users').select('*').eq('id', user_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**result.data[0])

@api_router.get("/users/email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str):
    """Get user by email"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('users').select('*').eq('email', email).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**result.data[0])

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, updates: dict):
    """Update user fields"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    updates['updated_at'] = datetime.utcnow().isoformat()
    result = supabase.table('users').update(updates).eq('id', user_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**result.data[0])

# ==================== ONBOARDING ROUTES ====================

@api_router.post("/onboarding", response_model=OnboardingProfileResponse)
async def create_onboarding_profile(profile_data: OnboardingProfileCreate):
    """Create onboarding profile"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    new_profile = {
        'id': generate_uuid(),
        'primary_change_domain': profile_data.primary_change_domain,
        'failure_patterns': profile_data.failure_patterns,
        'baseline_consistency_level': profile_data.baseline_consistency_level,
        'primary_obstacle': profile_data.primary_obstacle,
        'max_daily_effort_minutes': profile_data.max_daily_effort_minutes,
        'miss_response_type': profile_data.miss_response_type,
        'coach_style_preference': profile_data.coach_style_preference,
    }
    
    result = supabase.table('onboarding_profiles').insert(new_profile).execute()
    return OnboardingProfileResponse(**result.data[0])

@api_router.get("/onboarding/{profile_id}", response_model=OnboardingProfileResponse)
async def get_onboarding_profile(profile_id: str):
    """Get onboarding profile by ID"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('onboarding_profiles').select('*').eq('id', profile_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return OnboardingProfileResponse(**result.data[0])

@api_router.get("/onboarding/user/{user_id}", response_model=OnboardingProfileResponse)
async def get_onboarding_profile_by_user(user_id: str):
    """Get onboarding profile by user ID"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('onboarding_profiles').select('*').eq('user_id', user_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return OnboardingProfileResponse(**result.data[0])

@api_router.put("/onboarding/{profile_id}/link-user")
async def link_onboarding_to_user(profile_id: str, user_id: str):
    """Link onboarding profile to a user after authentication"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Update onboarding profile with user_id
    supabase.table('onboarding_profiles').update({'user_id': user_id}).eq('id', profile_id).execute()
    
    # Update user with onboarding profile
    supabase.table('users').update({
        'onboarding_completed': True,
        'onboarding_profile_id': profile_id,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', user_id).execute()
    
    return {"status": "success", "message": "Profile linked to user"}

# ==================== HABIT CHAT ROUTES ====================

@api_router.post("/habits/chat")
@limiter.limit("10/minute")
async def habit_chat(request: Request, chat_request: ChatRequest):
    """Chat with AI for habit selection and clarification"""
    onboarding_profile = None
    
    if chat_request.user_id and supabase:
        # Get user's onboarding profile
        user_result = supabase.table('users').select('onboarding_profile_id').eq('id', chat_request.user_id).execute()
        
        if user_result.data and len(user_result.data) > 0 and user_result.data[0].get('onboarding_profile_id'):
            profile_result = supabase.table('onboarding_profiles').select('*').eq('id', user_result.data[0]['onboarding_profile_id']).execute()
            if profile_result.data and len(profile_result.data) > 0:
                onboarding_profile = profile_result.data[0]
    
    # Convert chat history to proper format
    chat_history = [{"role": msg.role, "content": msg.content} for msg in chat_request.chat_history]
    
    try:
        # Generate AI response
        response = await generate_habit_clarification(chat_request.message, chat_history, onboarding_profile)
        
        # Check if ready for roadmap
        ready_for_roadmap = "[READY_FOR_ROADMAP" in response
        habit_name = None
        category = None
        
        if ready_for_roadmap:
            try:
                marker = response.split("[READY_FOR_ROADMAP:")[1].split("]")[0]
                parts = marker.split(":")
                habit_name = parts[0].strip()
                category = parts[1].strip() if len(parts) > 1 else "other"
                response = response.split("[READY_FOR_ROADMAP")[0].strip()
            except:
                ready_for_roadmap = False
        
        return {
            "response": response,
            "ready_for_roadmap": ready_for_roadmap,
            "habit_name": habit_name,
            "category": category
        }
    except Exception as e:
        logger.error(f"Chat generation failed: {e}")
        # Return the actual error for debugging
        raise HTTPException(status_code=500, detail=f"Chat Error: {str(e)}")

# ==================== HABIT INSTANCE ROUTES ====================

@api_router.post("/habits/instances")
@limiter.limit("20/minute")
async def create_habit_instance(request: Request, habit_data: HabitInstanceCreate):
    """Create a new habit instance and generate roadmap"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Get user's onboarding profile
    onboarding_profile = None
    user_result = supabase.table('users').select('onboarding_profile_id').eq('id', habit_data.user_id).execute()
    
    if user_result.data and len(user_result.data) > 0 and user_result.data[0].get('onboarding_profile_id'):
        profile_result = supabase.table('onboarding_profiles').select('*').eq('id', user_result.data[0]['onboarding_profile_id']).execute()
        if profile_result.data and len(profile_result.data) > 0:
            onboarding_profile = profile_result.data[0]
        if profile_result.data and len(profile_result.data) > 0:
            onboarding_profile = profile_result.data[0]
            
    # Check habit limit (5 active habits max)
    existing_habits = supabase.table('habit_instances')\
        .select('*', count='exact')\
        .eq('user_id', habit_data.user_id)\
        .execute()
        
    if existing_habits.count and existing_habits.count >= 5:
        # Check subscription? Frontend handles paywall/subscription checks.
        # But for HARD LIMIT of 5, we enforce it here for everyone based on user request.
        raise HTTPException(status_code=400, detail="Habit limit reached. You can only have 5 active habits.")
    # Generate roadmap
    roadmap = await generate_habit_roadmap(
        habit_data.habit_name,
        habit_data.category,
        habit_data.duration_days,
        onboarding_profile
    )
    
    # Create habit instance
    start_date = datetime.utcnow()
    habit_instance = {
        'id': generate_uuid(),
        'user_id': habit_data.user_id,
        'habit_name': habit_data.habit_name,
        'habit_description': habit_data.habit_description,
        'category': habit_data.category,
        'duration_days': habit_data.duration_days,
        'start_date': start_date.isoformat(),
        'end_date': (start_date + timedelta(days=habit_data.duration_days)).isoformat(),
        'status': 'active',
        'completion_percentage': 0.0,
        'current_streak': 0,
        'longest_streak': 0,
        'roadmap': roadmap,
        'chat_history': [],
    }
    
    result = supabase.table('habit_instances').insert(habit_instance).execute()
    return result.data[0]

@api_router.get("/habits/instances/user/{user_id}")
async def get_user_habit_instances(user_id: str):
    """Get all habit instances for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('habit_instances').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
    return result.data

@api_router.get("/habits/instances/{instance_id}")
async def get_habit_instance(instance_id: str):
    """Get a specific habit instance"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('habit_instances').select('*').eq('id', instance_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Habit instance not found")
    
    return result.data[0]

@api_router.delete("/habits/instances/{instance_id}")
async def delete_habit_instance(instance_id: str):
    """Delete a habit instance"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    supabase.table('habit_instances').delete().eq('id', instance_id).execute()
    return {"status": "success", "message": "Habit instance deleted"}

# ==================== TASK ROUTES ====================

@api_router.put("/habits/instances/{instance_id}/tasks/complete")
async def complete_task(instance_id: str, request: TaskCompletionRequest):
    """Mark a task as completed and update streaks"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('habit_instances').select('*').eq('id', instance_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Habit instance not found")
    
    habit_data = result.data[0]
    roadmap = habit_data.get('roadmap', {})
    
    # Find and update the task
    day_completed = False
    if roadmap:
        day_plans = roadmap.get('day_plans', [])
        for day_plan in day_plans:
            if day_plan.get('day_number') == request.day_number:
                for task in day_plan.get('tasks', []):
                    if task.get('id') == request.task_id:
                        task['completed'] = True
                        task['completed_at'] = datetime.utcnow().isoformat()
                        break
                
                # Calculate day completion
                tasks = day_plan.get('tasks', [])
                completed_tasks = sum(1 for t in tasks if t.get('completed'))
                day_plan['completion_percentage'] = (completed_tasks / len(tasks)) * 100 if tasks else 0
                day_completed = day_plan['completion_percentage'] >= 100
                break
        
        # Calculate overall completion
        total_tasks = sum(len(dp.get('tasks', [])) for dp in day_plans)
        completed_total = sum(sum(1 for t in dp.get('tasks', []) if t.get('completed')) for dp in day_plans)
        completion_percentage = (completed_total / total_tasks) * 100 if total_tasks > 0 else 0
    else:
        completion_percentage = habit_data.get('completion_percentage', 0)
    
    # Update streak if day is fully completed
    current_streak = habit_data.get('current_streak', 0) or 0
    longest_streak = habit_data.get('longest_streak', 0) or 0
    last_completed_date = habit_data.get('last_completed_date')
    
    if day_completed:
        current_streak, longest_streak = calculate_streak(habit_data, True)
        last_completed_date = datetime.utcnow().isoformat()
    
    # Update in database
    update_data = {
        'roadmap': roadmap,
        'completion_percentage': completion_percentage,
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'last_completed_date': last_completed_date,
        'updated_at': datetime.utcnow().isoformat()
    }
    
    supabase.table('habit_instances').update(update_data).eq('id', instance_id).execute()
    
    return {
        "status": "success",
        "completion_percentage": completion_percentage,
        "current_streak": current_streak,
        "longest_streak": longest_streak
    }

@api_router.get("/habits/instances/{instance_id}/daily-tasks/{day_number}")
async def get_daily_tasks(instance_id: str, day_number: int):
    """Get tasks for a specific day"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('habit_instances').select('roadmap').eq('id', instance_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Habit instance not found")
    
    roadmap = result.data[0].get('roadmap', {})
    
    if roadmap:
        for day_plan in roadmap.get('day_plans', []):
            if day_plan.get('day_number') == day_number:
                return day_plan
    
    raise HTTPException(status_code=404, detail="Day plan not found")

@api_router.put("/habits/instances/{instance_id}/start")
async def update_habit_start_date(instance_id: str):
    """Reset the habit start date to now (e.g. after payment)"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    start_date = datetime.utcnow()
    # Also update end_date to keep duration correct
    
    # First get duration
    result = supabase.table('habit_instances').select('duration_days').eq('id', instance_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    duration_days = result.data[0].get('duration_days', 29)
    end_date = start_date + timedelta(days=duration_days)
    
    update_data = {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'updated_at': start_date.isoformat()
    }
    
    supabase.table('habit_instances').update(update_data).eq('id', instance_id).execute()
    
    return {"status": "success", "start_date": update_data['start_date']}

# ==================== NOTIFICATION ROUTES ====================

@api_router.post("/notifications/register")
async def register_push_token(request: RegisterPushTokenRequest):
    """Register a push token for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Check if preferences exist
    result = supabase.table('notification_preferences').select('id').eq('user_id', request.user_id).execute()
    
    if result.data and len(result.data) > 0:
        # Update existing
        supabase.table('notification_preferences').update({
            'push_token': request.push_token,
            'platform': request.platform,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('user_id', request.user_id).execute()
        return {"status": "success", "message": "Push token updated"}
    else:
        # Create new
        new_prefs = {
            'id': generate_uuid(),
            'user_id': request.user_id,
            'push_token': request.push_token,
            'platform': request.platform,
            'daily_reminders': True,
            'morning_time': '09:00',
            'afternoon_time': '14:00',
            'evening_time': '20:00',
            'milestone_alerts': True,
            'streak_notifications': True,
        }
        supabase.table('notification_preferences').insert(new_prefs).execute()
        return {"status": "success", "message": "Push token registered"}

@api_router.get("/notifications/preferences/{user_id}")
async def get_notification_preferences(user_id: str):
    """Get notification preferences for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('notification_preferences').select('*').eq('user_id', user_id).execute()
    
    if not result.data or len(result.data) == 0:
        # Return default preferences
        return {
            'user_id': user_id,
            'daily_reminders': True,
            'morning_time': '09:00',
            'afternoon_time': '14:00',
            'evening_time': '20:00',
            'milestone_alerts': True,
            'streak_notifications': True,
        }
    
    return result.data[0]

@api_router.put("/notifications/preferences/{user_id}")
async def update_notification_preferences(user_id: str, request: UpdateNotificationPrefsRequest):
    """Update notification preferences for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    updates = {k: v for k, v in request.dict().items() if v is not None}
    updates['updated_at'] = datetime.utcnow().isoformat()
    
    result = supabase.table('notification_preferences').select('id').eq('user_id', user_id).execute()
    
    if result.data and len(result.data) > 0:
        supabase.table('notification_preferences').update(updates).eq('user_id', user_id).execute()
    else:
        new_prefs = {
            'id': generate_uuid(),
            'user_id': user_id,
            **updates
        }
        supabase.table('notification_preferences').insert(new_prefs).execute()
    
    return {"status": "success", "message": "Notification preferences updated"}

@api_router.get("/notifications/coach-messages/{user_id}")
async def get_coach_messages(user_id: str):
    """Get coach-style specific notification messages for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    coach_style = "adaptive"
    
    # Get user's onboarding profile
    user_result = supabase.table('users').select('onboarding_profile_id').eq('id', user_id).execute()
    
    if user_result.data and len(user_result.data) > 0 and user_result.data[0].get('onboarding_profile_id'):
        profile_result = supabase.table('onboarding_profiles').select('coach_style_preference').eq('id', user_result.data[0]['onboarding_profile_id']).execute()
        if profile_result.data and len(profile_result.data) > 0:
            coach_style = profile_result.data[0].get('coach_style_preference', 'adaptive')
    
    return {
        "coach_style": coach_style,
        "messages": COACH_STYLES.get(coach_style, COACH_STYLES['adaptive'])
    }

@api_router.get("/notifications/pending-tasks/{user_id}")
async def get_pending_tasks_count(user_id: str):
    """Get count of pending tasks for today for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('habit_instances').select('*').eq('user_id', user_id).eq('status', 'active').execute()
    
    total_pending = 0
    habit_summaries = []
    
    for habit_data in result.data:
        roadmap = habit_data.get('roadmap', {})
        if roadmap:
            start_date = datetime.fromisoformat(habit_data['start_date'].replace('Z', '+00:00'))
            today = datetime.utcnow()
            current_day = max(1, (today - start_date).days + 1)
            
            for day_plan in roadmap.get('day_plans', []):
                if day_plan.get('day_number') == current_day:
                    incomplete_tasks = sum(1 for t in day_plan.get('tasks', []) if not t.get('completed'))
                    total_pending += incomplete_tasks
                    if incomplete_tasks > 0:
                        habit_summaries.append({
                            "habit_name": habit_data['habit_name'],
                            "pending_tasks": incomplete_tasks,
                            "current_streak": habit_data.get('current_streak', 0)
                        })
                    break
    
    return {
        "total_pending": total_pending,
        "habits": habit_summaries
    }

# ==================== TRIAL & SUBSCRIPTION ROUTES ====================

@api_router.post("/users/{user_id}/start-trial")
async def start_trial(user_id: str):
    """Start the free trial for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = supabase.table('users').select('trial_started').eq('id', user_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    if result.data[0].get('trial_started'):
        raise HTTPException(status_code=400, detail="Trial already started")
    
    trial_start = datetime.utcnow()
    supabase.table('users').update({
        'trial_started': True,
        'trial_start_date': trial_start.isoformat(),
        'updated_at': trial_start.isoformat()
    }).eq('id', user_id).execute()
    
    return {
        "status": "success",
        "message": "Trial started",
        "trial_end_date": (trial_start + timedelta(days=29)).isoformat()
    }

@api_router.get("/users/{user_id}/subscription")
async def get_subscription_status(user_id: str):
    """Get subscription status for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Check subscriptions table
    result = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
    
    if result.data and len(result.data) > 0:
        sub = result.data[0]
        is_valid = True
        if sub.get('subscription_end_date'):
            end_date = datetime.fromisoformat(sub['subscription_end_date'].replace('Z', '+00:00'))
            is_valid = end_date > datetime.now(timezone.utc)
        
        return {
            "is_subscribed": is_valid and sub.get('is_subscribed', False),
            "is_trial_active": sub.get('is_trial_active', False),
            "trial_end_date": sub.get('trial_end_date'),
            "subscription_end_date": sub.get('subscription_end_date'),
            "product_id": sub.get('product_id'),
            "will_renew": sub.get('will_renew', False)
        }
    
    # Check user's trial status
    user_result = supabase.table('users').select('trial_started, trial_start_date').eq('id', user_id).execute()
    
    if user_result.data and len(user_result.data) > 0 and user_result.data[0].get('trial_started'):
        trial_start = user_result.data[0].get('trial_start_date')
        if trial_start:
            trial_start_dt = datetime.fromisoformat(trial_start.replace('Z', '+00:00'))
            trial_end = trial_start_dt + timedelta(days=30)
            is_trial_active = datetime.now(timezone.utc) < trial_end
            return {
                "is_subscribed": is_trial_active,
                "is_trial_active": is_trial_active,
                "trial_end_date": trial_end.isoformat() if is_trial_active else None,
                "subscription_end_date": None,
                "product_id": None,
                "will_renew": False
            }
    
    return {
        "is_subscribed": False,
        "is_trial_active": False,
        "trial_end_date": None,
        "subscription_end_date": None,
        "product_id": None,
        "will_renew": False
    }

@api_router.put("/users/{user_id}/subscription")
async def update_subscription_status(user_id: str, request: UpdateSubscriptionRequest):
    """Update subscription status for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    subscription_data = {
        'user_id': user_id,
        'is_subscribed': request.is_subscribed,
        'is_trial_active': request.is_trial_active or False,
        'will_renew': request.will_renew or False,
        'updated_at': datetime.utcnow().isoformat()
    }
    
    if request.trial_end_date:
        subscription_data['trial_end_date'] = request.trial_end_date
    if request.expiration_date:
        subscription_data['subscription_end_date'] = request.expiration_date
    if request.product_id:
        subscription_data['product_id'] = request.product_id
    
    # Upsert subscription
    result = supabase.table('subscriptions').select('id').eq('user_id', user_id).execute()
    
    if result.data and len(result.data) > 0:
        supabase.table('subscriptions').update(subscription_data).eq('user_id', user_id).execute()
    else:
        subscription_data['id'] = generate_uuid()
        supabase.table('subscriptions').insert(subscription_data).execute()
    
    # Update user's subscription_active flag
    supabase.table('users').update({
        'subscription_active': request.is_subscribed,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', user_id).execute()
    
    return {"status": "success", "message": "Subscription status updated"}

@api_router.post("/webhooks/revenuecat")
async def revenuecat_webhook(payload: dict):
    """Handle RevenueCat webhook events for subscription updates"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    event_type = payload.get("event", {}).get("type")
    app_user_id = payload.get("event", {}).get("app_user_id")
    
    if not app_user_id:
        raise HTTPException(status_code=400, detail="Missing app_user_id")
    
    logger.info(f"RevenueCat webhook: {event_type} for user {app_user_id}")
    
    if event_type in ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"]:
        expiration_date = payload.get("event", {}).get("expiration_at_ms")
        product_id = payload.get("event", {}).get("product_id")
        
        subscription_data = {
            'user_id': app_user_id,
            'is_subscribed': True,
            'is_trial_active': event_type == "INITIAL_PURCHASE",
            'will_renew': True,
            'product_id': product_id,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if expiration_date:
            subscription_data['subscription_end_date'] = datetime.fromtimestamp(expiration_date / 1000).isoformat()
        
        result = supabase.table('subscriptions').select('id').eq('user_id', app_user_id).execute()
        if result.data and len(result.data) > 0:
            supabase.table('subscriptions').update(subscription_data).eq('user_id', app_user_id).execute()
        else:
            subscription_data['id'] = generate_uuid()
            supabase.table('subscriptions').insert(subscription_data).execute()
        
        supabase.table('users').update({'subscription_active': True}).eq('id', app_user_id).execute()
        
    elif event_type in ["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"]:
        supabase.table('subscriptions').update({
            'is_subscribed': False,
            'will_renew': False,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('user_id', app_user_id).execute()
        
        supabase.table('users').update({'subscription_active': False}).eq('id', app_user_id).execute()
    
    return {"status": "success"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
