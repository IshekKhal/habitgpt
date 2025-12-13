export const COLORS = {
  // Primary accent - Muted Green (growth, stability)
  primary: '#6B9080',
  primaryLight: '#8FB3A5',
  primaryDark: '#4A7261',
  
  // Secondary - Soft Amber (routine, warmth)
  secondary: '#D4A373',
  secondaryLight: '#E3BF9A',
  secondaryDark: '#B88B5E',
  
  // Accent - Warm Blue (trust, calm)
  accent: '#5C8DB8',
  accentLight: '#7FA8C9',
  accentDark: '#4A7399',
  
  // Background colors - Warm neutrals
  background: '#FAF8F5',
  backgroundLight: '#FFFFFF',
  backgroundCard: '#F0EDE8',
  backgroundDark: '#E8E4DD',
  
  // Text colors
  textPrimary: '#2D3B36',
  textSecondary: '#5A6B63',
  textMuted: '#8A9A91',
  textLight: '#FFFFFF',
  
  // Status colors
  success: '#6B9080',
  warning: '#D4A373',
  error: '#C47A7A',
  info: '#5C8DB8',
  
  // Border colors
  border: '#DDD8D0',
  borderLight: '#E8E4DD',
  
  // Gradient colors (subtle)
  gradientStart: '#6B9080',
  gradientEnd: '#8FB3A5',
  
  // Dark mode colors (optional)
  darkBackground: '#1E2420',
  darkBackgroundLight: '#2A312C',
  darkBackgroundCard: '#343D38',
  darkTextPrimary: '#F5F3EF',
  darkTextSecondary: '#B8C4BC',
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
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#2D3B36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#2D3B36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2D3B36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Coach style configurations based on Q7 answer
export const COACH_STYLES = {
  gentle: {
    name: 'Gentle & Encouraging',
    missedDayMessage: "It's okay to have an off day. Tomorrow is a fresh start! 🌱",
    reminderTone: 'friendly',
    streakBrokenMessage: "Don't worry about the streak. What matters is getting back on track.",
  },
  structured: {
    name: 'Structured & Firm',
    missedDayMessage: "You missed today's habit. Let's make sure tomorrow counts.",
    reminderTone: 'professional',
    streakBrokenMessage: "Streak broken. Reset and recommit to your goal.",
  },
  strict: {
    name: 'Strict & No-Excuses',
    missedDayMessage: "No excuses. You committed to this. Get it done.",
    reminderTone: 'direct',
    streakBrokenMessage: "Streak lost. Start over. No shortcuts.",
  },
  adaptive: {
    name: 'Adaptive',
    missedDayMessage: "Based on your pattern, let's adjust your approach.",
    reminderTone: 'dynamic',
    streakBrokenMessage: "Let's analyze what went wrong and adapt.",
  },
};
