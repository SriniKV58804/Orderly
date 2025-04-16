import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, FAB, useTheme, Surface, IconButton, SegmentedButtons, Portal, Dialog, Button, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Task } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';
import { TaskCard } from '../../../src/components/TaskCard';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

type ViewMode = 'all' | 'active' | 'completed';
type SortMode = 'due_date' | 'priority' | 'created';

interface Course {
  id: string;
  name: string;
}

interface GroupedTasks {
  [courseId: string]: {
    courseName: string;
    tasks: Task[];
  };
}

export default function TasksScreen() {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('due_date');
  const [taskStudyPlans, setTaskStudyPlans] = useState<Set<string>>(new Set());
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  const window = Dimensions.get('window');

  useEffect(() => {
    fetchCourses();
    fetchTasks();
    fetchStudyPlans();
  }, [viewMode, sortMode]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters based on view mode
      if (viewMode === 'active') {
        query = query.neq('status', 'completed');
      } else if (viewMode === 'completed') {
        query = query.eq('status', 'completed');
      }

      // Apply sorting
      switch (sortMode) {
        case 'due_date':
          query = query.order('due_date', { ascending: true });
          break;
        case 'priority':
          query = query.order('priority', { ascending: false });
          break;
        case 'created':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStudyPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Join with tasks to get study plans for user's tasks
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          study_plans!inner (
            task_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Extract task IDs that have study plans
      const taskIds = data?.map(task => task.id) || [];
      setTaskStudyPlans(new Set(taskIds));
    } catch (err) {
      console.error('Error fetching study plans:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (updateError) throw updateError;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const active = total - completed;
    return { total, completed, active };
  };

  const stats = getTaskStats();

  const groupTasksByCourse = (tasks: Task[]): GroupedTasks => {
    const grouped: GroupedTasks = {
      uncategorized: {
        courseName: 'Other Tasks',
        tasks: [],
      },
    };

    tasks.forEach(task => {
      if (!task.course_id || !task.course) {
        grouped.uncategorized.tasks.push(task);
      } else {
        const courseId = task.course_id.toString();
        if (!grouped[courseId]) {
          grouped[courseId] = {
            courseName: task.course,
            tasks: [],
          };
        }
        grouped[courseId].tasks.push(task);
      }
    });

    // Sort tasks within each group
    Object.values(grouped).forEach(group => {
      group.tasks.sort((a, b) => {
        switch (sortMode) {
          case 'due_date':
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          case 'priority':
            return b.priority - a.priority;
          case 'created':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          default:
            return 0;
        }
      });
    });

    return grouped;
  };

  const themedStyles = {
    courseContainer: {
      marginBottom: 24,
      borderRadius: 16,
    },
    courseSection: {
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    courseTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceVariant,
    },
    courseTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 12,
      flex: 1,
      color: theme.colors.onSurface,
    },
    taskCount: {
      fontSize: 14,
      opacity: 0.7,
      color: theme.colors.onSurfaceVariant,
    },
    taskList: {
      padding: 16,
      paddingTop: 8,
      backgroundColor: theme.colors.surface,
    },
  } as const;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      padding: 16,
      paddingTop: 24,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      elevation: 2,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      opacity: 0.7,
    },
    viewModeButtons: {
      marginBottom: 8,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyState: {
      padding: 32,
      borderRadius: 16,
      alignItems: 'center',
      elevation: 2,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptyText: {
      textAlign: 'center',
      opacity: 0.7,
      lineHeight: 20,
    },
    fabContainer: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      gap: 16,
    },
    fab: {
      elevation: 4,
    },
    importFab: {
      backgroundColor: theme.colors.secondary,
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View 
        entering={FadeInDown.duration(500)}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <IconButton
            icon="sort-variant"
            size={24}
            onPress={() => setShowSortDialog(true)}
          />
        </View>

        <View style={styles.statsContainer}>
          <Surface style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.active}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {stats.total}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </Surface>
        </View>

        <SegmentedButtons
          value={viewMode}
          onValueChange={value => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
          style={styles.viewModeButtons}
        />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTasks();
            }}
            colors={[theme.colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons
              name="loading"
              size={32}
              color={theme.colors.primary}
            />
          </View>
        ) : tasks.length === 0 ? (
          <Surface style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={48}
              color={theme.colors.primary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'completed'
                ? "You haven't completed any tasks yet."
                : viewMode === 'active'
                ? "You don't have any active tasks."
                : "Tap the + button to create your first task!"}
            </Text>
          </Surface>
        ) : (
          Object.entries(groupTasksByCourse(tasks)).map(([courseId, { courseName, tasks: courseTasks }]) => (
            courseTasks.length > 0 && (
              <Animated.View
                key={courseId}
                entering={FadeInDown}
                layout={Layout.springify()}
                style={themedStyles.courseContainer}
              >
                <Surface style={themedStyles.courseSection} elevation={2}>
                  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <View style={themedStyles.courseTitleContainer}>
                      <MaterialCommunityIcons
                        name="book-outline"
                        size={24}
                        color={theme.colors.primary}
                      />
                      <Text style={themedStyles.courseTitle}>{courseName}</Text>
                      <Text style={themedStyles.taskCount}>
                        {courseTasks.length} task{courseTasks.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    <View style={themedStyles.taskList}>
                      {courseTasks.map((task, index) => (
                        <Animated.View
                          key={task.id}
                          entering={FadeInDown.delay(index * 100)}
                          layout={Layout.springify()}
                        >
                          <TaskCard
                            task={task}
                            theme={theme}
                            onPress={() => router.push(`/tasks/${task.id}`)}
                            onToggleStatus={() => handleToggleStatus(task)}
                            showWorkDate={true}
                            hasStudyPlan={taskStudyPlans.has(task.id)}
                          />
                        </Animated.View>
                      ))}
                    </View>
                  </View>
                </Surface>
              </Animated.View>
            )
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={showSortDialog}
          onDismiss={() => setShowSortDialog(false)}
        >
          <Dialog.Title>Sort Tasks</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={sortMode}
              onValueChange={value => {
                setSortMode(value as SortMode);
                setShowSortDialog(false);
              }}
              buttons={[
                { 
                  value: 'due_date', 
                  label: 'Due Date',
                  icon: 'calendar'
                },
                { 
                  value: 'priority', 
                  label: 'Priority',
                  icon: 'flag'
                },
                { 
                  value: 'created', 
                  label: 'Created',
                  icon: 'clock'
                },
              ]}
            />
          </Dialog.Content>
        </Dialog>
      </Portal>

      <View style={styles.fabContainer}>
        <FAB
          icon="cloud-download"
          label="Import Canvas"
          style={[styles.fab, styles.importFab, { backgroundColor: theme.colors.secondary }]}
          onPress={() => router.push('/canvas/sync')}
        />
        <FAB
          icon="plus"
          label="New Task"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/tasks/new')}
        />
      </View>
    </View>
  );
}