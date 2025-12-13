import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingProfile {
  id?: string;
  user_role: string;
  age_range: string;
  country: string;
  timezone: string;
  daily_time_minutes: number;
  learning_preferences: string[];
  learning_history_type: string;
  motivation_type: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  google_id?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  onboarding_profile_id?: string;
  trial_started: boolean;
  trial_start_date?: string;
  subscription_active: boolean;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  resource_links: string[];
  completed: boolean;
  completed_at?: string;
}

export interface DayPlan {
  day_number: number;
  date?: string;
  tasks: DailyTask[];
  completion_percentage: number;
}

export interface Resource {
  id: string;
  type: string;
  title: string;
  url: string;
  description: string;
}

export interface SkillRoadmap {
  overview: string;
  total_days: number;
  milestones: Array<{
    day: number;
    title: string;
    description: string;
  }>;
  day_plans: DayPlan[];
  resources: Resource[];
}

export interface SkillInstance {
  id: string;
  user_id: string;
  skill_name: string;
  skill_description: string;
  category: string;
  duration_days: number;
  start_date: string;
  end_date?: string;
  status: string;
  completion_percentage: number;
  roadmap?: SkillRoadmap;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialEndDate?: string;
  expirationDate?: string;
  productId?: string;
  willRenew: boolean;
}

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Subscription state
  subscriptionStatus: SubscriptionStatus;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  
  // Onboarding state
  onboardingProfile: OnboardingProfile | null;
  setOnboardingProfile: (profile: OnboardingProfile | null) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  onboardingAnswers: Record<string, any>;
  setOnboardingAnswer: (key: string, value: any) => void;
  resetOnboarding: () => void;
  
  // Skills state
  skillInstances: SkillInstance[];
  setSkillInstances: (instances: SkillInstance[]) => void;
  addSkillInstance: (instance: SkillInstance) => void;
  removeSkillInstance: (instanceId: string) => void;
  updateSkillInstance: (instanceId: string, updates: Partial<SkillInstance>) => void;
  
  // Chat state
  currentChatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  
  // Pending skill from chat
  pendingSkill: { name: string; category: string } | null;
  setPendingSkill: (skill: { name: string; category: string } | null) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // User state
  user: null,
  setUser: (user) => {
    set({ user });
    get().saveToStorage();
  },
  
  // Subscription state
  subscriptionStatus: {
    isSubscribed: false,
    isTrialActive: false,
    willRenew: false,
  },
  setSubscriptionStatus: (status) => {
    set({ subscriptionStatus: status });
    get().saveToStorage();
  },
  
  // Onboarding state
  onboardingProfile: null,
  setOnboardingProfile: (profile) => {
    set({ onboardingProfile: profile });
    get().saveToStorage();
  },
  onboardingStep: 1,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  onboardingAnswers: {},
  setOnboardingAnswer: (key, value) => {
    set((state) => ({
      onboardingAnswers: { ...state.onboardingAnswers, [key]: value },
    }));
  },
  resetOnboarding: () => {
    set({
      onboardingStep: 1,
      onboardingAnswers: {},
    });
  },
  
  // Skills state
  skillInstances: [],
  setSkillInstances: (instances) => {
    set({ skillInstances: instances });
    get().saveToStorage();
  },
  addSkillInstance: (instance) => {
    set((state) => ({
      skillInstances: [...state.skillInstances, instance],
    }));
    get().saveToStorage();
  },
  removeSkillInstance: (instanceId) => {
    set((state) => ({
      skillInstances: state.skillInstances.filter((i) => i.id !== instanceId),
    }));
    get().saveToStorage();
  },
  updateSkillInstance: (instanceId, updates) => {
    set((state) => ({
      skillInstances: state.skillInstances.map((i) =>
        i.id === instanceId ? { ...i, ...updates } : i
      ),
    }));
    get().saveToStorage();
  },
  
  // Chat state
  currentChatHistory: [],
  addChatMessage: (message) => {
    set((state) => ({
      currentChatHistory: [...state.currentChatHistory, message],
    }));
  },
  clearChatHistory: () => set({ currentChatHistory: [] }),
  
  // Pending skill
  pendingSkill: null,
  setPendingSkill: (skill) => set({ pendingSkill: skill }),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Persistence
  loadFromStorage: async () => {
    try {
      const userData = await AsyncStorage.getItem('skillgpt_user');
      const profileData = await AsyncStorage.getItem('skillgpt_profile');
      const skillsData = await AsyncStorage.getItem('skillgpt_skills');
      
      if (userData) set({ user: JSON.parse(userData) });
      if (profileData) set({ onboardingProfile: JSON.parse(profileData) });
      if (skillsData) set({ skillInstances: JSON.parse(skillsData) });
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  },
  saveToStorage: async () => {
    try {
      const { user, onboardingProfile, skillInstances } = get();
      if (user) await AsyncStorage.setItem('skillgpt_user', JSON.stringify(user));
      if (onboardingProfile) await AsyncStorage.setItem('skillgpt_profile', JSON.stringify(onboardingProfile));
      if (skillInstances.length > 0) await AsyncStorage.setItem('skillgpt_skills', JSON.stringify(skillInstances));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },
}));
