import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { createHabitInstance, startTrial } from '../src/services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, MICROCOPY } from '../src/constants/theme';

export default function PaymentScreen() {
  const { user, pendingHabit, clearChatHistory, addHabitInstance, setUser, setPendingHabit } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartLearning = async () => {
    if (!user?.id || !pendingHabit) return;

    setIsLoading(true);

    try {
      // Start trial if not already started
      if (!user.trial_started) {
        setIsStartingTrial(true);
        await startTrial(user.id);
        setUser({ ...user, trial_started: true });
      }

      // Create habit instance with roadmap
      const habitInstance = await createHabitInstance({
        user_id: user.id,
        habit_name: pendingHabit.name,
        habit_description: `Building ${pendingHabit.name} over 29 days`,
        category: pendingHabit.category,
        duration_days: 29,
      });

      addHabitInstance(habitInstance);
      clearChatHistory();
      setPendingHabit(null);

      // Navigate to roadmap with isNew flag to trigger paywall
      router.replace(`/habit-roadmap/${habitInstance.id}?isNew=true`);
    } catch (error) {
      console.error('Failed to start habit:', error);
    } finally {
      setIsLoading(false);
      setIsStartingTrial(false);
    }
  };

  const handleClose = () => {
    setPendingHabit(null);
    clearChatHistory();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close Button */}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={44} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>{MICROCOPY.firstHabit.title}</Text>
          <Text style={styles.subtitle}>
            Start building <Text style={styles.highlight}>{pendingHabit?.name}</Text> today
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
            <Text style={styles.featureText}>Personalized 29-day roadmap</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
            <Text style={styles.featureText}>Daily micro-tasks that build habits</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
            <Text style={styles.featureText}>Coach-style reminders & support</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
            <Text style={styles.featureText}>Streak tracking & milestones</Text>
          </View>
        </View>

        {/* Pricing Info */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>7-Day Free Trial</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>FIRST HABIT FREE</Text>
            </View>
          </View>
          <Text style={styles.pricingDescription}>
            After your trial, continue growing habits for
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>$5.99</Text>
            <Text style={styles.pricePeriod}>/month</Text>
          </View>
          <Text style={styles.pricingNote}>
            Cancel anytime. No charges until trial ends.
          </Text>
        </View>

        {/* Payment Method Placeholder */}
        <TouchableOpacity style={styles.paymentMethodCard} activeOpacity={0.8}>
          <Ionicons name="card-outline" size={22} color={COLORS.textSecondary} />
          <View style={styles.paymentMethodText}>
            <Text style={styles.paymentMethodTitle}>Add Payment Method</Text>
            <Text style={styles.paymentMethodSubtitle}>Required to start free trial</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payment is securely stored via RevenueCat. You won't be charged until your 7-day trial ends.
        </Text>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleStartLearning}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.textLight} />
              <Text style={styles.ctaButtonText}>
                {isStartingTrial ? 'Starting trial...' : 'Creating your roadmap...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.ctaButtonText}>Start Building This Habit</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureText: {
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
  },
  pricingCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pricingTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  priceBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  pricingDescription: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.xs,
  },
  priceAmount: {
    fontSize: FONTS.size.xxxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pricePeriod: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  pricingNote: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  paymentMethodText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  paymentMethodTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentMethodSubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
  },
  disclaimer: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    opacity: 0.7,
  },
  ctaButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
