import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { getUserHabitInstances, deleteHabitInstance } from '../../src/services/api';
import { HabitCard } from '../../src/components/HabitCard';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, MICROCOPY } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user, habitInstances, setHabitInstances, removeHabitInstance } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchHabits = async () => {
    if (!user?.id) return;
    try {
      const instances = await getUserHabitInstances(user.id);
      setHabitInstances(instances);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHabits();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHabits();
    setRefreshing(false);
  };

  const handleAddHabit = () => {
    router.push('/habit-chat');
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/habit-roadmap/${habitId}`);
  };

  const handleHabitLongPress = (habitId: string, habitName: string) => {
    Alert.alert(
      'Remove Habit',
      `Are you sure you want to remove "${habitName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabitInstance(habitId);
              removeHabitInstance(habitId);
            } catch (error) {
              console.error('Failed to delete habit:', error);
              Alert.alert('Error', 'Failed to remove habit. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="leaf-outline" size={56} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{MICROCOPY.emptyHabits.title}</Text>
      <Text style={styles.emptySubtitle}>{MICROCOPY.emptyHabits.subtitle}</Text>
      <TouchableOpacity style={styles.trialBanner} activeOpacity={0.8}>
        <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
        <Text style={styles.trialText}>{MICROCOPY.firstHabit.title}</Text>
      </TouchableOpacity>
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}</Text>
          <Text style={styles.subGreeting}>Small steps, big changes</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/notification-settings')}
        >
          <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {habitInstances.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.habitsContainer}>
            <Text style={styles.sectionTitle}>Your Habits</Text>
            {habitInstances.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onPress={() => handleHabitPress(habit.id)}
                onLongPress={() => handleHabitLongPress(habit.id, habit.habit_name)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddHabit}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.textLight} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.size.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.size.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  trialText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  habitsContainer: {
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
});
