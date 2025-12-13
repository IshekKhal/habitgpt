import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingProfile {
  id?: string;
  primary_change_domain: string;
  failure_patterns: string[];
  baseline_consistency_level: string;
  primary_obstacle: string;
  max_daily_effort_minutes: number;
  miss_response_type: string;
  coach_style_preference: string;
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

export interface HabitRoadmap {
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

export interface HabitInstance {
  id: string;
  user_id: string;
  habit_name: string;
  habit_description: string;
  category: string;
  duration_days: number;
  start_date: string;
  end_date?: string;
  status: string;
  completion_percentage: number;
  current_streak: number;
  longest_streak: number;
  roadmap?: HabitRoadmap;
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
  
  // Habits state
  habitInstances: HabitInstance[];
  setHabitInstances: (instances: HabitInstance[]) => void;
  addHabitInstance: (instance: HabitInstance) => void;
  removeHabitInstance: (instanceId: string) => void;
  updateHabitInstance: (instanceId: string, updates: Partial<HabitInstance>) => void;
  
  // Chat state
  currentChatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  
  // Pending habit from chat
  pendingHabit: { name: string; category: string } | null;
  setPendingHabit: (habit: { name: string; category: string } | null) => void;
  
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
  
  // Habits state
  habitInstances: [],
  setHabitInstances: (instances) => {
    set({ habitInstances: instances });
    get().saveToStorage();
  },
  addHabitInstance: (instance) => {
    set((state) => ({
      habitInstances: [...state.habitInstances, instance],
    }));
    get().saveToStorage();
  },
  removeHabitInstance: (instanceId) => {
    set((state) => ({
      habitInstances: state.habitInstances.filter((i) => i.id !== instanceId),
    }));
    get().saveToStorage();
  },
  updateHabitInstance: (instanceId, updates) => {
    set((state) => ({
      habitInstances: state.habitInstances.map((i) =>
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
  
  // Pending habit
  pendingHabit: null,
  setPendingHabit: (habit) => set({ pendingHabit: habit }),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Persistence
  loadFromStorage: async () => {
    try {
      const userData = await AsyncStorage.getItem('habitgpt_user');
      const profileData = await AsyncStorage.getItem('habitgpt_profile');
      const habitsData = await AsyncStorage.getItem('habitgpt_habits');
      const subscriptionData = await AsyncStorage.getItem('habitgpt_subscription');
      
      if (userData) set({ user: JSON.parse(userData) });
      if (profileData) set({ onboardingProfile: JSON.parse(profileData) });
      if (habitsData) set({ habitInstances: JSON.parse(habitsData) });
      if (subscriptionData) set({ subscriptionStatus: JSON.parse(subscriptionData) });
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  },
  saveToStorage: async () => {
    try {
      const { user, onboardingProfile, habitInstances, subscriptionStatus } = get();
      if (user) await AsyncStorage.setItem('habitgpt_user', JSON.stringify(user));
      if (onboardingProfile) await AsyncStorage.setItem('habitgpt_profile', JSON.stringify(onboardingProfile));
      if (habitInstances.length > 0) await AsyncStorage.setItem('habitgpt_habits', JSON.stringify(habitInstances));
      if (subscriptionStatus) await AsyncStorage.setItem('habitgpt_subscription', JSON.stringify(subscriptionStatus));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },
}));
