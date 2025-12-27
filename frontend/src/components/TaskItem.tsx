import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import { DailyTask } from '../store/useStore';

interface TaskItemProps {
  task: DailyTask;
  onToggle: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
  const [expanded, setExpanded] = React.useState(false);

  const openResource = (url: string) => {
    console.log('Attempting to open resource:', url);
    if (url.startsWith('http')) {
      Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
    } else {
      console.warn('Invalid URL format:', url);
    }
  };

  return (
    <View style={[styles.container, task.completed && styles.containerCompleted]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
          {task.completed && (
            <Ionicons name="checkmark" size={16} color={COLORS.textPrimary} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={[styles.title, task.completed && styles.titleCompleted]}>
            {task.title}
          </Text>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 2}
          >
            {task.description}
          </Text>
        </TouchableOpacity>

        <View style={styles.meta}>
          <TouchableOpacity
            style={styles.timeContainer}
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.timeText}>{task.estimated_minutes} min</Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={COLORS.textMuted}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>

          {task.resource_links && task.resource_links.length > 0 && (
            <View style={styles.resourcesContainer}>
              {task.resource_links.slice(0, 2).map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resourceButton}
                  onPress={() => openResource(url)}
                >
                  <Ionicons
                    name={url.includes('youtube') ? 'logo-youtube' : 'link-outline'}
                    size={14}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  containerCompleted: {
    opacity: 0.7,
    backgroundColor: COLORS.backgroundLight,
  },
  checkboxContainer: {
    paddingRight: SPACING.md,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  description: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
  },
  resourcesContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  resourceButton: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
