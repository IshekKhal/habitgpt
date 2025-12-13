import axios from 'axios';
import { OnboardingProfile, User, SkillInstance, ChatMessage } from '../store/useStore';

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

// Skill Chat APIs
export const sendSkillChatMessage = async (
  userId: string,
  message: string,
  chatHistory: ChatMessage[],
  skillInstanceId?: string
): Promise<{
  response: string;
  ready_for_roadmap: boolean;
  skill_name?: string;
  category?: string;
}> => {
  const response = await api.post('/skills/chat', {
    user_id: userId,
    message,
    chat_history: chatHistory,
    skill_instance_id: skillInstanceId,
  });
  return response.data;
};

// Skill Instance APIs
export const createSkillInstance = async (skillData: {
  user_id: string;
  skill_name: string;
  skill_description: string;
  category: string;
  duration_days?: number;
}): Promise<SkillInstance> => {
  const response = await api.post('/skills/instances', skillData);
  return response.data;
};

export const getUserSkillInstances = async (userId: string): Promise<SkillInstance[]> => {
  const response = await api.get(`/skills/instances/user/${userId}`);
  return response.data;
};

export const getSkillInstance = async (instanceId: string): Promise<SkillInstance> => {
  const response = await api.get(`/skills/instances/${instanceId}`);
  return response.data;
};

export const deleteSkillInstance = async (instanceId: string): Promise<void> => {
  await api.delete(`/skills/instances/${instanceId}`);
};

// Task APIs
export const completeTask = async (
  instanceId: string,
  taskId: string,
  dayNumber: number
): Promise<{ completion_percentage: number }> => {
  const response = await api.put(`/skills/instances/${instanceId}/tasks/complete`, {
    task_id: taskId,
    day_number: dayNumber,
  });
  return response.data;
};

export const getDailyTasks = async (instanceId: string, dayNumber: number) => {
  const response = await api.get(`/skills/instances/${instanceId}/daily-tasks/${dayNumber}`);
  return response.data;
};

// Trial APIs
export const startTrial = async (userId: string): Promise<{ trial_end_date: string }> => {
  const response = await api.post(`/users/${userId}/start-trial`);
  return response.data;
};

export default api;
