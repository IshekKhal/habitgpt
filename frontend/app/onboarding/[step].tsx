import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { createOnboardingProfile, createUser, linkOnboardingToUser } from '../../src/services/api';
import { initializeNotifications } from '../../src/services/notifications';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, COACH_STYLES } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

// ==================== QUESTION DEFINITIONS ====================

interface Option {
  id: string;
  label: string;
  icon?: string;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: 'single' | 'multi';
  options: Option[];
  fieldName: string;
}

const QUESTIONS: Question[] = [
  {
    id: '1',
    title: 'What do you want to change right now?',
    subtitle: 'Which area of your life do you most want to improve?',
    type: 'single',
    options: [
      { id: 'sleep_energy', label: 'Sleep & energy', icon: 'moon-outline' },
      { id: 'focus_productivity', label: 'Focus & productivity', icon: 'flash-outline' },
      { id: 'health_fitness', label: 'Health & fitness', icon: 'fitness-outline' },
      { id: 'spiritual_mental', label: 'Spiritual / mental well-being', icon: 'leaf-outline' },
      { id: 'discipline', label: 'Discipline & consistency', icon: 'timer-outline' },
      { id: 'relationships', label: 'Relationships / personal conduct', icon: 'people-outline' },
      { id: 'specific', label: 'Something specific', icon: 'sparkles-outline' },
    ],
    fieldName: 'primary_change_domain',
  },
  {
    id: '2',
    title: 'When do you usually fail with habits?',
    subtitle: 'When do you most often break habits you try to build?',
    type: 'multi',
    options: [
      { id: 'mornings', label: 'Mornings', icon: 'sunny-outline' },
      { id: 'evenings', label: 'Evenings', icon: 'moon-outline' },
      { id: 'weekends', label: 'Weekends', icon: 'calendar-outline' },
      { id: 'stressful_days', label: 'Stressful days', icon: 'alert-circle-outline' },
      { id: 'miss_one_day', label: 'When I miss one day', icon: 'close-circle-outline' },
      { id: 'quit_no_reason', label: 'I usually quit without a clear reason', icon: 'help-circle-outline' },
    ],
    fieldName: 'failure_patterns',
  },
  {
    id: '3',
    title: 'How consistent are you right now?',
    subtitle: 'Over the last 30 days, how consistent have you been with routines?',
    type: 'single',
    options: [
      { id: 'very_inconsistent', label: 'Very inconsistent', icon: 'close-outline' },
      { id: 'somewhat_inconsistent', label: 'Somewhat inconsistent', icon: 'remove-outline' },
      { id: 'mostly_consistent', label: 'Mostly consistent', icon: 'add-outline' },
      { id: 'extremely_consistent', label: 'Extremely consistent', icon: 'checkmark-outline' },
    ],
    fieldName: 'baseline_consistency_level',
  },
  {
    id: '4',
    title: 'What usually stops you?',
    subtitle: 'What most often gets in your way?',
    type: 'single',
    options: [
      { id: 'lack_motivation', label: 'Lack of motivation', icon: 'battery-dead-outline' },
      { id: 'forgetting', label: 'Forgetting', icon: 'cloud-outline' },
      { id: 'poor_planning', label: 'Poor planning', icon: 'calendar-clear-outline' },
      { id: 'low_energy', label: 'Low energy', icon: 'flash-off-outline' },
      { id: 'distractions', label: 'Distractions (phone, people, noise)', icon: 'phone-portrait-outline' },
      { id: 'dont_know', label: "I don't know", icon: 'help-outline' },
    ],
    fieldName: 'primary_obstacle',
  },
  {
    id: '5',
    title: 'How much daily effort are you realistically willing to give?',
    subtitle: 'Be honest — how much effort can you commit every day?',
    type: 'single',
    options: [
      { id: '5', label: '2–5 minutes', icon: 'time-outline' },
      { id: '10', label: '5–10 minutes', icon: 'time-outline' },
      { id: '20', label: '10–20 minutes', icon: 'time-outline' },
      { id: '30', label: '20+ minutes', icon: 'time-outline' },
    ],
    fieldName: 'max_daily_effort_minutes',
  },
  {
    id: '6',
    title: 'How do you respond when you miss a day?',
    subtitle: 'If you miss a habit once, what usually happens?',
    type: 'single',
    options: [
      { id: 'guilty_give_up', label: 'I feel guilty and give up', icon: 'sad-outline' },
      { id: 'try_again', label: 'I try again the next day', icon: 'refresh-outline' },
      { id: 'ignore_drift', label: 'I ignore it and drift away', icon: 'trending-down-outline' },
      { id: 'depends', label: 'It depends on the habit', icon: 'swap-horizontal-outline' },
    ],
    fieldName: 'miss_response_type',
  },
  {
    id: '7',
    title: 'What do you want HabitGPT to be for you?',
    subtitle: 'How should HabitGPT behave?',
    type: 'single',
    options: [
      { id: 'gentle', label: 'Gentle and encouraging', icon: 'heart-outline' },
      { id: 'structured', label: 'Structured and firm', icon: 'grid-outline' },
      { id: 'strict', label: 'Strict and no-excuses', icon: 'fitness-outline' },
      { id: 'adaptive', label: 'Adaptive (changes based on performance)', icon: 'sync-outline' },
    ],
    fieldName: 'coach_style_preference',
  },
];

