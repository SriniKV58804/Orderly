import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, useTheme, Card, IconButton, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import type { Task } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';

export default function TasksScreen() {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <Card
      style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => router.push(`/tasks/${item.id}`)}
    >
      <Card.Title
        title={item.title}
        subtitle={`Due: ${new Date(item.due_date).toLocaleDateString()}`}
        right={(props) => (
          <IconButton
            {...props}
            icon={item.status === 'completed' ? 'check-circle' : 'circle-outline'}
            onPress={() => toggleTaskStatus(item)}
          />
        )}
      />
      <Card.Content>
        <Text style={{ color: theme.colors.textSecondary }}>
          {item.description?.slice(0, 100)}
          {item.description && item.description.length > 100 ? '...' : ''}
        </Text>
        <View style={styles.taskMeta}>
          <Button
            mode="text"
            compact
            icon="flag"
            textColor={getPriorityColor(item.priority, theme)}
          >
            Priority {item.priority}
          </Button>
          <Button
            mode="text"
            compact
            icon="folder"
            textColor={theme.colors.textSecondary}
          >
            {item.category}
          </Button>
        </View>
      </Card.Content>
    </Card>
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

  const getPriorityColor = (priority: number, theme: any) => {
    switch (priority) {
      case 5: return theme.colors.error;
      case 4: return '#FF9800';
      case 3: return theme.colors.primary;
      case 2: return theme.colors.secondary;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading && (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No tasks yet. Tap + to add one!
            </Text>
          )
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/tasks/new')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  taskCard: {
    marginBottom: 12,
    elevation: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
  },
  error: {
    padding: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 