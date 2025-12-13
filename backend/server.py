from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json
import google.generativeai as genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'skillgpt_db')]

# Configure Gemini with user-provided API key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logging.warning("GEMINI_API_KEY not set. AI features will not work.")

# Create the main app
app = FastAPI(title="SkillGPT API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class OnboardingProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    user_role: str  # student, professional, etc.
    age_range: str  # Under 16, 16-18, etc.
    country: str
    timezone: str
    daily_time_minutes: int  # 15, 30, 60, 120+
    learning_preferences: List[str]  # videos, articles, hands-on, etc.
    learning_history_type: str  # first time, quit midway, etc.
    motivation_type: str  # career, personal growth, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OnboardingProfileCreate(BaseModel):
    user_role: str
    age_range: str
    country: str
    timezone: str
    daily_time_minutes: int
    learning_preferences: List[str]
    learning_history_type: str
    motivation_type: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_profile_id: Optional[str] = None
    trial_started: bool = False
    trial_start_date: Optional[datetime] = None
    subscription_active: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    name: str
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None

class DailyTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    estimated_minutes: int
    resource_links: List[str] = []
    completed: bool = False
    completed_at: Optional[datetime] = None

class DayPlan(BaseModel):
    day_number: int
    date: Optional[str] = None
    tasks: List[DailyTask]
    completion_percentage: float = 0.0

class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # youtube, article, document
    title: str
    url: str
    description: str

class SkillRoadmap(BaseModel):
    overview: str
    total_days: int
    milestones: List[Dict[str, Any]]
    day_plans: List[DayPlan]
    resources: List[Resource]

class SkillInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    skill_name: str
    skill_description: str
    category: str
    duration_days: int = 90
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    status: str = "active"  # active, completed, paused
    completion_percentage: float = 0.0
    roadmap: Optional[SkillRoadmap] = None
    chat_history: List[Dict[str, str]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SkillInstanceCreate(BaseModel):
    user_id: str
    skill_name: str
    skill_description: str
    category: str
    duration_days: int = 90

class ChatMessage(BaseModel):
    role: str  # user or assistant
    content: str

class ChatRequest(BaseModel):
    user_id: str
    skill_instance_id: Optional[str] = None
    message: str
    chat_history: List[ChatMessage] = []

class TaskCompletionRequest(BaseModel):
    task_id: str
    day_number: int

# ==================== HELPER FUNCTIONS ====================

def get_gemini_model():
    """Get the Gemini model for chat"""
    return genai.GenerativeModel('gemini-2.5-flash')

async def generate_skill_clarification(user_message: str, chat_history: List[Dict[str, str]], onboarding_profile: Optional[dict] = None):
    """Generate clarifying questions for skill selection using Gemini"""
    model = get_gemini_model()
    
    profile_context = ""
    if onboarding_profile:
        profile_context = f"""
User Profile:
- Role: {onboarding_profile.get('user_role', 'unknown')}
- Age Range: {onboarding_profile.get('age_range', 'unknown')}
- Daily Time: {onboarding_profile.get('daily_time_minutes', 60)} minutes
- Learning Style: {', '.join(onboarding_profile.get('learning_preferences', []))}
- Motivation: {onboarding_profile.get('motivation_type', 'unknown')}
"""
    
    history_text = ""
    for msg in chat_history:
        history_text += f"{msg['role'].upper()}: {msg['content']}\n"
    
    prompt = f"""You are a skill learning assistant for SkillGPT app. Your job is to help users clarify exactly what skill they want to learn.

{profile_context}

CONVERSATION HISTORY:
{history_text}

USER'S LATEST MESSAGE: {user_message}

RULES:
1. NEVER generate a roadmap until the skill is completely unambiguous
2. Ask clarifying questions to narrow down the exact skill
3. Provide 3-4 options when disambiguating
4. Once the skill is clear, confirm with the user before proceeding
5. Keep responses concise and friendly
6. When ready to proceed, end your message with [READY_FOR_ROADMAP:skill_name:category]

RESPONSE FORMAT:
- If skill is ambiguous: Ask clarifying questions with numbered options
- If skill is clear but needs goal clarification: Ask about their specific goal
- If ready for roadmap: Confirm the skill and end with [READY_FOR_ROADMAP:skill_name:category]

Respond naturally as a helpful assistant:"""

    response = model.generate_content(prompt)
    return response.text

async def generate_skill_roadmap(skill_name: str, category: str, duration_days: int, onboarding_profile: Optional[dict] = None):
    """Generate a complete roadmap for learning a skill using Gemini"""
    model = get_gemini_model()
    
    daily_time = onboarding_profile.get('daily_time_minutes', 60) if onboarding_profile else 60
    learning_prefs = onboarding_profile.get('learning_preferences', ['videos', 'hands-on']) if onboarding_profile else ['videos', 'hands-on']
    
    prompt = f"""Generate a detailed {duration_days}-day learning roadmap for: {skill_name} (Category: {category})

USER CONTEXT:
- Daily available time: {daily_time} minutes
- Preferred learning styles: {', '.join(learning_prefs)}

Generate a JSON response with this EXACT structure:
{{
    "overview": "Brief overview of the learning journey",
    "total_days": {duration_days},
    "milestones": [
        {{"day": 7, "title": "Milestone 1", "description": "What they should achieve"}},
        {{"day": 30, "title": "Milestone 2", "description": "What they should achieve"}},
        {{"day": 60, "title": "Milestone 3", "description": "What they should achieve"}},
        {{"day": 90, "title": "Final Milestone", "description": "What they should achieve"}}
    ],
    "day_plans": [
        {{
            "day_number": 1,
            "tasks": [
                {{
                    "title": "Task title",
                    "description": "What to do",
                    "estimated_minutes": 30,
                    "resource_links": ["https://youtube.com/..."]
                }}
            ]
        }}
    ],
    "resources": [
        {{
            "type": "youtube",
            "title": "Resource title",
            "url": "https://...",
            "description": "Why this resource is helpful"
        }}
    ]
}}

IMPORTANT:
1. Generate day_plans for at least the first 14 days in detail
2. Each day should have 2-4 tasks that fit within {daily_time} minutes total
3. Include real, useful YouTube links and article URLs
4. Tasks should progressively build skills
5. Include a mix of learning and practice tasks

Return ONLY the JSON, no markdown formatting:"""

    response = model.generate_content(prompt)
    response_text = response.text.strip()
    
    # Clean up response - remove markdown code blocks if present
    if response_text.startswith('```'):
        response_text = response_text.split('\n', 1)[1]
    if response_text.endswith('```'):
        response_text = response_text.rsplit('\n', 1)[0]
    if response_text.startswith('json'):
        response_text = response_text[4:]
    
    try:
        roadmap_data = json.loads(response_text)
        
        # Process day_plans to ensure proper structure
        processed_day_plans = []
        for day_data in roadmap_data.get('day_plans', []):
            tasks = []
            for task_data in day_data.get('tasks', []):
                task = DailyTask(
                    title=task_data.get('title', ''),
                    description=task_data.get('description', ''),
                    estimated_minutes=task_data.get('estimated_minutes', 30),
                    resource_links=task_data.get('resource_links', [])
                )
                tasks.append(task)
            
            day_plan = DayPlan(
                day_number=day_data.get('day_number', 1),
                tasks=tasks
            )
            processed_day_plans.append(day_plan)
        
        # Process resources
        processed_resources = []
        for res_data in roadmap_data.get('resources', []):
            resource = Resource(
                type=res_data.get('type', 'article'),
                title=res_data.get('title', ''),
                url=res_data.get('url', ''),
                description=res_data.get('description', '')
            )
            processed_resources.append(resource)
        
        roadmap = SkillRoadmap(
            overview=roadmap_data.get('overview', ''),
            total_days=roadmap_data.get('total_days', duration_days),
            milestones=roadmap_data.get('milestones', []),
            day_plans=processed_day_plans,
            resources=processed_resources
        )
        
        return roadmap
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse roadmap JSON: {e}")
        logger.error(f"Response text: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to generate roadmap")

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "SkillGPT API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# User Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Create a new user or return existing user by email"""
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        return User(**existing_user)
    
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/users/email/{email}", response_model=User)
async def get_user_by_email(email: str):
    """Get user by email"""
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, updates: dict):
    """Update user fields"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id})
    return User(**user)

# Onboarding Routes
@api_router.post("/onboarding", response_model=OnboardingProfile)
async def create_onboarding_profile(profile_data: OnboardingProfileCreate):
    """Create onboarding profile"""
    profile = OnboardingProfile(**profile_data.dict())
    await db.onboarding_profiles.insert_one(profile.dict())
    return profile

@api_router.get("/onboarding/{profile_id}", response_model=OnboardingProfile)
async def get_onboarding_profile(profile_id: str):
    """Get onboarding profile by ID"""
    profile = await db.onboarding_profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return OnboardingProfile(**profile)

@api_router.get("/onboarding/user/{user_id}", response_model=OnboardingProfile)
async def get_onboarding_profile_by_user(user_id: str):
    """Get onboarding profile by user ID"""
    profile = await db.onboarding_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return OnboardingProfile(**profile)

@api_router.put("/onboarding/{profile_id}/link-user")
async def link_onboarding_to_user(profile_id: str, user_id: str):
    """Link onboarding profile to a user after authentication"""
    # Update onboarding profile with user_id
    await db.onboarding_profiles.update_one(
        {"id": profile_id},
        {"$set": {"user_id": user_id}}
    )
    
    # Update user with onboarding profile
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"onboarding_completed": True, "onboarding_profile_id": profile_id}}
    )
    
    return {"status": "success", "message": "Profile linked to user"}

# Skill Chat Routes
@api_router.post("/skills/chat")
async def skill_chat(request: ChatRequest):
    """Chat with AI for skill selection and disambiguation"""
    # Get user's onboarding profile if available
    onboarding_profile = None
    if request.user_id:
        user = await db.users.find_one({"id": request.user_id})
        if user and user.get("onboarding_profile_id"):
            profile = await db.onboarding_profiles.find_one({"id": user["onboarding_profile_id"]})
            if profile:
                onboarding_profile = profile
    
    # Convert chat history to proper format
    chat_history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
    
    # Generate AI response
    response = await generate_skill_clarification(request.message, chat_history, onboarding_profile)
    
    # Check if ready for roadmap
    ready_for_roadmap = "[READY_FOR_ROADMAP" in response
    skill_name = None
    category = None
    
    if ready_for_roadmap:
        # Extract skill name and category
        try:
            marker = response.split("[READY_FOR_ROADMAP:")[1].split("]")[0]
            parts = marker.split(":")
            skill_name = parts[0].strip()
            category = parts[1].strip() if len(parts) > 1 else "general"
            # Remove the marker from response
            response = response.split("[READY_FOR_ROADMAP")[0].strip()
        except:
            ready_for_roadmap = False
    
    return {
        "response": response,
        "ready_for_roadmap": ready_for_roadmap,
        "skill_name": skill_name,
        "category": category
    }

# Skill Instance Routes
@api_router.post("/skills/instances", response_model=SkillInstance)
async def create_skill_instance(skill_data: SkillInstanceCreate):
    """Create a new skill instance and generate roadmap"""
    # Get user's onboarding profile
    onboarding_profile = None
    user = await db.users.find_one({"id": skill_data.user_id})
    if user and user.get("onboarding_profile_id"):
        profile = await db.onboarding_profiles.find_one({"id": user["onboarding_profile_id"]})
        if profile:
            onboarding_profile = profile
    
    # Generate roadmap
    roadmap = await generate_skill_roadmap(
        skill_data.skill_name,
        skill_data.category,
        skill_data.duration_days,
        onboarding_profile
    )
    
    # Create skill instance
    skill_instance = SkillInstance(
        user_id=skill_data.user_id,
        skill_name=skill_data.skill_name,
        skill_description=skill_data.skill_description,
        category=skill_data.category,
        duration_days=skill_data.duration_days,
        end_date=datetime.utcnow() + timedelta(days=skill_data.duration_days),
        roadmap=roadmap
    )
    
    await db.skill_instances.insert_one(skill_instance.dict())
    return skill_instance

@api_router.get("/skills/instances/user/{user_id}")
async def get_user_skill_instances(user_id: str):
    """Get all skill instances for a user"""
    instances = await db.skill_instances.find({"user_id": user_id}).to_list(100)
    return [SkillInstance(**instance) for instance in instances]

@api_router.get("/skills/instances/{instance_id}")
async def get_skill_instance(instance_id: str):
    """Get a specific skill instance"""
    instance = await db.skill_instances.find_one({"id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="Skill instance not found")
    return SkillInstance(**instance)

@api_router.delete("/skills/instances/{instance_id}")
async def delete_skill_instance(instance_id: str):
    """Delete a skill instance"""
    result = await db.skill_instances.delete_one({"id": instance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill instance not found")
    return {"status": "success", "message": "Skill instance deleted"}

# Task Routes
@api_router.put("/skills/instances/{instance_id}/tasks/complete")
async def complete_task(instance_id: str, request: TaskCompletionRequest):
    """Mark a task as completed"""
    instance = await db.skill_instances.find_one({"id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="Skill instance not found")
    
    skill_instance = SkillInstance(**instance)
    
    # Find and update the task
    if skill_instance.roadmap:
        for day_plan in skill_instance.roadmap.day_plans:
            if day_plan.day_number == request.day_number:
                for task in day_plan.tasks:
                    if task.id == request.task_id:
                        task.completed = True
                        task.completed_at = datetime.utcnow()
                        break
                
                # Calculate day completion percentage
                completed_tasks = sum(1 for t in day_plan.tasks if t.completed)
                day_plan.completion_percentage = (completed_tasks / len(day_plan.tasks)) * 100 if day_plan.tasks else 0
                break
        
        # Calculate overall completion percentage
        total_tasks = sum(len(dp.tasks) for dp in skill_instance.roadmap.day_plans)
        completed_total = sum(sum(1 for t in dp.tasks if t.completed) for dp in skill_instance.roadmap.day_plans)
        skill_instance.completion_percentage = (completed_total / total_tasks) * 100 if total_tasks > 0 else 0
        
        # Update in database
        await db.skill_instances.update_one(
            {"id": instance_id},
            {"$set": skill_instance.dict()}
        )
    
    return {"status": "success", "completion_percentage": skill_instance.completion_percentage}

@api_router.get("/skills/instances/{instance_id}/daily-tasks/{day_number}")
async def get_daily_tasks(instance_id: str, day_number: int):
    """Get tasks for a specific day"""
    instance = await db.skill_instances.find_one({"id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="Skill instance not found")
    
    skill_instance = SkillInstance(**instance)
    
    if skill_instance.roadmap:
        for day_plan in skill_instance.roadmap.day_plans:
            if day_plan.day_number == day_number:
                return day_plan
    
    raise HTTPException(status_code=404, detail="Day plan not found")

# ==================== NOTIFICATION MODELS ====================

class NotificationPreferences(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    push_token: Optional[str] = None
    platform: Optional[str] = None  # ios, android
    daily_reminders: bool = True
    morning_time: str = "09:00"
    afternoon_time: str = "14:00"
    evening_time: str = "20:00"
    milestone_alerts: bool = True
    streak_notifications: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RegisterPushTokenRequest(BaseModel):
    user_id: str
    push_token: str
    platform: str  # ios, android

class UpdateNotificationPrefsRequest(BaseModel):
    daily_reminders: Optional[bool] = None
    morning_time: Optional[str] = None
    afternoon_time: Optional[str] = None
    evening_time: Optional[str] = None
    milestone_alerts: Optional[bool] = None
    streak_notifications: Optional[bool] = None

# ==================== NOTIFICATION ROUTES ====================

@api_router.post("/notifications/register")
async def register_push_token(request: RegisterPushTokenRequest):
    """Register a push token for a user"""
    # Check if preferences already exist for this user
    existing = await db.notification_preferences.find_one({"user_id": request.user_id})
    
    if existing:
        # Update existing preferences with new token
        await db.notification_preferences.update_one(
            {"user_id": request.user_id},
            {"$set": {
                "push_token": request.push_token,
                "platform": request.platform,
                "updated_at": datetime.utcnow()
            }}
        )
        return {"status": "success", "message": "Push token updated"}
    else:
        # Create new preferences
        prefs = NotificationPreferences(
            user_id=request.user_id,
            push_token=request.push_token,
            platform=request.platform
        )
        await db.notification_preferences.insert_one(prefs.dict())
        return {"status": "success", "message": "Push token registered"}

@api_router.get("/notifications/preferences/{user_id}")
async def get_notification_preferences(user_id: str):
    """Get notification preferences for a user"""
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    if not prefs:
        # Return default preferences
        return NotificationPreferences(user_id=user_id)
    return NotificationPreferences(**prefs)

@api_router.put("/notifications/preferences/{user_id}")
async def update_notification_preferences(user_id: str, request: UpdateNotificationPrefsRequest):
    """Update notification preferences for a user"""
    updates = {k: v for k, v in request.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    
    existing = await db.notification_preferences.find_one({"user_id": user_id})
    
    if existing:
        await db.notification_preferences.update_one(
            {"user_id": user_id},
            {"$set": updates}
        )
    else:
        # Create new preferences with updates
        prefs = NotificationPreferences(user_id=user_id, **request.dict())
        await db.notification_preferences.insert_one(prefs.dict())
    
    return {"status": "success", "message": "Notification preferences updated"}

@api_router.get("/notifications/users-to-notify")
async def get_users_to_notify():
    """Get all users with push tokens enabled for notifications (for server-side push)"""
    users = await db.notification_preferences.find({
        "daily_reminders": True,
        "push_token": {"$ne": None}
    }).to_list(1000)
    
    return [{"user_id": u["user_id"], "push_token": u["push_token"], "platform": u.get("platform")} for u in users]

@api_router.get("/notifications/pending-tasks/{user_id}")
async def get_pending_tasks_count(user_id: str):
    """Get count of pending tasks for today for a user"""
    # Get all active skill instances for user
    instances = await db.skill_instances.find({
        "user_id": user_id,
        "status": "active"
    }).to_list(100)
    
    total_pending = 0
    skill_summaries = []
    
    for instance in instances:
        skill_instance = SkillInstance(**instance)
        if skill_instance.roadmap:
            # Calculate current day
            start_date = skill_instance.start_date
            today = datetime.utcnow()
            current_day = max(1, (today - start_date).days + 1)
            
            # Find today's day plan
            for day_plan in skill_instance.roadmap.day_plans:
                if day_plan.day_number == current_day:
                    incomplete_tasks = sum(1 for t in day_plan.tasks if not t.completed)
                    total_pending += incomplete_tasks
                    if incomplete_tasks > 0:
                        skill_summaries.append({
                            "skill_name": skill_instance.skill_name,
                            "pending_tasks": incomplete_tasks
                        })
                    break
    
    return {
        "total_pending": total_pending,
        "skills": skill_summaries
    }

# Trial/Payment Routes
@api_router.post("/users/{user_id}/start-trial")
async def start_trial(user_id: str):
    """Start the free trial for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("trial_started"):
        raise HTTPException(status_code=400, detail="Trial already started")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "trial_started": True,
            "trial_start_date": datetime.utcnow()
        }}
    )
    
    return {"status": "success", "message": "Trial started", "trial_end_date": (datetime.utcnow() + timedelta(days=90)).isoformat()}

