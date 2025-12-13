import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { user, loadFromStorage } = useStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    // If user is already logged in and onboarded, go to home
    if (user?.onboarding_completed) {
      router.replace('/(tabs)/home');
    }
  }, [user]);

  const handleGetStarted = () => {
    router.push('/onboarding/1');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="leaf" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>HabitGPT</Text>
          <Text style={styles.tagline}>Grow any habit in 29 days</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>29-Day Framework</Text>
              <Text style={styles.featureDesc}>Science-backed habit formation timeline</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="analytics-outline" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Personalized Coaching</Text>
              <Text style={styles.featureDesc}>AI adapts to your style and patterns</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="trending-up-outline" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Track Progress</Text>
              <Text style={styles.featureDesc}>Visual streaks and milestone celebrations</Text>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            First month free • Build habits that stick
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    fontSize: FONTS.size.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONTS.size.lg,
    color: COLORS.textSecondary,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  ctaSection: {
    paddingBottom: SPACING.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  disclaimer: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
