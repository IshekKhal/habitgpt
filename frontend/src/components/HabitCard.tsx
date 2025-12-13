import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS, MICROCOPY } from '../constants/theme';
import { HabitInstance } from '../store/useStore';
import { differenceInDays } from 'date-fns';

interface HabitCardProps {
  habit: HabitInstance;
  onPress: () => void;
  onLongPress?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onPress,
  onLongPress,
}) => {
  const startDate = new Date(habit.start_date);
  const today = new Date();
  const daysPassed = Math.max(1, differenceInDays(today, startDate) + 1);
  const progressPercentage = Math.min(habit.completion_percentage, 100);
  const daysRemaining = Math.max(0, habit.duration_days - daysPassed);

  const getCategoryIcon = () => {
    const category = habit.category?.toLowerCase() || '';
    if (category.includes('sleep') || category.includes('energy')) return 'moon-outline';
    if (category.includes('focus') || category.includes('productivity')) return 'flash-outline';
    if (category.includes('health') || category.includes('fitness')) return 'fitness-outline';
    if (category.includes('spiritual') || category.includes('mental')) return 'leaf-outline';
    if (category.includes('discipline')) return 'timer-outline';
    if (category.includes('relationship')) return 'people-outline';
    return 'sparkles-outline';
  };

  const getStreakDisplay = () => {
    if (habit.current_streak > 0) {
      return MICROCOPY.streak.active(habit.current_streak);
    }
    return MICROCOPY.streak.broken;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={getCategoryIcon() as any} size={22} color={COLORS.textPrimary} />
        </View>
        <View style={styles.streakBadge}>
          <Ionicons 
            name={habit.current_streak > 0 ? "flame" : "flame-outline"} 
            size={14} 
            color={habit.current_streak > 0 ? COLORS.secondary : COLORS.textMuted} 
          />
          <Text style={[
            styles.streakText,
            habit.current_streak > 0 && styles.streakTextActive
          ]}>
            {getStreakDisplay()}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {habit.habit_name}
      </Text>
      
      {/* Progress info */}
      <View style={styles.progressInfo}>
        <Text style={styles.dayText}>
          Day {daysPassed} of {habit.duration_days}
        </Text>
        <Text style={styles.remainingText}>
          {daysRemaining > 0 ? `${daysRemaining} days to go` : 'Final day!'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.continueButton} onPress={onPress}>
        <Text style={styles.continueText}>Continue</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  streakText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  streakTextActive: {
    color: COLORS.secondary,
  },
  title: {
    fontSize: FONTS.size.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dayText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  remainingText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    minWidth: 40,
    textAlign: 'right',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  continueText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
