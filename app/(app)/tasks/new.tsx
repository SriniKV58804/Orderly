import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { TaskForm } from '../../../src/components/TaskForm';
import type { TaskFormData } from '../../../src/types';

export default function NewTaskScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: TaskFormData) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure we have a valid date
      const due_date = values.due_date instanceof Date ? 
        values.due_date : 
        new Date();

      // Create task, omitting course_id if it doesn't exist
      const taskData = {
        user_id: user.id,
        title: values.title,
        description: values.description || '',
        category: values.category,
        due_date: due_date.toISOString(),
        work_date: values.work_date?.toISOString() || null,
        status: 'pending',
        priority: values.priority,
        course: values.course || null,
        ...(values.course_id ? { course_id: values.course_id } : {}),
        is_canvas_task: false
      };

      const { error: createError } = await supabase
        .from('tasks')
        .insert(taskData);

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