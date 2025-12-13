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
import { getUserSkillInstances, deleteSkillInstance } from '../../src/services/api';
import { SkillCard } from '../../src/components/SkillCard';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user, skillInstances, setSkillInstances, removeSkillInstance } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchSkills = async () => {
    if (!user?.id) return;
    try {
      const instances = await getUserSkillInstances(user.id);
      setSkillInstances(instances);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSkills();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSkills();
    setRefreshing(false);
  };

  const handleAddSkill = () => {
    router.push('/skill-chat');
  };

  const handleSkillPress = (skillId: string) => {
    router.push(`/skill-roadmap/${skillId}`);
  };

  const handleSkillLongPress = (skillId: string, skillName: string) => {
    Alert.alert(
      'Delete Skill',
      `Are you sure you want to delete "${skillName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSkillInstance(skillId);
              removeSkillInstance(skillId);
            } catch (error) {
              console.error('Failed to delete skill:', error);
              Alert.alert('Error', 'Failed to delete skill. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="bulb-outline" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Start Learning a New Skill</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button below to begin your journey
      </Text>
      <TouchableOpacity style={styles.trialBanner} activeOpacity={0.8}>
        <Ionicons name="gift-outline" size={20} color={COLORS.secondary} />
        <Text style={styles.trialText}>Learn your first skill FREE for 90 days</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Learner'}</Text>
          <Text style={styles.subGreeting}>Ready to learn something new?</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
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
        {skillInstances.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.skillsContainer}>
            <Text style={styles.sectionTitle}>Your Skills</Text>
            {skillInstances.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onPress={() => handleSkillPress(skill.id)}
                onLongPress={() => handleSkillLongPress(skill.id, skill.skill_name)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddSkill}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={COLORS.textPrimary} />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: {
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
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
    backgroundColor: COLORS.secondary + '20',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  trialText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  skillsContainer: {
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
