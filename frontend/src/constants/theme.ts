// HabitGPT Theme - Minimalist, Humane Design
// Background: off-white / warm gray
// Primary: Black (buttons, CTAs, active states)
// Secondary: soft neutrals (muted green, muted blue)
// Typography: Excellent, generous spacing

export const COLORS = {
  // Primary accent - Black (buttons, CTAs, active states)
  primary: '#1A1A1A',
  primaryLight: '#333333',
  primaryDark: '#000000',
  
  // Secondary - Muted Green (growth, stability)
  secondary: '#6B9080',
  secondaryLight: '#8FB3A5',
  secondaryDark: '#4A7261',
  
  // Accent - Muted Blue (trust, calm)
  accent: '#7A8B99',
  accentLight: '#9AABB9',
  accentDark: '#5A6B79',
  
  // Warm accent - Soft Amber (routine, warmth)
  warm: '#C9A76C',
  warmLight: '#DCC192',
  warmDark: '#A68B4A',
  
  // Background colors - Warm neutrals (off-white, warm gray)
  background: '#FAFAF8',
  backgroundLight: '#FFFFFF',
  backgroundCard: '#F5F4F2',
  backgroundDark: '#EFEEE9',
  
  // Text colors - High contrast for readability
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#8A8A8A',
  textLight: '#FFFFFF',
  
  // Status colors - Never use black for failure
  success: '#6B9080',  // Muted green
  warning: '#C9A76C',  // Soft amber
  error: '#C4847A',    // Muted coral (supportive, not harsh)
  info: '#7A8B99',     // Muted blue
  
  // Border colors
  border: '#E5E3DF',
  borderLight: '#EFEEE9',
  borderDark: '#D4D1CB',
  
  // Streak colors (celebratory but not overwhelming)
  streak: '#6B9080',
  streakGlow: '#8FB3A510',
  
  // Dark mode colors (optional, not default)
  darkBackground: '#1A1A1A',
  darkBackgroundLight: '#252525',
  darkBackgroundCard: '#2D2D2D',
  darkTextPrimary: '#F5F5F3',
  darkTextSecondary: '#B8B8B5',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 40,
    hero: 48,
  },
  // Line heights for excellent typography
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// Generous spacing (8pt grid)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// Subtle shadows for depth without distraction
export const SHADOWS = {
  sm: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Coach style configurations based on Q7 answer
export const COACH_STYLES = {
  gentle: {
    name: 'Gentle & Encouraging',
    missedDayMessage: "It's okay to have an off day. Tomorrow is a fresh start! 🌱",
    reminderTone: 'friendly',
    streakBrokenMessage: "Don't worry about the streak. What matters is getting back on track.",
    morningNotification: "Good morning! Ready to nurture your habit today? You've got this! 🌅",
    afternoonNotification: "Gentle reminder — have you had a chance to work on your habit? No pressure! 💚",
    eveningNotification: "Winding down? Perfect time to check in on your habit. Every small step counts! ✨",
  },
  structured: {
    name: 'Structured & Firm',
    missedDayMessage: "You missed today's habit. Let's make sure tomorrow counts.",
    reminderTone: 'professional',
    streakBrokenMessage: "Streak broken. Reset and recommit to your goal.",
    morningNotification: "Morning check-in: Your habit is scheduled for today. Plan your time accordingly.",
    afternoonNotification: "Afternoon update: Your daily habit task is pending. Complete it before evening.",
    eveningNotification: "Evening status: Finalize today's habit before midnight to maintain your streak.",
  },
  strict: {
    name: 'Strict & No-Excuses',
    missedDayMessage: "No excuses. You committed to this. Get it done.",
    reminderTone: 'direct',
    streakBrokenMessage: "Streak lost. Start over. No shortcuts.",
    morningNotification: "Day started. Your habit awaits. Execute.",
    afternoonNotification: "Half the day is gone. Is your habit done? If not, do it now.",
    eveningNotification: "Final call. Complete your habit or accept the missed day.",
  },
  adaptive: {
    name: 'Adaptive',
    missedDayMessage: "Based on your pattern, let's adjust your approach. What got in the way?",
    reminderTone: 'dynamic',
    streakBrokenMessage: "Let's analyze what went wrong and adapt your plan.",
    morningNotification: "Good morning! Based on your progress, today's a great day to build momentum.",
    afternoonNotification: "Checking in — how's the habit going? Let me know if you need to adjust.",
    eveningNotification: "Evening reflection: How did today go? Your feedback helps me help you better.",
  },
};

// Microcopy - Humane messaging
export const MICROCOPY = {
  emptyHabits: {
    title: "Your journey starts here",
    subtitle: "What habit would you like to grow?",
  },
  firstHabit: {
    title: "First 29 days on us",
    subtitle: "Build one habit. See the difference.",
  },
  streak: {
    active: (days: number) => `${days} day${days === 1 ? '' : 's'} strong`,
    broken: "Fresh start tomorrow",
    milestone: (days: number) => `${days} days — you're building something real`,
  },
  completion: {
    dayDone: "Another day in the books",
    habitComplete: "29 days. You did it.",
    almostThere: "So close. Keep going.",
  },
  encouragement: {
    morning: "Small steps, big changes",
    afternoon: "You've got this",
    evening: "End the day proud",
    missed: "Tomorrow is waiting",
  },
};

// Animation timings
export const ANIMATIONS = {
  fast: 150,
  normal: 250,
  slow: 400,
};
