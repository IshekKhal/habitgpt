import axios from 'axios';
import { User, OnboardingProfile, HabitInstance, ChatMessage } from '../store/useStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for retrying requests with exponential backoff
async function retryRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}

// <ANTIGRAVITY_DEBUG>
api.interceptors.request.use(request => {
  console.log('>>> Request:', request.method?.toUpperCase(), request.url);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('<<< Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.log('!!! Error:', error.message, error.response?.status, error.config?.url);
    if (error.response) {
      console.log('!!! Error Data:', JSON.stringify(error.response.data).substring(0, 200));
    }
    return Promise.reject(error);
  }
);
// </ANTIGRAVITY_DEBUG>

// ==================== USER API ====================

export const createUser = async (userData: {
  email: string;
  name: string;
  google_id?: string;
  apple_id?: string;
  avatar_url?: string;
  id?: string;
}): Promise<User> => {
  const response = await api.post('/api/users', userData);
  return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const response = await api.get(`/api/users/email/${email}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<User> => {
  const response = await api.put(`/api/users/${userId}`, updates);
  return response.data;
};

// ==================== ONBOARDING API ====================

export const createOnboardingProfile = async (
  profile: Omit<OnboardingProfile, 'id' | 'user_id' | 'created_at'>
): Promise<OnboardingProfile> => {
  const response = await api.post('/api/onboarding', profile);
  return response.data;
};

export const getOnboardingProfile = async (
  profileId: string
): Promise<OnboardingProfile> => {
  const response = await api.get(`/api/onboarding/${profileId}`);
  return response.data;
};

export const getOnboardingProfileByUser = async (
  userId: string
): Promise<OnboardingProfile | null> => {
  try {
    const response = await api.get(`/api/onboarding/user/${userId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const linkOnboardingToUser = async (
  profileId: string,
  userId: string
): Promise<void> => {
  await api.put(`/api/onboarding/${profileId}/link-user?user_id=${userId}`);
};

// ==================== HABIT CHAT API ====================

export const sendHabitChatMessage = async (
  userId: string,
  message: string,
  chatHistory: ChatMessage[]
): Promise<{
  response: string;
  ready_for_roadmap: boolean;
  habit_name?: string;
  category?: string;
}> => {
  return retryRequest(async () => {
    const response = await api.post('/api/habits/chat', {
      user_id: userId,
      message,
      chat_history: chatHistory,
    });
    return response.data;
  }, 3, 2000); // Retry 3 times, starting with 2s delay
};

// ==================== HABIT INSTANCE API ====================

export const createHabitInstance = async (data: {
  user_id: string;
  habit_name: string;
  habit_description: string;
  category: string;
  duration_days?: number;
}): Promise<HabitInstance> => {
  const response = await api.post('/api/habits/instances', {
    ...data,
    duration_days: data.duration_days || 29,
  });
  return response.data;
};

export const getUserHabitInstances = async (
  userId: string
): Promise<HabitInstance[]> => {
  const response = await api.get(`/api/habits/instances/user/${userId}`);
  return response.data;
};

export const getHabitInstance = async (
  instanceId: string
): Promise<HabitInstance> => {
  const response = await api.get(`/api/habits/instances/${instanceId}`);
  return response.data;
};

export const deleteHabitInstance = async (
  instanceId: string
): Promise<void> => {
  await api.delete(`/api/habits/instances/${instanceId}`);
};

export const updateHabitStartDate = async (
  instanceId: string
): Promise<void> => {
  await api.put(`/api/habits/instances/${instanceId}/start`);
};

// ==================== TASK API ====================

export const completeTask = async (
  instanceId: string,
  taskId: string,
  dayNumber: number,
  completed: boolean
): Promise<{
  status: string;
  completion_percentage: number;
  current_streak: number;
  longest_streak: number;
  task_completed: boolean;
}> => {
  const response = await api.put(
    `/api/habits/instances/${instanceId}/tasks/complete`,
    {
      task_id: taskId,
      day_number: dayNumber,
      completed,
    }
  );
  return response.data;
};

export const getDailyTasks = async (
  instanceId: string,
  dayNumber: number
): Promise<any> => {
  const response = await api.get(
    `/api/habits/instances/${instanceId}/daily-tasks/${dayNumber}`
  );
  return response.data;
};

// ==================== TRIAL & SUBSCRIPTION API ====================

export const startTrial = async (userId: string): Promise<void> => {
  await api.post(`/api/users/${userId}/start-trial`);
};

export const checkSubscriptionStatus = async (
  userId: string
): Promise<{
  is_subscribed: boolean;
  is_trial_active: boolean;
  trial_end_date?: string;
  subscription_end_date?: string;
  product_id?: string;
  will_renew: boolean;
}> => {
  const response = await api.get(`/api/users/${userId}/subscription`);
  return response.data;
};

export const updateSubscriptionStatus = async (
  userId: string,
  status: {
    is_subscribed: boolean;
    is_trial_active?: boolean;
    trial_end_date?: string;
    expiration_date?: string;
    product_id?: string;
    will_renew?: boolean;
  }
): Promise<void> => {
  await api.put(`/api/users/${userId}/subscription`, status);
};

// ==================== NOTIFICATION API ====================

export const registerPushToken = async (
  userId: string,
  pushToken: string,
  platform: string
): Promise<void> => {
  await api.post('/api/notifications/register', {
    user_id: userId,
    push_token: pushToken,
    platform,
  });
};

export const getNotificationPreferences = async (
  userId: string
): Promise<any> => {
  const response = await api.get(`/api/notifications/preferences/${userId}`);
  return response.data;
};

export const updateNotificationPreferences = async (
  userId: string,
  prefs: {
    daily_reminders?: boolean;
    morning_time?: string;
    afternoon_time?: string;
    evening_time?: string;
    milestone_alerts?: boolean;
    streak_notifications?: boolean;
  }
): Promise<void> => {
  await api.put(`/api/notifications/preferences/${userId}`, prefs);
};

export const getPendingTasksCount = async (
  userId: string
): Promise<{
  total_pending: number;
  habits: Array<{
    habit_name: string;
    pending_tasks: number;
    current_streak: number;
  }>;
}> => {
  const response = await api.get(`/api/notifications/pending-tasks/${userId}`);
  return response.data;
};

export const getCoachMessages = async (
  userId: string
): Promise<{
  coach_style: string;
  messages: {
    name: string;
    morning_notification: string;
    afternoon_notification: string;
    evening_notification: string;
    missed_day_message: string;
    streak_broken_message: string;
  };
}> => {
  const response = await api.get(`/api/notifications/coach-messages/${userId}`);
  return response.data;
};

// ==================== HEALTH CHECK ====================

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/api/health');
    return response.status === 200;
  } catch {
    return false;
  }
};
