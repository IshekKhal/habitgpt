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
import { createSkillInstance, startTrial } from '../src/services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../src/constants/theme';

export default function PaymentScreen() {
  const { user, pendingSkill, clearChatHistory, addSkillInstance, setUser, setPendingSkill } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartLearning = async () => {
    if (!user?.id || !pendingSkill) return;

    setIsLoading(true);

    try {
      // Start trial if not already started
      if (!user.trial_started) {
        setIsStartingTrial(true);
        await startTrial(user.id);
        setUser({ ...user, trial_started: true });
      }

      // Create skill instance with roadmap
      const skillInstance = await createSkillInstance({
        user_id: user.id,
        skill_name: pendingSkill.name,
        skill_description: `Learning ${pendingSkill.name} with AI-generated roadmap`,
        category: pendingSkill.category,
        duration_days: 90,
      });

      addSkillInstance(skillInstance);
      clearChatHistory();
      setPendingSkill(null);

      // Navigate to roadmap
      router.replace(`/skill-roadmap/${skillInstance.id}`);
    } catch (error) {
      console.error('Failed to start learning:', error);
    } finally {
      setIsLoading(false);
      setIsStartingTrial(false);
    }
  };

  const handleClose = () => {
    setPendingSkill(null);
    clearChatHistory();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close Button */}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="gift" size={48} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>Your First Skill is FREE!</Text>
          <Text style={styles.subtitle}>
            Start learning <Text style={styles.highlight}>{pendingSkill?.name}</Text> today with a 90-day free trial
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.featureText}>Personalized AI roadmap</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.featureText}>Daily tasks and progress tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.featureText}>Curated learning resources</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.featureText}>Push notifications for reminders</Text>
          </View>
        </View>

        {/* Pricing Info */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>90-Day Free Trial</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>FIRST SKILL FREE</Text>
            </View>
          </View>
          <Text style={styles.pricingDescription}>
            After your trial ends, continue learning for just
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>$19.99</Text>
            <Text style={styles.pricePeriod}>/month</Text>
          </View>
          <Text style={styles.pricingNote}>
            Cancel anytime. No charges until trial ends.
          </Text>
        </View>

        {/* Payment Method Placeholder */}
        <TouchableOpacity style={styles.paymentMethodCard} activeOpacity={0.8}>
          <Ionicons name="card-outline" size={24} color={COLORS.textSecondary} />
          <View style={styles.paymentMethodText}>
            <Text style={styles.paymentMethodTitle}>Add Payment Method</Text>
            <Text style={styles.paymentMethodSubtitle}>Required to start free trial</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payment information is securely stored via RevenueCat. You won't be charged until after your 90-day trial period ends.
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
              <ActivityIndicator color={COLORS.textPrimary} />
              <Text style={styles.ctaButtonText}>
                {isStartingTrial ? 'Starting Trial...' : 'Generating Roadmap...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.ctaButtonText}>Start Learning Free</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textPrimary} />
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
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
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    color: COLORS.primary,
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
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pricingTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  priceBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  priceBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    fontWeight: 'bold',
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
    borderRadius: BORDER_RADIUS.md,
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
    backgroundColor: COLORS.primary + '80',
  },
  ctaButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