# ==================== SUBSCRIPTION ROUTES ====================

class SubscriptionStatus(BaseModel):
    is_subscribed: bool
    is_trial_active: bool = False
    trial_end_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    product_id: Optional[str] = None
    will_renew: bool = False

class UpdateSubscriptionRequest(BaseModel):
    is_subscribed: bool
    is_trial_active: Optional[bool] = None
    trial_end_date: Optional[str] = None
    expiration_date: Optional[str] = None
    product_id: Optional[str] = None
    will_renew: Optional[bool] = None

@api_router.get("/users/{user_id}/subscription")
async def get_subscription_status(user_id: str):
    """Get subscription status for a user"""
    # Check subscriptions collection
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if subscription:
        # Check if subscription is still valid
        is_valid = True
        if subscription.get("subscription_end_date"):
            end_date = subscription["subscription_end_date"]
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            is_valid = end_date > datetime.utcnow()
        
        return {
            "is_subscribed": is_valid and subscription.get("is_subscribed", False),
            "is_trial_active": subscription.get("is_trial_active", False),
            "trial_end_date": subscription.get("trial_end_date"),
            "subscription_end_date": subscription.get("subscription_end_date"),
            "product_id": subscription.get("product_id"),
            "will_renew": subscription.get("will_renew", False)
        }
    
    # Check if user has active trial from users collection
    user = await db.users.find_one({"id": user_id})
    if user and user.get("trial_started"):
        trial_start = user.get("trial_start_date")
        if trial_start:
            trial_end = trial_start + timedelta(days=30)  # First month free
            is_trial_active = datetime.utcnow() < trial_end
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
    """Update subscription status for a user (called after RevenueCat events)"""
    subscription_data = {
        "user_id": user_id,
        "is_subscribed": request.is_subscribed,
        "is_trial_active": request.is_trial_active or False,
        "will_renew": request.will_renew or False,
        "updated_at": datetime.utcnow()
    }
    
    if request.trial_end_date:
        subscription_data["trial_end_date"] = request.trial_end_date
    if request.expiration_date:
        subscription_data["subscription_end_date"] = request.expiration_date
    if request.product_id:
        subscription_data["product_id"] = request.product_id
    
    # Upsert subscription
    existing = await db.subscriptions.find_one({"user_id": user_id})
    if existing:
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription_data}
        )
    else:
        subscription_data["created_at"] = datetime.utcnow()
        await db.subscriptions.insert_one(subscription_data)
    
    # Also update user's subscription_active flag
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_active": request.is_subscribed}}
    )
    
    return {"status": "success", "message": "Subscription status updated"}

