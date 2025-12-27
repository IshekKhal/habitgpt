import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COACH_STYLES } from '../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

// Check if we're on a native platform
const isNative = Platform.OS !== 'web';

// Request permissions and get push token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!isNative) {
    console.log('Push notifications not supported on web');
    return null;
  }

  let token: string | null = null;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Habit Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A1A1A',
      });
    } catch (error) {
      console.log('Error setting notification channel:', error);
    }
  }

  if (Device.isDevice) {
    try {
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
        console.log('Error getting expo push token:', error);
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          token = deviceToken.data;
        } catch (e) {
          console.log('Error getting device push token:', e);
        }
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
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
    // Re-schedule notifications with new preferences (only on native)
    if (isNative) {
      await scheduleAllDailyReminders(prefs);
    }
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
): Promise<string | null> {
  if (!isNative) {
    console.log('Notifications not supported on web');
    return null;
  }

  try {
    // Cancel existing notification with same identifier
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => { });

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
  } catch (error) {
    console.log('Error scheduling notification:', error);
    return null;
  }
}

// Generate personalized notification content
async function generateNotificationContent(
  userId: string,
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  coachStyle: string
): Promise<string> {
  try {
    // We need user name and habit info.
    // For MVP, we'll fetch user details here or assume passed.
    // Actually, getting user details from storage/store is cleaner but we are in a service file.
    // Let's rely on what we have. We can pass data to this function.
    // But scheduleAllDailyReminders only has prefs.

    // Quick fetch of user name from storage for now
    const userJson = await AsyncStorage.getItem('habitgpt-storage');
    let userName = 'Friend';
    let habitName = 'your habit';
    let tasksRemaining = 3; // Default assumption if check fails

    if (userJson) {
      const data = JSON.parse(userJson);
      if (data.state?.user?.name) userName = data.state.user.name.split(' ')[0];
      // Get first active habit persistence
      if (data.state?.habitInstances && data.state.habitInstances.length > 0) {
        habitName = data.state.habitInstances[0].habit_name;
        // Calculate remaining tasks for today? Complex to parse full roadmap from storage string.
        // We will assume 'some' tasks remaining for the morning schedule.
      }
    }

    const response = await axios.post(`${API_URL}/api/notifications/generate`, {
      user_name: userName,
      habit_name: habitName,
      time_of_day: timeOfDay,
      coach_style: coachStyle,
      tasks_remaining: tasksRemaining
    });
    return response.data.content;
  } catch (error) {
    console.log('AI Notification fetch failed, using fallback');
    const messages = getCoachMessages(coachStyle);
    return messages[timeOfDay];
  }
}

// Schedule all three daily reminders with AI-generated messages
export async function scheduleAllDailyReminders(prefs?: NotificationPreferences): Promise<void> {
  if (!isNative) {
    console.log('Skipping notification scheduling on web');
    return;
  }

  const preferences = prefs || await getNotificationPreferences();

  if (!preferences.enabled) {
    await cancelAllNotifications();
    return;
  }

  const morningTime = parseTime(preferences.morningTime);
  const afternoonTime = parseTime(preferences.afternoonTime);
  const eveningTime = parseTime(preferences.eveningTime);

  // Fetch AI content (parallel for speed)
  const [morningMsg, afternoonMsg, eveningMsg] = await Promise.all([
    generateNotificationContent('user', 'morning', preferences.coachStyle),
    generateNotificationContent('user', 'afternoon', preferences.coachStyle),
    generateNotificationContent('user', 'evening', preferences.coachStyle)
  ]);

  // Morning reminder
  await scheduleDailyNotification(
    'morning-reminder',
    'HabitGPT',
    morningMsg,
    morningTime
  );

  // Afternoon reminder
  await scheduleDailyNotification(
    'afternoon-reminder',
    'HabitGPT',
    afternoonMsg,
    afternoonTime
  );

  // Evening reminder (FOMO/Urgent by default)
  await scheduleDailyNotification(
    'evening-reminder',
    'HabitGPT',
    eveningMsg,
    eveningTime
  );

  console.log('All AI daily reminders scheduled');
}

// Cancel a specific daily notification (e.g. if done for the day)
export async function cancelDailyNotification(identifier: string): Promise<void> {
  if (!isNative) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log(`Cancelled notification: ${identifier}`);
  } catch (e) {
    console.log(`Error cancelling ${identifier}:`, e);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  if (!isNative) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
  } catch (error) {
    console.log('Error cancelling notifications:', error);
  }
}

// Send immediate notification (for testing)
export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  if (!isNative) {
    console.log('Notifications not supported on web');
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Error sending immediate notification:', error);
  }
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (!isNative) return [];

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Error getting scheduled notifications:', error);
    return [];
  }
}

// Listen for notification responses (when user taps notification)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription | null {
  if (!isNative) return null;
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Listen for notifications received while app is foregrounded
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription | null {
  if (!isNative) return null;
  return Notifications.addNotificationReceivedListener(callback);
}

// Initialize notifications for a user
export async function initializeNotifications(userId: string, coachStyle?: string): Promise<void> {
  if (!isNative) {
    console.log('Skipping notification initialization on web');
    return;
  }

  try {
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
  } catch (error) {
    console.log('Error initializing notifications:', error);
  }
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

// Send daily completion notification
export async function sendDailyCompletionNotification(habitName: string): Promise<void> {
  await sendImmediateNotification(
    'Day Complete! 🎉',
    `Great job on "${habitName}" today! You're making progress.`
  );
}
