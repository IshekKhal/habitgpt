import React, { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { supabase } from '../src/services/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createUser, linkOnboardingToUser, updateUser } from '../src/services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../src/constants/theme';

type AuthStage = 'login' | 'otp' | 'profile';

export default function AuthScreen() {
  const { onboardingProfile, setUser, setOnboardingProfile } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<AuthStage>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');

  // Configure Google Sign-In
  React.useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (webClientId) {
      try {
        GoogleSignin.configure({
          webClientId: webClientId,
          offlineAccess: true,
          scopes: ['profile', 'email'],
          forceCodeForRefreshToken: true,
        });
      } catch (err) {
        console.error('debug: Google Sign-In configuration error:', err);
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      try { await GoogleSignin.signOut(); } catch (e) { } // Force fresh picker

      const userInfo = await GoogleSignin.signIn();
      // @ts-ignore
      const idToken = userInfo.data?.idToken || userInfo.idToken || userInfo.user?.idToken;

      if (idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) throw error;
        if (data.session) {
          const name = data.session.user.user_metadata.full_name || data.session.user.user_metadata.name || 'User';
          await finalizeAuth(data.session.user, name);
        }
      }
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Error', `Google Sign-In failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;

        if (data.session) {
          // Apple only sends name on first login. Supabase generally handles this, 
          // but we might default to 'User' if missing.
          const name = credential.fullName?.givenName
            ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
            : data.session.user.user_metadata?.full_name || 'User';

          await finalizeAuth(data.session.user, name);
        }
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // handle that the user canceled the sign-in flow
      } else {
        Alert.alert('Error', `Apple Sign-In failed: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Try to Sign In First
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInData.session) {
        console.log('Login successful');
        // Check if we need to collect name (missing metadata?)
        // For now, assume if they log in, they are good.
        // We might want to check if they have a public user record?
        // Let's just proceed. If they are new to *us* (cleared DB) but old to Auth, we catch that in finalizeAuth.
        const userName = signInData.session.user.user_metadata?.full_name || 'Friend';
        await finalizeAuth(signInData.session.user, userName);
        return;
      }

      // 2. If Sign In failed, try Sign Up
      if (signInError) {
        console.log('Sign in failed, trying sign up...', signInError.message);

        // If error suggests wrong password for existing user, stop here
        if (signInError.message.includes('Invalid login') && !signInError.message.includes('Email not confirmed')) {
          // We don't distinguish "User not found" from "Wrong password" securely usually.
          // standard Supabase message for wrong password is "Invalid login credentials".
          // standard Supabase message for user not found is ALSO "Invalid login credentials".
          // So we MUST try Sign Up.
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            Alert.alert('Incorrect Password', 'This email is already registered. Please check your password.');
          } else {
            Alert.alert('Error', signUpError.message);
          }
          return;
        }

        if (signUpData.user) {
          // If we got a user but no session, verification is required
          if (!signUpData.session) {
            console.log('Sign up successful, verification needed');
            setStage('otp');
          } else {
            // Auto-confirmed (unlikely if email verify is on, but possible)
            await finalizeAuth(signUpData.user, 'Friend'); // Default name if skipped
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'signup',
      });

      if (error) throw error;

      if (data.session) {
        // Verification success! Now collect name.
        setStage('profile');
      }
    } catch (error: any) {
      Alert.alert('Invalid Code', 'Please check the code sent to your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      // Get current user from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Update auth metadata with name
      await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });

      await finalizeAuth(user, name.trim());
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setIsLoading(false);
    }
  };

  const finalizeAuth = async (authUser: any, userName: string) => {
    try {
      // Extract avatar URL (Google/Apple/etc)
      const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

      // Create/Get user in public schema
      const user = await createUser({
        id: authUser.id,
        email: authUser.email || '',
        name: userName,
        google_id: authUser.app_metadata?.provider === 'google' ? authUser.id : undefined,
        apple_id: authUser.app_metadata?.provider === 'apple' ? authUser.id : undefined,
        avatar_url: avatarUrl,
      });

      // Self-heal: If user exists but has no avatar, and we have one now, update it.
      if (!user.avatar_url && avatarUrl) {
        console.log('Self-healing missing avatar URL');
        await updateUser(user.id, { avatar_url: avatarUrl });
        user.avatar_url = avatarUrl;
      }

      // Link onboarding
      if (onboardingProfile?.id) {
        await linkOnboardingToUser(onboardingProfile.id, user.id);
        setOnboardingProfile({ ...onboardingProfile, user_id: user.id });
        user.onboarding_completed = true;
        user.onboarding_profile_id = onboardingProfile.id;
      }

      setUser(user);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Finalize auth error:', error);
      Alert.alert('Error', `Failed to save user profile: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false); // Only stop loading if we failed or are about to navigate
    }
  };

  const renderLoginStage = () => {
    const isIOS = Platform.OS === 'ios';

    return (
      <>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        <View style={[styles.formContainer, isIOS && { justifyContent: 'center', flex: 1 }]}>
          {/* Google Sign In - Both Platforms */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.background} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* iOS: Apple Sign In Only */}
          {isIOS ? (
            <TouchableOpacity
              style={[styles.googleButton, { marginTop: SPACING.md, backgroundColor: '#000000' }]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.googleButtonText, { color: '#FFFFFF' }]}>Continue with Apple</Text>
            </TouchableOpacity>
          ) : (
            /* Android: Email & Password Fallback */
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!email.trim() || !password.trim() || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleInitialSubmit}
                disabled={!email.trim() || !password.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={[
                    styles.primaryButtonText,
                    (!email.trim() || !password.trim() || isLoading) && styles.primaryButtonTextDisabled
                  ]}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </>
    );
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) {
        if (error.message.includes('Limit exceeded')) {
          throw new Error('Too many attempts. Please wait a moment.');
        }
        throw error;
      }
      Alert.alert('Sent!', 'A new code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOtpStage = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStage('login')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a code to {email}</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Verification Code</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="123456"
            placeholderTextColor={COLORS.textMuted}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!otp.trim() || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleVerifyOtp}
          disabled={!otp.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={[
              styles.primaryButtonText,
              (!otp.trim() || isLoading) && styles.primaryButtonTextDisabled
            ]}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOtp}
          disabled={isLoading}
        >
          <Text style={styles.resendButtonText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderProfileStage = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>This is how your AI coach will address you.</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Abhishek"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!name.trim() || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleProfileSubmit}
          disabled={!name.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={[
              styles.primaryButtonText,
              (!name.trim() || isLoading) && styles.primaryButtonTextDisabled
            ]}>Get Started</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {stage === 'login' && renderLoginStage()}
          {stage === 'otp' && renderOtpStage()}
          {stage === 'profile' && renderProfileStage()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    position: 'relative',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: SPACING.xxl,
    padding: SPACING.sm,
    zIndex: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  formContainer: {
    flex: 1,
    marginTop: SPACING.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  googleButtonText: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
  },
  primaryButtonText: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  primaryButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  resendButton: {
    marginTop: SPACING.md,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.size.sm,
  },
  footer: {
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
