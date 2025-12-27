import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../../src/store/useStore';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, COACH_STYLES } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, onboardingProfile, setUser, setOnboardingProfile, setHabitInstances, resetOnboarding } = useStore();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['habitgpt_user', 'habitgpt_profile', 'habitgpt_habits', 'habitgpt_subscription']);
              setUser(null);
              setOnboardingProfile(null);
              setHabitInstances([]);
              resetOnboarding();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const getChangeDomainLabel = (domain: string) => {
    const labels: Record<string, string> = {
      sleep_energy: 'Sleep & Energy',
      focus_productivity: 'Focus & Productivity',
      health_fitness: 'Health & Fitness',
      spiritual_mental: 'Spiritual / Mental Well-being',
      discipline: 'Discipline & Consistency',
      relationships: 'Relationships / Personal Conduct',
      specific: 'Something Specific',
    };
    return labels[domain] || domain;
  };

  const getConsistencyLabel = (level: string) => {
    const labels: Record<string, string> = {
      very_inconsistent: 'Very Inconsistent',
      somewhat_inconsistent: 'Somewhat Inconsistent',
      mostly_consistent: 'Mostly Consistent',
      extremely_consistent: 'Extremely Consistent',
    };
    return labels[level] || level;
  };

  const getCoachStyleInfo = (style: string) => {
    const coachStyle = COACH_STYLES[style as keyof typeof COACH_STYLES];
    return coachStyle?.name || 'Adaptive';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Not signed in'}</Text>
          </View>
        </View>

        {/* Habit Profile */}
        {onboardingProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Habit Profile</Text>

            <View style={styles.detailRow}>
              <Ionicons name="compass-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Focus Area</Text>
              <Text style={styles.detailValue}>{getChangeDomainLabel(onboardingProfile.primary_change_domain)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Daily Effort</Text>
              <Text style={styles.detailValue}>{onboardingProfile.max_daily_effort_minutes} min</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="trending-up-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Consistency</Text>
              <Text style={styles.detailValue}>{getConsistencyLabel(onboardingProfile.baseline_consistency_level)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Coach Style</Text>
              <Text style={styles.detailValue}>{getCoachStyleInfo(onboardingProfile.coach_style_preference)}</Text>
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/notification-settings')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('https://apps.apple.com/account/subscriptions');
              } else {
                Linking.openURL('https://play.google.com/store/account/subscriptions');
              }
            }}
          >
            <Ionicons name="card-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Manage Subscription</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HabitGPT v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  header: {
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  userName: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  detailValue: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  menuItemText: {
    flex: 1,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
