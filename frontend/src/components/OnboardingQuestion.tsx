import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface OnboardingQuestionProps {
  question: string;
  subtitle?: string;
  options: Option[];
  selectedValue: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  step: number;
  totalSteps: number;
}

export const OnboardingQuestion: React.FC<OnboardingQuestionProps> = ({
  question,
  subtitle,
  options,
  selectedValue,
  onSelect,
  multiSelect = false,
  step,
  totalSteps,
}) => {
  const isSelected = (value: string) => {
    if (multiSelect && Array.isArray(selectedValue)) {
      return selectedValue.includes(value);
    }
    return selectedValue === value;
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < step && styles.progressDotCompleted,
              index === step - 1 && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <Text style={styles.stepText}>QUESTION {step} OF {totalSteps}</Text>
      <Text style={styles.question}>{question}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Options */}
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isSelected(option.value) && styles.optionSelected,
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              {option.icon && (
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={isSelected(option.value) ? COLORS.primary : COLORS.textSecondary}
                  style={styles.optionIcon}
                />
              )}
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
                <Ionicons name="checkmark" size={16} color={COLORS.textPrimary} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  optionsContainer: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: SPACING.md,
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
});
