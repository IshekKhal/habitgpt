import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../../src/store/useStore';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, onboardingProfile, setUser, setOnboardingProfile, setSkillInstances, resetOnboarding } = useStore();

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
              await AsyncStorage.multiRemove(['skillgpt_user', 'skillgpt_profile', 'skillgpt_skills']);
              setUser(null);
              setOnboardingProfile(null);
              setSkillInstances([]);
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

  const getLearningStyleLabel = (pref: string) => {
    const labels: Record<string, string> = {
      videos: 'Videos',
      articles: 'Articles',
      hands_on: 'Hands-on',
      quizzes: 'Quizzes',
      step_by_step: 'Step-by-step',
    };
    return labels[pref] || pref;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      school_student: 'School Student',
      college_student: 'College Student',
      working_professional: 'Working Professional',
      freelancer: 'Freelancer',
      unemployed: 'Between Roles',
      other: 'Other',
    };
    return labels[role] || role;
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
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Not signed in'}</Text>
          </View>
        </View>

        {/* Profile Details */}
        {onboardingProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Learning Profile</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{getRoleLabel(onboardingProfile.user_role)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Daily Time</Text>
              <Text style={styles.detailValue}>{onboardingProfile.daily_time_minutes} min</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{onboardingProfile.country}</Text>
            </View>

            <View style={styles.preferencesRow}>
              <Ionicons name="heart-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Learning Style</Text>
            </View>
            <View style={styles.preferenceTags}>
              {onboardingProfile.learning_preferences?.map((pref) => (
                <View key={pref} style={styles.preferenceTag}>
                  <Text style={styles.preferenceTagText}>{getLearningStyleLabel(pref)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="card-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Subscription</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
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
    paddingHorizontal: SPACING.lg,
  },
  header: {
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  userName: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
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
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
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
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
  },
  preferencesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  preferenceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  preferenceTag: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  preferenceTagText: {
    fontSize: FONTS.size.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
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
    backgroundColor: COLORS.error + '15',
    borderRadius: BORDER_RADIUS.md,
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
