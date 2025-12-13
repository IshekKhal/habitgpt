import axios from 'axios';
import { OnboardingProfile, User, HabitInstance, ChatMessage } from '../store/useStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User APIs
export const createUser = async (userData: {
  email: string;
  name: string;
  google_id?: string;
  avatar_url?: string;
}): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const response = await api.get(`/users/email/${email}`);
  return response.data;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  const response = await api.put(`/users/${userId}`, updates);
  return response.data;
};

// Onboarding APIs
export const createOnboardingProfile = async (profile: Omit<OnboardingProfile, 'id'>): Promise<OnboardingProfile> => {
  const response = await api.post('/onboarding', profile);
  return response.data;
};

export const getOnboardingProfile = async (profileId: string): Promise<OnboardingProfile> => {
  const response = await api.get(`/onboarding/${profileId}`);
  return response.data;
};

export const linkOnboardingToUser = async (profileId: string, userId: string): Promise<void> => {
  await api.put(`/onboarding/${profileId}/link-user?user_id=${userId}`);
};

// Habit Chat APIs
export const sendHabitChatMessage = async (
  userId: string,
  message: string,
  chatHistory: ChatMessage[],
  habitInstanceId?: string
): Promise<{
  response: string;
  ready_for_roadmap: boolean;
  habit_name?: string;
  category?: string;
}> => {
  const response = await api.post('/habits/chat', {
    user_id: userId,
    message,
    chat_history: chatHistory,
    habit_instance_id: habitInstanceId,
  });
  return response.data;
};

// Habit Instance APIs
export const createHabitInstance = async (habitData: {
  user_id: string;
  habit_name: string;
  habit_description: string;
  category: string;
  duration_days?: number;
}): Promise<HabitInstance> => {
  const response = await api.post('/habits/instances', habitData);
  return response.data;
};

export const getUserHabitInstances = async (userId: string): Promise<HabitInstance[]> => {
  const response = await api.get(`/habits/instances/user/${userId}`);
  return response.data;
};

export const getHabitInstance = async (instanceId: string): Promise<HabitInstance> => {
  const response = await api.get(`/habits/instances/${instanceId}`);
  return response.data;
};

export const deleteHabitInstance = async (instanceId: string): Promise<void> => {
  await api.delete(`/habits/instances/${instanceId}`);
};

// Task APIs
export const completeTask = async (
  instanceId: string,
  taskId: string,
  dayNumber: number
): Promise<{ completion_percentage: number; current_streak: number }> => {
  const response = await api.put(`/habits/instances/${instanceId}/tasks/complete`, {
    task_id: taskId,
    day_number: dayNumber,
  });
  return response.data;
};

export const getDailyTasks = async (instanceId: string, dayNumber: number) => {
  const response = await api.get(`/habits/instances/${instanceId}/daily-tasks/${dayNumber}`);
  return response.data;
};

// Trial APIs
export const startTrial = async (userId: string): Promise<{ trial_end_date: string }> => {
  const response = await api.post(`/users/${userId}/start-trial`);
  return response.data;
};

// Subscription APIs
export const checkSubscriptionStatus = async (userId: string): Promise<{
  is_subscribed: boolean;
  is_trial_active: boolean;
  trial_end_date?: string;
  subscription_end_date?: string;
  product_id?: string;
  will_renew: boolean;
}> => {
  const response = await api.get(`/users/${userId}/subscription`);
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
  await api.put(`/users/${userId}/subscription`, status);
};

export default api;
