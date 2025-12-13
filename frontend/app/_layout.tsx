import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../src/constants/theme';
import { useStore } from '../src/store/useStore';

const queryClient = new QueryClient();

// Configure notification handler (must be at top level) - only on native
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function NotificationHandler() {
  const { user } = useStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Only initialize notifications on native platforms
    if (Platform.OS === 'web') {
      return;
    }

    const setupNotifications = async () => {
      if (user?.id) {
        try {
          // Request permissions
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permissions not granted');
            return;
          }
        } catch (error) {
          console.log('Error setting up notifications:', error);
        }
      }

      // Listen for notifications received while app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

      // Listen for notification responses (when user taps notification)
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data?.type === 'daily_reminder') {
          router.push('/(tabs)/home');
        }
      });
    };

    setupNotifications();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NotificationHandler />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/[step]" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit-chat" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habit-roadmap/[id]" />
          <Stack.Screen name="payment" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notification-settings" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
