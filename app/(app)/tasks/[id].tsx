import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Surface, Chip, Modal, ProgressBar, Divider, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import type { Task } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';
import { TaskForm } from '../../../src/components/TaskForm';
import { formatDistanceToNow, isPast, isToday } from 'date-fns';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontWeight: '600',
  },
  contentCard: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  metaSection: {
    gap: 16,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 15,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  deleteButtonContainer: {
    borderColor: 'transparent',
  },
  studyPlanButtonContainer: {
    // Any specific styles for study plan button
  },
  actionsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

export default function TaskDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const fadeAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    if (!id) {
      setError('Invalid task ID');
      setLoading(false);
    }
  }, [id]);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          study_plans (
            id
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }
      if (!data) throw new Error('Task not found');
      
      setTask(data);
    } catch (err) {
      console.error('Error fetching task:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();

    const subscription = supabase
      .channel(`task_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            router.replace('/(app)/(tabs)/tasks');
          } else {
            await fetchTask();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, fetchTask]);

  const handleUpdate = async (updatedValues: Partial<Task>) => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          ...updatedValues,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Animate success feedback
      Animated.parallel([
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
          }),
        ]),
      ]).start();

      await fetchTask();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      // Animate status change
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      await fetchTask();
    } catch (err) {
      console.error('Status update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return theme.colors.primary;
      case 'in_progress':
        return '#FF9800';
      case 'pending':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5:
        return theme.colors.error;
      case 4:
        return '#FF9800';
      case 3:
        return theme.colors.primary;
      case 2:
        return theme.colors.secondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'homework':
        return 'book-open-variant';
      case 'quiz':
        return 'pencil';
      case 'project':
        return 'folder';
      case 'exam':
        return 'file-document';
      case 'study':
        return 'book';
      case 'assignment':
        return 'clipboard-text';
      case 'reading':
        return 'book-open-page-variant';
      case 'research':
        return 'magnify';
      default:
        return 'checkbox-marked-circle-outline';
    }
  };

  const getDueStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', color: theme.colors.error };
    }
    if (isToday(date)) {
      return { label: 'Due Today', color: '#FF9800' };
    }
    return { label: `Due ${formatDistanceToNow(date, { addSuffix: true })}`, color: theme.colors.primary };
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete associated study plan if exists
      if (task?.is_canvas_task) {
        const { error: studyPlanError } = await supabase
          .from('study_plans')
          .delete()
          .eq('task_id', id);

        if (studyPlanError) {
          console.error('Error deleting study plan:', studyPlanError);
        }
      }

      // Show success animation before navigating back
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.back();
      });
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeletePress = () => {
    console.log('Delete button pressed, current state:', showDeleteModal);
    setShowDeleteModal(prev => {
      console.log('Setting state to:', !prev);
      return !prev;
    });
  };

  useEffect(() => {
    console.log('Modal visibility changed:', showDeleteModal);
  }, [showDeleteModal]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ProgressBar indeterminate color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons 
          name="alert-circle-outline" 
          size={48} 
          color={theme.colors.error} 
        />
        <Text variant="titleMedium" style={{ marginVertical: 8, color: theme.colors.error }}>
          {error}
        </Text>
        <Button mode="contained" onPress={fetchTask}>
          Retry
        </Button>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons 
          name="file-search-outline" 
          size={48} 
          color={theme.colors.textSecondary} 
        />
        <Text variant="titleMedium" style={{ marginTop: 8, color: theme.colors.textSecondary }}>
          Task not found
        </Text>
      </View>
    );
  }

  if (isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={styles.header} elevation={2}>
          <IconButton
            icon="close"
            size={24}
            onPress={() => setIsEditing(false)}
          />
          <Text variant="titleLarge" style={styles.headerTitle}>Edit Task</Text>
          <View style={{ width: 48 }} />
        </Surface>
        <TaskForm
          initialValues={task}
          onSubmit={handleUpdate}
        />
      </View>
    );
  }

  const dueStatus = getDueStatus(task.due_date);

  // Add theme-dependent styles inside the component
  const themedStyles = {
    actionsWrapper: {
      backgroundColor: theme.colors.background,
    },
    deleteButton: {
      borderColor: theme.colors.error,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Surface style={styles.header} elevation={2}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text variant="titleLarge" style={styles.headerTitle}>Task Details</Text>
          <IconButton
            icon="pencil"
            size={24}
            onPress={() => setIsEditing(true)}
          />
        </Surface>

        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchTask} />
          }
        >
          <View style={styles.card}>
            <View style={styles.statusBar}>
              <Chip 
                mode="flat"
                style={{ backgroundColor: getStatusColor(task.status) }}
                textStyle={{ color: 'white' }}
              >
                {task.status.replace('_', ' ').toUpperCase()}
              </Chip>
              <Animated.View>
                <IconButton
                  icon={task.status === 'completed' ? 'check-circle' : 'circle-outline'}
                  iconColor={task.status === 'completed' ? theme.colors.primary : theme.colors.textSecondary}
                  size={28}
                  onPress={() => handleStatusChange(task.status === 'completed' ? 'pending' : 'completed')}
                />
              </Animated.View>
            </View>

            <Text variant="headlineSmall" style={styles.title}>
              {task.title}
            </Text>

            {task.description && (
              <>
                <Divider style={styles.divider} />
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  {task.description}
                </Text>
              </>
            )}

            <Divider style={styles.divider} />

            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons 
                  name="flag" 
                  size={20} 
                  color={getPriorityColor(task.priority)} 
                />
                <Text style={[styles.metaText, { color: getPriorityColor(task.priority) }]}>
                  Priority {task.priority}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <MaterialCommunityIcons 
                  name={getCategoryIcon(task.category)} 
                  size={20} 
                  color={theme.colors.primary}
                />
                <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                  {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={20} 
                  color={dueStatus.color} 
                />
                <Text style={[styles.metaText, { color: dueStatus.color }]}>
                  {dueStatus.label}
                </Text>
              </View>

              {task.work_date && (
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons 
                    name="calendar-clock" 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                    Scheduled: {formatDistanceToNow(new Date(task.work_date), { addSuffix: true })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.progressSection}>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>Progress</Text>
              <ProgressBar
                progress={task.status === 'completed' ? 1 : 0.5}
                color={getStatusColor(task.status)}
                style={styles.progressBar}
              />
              <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                {task.status === 'completed' 
                  ? `Completed ${formatDistanceToNow(new Date(task.completed_at || Date.now()), { addSuffix: true })}` 
                  : 'In progress'}
              </Text>
            </View>
          </View>
        </ScrollView>

        <Surface style={[styles.actionsWrapper, themedStyles.actionsWrapper]} elevation={2}>
          <View style={styles.actions}>
            <Button
              mode="contained"
              icon="brain"
              style={[styles.actionButton, styles.studyPlanButtonContainer]}
              onPress={() => {
                if (task?.id) {
                  router.push({
                    pathname: `/tasks/${task.id}/study-plan`,
                    params: { id: task.id }
                  });
                }
              }}
            >
              Study Plan
            </Button>

            <Button
              mode="outlined"
              icon="trash-can-outline"
              textColor={theme.colors.error}
              disabled={deleting}
              style={[styles.actionButton, styles.deleteButtonContainer, themedStyles.deleteButton]}
              onPress={() => setShowDeleteModal(true)}
            >
              Delete
            </Button>
          </View>
        </Surface>

        <Portal>
          <Modal
            visible={showDeleteModal}
            onDismiss={() => setShowDeleteModal(false)}
            contentContainerStyle={{
              backgroundColor: theme.colors.surface,
              padding: 20,
              margin: 20,
              borderRadius: 8,
            }}
          >
            <View>
              <Text variant="titleLarge" style={{ marginBottom: 16 }}>Delete Task</Text>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
                Are you sure you want to delete this task?
              </Text>
              {task?.is_canvas_task && (
                <Text style={{ marginBottom: 16, color: theme.colors.error }}>
                  This will also delete the associated study plan.
                </Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Button 
                  mode="outlined"
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained"
                  onPress={handleDelete}
                  loading={deleting}
                  buttonColor={theme.colors.error}
                  textColor="white"
                >
                  Delete
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      </Animated.View>
    </View>
  );
}