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

      // Ensure due_date is a valid Date object
      const dueDate = new Date(values.due_date);
      if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
        throw new Error('Invalid due date');
      }

      // Create the task with proper date formatting and course handling
      const { error: createError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: values.title,
          description: values.description,
          category: values.category,
          course: values.course,
          course_id: values.course_id,
          due_date: dueDate.toISOString(), // Use the validated date
          work_date: values.work_date ? new Date(values.work_date).toISOString() : null,
          status: 'pending',
          priority: values.priority || 3,
          is_canvas_task: false
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