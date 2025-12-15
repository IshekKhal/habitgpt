import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../src/store/useStore';
import {
  NotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  updateNotificationPreferencesOnServer,
  sendImmediateNotification,
  getScheduledNotifications,
} from '../src/services/notifications';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../src/constants/theme';

export default function NotificationSettingsScreen() {
  const { user } = useStore();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    morningTime: '09:00',
    afternoonTime: '14:00',
    eveningTime: '20:00',
    coachStyle: 'adaptive',
  });
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    const newPrefs = { ...preferences, enabled: value };
    setPreferences(newPrefs);
    await savePreferences(newPrefs);
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }

    if (selectedDate && showTimePicker) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      const newPrefs = { ...preferences, [showTimePicker]: timeStr };
      setPreferences(newPrefs);

      if (Platform.OS === 'ios') {
        // On iOS, save when done button is pressed
      } else {
        await savePreferences(newPrefs);
      }
    }
  };

  const savePreferences = async (prefs: NotificationPreferences) => {
    try {
      await saveNotificationPreferences(prefs);
      if (user?.id) {
        await updateNotificationPreferencesOnServer(user.id, prefs);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  };

  const handleTestNotification = async () => {
    await sendImmediateNotification(
      'Test Notification',
      'This is a test notification from HabitGPT!'
    );
    Alert.alert('Sent!', 'A test notification has been sent.');
  };

  const handleViewScheduled = async () => {
    const scheduled = await getScheduledNotifications();
    const count = scheduled.length;
    Alert.alert(
      'Scheduled Notifications',
      `You have ${count} notifications scheduled.\n\n${scheduled
        .map((n) => `• ${n.content.title}`)
        .join('\n')}`
    );
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleBack = () => {
    router.back();
  };

  const handleDoneTimePicker = async () => {
    setShowTimePicker(null);
    await savePreferences(preferences);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="notifications" size={24} color={COLORS.primary} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Daily Reminders</Text>
                <Text style={styles.toggleSubtitle}>
                  Get reminded 3 times a day to complete your tasks
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
              thumbColor={preferences.enabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Time Settings */}
        {preferences.enabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Times</Text>

            {/* Morning */}
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setShowTimePicker('morningTime')}
            >
              <View style={styles.timeInfo}>
                <View style={[styles.timeIcon, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="sunny" size={20} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={styles.timeLabel}>Morning</Text>
                  <Text style={styles.timeDesc}>Start your day with learning</Text>
                </View>
              </View>
              <View style={styles.timeValue}>
                <Text style={styles.timeText}>{formatTime(preferences.morningTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Afternoon */}
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setShowTimePicker('afternoonTime')}
            >
              <View style={styles.timeInfo}>
                <View style={[styles.timeIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                  <Ionicons name="partly-sunny" size={20} color={COLORS.secondary} />
                </View>
                <View>
                  <Text style={styles.timeLabel}>Afternoon</Text>
                  <Text style={styles.timeDesc}>Midday check-in</Text>
                </View>
              </View>
              <View style={styles.timeValue}>
                <Text style={styles.timeText}>{formatTime(preferences.afternoonTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Evening */}
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setShowTimePicker('eveningTime')}
            >
              <View style={styles.timeInfo}>
                <View style={[styles.timeIcon, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="moon" size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.timeLabel}>Evening</Text>
                  <Text style={styles.timeDesc}>Finish remaining tasks</Text>
                </View>
              </View>
              <View style={styles.timeValue}>
                <Text style={styles.timeText}>{formatTime(preferences.eveningTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleTestNotification}>
            <Ionicons name="paper-plane-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Send Test Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewScheduled}>
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>View Scheduled Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            Notifications help you stay consistent with your learning goals. You can customize
            the timing to fit your schedule.
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                Set {showTimePicker === 'morningTime' ? 'Morning' :
                  showTimePicker === 'afternoonTime' ? 'Afternoon' : 'Evening'} Time
              </Text>
              <TouchableOpacity onPress={handleDoneTimePicker}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={parseTimeToDate(preferences[showTimePicker as keyof NotificationPreferences] as string)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              textColor={COLORS.textPrimary}
              themeVariant="dark"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timeIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONTS.size.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  actionButtonText: {
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pickerDone: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