@api_router.post("/webhooks/revenuecat")
async def revenuecat_webhook(payload: dict):
    """Handle RevenueCat webhook events for subscription updates"""
    event_type = payload.get("event", {}).get("type")
    app_user_id = payload.get("event", {}).get("app_user_id")
    
    if not app_user_id:
        raise HTTPException(status_code=400, detail="Missing app_user_id")
    
    logger.info(f"RevenueCat webhook: {event_type} for user {app_user_id}")
    
    # Handle different event types
    if event_type in ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"]:
        # Subscription activated or renewed
        expiration_date = payload.get("event", {}).get("expiration_at_ms")
        product_id = payload.get("event", {}).get("product_id")
        
        subscription_data = {
            "user_id": app_user_id,
            "is_subscribed": True,
            "is_trial_active": event_type == "INITIAL_PURCHASE",
            "will_renew": True,
            "product_id": product_id,
            "updated_at": datetime.utcnow()
        }
        
        if expiration_date:
            subscription_data["subscription_end_date"] = datetime.fromtimestamp(expiration_date / 1000)
        
        existing = await db.subscriptions.find_one({"user_id": app_user_id})
        if existing:
            await db.subscriptions.update_one({"user_id": app_user_id}, {"$set": subscription_data})
        else:
            subscription_data["created_at"] = datetime.utcnow()
            await db.subscriptions.insert_one(subscription_data)
        
        await db.users.update_one({"id": app_user_id}, {"$set": {"subscription_active": True}})
        
    elif event_type in ["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"]:
        # Subscription cancelled or expired
        await db.subscriptions.update_one(
            {"user_id": app_user_id},
            {"$set": {
                "is_subscribed": False,
                "will_renew": False,
                "updated_at": datetime.utcnow()
            }}
        )
        await db.users.update_one({"id": app_user_id}, {"$set": {"subscription_active": False}})
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
