import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, useTheme, Card, IconButton, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../../../src/lib/supabase';
import type { Task } from '../../../../src/types';
import type { AppTheme } from '../../../../src/theme';
import { TaskCard } from '../../../../src/components/TaskCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInDown, 
  FadeOutUp,
  SlideInRight, 
  Layout 
} from 'react-native-reanimated';

export default function DashboardScreen() {
    const router = useRouter();
    const theme = useTheme<AppTheme>();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueTasks, setDueTasks] = useState<Task[]>([]);
    const [workTasks, setWorkTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [markedDates, setMarkedDates] = useState({});
    const [taskStudyPlans, setTaskStudyPlans] = useState<Set<string>>(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);
  
    useEffect(() => {
      const loadData = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchTasks(), fetchStudyPlans()]);
        setIsRefreshing(false);
      };
  
      loadData();

      // Set up real-time subscription for task updates
      const subscription = supabase
        .channel('task_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          async (payload) => {
            console.log('Task change received:', payload);
            // Refresh tasks when any task is updated/deleted/inserted
            await fetchTasks();
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }, [selectedDate]);
  
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
  
        // Fetch all tasks to mark calendar
        const { data: allTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
  
        if (fetchError) throw fetchError;
  
        // Create marked dates object for calendar
        const marked = {};
        allTasks?.forEach(task => {
          // Just take the date part for calendar markers
          const dueDate = task.due_date.split('T')[0];
          const workDate = task.work_date ? task.work_date.split('T')[0] : null;
          
          if (dueDate) {
            marked[dueDate] = {
              ...marked[dueDate],
              marked: true,
              dots: [
                ...(marked[dueDate]?.dots || []),
                { color: theme.colors.error, key: `due-${task.id}` }
              ]
            };
          }
  
          if (workDate) {
            marked[workDate] = {
              ...marked[workDate],
              marked: true,
              dots: [
                ...(marked[workDate]?.dots || []),
                { color: theme.colors.primary, key: `work-${task.id}` }
              ]
            };
          }
        });
        setMarkedDates(marked);
  
        // For selected date queries, use the date part only
        const startDate = `${selectedDate}T00:00:00`;
        const endDate = `${selectedDate}T23:59:59`;
  
        // Fetch tasks due on selected date
        const { data: dueToday, error: dueError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .gte('due_date', startDate)
          .lte('due_date', endDate)
          .order('due_date', { ascending: true });
  
        if (dueError) throw dueError;
        setDueTasks(dueToday || []);
  
        // Fetch tasks to work on selected date
        const { data: workToday, error: workError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .order('work_date', { ascending: true });
  
        if (workError) throw workError;
        setWorkTasks(workToday || []);
  
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };
  
    const fetchStudyPlans = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
  
        // Get all study plans and join with tasks to filter by user
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
  
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
  
    const renderTask = (task: Task) => (
      <TaskCard
        key={task.id}
        task={task}
        theme={theme}
        onPress={() => router.push(`/tasks/${task.id}`)}
        onToggleStatus={() => toggleTaskStatus(task)}
        showWorkDate={true}
        hasStudyPlan={taskStudyPlans.has(task.id)}
      />
    );
  
    const toggleTaskStatus = async (task: Task) => {
      try {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', task.id);
  
        if (updateError) throw updateError;
        await fetchTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task');
      }
    };
  
    const handleDayPress = (day) => {
      setSelectedDate(day.dateString);
    };
  
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      header: {
        padding: 16,
        paddingTop: 48,
        backgroundColor: theme.colors.primary,
      },
      headerTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
      },
      headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
      },
      calendarContainer: {
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
      },
      statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        elevation: 2,
      },
      statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
      },
      sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
      },
      taskList: {
        paddingHorizontal: 16,
        paddingBottom: 24,
      },
      emptyContainer: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        margin: 16,
        borderRadius: 12,
        opacity: 0.8,
      },
      emptyIcon: {
        marginBottom: 12,
        opacity: 0.7,
      },
      emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        lineHeight: 20,
      },
      addButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: theme.colors.primary,
        borderRadius: 28,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
      },
    });
  
    return (
      <View style={styles.container}>
        <ScrollView>
          <Animated.View 
            entering={FadeInDown.delay(200)}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>
              Task Dashboard
            </Text>
            <Text style={styles.headerSubtitle}>
              {new Date(selectedDate).toLocaleDateString(undefined, { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </Animated.View>
  
          <View style={styles.statsContainer}>
            <Animated.View 
              entering={SlideInRight.delay(400)}
              style={styles.statCard}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {dueTasks.length}
              </Text>
              <Text style={styles.statLabel}>Due Today</Text>
            </Animated.View>
            
            <Animated.View 
              entering={SlideInRight.delay(600)}
              style={styles.statCard}
            >
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                {workTasks.length}
              </Text>
              <Text style={styles.statLabel}>To Work On</Text>
            </Animated.View>
          </View>
  
          <Animated.View 
            entering={FadeInDown.delay(800)}
            style={styles.calendarContainer}
          >
            <Calendar
              onDayPress={handleDayPress}
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  ...markedDates[selectedDate],
                  selected: true,
                  selectedColor: theme.colors.primary,
                }
              }}
              markingType="multi-dot"
              theme={{
                calendarBackground: theme.colors.surface,
                selectedDayBackgroundColor: theme.colors.primary,
                todayTextColor: theme.colors.primary,
                arrowColor: theme.colors.primary,
                dotColor: theme.colors.primary,
                selectedDotColor: '#ffffff',
                monthTextColor: theme.colors.primary,
                textMonthFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 16,
              }}
            />
          </Animated.View>
  
          {isRefreshing ? (
            <ActivityIndicator 
              size="large" 
              color={theme.colors.primary} 
              style={{ padding: 32 }}
            />
          ) : (
            <>
              <Animated.View 
                entering={FadeInDown.delay(1000)}
                layout={Layout.springify()}
              >
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                    Due Today
                  </Text>
                </View>
                
                <View style={styles.taskList}>
                  {dueTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons 
                        name="calendar-check"
                        size={32}
                        color={theme.colors.textSecondary}
                        style={styles.emptyIcon}
                      />
                      <Text style={styles.emptyText}>
                        No tasks due today.{'\n'}You're all caught up!
                      </Text>
                    </View>
                  ) : (
                    dueTasks.map((task, index) => (
                      <Animated.View
                        key={task.id}
                        entering={FadeInDown.delay(index * 100 + 1200)}
                      >
                        <TaskCard
                          task={task}
                          theme={theme}
                          onPress={() => router.push(`/tasks/${task.id}`)}
                          onToggleStatus={() => toggleTaskStatus(task)}
                          showWorkDate={true}
                          hasStudyPlan={taskStudyPlans.has(task.id)}
                        />
                      </Animated.View>
                    ))
                  )}
                </View>
              </Animated.View>
  
              <Animated.View 
                entering={FadeInDown.delay(1400)}
                layout={Layout.springify()}
              >
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                    Work Schedule
                  </Text>
                </View>
                
                <View style={styles.taskList}>
                  {workTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons 
                        name="book-check"
                        size={32}
                        color={theme.colors.textSecondary}
                        style={styles.emptyIcon}
                      />
                      <Text style={styles.emptyText}>
                        No work scheduled for today.{'\n'}Time to plan ahead!
                      </Text>
                    </View>
                  ) : (
                    workTasks.map((task, index) => (
                      <Animated.View
                        key={task.id}
                        entering={FadeInDown.delay(index * 100 + 1600)}
                      >
                        <TaskCard
                          task={task}
                          theme={theme}
                          onPress={() => router.push(`/tasks/${task.id}`)}
                          onToggleStatus={() => toggleTaskStatus(task)}
                          showWorkDate={true}
                          hasStudyPlan={taskStudyPlans.has(task.id)}
                        />
                      </Animated.View>
                    ))
                  )}
                </View>
              </Animated.View>
            </>
          )}
        </ScrollView>
  
        <Animated.View 
          entering={FadeInDown.delay(1800)}
          style={styles.addButton}
        >
          <IconButton
            icon="plus"
            iconColor="white"
            size={24}
            onPress={() => router.push('/tasks/new')}
          />
        </Animated.View>
      </View>
    );
  }