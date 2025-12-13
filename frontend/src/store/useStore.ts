import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== TYPE DEFINITIONS ====================

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
  created_at?: string;
}

export interface OnboardingProfile {
  id?: string;
  user_id?: string;
  primary_change_domain: string;  // sleep_energy, focus_productivity, etc.
  failure_patterns: string[];     // mornings, evenings, weekends, etc.
  baseline_consistency_level: string;  // very_inconsistent, somewhat_inconsistent, etc.
  primary_obstacle: string;       // lack_motivation, forgetting, etc.
  max_daily_effort_minutes: number;  // 5, 10, 20, 30
  miss_response_type: string;     // guilty_give_up, try_again, ignore_drift, depends
  coach_style_preference: string; // gentle, structured, strict, adaptive
  created_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  type: string;  // youtube, article, document
  title: string;
  url: string;
  description: string;
}

export interface Milestone {
  day: number;
  title: string;
  description: string;
}

export interface HabitRoadmap {
  overview: string;
  total_days: number;
  milestones: Milestone[];
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
  status: string;  // active, completed, paused
  completion_percentage: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date?: string;
  roadmap?: HabitRoadmap;
  chat_history: ChatMessage[];
  created_at: string;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialEndDate?: string;
  expirationDate?: string;
  productId?: string;
  willRenew: boolean;
}

export interface PendingHabit {
  name: string;
  category: string;
}

// ==================== STORE INTERFACE ====================

interface HabitGPTStore {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Onboarding state
  onboardingStep: number;
  onboardingProfile: OnboardingProfile | null;
  setOnboardingStep: (step: number) => void;
  setOnboardingProfile: (profile: OnboardingProfile | null) => void;
  updateOnboardingProfile: (updates: Partial<OnboardingProfile>) => void;
  resetOnboarding: () => void;

  // Chat state
  currentChatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;

  // Pending habit (from chat, before payment)
  pendingHabit: PendingHabit | null;
  setPendingHabit: (habit: PendingHabit | null) => void;

  // Habit instances
  habitInstances: HabitInstance[];
  setHabitInstances: (instances: HabitInstance[]) => void;
  addHabitInstance: (instance: HabitInstance) => void;
  updateHabitInstance: (id: string, updates: Partial<HabitInstance>) => void;
  removeHabitInstance: (id: string) => void;

  // Subscription status
  subscriptionStatus: SubscriptionStatus;
  setSubscriptionStatus: (status: Partial<SubscriptionStatus>) => void;

  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

// ==================== INITIAL STATE ====================

const initialOnboardingProfile: OnboardingProfile = {
  primary_change_domain: '',
  failure_patterns: [],
  baseline_consistency_level: '',
  primary_obstacle: '',
  max_daily_effort_minutes: 10,
  miss_response_type: '',
  coach_style_preference: 'adaptive',
};

const initialSubscriptionStatus: SubscriptionStatus = {
  isSubscribed: false,
  isTrialActive: false,
  willRenew: false,
};

// ==================== STORE IMPLEMENTATION ====================

export const useStore = create<HabitGPTStore>((set, get) => ({
  // User state
  user: null,
  setUser: (user) => {
    set({ user });
    get().saveToStorage();
  },

  // Onboarding state
  onboardingStep: 1,
  onboardingProfile: null,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setOnboardingProfile: (profile) => {
    set({ onboardingProfile: profile });
    get().saveToStorage();
  },
  updateOnboardingProfile: (updates) => {
    const current = get().onboardingProfile || { ...initialOnboardingProfile };
    const updated = { ...current, ...updates };
    set({ onboardingProfile: updated });
  },
  resetOnboarding: () => {
    set({
      onboardingStep: 1,
      onboardingProfile: null,
    });
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

  // Habit instances
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
  updateHabitInstance: (id, updates) => {
    set((state) => ({
      habitInstances: state.habitInstances.map((inst) =>
        inst.id === id ? { ...inst, ...updates } : inst
      ),
    }));
    get().saveToStorage();
  },
  removeHabitInstance: (id) => {
    set((state) => ({
      habitInstances: state.habitInstances.filter((inst) => inst.id !== id),
    }));
    get().saveToStorage();
  },

  // Subscription status
  subscriptionStatus: initialSubscriptionStatus,
  setSubscriptionStatus: (status) => {
    set((state) => ({
      subscriptionStatus: { ...state.subscriptionStatus, ...status },
    }));
    get().saveToStorage();
  },

  // Persistence
  loadFromStorage: async () => {
    try {
      const [userData, profileData, habitsData, subscriptionData] = await Promise.all([
        AsyncStorage.getItem('habitgpt_user'),
        AsyncStorage.getItem('habitgpt_profile'),
        AsyncStorage.getItem('habitgpt_habits'),
        AsyncStorage.getItem('habitgpt_subscription'),
      ]);

      if (userData) {
        set({ user: JSON.parse(userData) });
      }
      if (profileData) {
        set({ onboardingProfile: JSON.parse(profileData) });
      }
      if (habitsData) {
        set({ habitInstances: JSON.parse(habitsData) });
      }
      if (subscriptionData) {
        set({ subscriptionStatus: JSON.parse(subscriptionData) });
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const state = get();
      await Promise.all([
        state.user
          ? AsyncStorage.setItem('habitgpt_user', JSON.stringify(state.user))
          : AsyncStorage.removeItem('habitgpt_user'),
        state.onboardingProfile
          ? AsyncStorage.setItem('habitgpt_profile', JSON.stringify(state.onboardingProfile))
          : AsyncStorage.removeItem('habitgpt_profile'),
        state.habitInstances.length > 0
          ? AsyncStorage.setItem('habitgpt_habits', JSON.stringify(state.habitInstances))
          : AsyncStorage.removeItem('habitgpt_habits'),
        AsyncStorage.setItem('habitgpt_subscription', JSON.stringify(state.subscriptionStatus)),
      ]);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));
