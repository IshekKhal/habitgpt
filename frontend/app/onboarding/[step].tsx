import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { createOnboardingProfile } from '../../src/services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../src/constants/theme';

const ONBOARDING_QUESTIONS = [
  {
    id: 'primary_change_domain',
    question: 'What do you want to change right now?',
    subtitle: 'Which area of your life do you most want to improve?',
    options: [
      { value: 'sleep_energy', label: 'Sleep & Energy', icon: 'moon-outline' },
      { value: 'focus_productivity', label: 'Focus & Productivity', icon: 'flash-outline' },
      { value: 'health_fitness', label: 'Health & Fitness', icon: 'fitness-outline' },
      { value: 'spiritual_mental', label: 'Spiritual / Mental Well-being', icon: 'leaf-outline' },
      { value: 'discipline', label: 'Discipline & Consistency', icon: 'timer-outline' },
      { value: 'relationships', label: 'Relationships / Personal Conduct', icon: 'people-outline' },
      { value: 'specific', label: 'Something Specific', icon: 'create-outline' },
    ],
  },
  {
    id: 'failure_patterns',
    question: 'When do you usually fail with habits?',
    subtitle: 'Select all that apply - this helps predict your challenge points',
    multiSelect: true,
    options: [
      { value: 'mornings', label: 'Mornings', icon: 'sunny-outline' },
      { value: 'evenings', label: 'Evenings', icon: 'moon-outline' },
      { value: 'weekends', label: 'Weekends', icon: 'calendar-outline' },
      { value: 'stressful_days', label: 'Stressful Days', icon: 'thunderstorm-outline' },
      { value: 'miss_one_day', label: 'When I Miss One Day', icon: 'close-circle-outline' },
      { value: 'no_clear_reason', label: 'I Usually Quit Without a Clear Reason', icon: 'help-circle-outline' },
    ],
  },
  {
    id: 'baseline_consistency_level',
    question: 'How consistent are you right now?',
    subtitle: 'Over the last 30 days, how consistent have you been with routines?',
    options: [
      { value: 'very_inconsistent', label: 'Very Inconsistent', icon: 'trending-down-outline' },
      { value: 'somewhat_inconsistent', label: 'Somewhat Inconsistent', icon: 'remove-outline' },
      { value: 'mostly_consistent', label: 'Mostly Consistent', icon: 'trending-up-outline' },
      { value: 'extremely_consistent', label: 'Extremely Consistent', icon: 'checkmark-done-outline' },
    ],
  },
  {
    id: 'primary_obstacle',
    question: 'What usually stops you?',
    subtitle: 'This helps us design the right triggers and reminders',
    options: [
      { value: 'lack_motivation', label: 'Lack of Motivation', icon: 'battery-dead-outline' },
      { value: 'forgetting', label: 'Forgetting', icon: 'help-outline' },
      { value: 'poor_planning', label: 'Poor Planning', icon: 'list-outline' },
      { value: 'low_energy', label: 'Low Energy', icon: 'bed-outline' },
      { value: 'distractions', label: 'Distractions (Phone, People, Noise)', icon: 'notifications-off-outline' },
      { value: 'dont_know', label: "I Don't Know", icon: 'help-circle-outline' },
    ],
  },
  {
    id: 'max_daily_effort_minutes',
    question: 'How much daily effort can you give?',
    subtitle: 'Be honest - we start below your limit, not at it',
    options: [
      { value: '5', label: '2-5 Minutes', icon: 'time-outline' },
      { value: '10', label: '5-10 Minutes', icon: 'time-outline' },
      { value: '20', label: '10-20 Minutes', icon: 'time-outline' },
      { value: '30', label: '20+ Minutes', icon: 'time-outline' },
    ],
  },
  {
    id: 'miss_response_type',
    question: 'How do you respond when you miss a day?',
    subtitle: 'This defines recovery logic and messaging tone',
    options: [
      { value: 'guilty_give_up', label: 'I Feel Guilty and Give Up', icon: 'sad-outline' },
      { value: 'try_again', label: 'I Try Again the Next Day', icon: 'refresh-outline' },
      { value: 'ignore_drift', label: 'I Ignore It and Drift Away', icon: 'cloudy-outline' },
      { value: 'depends', label: 'It Depends on the Habit', icon: 'swap-horizontal-outline' },
    ],
  },
  {
    id: 'coach_style_preference',
    question: 'What do you want HabitGPT to be for you?',
    subtitle: 'This controls notification language and coaching style',
    options: [
      { value: 'gentle', label: 'Gentle and Encouraging', icon: 'heart-outline' },
      { value: 'structured', label: 'Structured and Firm', icon: 'grid-outline' },
      { value: 'strict', label: 'Strict and No-Excuses', icon: 'warning-outline' },
      { value: 'adaptive', label: 'Adaptive (Changes Based on Performance)', icon: 'analytics-outline' },
    ],
  },
];

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const currentStep = parseInt(step || '1', 10);
  const totalSteps = ONBOARDING_QUESTIONS.length;

  const { onboardingAnswers, setOnboardingAnswer, setOnboardingProfile, setIsLoading } = useStore();
  const currentQuestion = ONBOARDING_QUESTIONS[currentStep - 1];

  const currentValue = currentQuestion?.multiSelect
    ? (onboardingAnswers[currentQuestion?.id] || [])
    : (onboardingAnswers[currentQuestion?.id] || '');

  const handleSelect = useCallback((value: string) => {
    if (currentQuestion?.multiSelect) {
      const current = Array.isArray(currentValue) ? currentValue : [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      setOnboardingAnswer(currentQuestion.id, updated);
    } else {
      setOnboardingAnswer(currentQuestion.id, value);
    }
  }, [currentQuestion, currentValue, setOnboardingAnswer]);

  const isSelected = (value: string) => {
    if (currentQuestion?.multiSelect && Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }
    return currentValue === value;
  };

  const canProceed = () => {
    if (currentQuestion?.multiSelect) {
      return Array.isArray(currentValue) && currentValue.length > 0;
    }
    return currentValue !== '';
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      router.push(`/onboarding/${currentStep + 1}`);
    } else {
      // Save onboarding profile
      setIsLoading(true);
      try {
        const profile = await createOnboardingProfile({
          primary_change_domain: onboardingAnswers.primary_change_domain,
          failure_patterns: onboardingAnswers.failure_patterns || [],
          baseline_consistency_level: onboardingAnswers.baseline_consistency_level,
          primary_obstacle: onboardingAnswers.primary_obstacle,
          max_daily_effort_minutes: parseInt(onboardingAnswers.max_daily_effort_minutes, 10),
          miss_response_type: onboardingAnswers.miss_response_type,
          coach_style_preference: onboardingAnswers.coach_style_preference,
        });
        setOnboardingProfile(profile);
        router.replace('/auth');
      } catch (error) {
        console.error('Failed to save onboarding profile:', error);
        router.replace('/auth');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index < currentStep && styles.progressDotCompleted,
                  index === currentStep - 1 && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Question Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepText}>QUESTION {currentStep} OF {totalSteps}</Text>
          <Text style={styles.question}>{currentQuestion.question}</Text>
          {currentQuestion.subtitle && (
            <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  isSelected(option.value) && styles.optionSelected,
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIcon,
                    isSelected(option.value) && styles.optionIconSelected,
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={22}
                      color={isSelected(option.value) ? COLORS.textLight : COLORS.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected(option.value) && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected(option.value) && styles.checkboxSelected,
                  ]}
                >
                  {isSelected(option.value) && (
                    <Ionicons name="checkmark" size={16} color={COLORS.textLight} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Continue' : 'Next'}
            </Text>
            <Ionicons
              name={currentStep === totalSteps ? 'checkmark' : 'arrow-forward'}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  progressDotCurrent: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepText: {
    fontSize: FONTS.size.xs,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  question: {
    fontSize: FONTS.size.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionIconSelected: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  nextButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
