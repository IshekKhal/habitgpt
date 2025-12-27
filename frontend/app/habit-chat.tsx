import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, ChatMessage } from '../src/store/useStore';
import { sendHabitChatMessage, createHabitInstance } from '../src/services/api';
import { ChatBubble } from '../src/components/ChatBubble';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, MICROCOPY } from '../src/constants/theme';

export default function HabitChatScreen() {
  const { user, currentChatHistory, addChatMessage, removeLastMessage, clearChatHistory, setPendingHabit, onboardingProfile } = useStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const getCoachGreeting = () => {
    const coachStyle = onboardingProfile?.coach_style_preference || 'adaptive';
    const greetings = {
      gentle: "Hi there! I'm excited to help you build a new habit. What positive change would you like to make in your life? Take your time — there's no rush. 🌱",
      structured: "Welcome. I'm here to help you establish a new habit over the next 29 days. What specific behavior would you like to develop? Please be as precise as possible.",
      strict: "Let's build a habit. What do you want to commit to? Be specific — vague goals lead to failure.",
      adaptive: "Hey! I'm here to help you grow a new habit in 29 days. What change are you thinking about? Don't worry if you're not sure yet — we'll figure it out together.",
    };
    return greetings[coachStyle as keyof typeof greetings] || greetings.adaptive;
  };

  useEffect(() => {
    // Clear chat history when entering
    clearChatHistory();
    // Add initial greeting based on coach style
    addChatMessage({
      role: 'assistant',
      content: getCoachGreeting(),
    });
  }, []);



  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // Add user message to chat immediately (Optimistic UI)
    addChatMessage({ role: 'user', content: userMessage });

    setIsLoading(true);

    try {
      const response = await sendHabitChatMessage(
        user?.id || '',
        userMessage,
        currentChatHistory
      );

      // Add assistant response
      addChatMessage({ role: 'assistant', content: response.response });

      // Check if ready for roadmap
      if (response.ready_for_roadmap && response.habit_name) {
        setPendingHabit({
          name: response.habit_name,
          category: response.category || 'other',
        });

        // Create the habit instance immediately
        const newHabit = await createHabitInstance({
          user_id: user?.id || '',
          habit_name: response.habit_name || 'New Habit',
          habit_description: `Journey to build ${response.habit_name}`,
          category: response.category || 'other',
          duration_days: 29,
        });

        // Navigate to roadmap with paywall forced (isNew=true)
        setTimeout(() => {
          router.replace({
            pathname: '/habit-roadmap/[id]',
            params: { id: newHabit.id, isNew: 'true' }
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Chat error:', error);

      // RESTORE INPUT STRATEGY
      // 1. Remove the optimistic user message we just added
      removeLastMessage();

      // 2. Restore context to input so they can modify/resend
      setInputText(userMessage);

      // 3. Inform user
      Alert.alert(
        "Connection Failed",
        "We couldn't send your message. Please check your internet and try again."
      );

    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    clearChatHistory();
    router.back();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item.content} isUser={item.role === 'user'} />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>HabitGPT</Text>
          <Text style={styles.headerSubtitle}>29-day journey</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={currentChatHistory}
          renderItem={renderMessage}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <ChatBubble message="" isUser={false} isLoading={true} />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What habit would you like to grow?"
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.textLight} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={COLORS.textLight} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: SPACING.lg,
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    maxHeight: 120,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
});