// ==================== MAIN COMPONENT ====================

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const currentStep = parseInt(step || '1', 10);
  const question = QUESTIONS[currentStep - 1];
  
  const {
    onboardingProfile,
    updateOnboardingProfile,
    setOnboardingProfile,
    setUser,
    user,
  } = useStore();

  const [selectedSingle, setSelectedSingle] = useState<string | null>(
    question.type === 'single' && onboardingProfile
      ? (onboardingProfile as any)[question.fieldName] || null
      : null
  );
  const [selectedMulti, setSelectedMulti] = useState<string[]>(
    question.type === 'multi' && onboardingProfile
      ? (onboardingProfile as any)[question.fieldName] || []
      : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = currentStep / QUESTIONS.length;
  const progressAnim = useRef(new Animated.Value(progress)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const handleSingleSelect = (optionId: string) => {
    setSelectedSingle(optionId);
  };

  const handleMultiSelect = (optionId: string) => {
    setSelectedMulti((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleBack = () => {
    if (currentStep > 1) {
      router.push(`/onboarding/${currentStep - 1}`);
    } else {
      router.back();
    }
  };

  const handleNext = async () => {
    // Update profile based on question type
    if (question.type === 'single') {
      const value = question.fieldName === 'max_daily_effort_minutes'
        ? parseInt(selectedSingle || '10', 10)
        : selectedSingle;
      updateOnboardingProfile({ [question.fieldName]: value });
    } else {
      updateOnboardingProfile({ [question.fieldName]: selectedMulti });
    }

    if (currentStep < QUESTIONS.length) {
      // Go to next question
      router.push(`/onboarding/${currentStep + 1}`);
    } else {
      // Final step - create user and profile
      setIsSubmitting(true);
      try {
        // Get the final profile
        const finalProfile = {
          ...onboardingProfile,
          [question.fieldName]: question.type === 'single'
            ? (question.fieldName === 'max_daily_effort_minutes'
              ? parseInt(selectedSingle || '10', 10)
              : selectedSingle)
            : selectedMulti,
        };

        // Create onboarding profile in backend
        const createdProfile = await createOnboardingProfile({
          primary_change_domain: finalProfile.primary_change_domain || '',
          failure_patterns: finalProfile.failure_patterns || [],
          baseline_consistency_level: finalProfile.baseline_consistency_level || '',
          primary_obstacle: finalProfile.primary_obstacle || '',
          max_daily_effort_minutes: finalProfile.max_daily_effort_minutes || 10,
          miss_response_type: finalProfile.miss_response_type || '',
          coach_style_preference: finalProfile.coach_style_preference || 'adaptive',
        });

        setOnboardingProfile(createdProfile);

        // Create or get user (simplified - in production use Google auth)
        const newUser = await createUser({
          email: `user_${Date.now()}@habitgpt.app`,
          name: 'HabitGPT User',
        });

        // Link profile to user
        if (createdProfile.id) {
          await linkOnboardingToUser(createdProfile.id, newUser.id);
        }

        // Update user with onboarding completed
        const updatedUser = {
          ...newUser,
          onboarding_completed: true,
          onboarding_profile_id: createdProfile.id,
        };
        setUser(updatedUser);

        // Initialize notifications with user's coach style
        await initializeNotifications(
          updatedUser.id,
          finalProfile.coach_style_preference || 'adaptive'
        );

        // Navigate to home with small delay to ensure router is mounted
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      } catch (error) {
        console.error('Error completing onboarding:', error);
        setIsSubmitting(false);
        // Still navigate to home on error (will be guest user)
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    }
  };

  const isNextDisabled = () => {
    if (question.type === 'single') {
      return !selectedSingle;
    }
    return selectedMulti.length === 0;
  };

  const getCoachStylePreview = () => {
    if (question.fieldName !== 'coach_style_preference' || !selectedSingle) return null;
    
    const style = COACH_STYLES[selectedSingle as keyof typeof COACH_STYLES];
    if (!style) return null;

    return (
      <View style={styles.coachPreview}>
        <Text style={styles.coachPreviewLabel}>Preview:</Text>
        <Text style={styles.coachPreviewText}>"{style.morningNotification}"</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.stepIndicator}>
            {currentStep}/{QUESTIONS.length}
          </Text>
        </View>

        {/* Question */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.questionTitle}>{question.title}</Text>
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const isSelected =
                question.type === 'single'
                  ? selectedSingle === option.id
                  : selectedMulti.includes(option.id);

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() =>
                    question.type === 'single'
                      ? handleSingleSelect(option.id)
                      : handleMultiSelect(option.id)
                  }
                  activeOpacity={0.7}
                >
                  {option.icon && (
                    <View style={[
                      styles.optionIconContainer,
                      isSelected && styles.optionIconContainerSelected
                    ]}>
                      <Ionicons
                        name={option.icon as any}
                        size={22}
                        color={isSelected ? COLORS.textLight : COLORS.textSecondary}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      question.type === 'single' ? styles.radioOuter : styles.checkboxOuter,
                      isSelected && (question.type === 'single' ? styles.radioOuterSelected : styles.checkboxOuterSelected),
                    ]}
                  >
                    {isSelected && (
                      question.type === 'single' ? (
                        <View style={styles.radioInner} />
                      ) : (
                        <Ionicons name="checkmark" size={14} color={COLORS.textLight} />
                      )
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Multi-select hint */}
          {question.type === 'multi' && (
            <Text style={styles.multiHint}>
              Select all that apply
            </Text>
          )}

          {/* Coach style preview */}
          {getCoachStylePreview()}
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, isNextDisabled() && styles.ctaButtonDisabled]}
            onPress={handleNext}
            disabled={isNextDisabled() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {isSubmitting
                ? 'Setting up...'
                : currentStep === QUESTIONS.length
                ? 'Start Your Journey'
                : 'Continue'}
            </Text>
            {!isSubmitting && (
              <Ionicons
                name={currentStep === QUESTIONS.length ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={COLORS.textLight}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  stepIndicator: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  questionTitle: {
    fontSize: FONTS.size.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  questionSubtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundDark,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionIconContainerSelected: {
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOuterSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  multiHint: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  coachPreview: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  coachPreviewLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  coachPreviewText: {
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  ctaContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  ctaButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
