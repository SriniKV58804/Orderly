import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Task } from '../types';
import type { AppTheme } from '../theme';
import { useRouter } from 'expo-router';
import Animated, { 
  FadeIn,
  FadeOut,
  SlideOutLeft,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

interface TaskCardProps {
  task: Task;
  theme: AppTheme;
  onPress: () => void;
  onToggleStatus: () => void;
  showWorkDate?: boolean;
  hasStudyPlan?: boolean;
}

export function TaskCard({ 
  task, 
  theme, 
  onPress, 
  onToggleStatus, 
  showWorkDate = false,
  hasStudyPlan = false,
}: TaskCardProps) {
  const router = useRouter();
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(pressed.value ? 0.98 : 1) }
      ]
    };
  });

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return theme.colors.error;
      case 4: return '#FF9800';
      case 3: return theme.colors.primary;
      case 2: return theme.colors.secondary;
      default: return theme.colors.textSecondary;
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      overflow: 'hidden',
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      color: theme.colors.onSurface,
    },
    description: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginTop: 8,
      lineHeight: 20,
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    priorityText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    studyPlanBadge: {
      backgroundColor: `${theme.colors.primary}20`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    progressBar: {
      height: 4,
      backgroundColor: `${theme.colors.primary}20`,
      borderRadius: 2,
      marginTop: 12,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
  });

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      entering={FadeIn}
      exiting={SlideOutLeft.duration(200)}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => pressed.value = true}
        onPressOut={() => pressed.value = false}
      >
        <View style={[
          styles.card,
          task.status === 'completed' && { opacity: 0.7 }
        ]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable onPress={onToggleStatus}>
                <Animated.View
                  style={[
                    styles.checkbox,
                    { 
                      borderColor: task.status === 'completed' 
                          ? theme.colors.primary 
                          : theme.colors.textSecondary,
                        backgroundColor: task.status === 'completed'
                          ? theme.colors.primary
                          : 'transparent'
                    }
                  ]}
                >
                  {task.status === 'completed' && (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color="white" 
                    />
                  )}
                </Animated.View>
              </Pressable>

              <View style={styles.titleContainer}>
                <Text 
                  style={[
                    styles.title,
                    task.status === 'completed' && { 
                      textDecorationLine: 'line-through',
                      color: theme.colors.textSecondary
                    }
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>

                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons 
                      name="clock-outline" 
                      size={14} 
                      color={theme.colors.error} 
                    />
                    <Text style={[styles.metaText, { color: theme.colors.error }]}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </Text>
                  </View>

                  {showWorkDate && task.work_date && (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons 
                        name="calendar-clock" 
                        size={14} 
                        color={theme.colors.primary} 
                      />
                      <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                        {new Date(task.work_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(task.priority) }
              ]}>
                <MaterialCommunityIcons 
                  name="flag" 
                  size={12} 
                  color="white" 
                />
                <Text style={styles.priorityText}>
                  P{task.priority}
                </Text>
              </View>
            </View>

            {task.description && (
              <Text 
                style={styles.description}
                numberOfLines={2}
              >
                {task.description}
              </Text>
            )}

            <View style={styles.metaContainer}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons 
                  name={getCategoryIcon(task.category)} 
                  size={14} 
                  color={theme.colors.primary} 
                />
                <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                  {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                </Text>
              </View>

              {hasStudyPlan && (
                <Pressable 
                  style={styles.studyPlanBadge}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/tasks/${task.id}/study-plan`);
                  }}
                >
                  <MaterialCommunityIcons 
                    name="brain" 
                    size={14} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                    Study Plan
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: task.status === 'completed' ? '100%' : '0%' }
                ]}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'homework': return 'book-open-variant';
    case 'quiz': return 'pencil';
    case 'project': return 'folder';
    case 'exam': return 'file-document';
    default: return 'checkbox-marked-circle-outline';
  }
}