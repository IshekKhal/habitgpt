import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  isLoading = false,
}) => {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingDot, styles.loadingDot1]} />
            <View style={[styles.loadingDot, styles.loadingDot2]} />
            <View style={[styles.loadingDot, styles.loadingDot3]} />
          </View>
        ) : (
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.split(/(\*\*.*?\*\*)/g).map((part, index) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <Text key={index} style={{ fontWeight: 'bold' }}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              return <Text key={index}>{part}</Text>;
            })}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.xs,
  },
  assistantBubble: {
    backgroundColor: COLORS.backgroundCard,
    borderBottomLeftRadius: SPACING.xs,
  },
  text: {
    fontSize: FONTS.size.md,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.textLight,
  },
  assistantText: {
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  loadingDot1: {
    opacity: 0.4,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 0.8,
  },
});
