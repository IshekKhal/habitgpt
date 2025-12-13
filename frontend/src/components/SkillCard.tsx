import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { SkillInstance } from '../store/useStore';
import { differenceInDays } from 'date-fns';

interface SkillCardProps {
  skill: SkillInstance;
  onPress: () => void;
  onLongPress?: () => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  onPress,
  onLongPress,
}) => {
  const startDate = new Date(skill.start_date);
  const today = new Date();
  const daysPassed = Math.max(1, differenceInDays(today, startDate) + 1);
  const progressPercentage = Math.min(skill.completion_percentage, 100);

  const getStatusColor = () => {
    if (progressPercentage >= 75) return COLORS.success;
    if (progressPercentage >= 50) return COLORS.accent;
    if (progressPercentage >= 25) return COLORS.warning;
    return COLORS.primary;
  };

  const getCategoryIcon = () => {
    const category = skill.category?.toLowerCase() || '';
    if (category.includes('tech') || category.includes('code')) return 'code-slash';
    if (category.includes('art') || category.includes('design')) return 'color-palette';
    if (category.includes('music')) return 'musical-notes';
    if (category.includes('sport') || category.includes('fitness')) return 'fitness';
    if (category.includes('cook') || category.includes('food')) return 'restaurant';
    if (category.includes('language')) return 'language';
    if (category.includes('business')) return 'briefcase';
    return 'bulb';
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
        <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '20' }]}>
          <Ionicons name={getCategoryIcon() as any} size={24} color={getStatusColor()} />
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            Day {daysPassed} / {skill.duration_days}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {skill.skill_name}
      </Text>
      <Text style={styles.category}>{skill.category}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: getStatusColor() }]}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.continueButton} onPress={onPress}>
        <Text style={styles.continueText}>Continue Learning</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
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
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  category: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  progressText: {
    fontSize: FONTS.size.sm,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  continueText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
