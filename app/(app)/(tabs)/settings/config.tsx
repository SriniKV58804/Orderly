import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Chip, useTheme, Portal, Dialog, Divider } from 'react-native-paper';
import { supabase } from '../../../../src/lib/supabase';
import type { AppTheme } from '../../../../src/theme';

interface Course {
  id: string;
  name: string;
  categories: string[];
}

export default function ConfigScreen() {
  const theme = useTheme<AppTheme>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [canvasDomain, setCanvasDomain] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch Canvas settings
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('canvas_domain, canvas_token')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setCanvasDomain(userData.canvas_domain || '');
      setCanvasToken(userData.canvas_token || '');

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCanvas = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          canvas_domain: canvasDomain,
          canvas_token: canvasToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      setSuccess('Canvas settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Canvas settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    try {
      if (!newCourse.trim()) return;
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          name: newCourse.trim(),
          categories: []
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setCourses([...courses, data]);
      setNewCourse('');
      setSuccess('Course added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add course');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!selectedCourse || !newCategory.trim()) return;
      setLoading(true);
      setError(null);

      const updatedCategories = [...(selectedCourse.categories || []), newCategory.trim()];
      
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          categories: updatedCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCourse.id);

      if (updateError) throw updateError;

      setCourses(courses.map(course => 
        course.id === selectedCourse.id 
          ? { ...course, categories: updatedCategories }
          : course
      ));

      setNewCategory('');
      setShowAddCategoryDialog(false);
      setSuccess('Category added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async (courseId: string, categoryToRemove: string) => {
    try {
      setLoading(true);
      setError(null);

      const course = courses.find(c => c.id === courseId);
      if (!course) return;

      const updatedCategories = course.categories.filter(cat => cat !== categoryToRemove);

      const { error: updateError } = await supabase
        .from('courses')
        .update({
          categories: updatedCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (updateError) throw updateError;

      setCourses(courses.map(c => 
        c.id === courseId 
          ? { ...c, categories: updatedCategories }
          : c
      ));

      setSuccess('Category removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.section}>
        <Card.Title title="Canvas Integration" />
        <Card.Content>
          <TextInput
            label="Canvas Domain"
            value={canvasDomain}
            onChangeText={setCanvasDomain}
            mode="outlined"
            placeholder="e.g., canvas.university.edu"
            style={styles.input}
          />
          <TextInput
            label="Access Token"
            value={canvasToken}
            onChangeText={setCanvasToken}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleUpdateCanvas}
            loading={loading}
            style={styles.button}
          >
            Update Canvas Settings
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.section}>
        <Card.Title title="Courses & Categories" />
        <Card.Content>
          <View style={styles.addCourse}>
            <TextInput
              label="New Course Name"
              value={newCourse}
              onChangeText={setNewCourse}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
            <Button
              mode="contained"
              onPress={handleAddCourse}
              loading={loading}
              disabled={!newCourse.trim()}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>

          {courses.map(course => (
            <Card key={course.id} style={styles.courseCard}>
              <Card.Title title={course.name} />
              <Card.Content>
                <View style={styles.categoriesContainer}>
                  {course.categories.map(category => (
                    <Chip
                      key={category}
                      onClose={() => handleRemoveCategory(course.id, category)}
                      style={styles.chip}
                    >
                      {category}
                    </Chip>
                  ))}
                </View>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSelectedCourse(course);
                    setShowAddCategoryDialog(true);
                  }}
                  style={styles.addCategoryButton}
                >
                  Add Category
                </Button>
              </Card.Content>
            </Card>
          ))}
        </Card.Content>
      </Card>

      {error && (
        <Text style={[styles.message, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      {success && (
        <Text style={[styles.message, { color: theme.colors.success }]}>
          {success}
        </Text>
      )}

      <Portal>
        <Dialog
          visible={showAddCategoryDialog}
          onDismiss={() => setShowAddCategoryDialog(false)}
        >
          <Dialog.Title>Add Category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={newCategory}
              onChangeText={setNewCategory}
              mode="outlined"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddCategoryDialog(false)}>Cancel</Button>
            <Button
              onPress={handleAddCategory}
              disabled={!newCategory.trim()}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  addCourse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 8,
  },
  courseCard: {
    marginVertical: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  addCategoryButton: {
    marginTop: 8,
  },
  message: {
    textAlign: 'center',
    margin: 16,
  },
  dialogInput: {
    marginTop: 8,
  },
}); 