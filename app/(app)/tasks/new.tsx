import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { TaskForm } from '../../../src/components/TaskForm';

export default function NewTaskScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure we have valid dates
      const dueDate = values.due_date instanceof Date ? 
        values.due_date : 
        new Date(values.due_date || new Date());

      const workDate = values.work_date instanceof Date ? 
        values.work_date : 
        values.work_date ? new Date(values.work_date) : null;

      // Create the task with proper date formatting and course handling
      const { error: createError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: values.title,
          description: values.description,
          category: values.category,
          due_date: dueDate.toISOString(),
          work_date: workDate?.toISOString() || null,
          status: 'pending',
          priority: values.priority || 3,
          course_id: values.course_id || null,
          is_canvas_task: false // Set this for non-Canvas tasks
        });

      if (createError) throw createError;
      router.back();
    } catch (err) {
      console.error('Error creating task:', err);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TaskForm 
        onSubmit={handleSubmit} 
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 