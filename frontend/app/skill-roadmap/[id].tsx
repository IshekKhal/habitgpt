import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useStore, SkillInstance, DayPlan } from '../../src/store/useStore';
import { getSkillInstance, completeTask, checkSubscriptionStatus } from '../../src/services/api';
import { TaskItem } from '../../src/components/TaskItem';
import { PaywallOverlay } from '../../src/components/PaywallOverlay';
import { hasActiveSubscription, syncSubscriptionWithBackend } from '../../src/services/revenuecat';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../src/constants/theme';
import { differenceInDays, format, addDays } from 'date-fns';

const { width } = Dimensions.get('window');

export default function SkillRoadmapScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const { user, subscriptionStatus, setSubscriptionStatus, updateSkillInstance, skillInstances } = useStore();
  const [skill, setSkill] = useState<SkillInstance | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'tasks' | 'resources' | 'milestones'>('tasks');
  
  // Paywall states
  const [showPaywall, setShowPaywall] = useState(false);
  const [isFirstSkill, setIsFirstSkill] = useState(true);
  const [contentBlurred, setContentBlurred] = useState(false);

  // Check if this is user's first skill
  useEffect(() => {
    const otherSkills = skillInstances.filter(s => s.id !== id);
    setIsFirstSkill(otherSkills.length === 0);
  }, [skillInstances, id]);

  // Check subscription status when screen loads
  useEffect(() => {
    checkAndShowPaywall();
  }, [id, isNew]);

  const checkAndShowPaywall = async () => {
    // If this is a newly created skill (coming from payment flow), show paywall
    if (isNew === 'true') {
      setShowPaywall(true);
      setContentBlurred(true);
      return;
    }

    // Check subscription status
    try {
      const hasSubscription = await hasActiveSubscription();
      
      if (!hasSubscription) {
        // Check backend subscription status as backup
        if (user?.id) {
          const backendStatus = await checkSubscriptionStatus(user.id);
          if (!backendStatus.is_subscribed) {
            setShowPaywall(true);
            setContentBlurred(true);
          }
        } else {
          setShowPaywall(true);
          setContentBlurred(true);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // On error, check if user has trial
      if (!user?.trial_started && !subscriptionStatus.isSubscribed) {
        setShowPaywall(true);
        setContentBlurred(true);
      }
    }
  };

  const handlePaywallSuccess = async () => {
    // Sync subscription with backend
    if (user?.id) {
      await syncSubscriptionWithBackend(user.id);
    }
    
    // Update local subscription status
    setSubscriptionStatus({
      isSubscribed: true,
      isTrialActive: isFirstSkill,
      willRenew: true,
    });
    
    // Remove blur and hide paywall
    setShowPaywall(false);
    setContentBlurred(false);
  };

  const fetchSkill = async () => {
    if (!id) return;
    try {
      const instance = await getSkillInstance(id);
      setSkill(instance);
      
      // Set selected day to current day of learning
      const startDate = new Date(instance.start_date);
      const today = new Date();
      const currentDay = Math.max(1, Math.min(differenceInDays(today, startDate) + 1, instance.duration_days));
      setSelectedDay(currentDay);
    } catch (error) {
      console.error('Failed to fetch skill:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSkill();
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSkill();
    // Also re-check subscription
    await checkAndShowPaywall();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleTaskToggle = async (taskId: string) => {
    if (!skill || !id || contentBlurred) return;
    
    try {
      const result = await completeTask(id, taskId, selectedDay);
      
      // Update local state
      if (skill.roadmap) {
        const updatedDayPlans = skill.roadmap.day_plans.map((dp) => {
          if (dp.day_number === selectedDay) {
            const updatedTasks = dp.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            );
            const completedCount = updatedTasks.filter((t) => t.completed).length;
            return {
              ...dp,
              tasks: updatedTasks,
              completion_percentage: (completedCount / updatedTasks.length) * 100,
            };
          }
          return dp;
        });

        const updatedSkill = {
          ...skill,
          completion_percentage: result.completion_percentage,
          roadmap: {
            ...skill.roadmap,
            day_plans: updatedDayPlans,
          },
        };
        setSkill(updatedSkill);
        updateSkillInstance(id, { completion_percentage: result.completion_percentage });
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const getCurrentDayPlan = (): DayPlan | undefined => {
    return skill?.roadmap?.day_plans.find((dp) => dp.day_number === selectedDay);
  };

  const getChartData = () => {
    if (!skill?.roadmap?.day_plans) return [];
    
    const data = skill.roadmap.day_plans.slice(0, 14).map((dp) => ({
      value: dp.completion_percentage || 0,
      label: `D${dp.day_number}`,
      frontColor: dp.day_number === selectedDay ? COLORS.primary : COLORS.border,
    }));
    
    return data;
  };

  if (!skill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading roadmap...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startDate = new Date(skill.start_date);
  const currentDay = Math.max(1, differenceInDays(new Date(), startDate) + 1);
  const currentDayPlan = getCurrentDayPlan();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Always visible */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.skillName} numberOfLines={1}>{skill.skill_name}</Text>
          <Text style={styles.skillProgress}>
            Day {currentDay} of {skill.duration_days} • {Math.round(skill.completion_percentage)}% Complete
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Progress Timeline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={getChartData()}
                width={Math.max(width - 64, getChartData().length * 40)}
                height={120}
                barWidth={24}
                barBorderRadius={4}
                frontColor={COLORS.primary}
                backgroundColor={COLORS.backgroundCard}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={COLORS.border}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                noOfSections={4}
                maxValue={100}
                hideYAxisText
                disablePress={contentBlurred}
                onPress={(item: any, index: number) => !contentBlurred && setSelectedDay(index + 1)}
              />
            </ScrollView>
          </View>

          {/* Day Selector */}
          <View style={styles.daySelector}>
            <TouchableOpacity
              style={styles.daySelectorButton}
              onPress={() => !contentBlurred && setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay <= 1 || contentBlurred}
            >
              <Ionicons name="chevron-back" size={24} color={selectedDay <= 1 ? COLORS.textMuted : COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.dayInfo}>
              <Text style={styles.dayNumber}>Day {selectedDay}</Text>
              <Text style={styles.dayDate}>
                {format(addDays(startDate, selectedDay - 1), 'MMM d, yyyy')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.daySelectorButton}
              onPress={() => !contentBlurred && setSelectedDay(Math.min(skill.duration_days, selectedDay + 1))}
              disabled={selectedDay >= skill.duration_days || contentBlurred}
            >
              <Ionicons name="chevron-forward" size={24} color={selectedDay >= skill.duration_days ? COLORS.textMuted : COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
              onPress={() => setActiveTab('tasks')}
            >
              <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
              onPress={() => setActiveTab('resources')}
            >
              <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>Resources</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'milestones' && styles.tabActive]}
              onPress={() => setActiveTab('milestones')}
            >
              <Text style={[styles.tabText, activeTab === 'milestones' && styles.tabTextActive]}>Milestones</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'tasks' && (
              <View>
                {currentDayPlan?.tasks && currentDayPlan.tasks.length > 0 ? (
                  currentDayPlan.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={() => handleTaskToggle(task.id)}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No tasks for this day</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'resources' && (
              <View>
                {skill.roadmap?.resources && skill.roadmap.resources.length > 0 ? (
                  skill.roadmap.resources.map((resource) => (
                    <TouchableOpacity key={resource.id} style={styles.resourceItem} disabled={contentBlurred}>
                      <View style={styles.resourceIcon}>
                        <Ionicons
                          name={resource.type === 'youtube' ? 'logo-youtube' : 'document-text-outline'}
                          size={24}
                          color={resource.type === 'youtube' ? '#FF0000' : COLORS.primary}
                        />
                      </View>
                      <View style={styles.resourceContent}>
                        <Text style={styles.resourceTitle}>{resource.title}</Text>
                        <Text style={styles.resourceDesc} numberOfLines={2}>{resource.description}</Text>
                      </View>
                      <Ionicons name="open-outline" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No resources available</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'milestones' && (
              <View>
                {skill.roadmap?.milestones && skill.roadmap.milestones.length > 0 ? (
                  skill.roadmap.milestones.map((milestone, index) => (
                    <View key={index} style={styles.milestoneItem}>
                      <View style={[
                        styles.milestoneMarker,
                        currentDay >= milestone.day && styles.milestoneMarkerCompleted
                      ]}>
                        {currentDay >= milestone.day ? (
                          <Ionicons name="checkmark" size={16} color={COLORS.textPrimary} />
                        ) : (
                          <Text style={styles.milestoneDay}>{milestone.day}</Text>
                        )}
                      </View>
                      <View style={styles.milestoneContent}>
                        <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                        <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                        <Text style={styles.milestoneDate}>Day {milestone.day}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="flag-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No milestones set</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Overview Card */}
          {skill.roadmap?.overview && (
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Learning Overview</Text>
              <Text style={styles.overviewText}>{skill.roadmap.overview}</Text>
            </View>
          )}
        </ScrollView>

        {/* Blur Overlay when payment required */}
        {contentBlurred && (
          <BlurView
            intensity={20}
            style={styles.blurOverlay}
            tint="dark"
          />
        )}
      </View>

      {/* Paywall Modal */}
      <PaywallOverlay
        visible={showPaywall}
        onSuccess={handlePaywallSuccess}
        isFirstSkill={isFirstSkill}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  skillName: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  skillProgress: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  chartContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  daySelectorButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  dayDate: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
  tabContent: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  resourceTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resourceDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  milestoneItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  milestoneMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneMarkerCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  milestoneDay: {
    fontSize: FONTS.size.xs,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  milestoneContent: {
    flex: 1,
    marginLeft: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  milestoneTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  milestoneDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  milestoneDate: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  overviewCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  overviewTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  overviewText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
