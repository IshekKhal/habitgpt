import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingQuestion } from '../../src/components/OnboardingQuestion';
import { useStore } from '../../src/store/useStore';
import { createOnboardingProfile } from '../../src/services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../src/constants/theme';

const ONBOARDING_QUESTIONS = [
  {
    id: 'user_role',
    question: 'What best describes you right now?',
    subtitle: 'This helps us personalize your learning experience',
    options: [
      { value: 'school_student', label: 'School Student', icon: 'school-outline' },
      { value: 'college_student', label: 'College Student', icon: 'library-outline' },
      { value: 'working_professional', label: 'Working Professional', icon: 'briefcase-outline' },
      { value: 'freelancer', label: 'Freelancer / Creator', icon: 'laptop-outline' },
      { value: 'unemployed', label: 'Unemployed / Between Roles', icon: 'search-outline' },
      { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
    ],
  },
  {
    id: 'age_range',
    question: "What's your age range?",
    subtitle: 'We adapt content complexity based on this',
    options: [
      { value: 'under_16', label: 'Under 16' },
      { value: '16_18', label: '16 - 18' },
      { value: '19_22', label: '19 - 22' },
      { value: '23_30', label: '23 - 30' },
      { value: '31_45', label: '31 - 45' },
      { value: '45_plus', label: '45+' },
    ],
  },
  {
    id: 'country',
    question: 'Where are you based?',
    subtitle: 'For relevant resources and scheduling',
    type: 'text_input',
    placeholder: 'Enter your country',
  },
  {
    id: 'daily_time_minutes',
    question: 'How much time can you invest daily?',
    subtitle: 'Be realistic - consistency beats intensity',
    options: [
      { value: '30', label: '15 - 30 minutes', icon: 'time-outline' },
      { value: '60', label: '30 - 60 minutes', icon: 'time-outline' },
      { value: '120', label: '1 - 2 hours', icon: 'time-outline' },
      { value: '180', label: '2+ hours', icon: 'time-outline' },
    ],
  },
  {
    id: 'learning_preferences',
    question: 'How do you prefer to learn?',
    subtitle: 'Select all that apply',
    multiSelect: true,
    options: [
      { value: 'videos', label: 'Watching videos', icon: 'play-circle-outline' },
      { value: 'articles', label: 'Reading articles/books', icon: 'book-outline' },
      { value: 'hands_on', label: 'Doing hands-on tasks', icon: 'construct-outline' },
      { value: 'quizzes', label: 'Quizzes & tests', icon: 'help-circle-outline' },
      { value: 'step_by_step', label: 'Step-by-step instructions', icon: 'list-outline' },
    ],
  },
  {
    id: 'learning_history_type',
    question: 'Have you learned skills online before?',
    subtitle: 'This helps us set the right pace',
    options: [
      { value: 'first_time', label: 'No, this is my first time', icon: 'sparkles-outline' },
      { value: 'quit_midway', label: 'Yes, but I usually quit midway', icon: 'pause-outline' },
      { value: 'completed_one', label: "Yes, I've completed at least one skill", icon: 'checkmark-circle-outline' },
      { value: 'independent', label: 'Yes, I learn independently often', icon: 'rocket-outline' },
    ],
  },
  {
    id: 'motivation_type',
    question: 'Why do you want to learn new skills?',
    subtitle: 'Understanding your motivation helps us keep you engaged',
    options: [
      { value: 'career', label: 'Career / Money', icon: 'cash-outline' },
      { value: 'personal_growth', label: 'Personal Growth', icon: 'trending-up-outline' },
      { value: 'academic', label: 'Academic Requirement', icon: 'school-outline' },
      { value: 'hobby', label: 'Hobby / Curiosity', icon: 'heart-outline' },
      { value: 'social', label: 'Social / Confidence', icon: 'people-outline' },
    ],
  },
];

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const currentStep = parseInt(step || '1', 10);
  const totalSteps = ONBOARDING_QUESTIONS.length;

  const { onboardingAnswers, setOnboardingAnswer, setOnboardingProfile, setIsLoading } = useStore();
  const currentQuestion = ONBOARDING_QUESTIONS[currentStep - 1];
  
  const [textInputValue, setTextInputValue] = useState(onboardingAnswers[currentQuestion?.id] || '');

  const currentValue = currentQuestion?.type === 'text_input' 
    ? textInputValue 
    : (onboardingAnswers[currentQuestion?.id] || (currentQuestion?.multiSelect ? [] : ''));

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

  const handleTextChange = (text: string) => {
    setTextInputValue(text);
    setOnboardingAnswer(currentQuestion.id, text);
  };

  const canProceed = () => {
    if (currentQuestion?.type === 'text_input') {
      return textInputValue.trim().length > 0;
    }
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
          user_role: onboardingAnswers.user_role,
          age_range: onboardingAnswers.age_range,
          country: onboardingAnswers.country,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          daily_time_minutes: parseInt(onboardingAnswers.daily_time_minutes, 10),
          learning_preferences: onboardingAnswers.learning_preferences || [],
          learning_history_type: onboardingAnswers.learning_history_type,
          motivation_type: onboardingAnswers.motivation_type,
        });
        setOnboardingProfile(profile);
        router.replace('/auth');
      } catch (error) {
        console.error('Failed to save onboarding profile:', error);
        // Still navigate to auth even if save fails
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
        </View>

        {/* Question Content */}
        {currentQuestion.type === 'text_input' ? (
          <View style={styles.textInputContainer}>
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
            <Text style={styles.stepText}>QUESTION {currentStep} OF {totalSteps}</Text>
            <Text style={styles.question}>{currentQuestion.question}</Text>
            {currentQuestion.subtitle && (
              <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
            )}
            <TextInput
              style={styles.textInput}
              placeholder={currentQuestion.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={textInputValue}
              onChangeText={handleTextChange}
              autoFocus
            />
          </View>
        ) : (
          <OnboardingQuestion
            question={currentQuestion.question}
            subtitle={currentQuestion.subtitle}
            options={currentQuestion.options || []}
            selectedValue={currentValue}
            onSelect={handleSelect}
            multiSelect={currentQuestion.multiSelect}
            step={currentStep}
            totalSteps={totalSteps}
          />
        )}

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
              color={COLORS.textPrimary}
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
  textInputContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xl,
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
  stepText: {
    fontSize: FONTS.size.xs,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
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
  },
  textInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.size.lg,
    color: COLORS.textPrimary,
    borderWidth: 2,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
  },
});
