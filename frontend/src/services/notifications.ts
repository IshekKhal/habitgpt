import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COACH_STYLES } from '../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  enabled: boolean;
  morningTime: string; // HH:MM format
  afternoonTime: string;
  eveningTime: string;
  coachStyle: string; // gentle, structured, strict, adaptive
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  morningTime: '09:00',
  afternoonTime: '14:00',
  eveningTime: '20:00',
  coachStyle: 'adaptive',
};

// Request permissions and get push token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A1A1A',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id',
      });
      token = pushToken.data;
    } catch (error) {
      console.log('Error getting push token:', error);
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save push token to backend
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    await axios.post(`${API_URL}/api/notifications/register`, {
      user_id: userId,
      push_token: token,
      platform: Platform.OS,
    });
    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Failed to save push token:', error);
  }
}

// Get notification preferences from storage
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem('notification_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting notification preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

// Save notification preferences to storage
export async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem('notification_preferences', JSON.stringify(prefs));
    // Re-schedule notifications with new preferences
    await scheduleAllDailyReminders(prefs);
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}

// Parse time string to hours and minutes
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// Get notification messages based on coach style
function getCoachMessages(coachStyle: string) {
  const style = COACH_STYLES[coachStyle as keyof typeof COACH_STYLES] || COACH_STYLES.adaptive;
  return {
    morning: style.morningNotification,
    afternoon: style.afternoonNotification,
    evening: style.eveningNotification,
  };
}

// Schedule a daily notification at specific time
async function scheduleDailyNotification(
  identifier: string,
  title: string,
  body: string,
  time: { hours: number; minutes: number }
): Promise<string> {
  // Cancel existing notification with same identifier
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  const trigger: Notifications.NotificationTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: time.hours,
    minute: time.minutes,
  };

  return await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'daily_reminder' },
    },
    trigger,
  });
}

// Schedule all three daily reminders with coach-style messages
export async function scheduleAllDailyReminders(prefs?: NotificationPreferences): Promise<void> {
  const preferences = prefs || await getNotificationPreferences();

  if (!preferences.enabled) {
    await cancelAllNotifications();
    return;
  }

  const morningTime = parseTime(preferences.morningTime);
  const afternoonTime = parseTime(preferences.afternoonTime);
  const eveningTime = parseTime(preferences.eveningTime);
  
  const messages = getCoachMessages(preferences.coachStyle);

  // Morning reminder
  await scheduleDailyNotification(
    'morning-reminder',
    'HabitGPT',
    messages.morning,
    morningTime
  );

  // Afternoon reminder
  await scheduleDailyNotification(
    'afternoon-reminder',
    'HabitGPT',
    messages.afternoon,
    afternoonTime
  );

  // Evening reminder
  await scheduleDailyNotification(
    'evening-reminder',
    'HabitGPT',
    messages.evening,
    eveningTime
  );

  console.log('All daily reminders scheduled with', preferences.coachStyle, 'style');
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All notifications cancelled');
}

// Send immediate notification (for testing)
export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Listen for notification responses (when user taps notification)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Listen for notifications received while app is foregrounded
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Initialize notifications for a user
export async function initializeNotifications(userId: string, coachStyle?: string): Promise<void> {
  // Request permissions and get token
  const token = await registerForPushNotificationsAsync();
  
  if (token) {
    // Save token to backend
    await savePushToken(userId, token);
  }

  // Get current preferences and update coach style if provided
  const prefs = await getNotificationPreferences();
  if (coachStyle) {
    prefs.coachStyle = coachStyle;
    await AsyncStorage.setItem('notification_preferences', JSON.stringify(prefs));
  }

  // Schedule daily reminders
  await scheduleAllDailyReminders(prefs);
}

// Update notification preferences on backend
export async function updateNotificationPreferencesOnServer(
  userId: string,
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await axios.put(`${API_URL}/api/notifications/preferences/${userId}`, {
      daily_reminders: prefs.enabled,
      morning_time: prefs.morningTime,
      afternoon_time: prefs.afternoonTime,
      evening_time: prefs.eveningTime,
    });
  } catch (error) {
    console.error('Failed to update notification preferences on server:', error);
  }
}

// Send streak milestone notification
export async function sendStreakMilestoneNotification(streakDays: number): Promise<void> {
  const milestones = [3, 7, 14, 21, 29];
  if (milestones.includes(streakDays)) {
    await sendImmediateNotification(
      'Streak Milestone! 🔥',
      `${streakDays} days strong! You're building something real.`
    );
  }
}

// Send habit completion notification
export async function sendHabitCompleteNotification(habitName: string): Promise<void> {
  await sendImmediateNotification(
    '29 Days Complete! 🎉',
    `You did it! "${habitName}" is now part of who you are.`
  );
}
