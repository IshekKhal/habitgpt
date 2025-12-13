import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../constants/theme';
import {
  getPackages,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
} from '../services/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';

interface PaywallOverlayProps {
  visible: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  isFirstSkill?: boolean;
}

export const PaywallOverlay: React.FC<PaywallOverlayProps> = ({
  visible,
  onSuccess,
  onClose,
  isFirstSkill = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
  }>({ monthly: null, yearly: null });

  useEffect(() => {
    if (visible) {
      loadPackages();
    }
  }, [visible]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const pkgs = await getPackages();
      setPackages(pkgs);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'monthly' ? packages.monthly : packages.yearly;
    
    if (!pkg) {
      // For development/demo, simulate success
      Alert.alert(
        'Demo Mode',
        'RevenueCat is not configured. In production, this would process the payment. Simulating success for demo.',
        [
          {
            text: 'Continue',
            onPress: () => onSuccess(),
          },
        ]
      );
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      
      if (result.success) {
        Alert.alert(
          'Welcome to SkillGPT!',
          isFirstSkill 
            ? 'Your first month is FREE! Start your learning journey now.'
            : 'Subscription activated successfully!',
          [{ text: 'Start Learning', onPress: () => onSuccess() }]
        );
      } else if (result.error && result.error !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      
      if (result.isSubscribed) {
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => onSuccess() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'No previous subscription found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setPurchasing(false);
    }
  };

  const monthlyPrice = packages.monthly?.product.priceString || '$19.99';
  const yearlyPrice = packages.yearly?.product.priceString || '$159.99';
  const yearlyMonthly = '$13.33';
  const savingsPercent = 33;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Blur Background */}
        <BlurView intensity={Platform.OS === 'ios' ? 50 : 100} style={styles.blur} tint="dark" />
        
        {/* Content */}
        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Close Button (only if allowed) */}
            {onClose && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="rocket" size={48} color={COLORS.primary} />
              </View>
              
              {isFirstSkill ? (
                <>
                  <Text style={styles.title}>Unlock Your Roadmap</Text>
                  <View style={styles.freeTrialBadge}>
                    <Ionicons name="gift" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.freeTrialText}>FIRST MONTH FREE</Text>
                  </View>
                  <Text style={styles.subtitle}>
                    Your personalized learning journey is ready! Start your free trial to access it.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Subscription Required</Text>
                  <Text style={styles.subtitle}>
                    Continue your learning journey by renewing your subscription.
                  </Text>
                </>
              )}
            </View>

            {/* Plan Selection */}
            <View style={styles.plansContainer}>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioButton,
                    selectedPlan === 'monthly' && styles.radioButtonSelected,
                  ]}>
                    {selectedPlan === 'monthly' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.planTitle}>Monthly</Text>
                </View>
                
                <View style={styles.priceContainer}>
                  {isFirstSkill && (
                    <Text style={styles.originalPrice}>{monthlyPrice}</Text>
                  )}
                  <Text style={[styles.currentPrice, isFirstSkill && styles.freePrice]}>
                    {isFirstSkill ? 'FREE' : monthlyPrice}
                  </Text>
                  <Text style={styles.priceSubtext}>
                    {isFirstSkill ? `then ${monthlyPrice}/month` : 'per month'}
                  </Text>
                </View>
                
                <Text style={styles.planDescription}>
                  Cancel anytime. Auto-renews monthly.
                </Text>
              </TouchableOpacity>

              {/* Yearly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'yearly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>SAVE {savingsPercent}%</Text>
                </View>
                
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioButton,
                    selectedPlan === 'yearly' && styles.radioButtonSelected,
                  ]}>
                    {selectedPlan === 'yearly' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.planTitle}>Yearly</Text>
                </View>
                
                <View style={styles.priceContainer}>
                  {isFirstSkill && (
                    <Text style={styles.originalPrice}>{yearlyPrice}</Text>
                  )}
                  <Text style={[styles.currentPrice, isFirstSkill && styles.freePrice]}>
                    {isFirstSkill ? 'FREE' : yearlyPrice}
                  </Text>
                  <Text style={styles.priceSubtext}>
                    {isFirstSkill 
                      ? `then ${yearlyPrice}/year (${yearlyMonthly}/mo)` 
                      : `${yearlyMonthly}/month, billed annually`}
                  </Text>
                </View>
                
                <Text style={styles.planDescription}>
                  Best value. Cancel anytime.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.featureText}>AI-powered personalized roadmaps</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.featureText}>Daily tasks & progress tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.featureText}>Curated learning resources</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                <Text style={styles.featureText}>Unlimited skills to learn</Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentMethods}>
              <Ionicons name="card" size={20} color={COLORS.textMuted} />
              <Ionicons name="logo-apple" size={20} color={COLORS.textMuted} />
              <Ionicons name="logo-google" size={20} color={COLORS.textMuted} />
              <Ionicons name="logo-paypal" size={20} color={COLORS.textMuted} />
            </View>
          </ScrollView>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing || loading}
              activeOpacity={0.8}
            >
              {purchasing ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <>
                  <Text style={styles.ctaButtonText}>
                    {isFirstSkill ? 'Start Free Trial' : 'Subscribe Now'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.textPrimary} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.restoreButton} 
              onPress={handleRestore}
              disabled={purchasing}
            >
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
              {isFirstSkill && ' Your subscription will auto-renew after the trial period.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '95%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SPACING.sm,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  freeTrialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  freeTrialText: {
    fontSize: FONTS.size.sm,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  plansContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  planCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  savingsBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  planTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceContainer: {
    marginBottom: SPACING.xs,
  },
  originalPrice: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: FONTS.size.xxxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  freePrice: {
    color: COLORS.secondary,
  },
  priceSubtext: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  planDescription: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
  },
  featuresContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textPrimary,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  ctaContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  restoreText: {
    fontSize: FONTS.size.sm,
    color: COLORS.primary,
  },
  termsText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
});
