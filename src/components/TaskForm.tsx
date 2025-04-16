import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { TextInput, useTheme, Button, Text, Surface, IconButton, Portal, Dialog, Menu } from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppTheme } from '../theme';
import { supabase } from '../lib/supabase';
import { CanvasService } from '../services/canvas';

interface TaskFormProps {
  onSubmit: (task: any) => void;
  initialValues?: any;
  onClose?: () => void;
}

interface Course {
  id: string;
  name: string;
  is_canvas_course?: boolean;
}

interface Category {
  id: string;
  name: string;
  is_canvas_category?: boolean;
}

interface FormValues {
  title: string;
  description: string;
  category: string;
  course: string;
  priority: number;
  due_date: Date;
  work_date: Date | null;
}

export const PRESET_CATEGORIES = [
  'Homework',
  'Quiz',
  'Exam',
  'Project',
  'Lab',
  'Discussion',
  'Reading',
  'Paper',
  'Presentation',
  'Study',
  'Other'
] as const;


export function TaskForm({ onSubmit, initialValues, onClose }: TaskFormProps) {
  const theme = useTheme<AppTheme>();
  const [categories] = useState<string[]>(PRESET_CATEGORIES);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [canvasService, setCanvasService] = useState<CanvasService | null>(null);
  const [values, setValues] = useState<FormValues>(() => ({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    category: initialValues?.category || '',
    course: initialValues?.course || '',
    priority: initialValues?.priority || 3,
    due_date: initialValues?.due_date ? new Date(initialValues.due_date) : new Date(),
    work_date: initialValues?.work_date ? new Date(initialValues.work_date) : null,
  }));
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showWorkDatePicker, setShowWorkDatePicker] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(initialValues?.course_id || null);
  const [scrollY] = useState(new Animated.Value(0));
  const [errors, setErrors] = useState<{
    title?: string;
    due_date?: string;
    category?: string;
  }>({});
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseMenuVisible, setCourseMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  // Header shadow animation
  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 0.9],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchUserCustomCategories();
    initializeCanvasAndFetchCourses();
  }, []);

  const fetchUserCustomCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('categories')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data?.categories) {
        setCustomCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching custom categories:', err);
    }
  };

  const initializeCanvasAndFetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('canvas_domain, canvas_token')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.canvas_domain || !userData?.canvas_token) {
        return;
      }

      const service = new CanvasService(userData.canvas_domain, userData.canvas_token);
      setCanvasService(service);

      const canvasCourses = await service.getCourses();
      setCourses(canvasCourses.map(course => ({
        id: course.id.toString(),
        name: course.name,
        is_canvas_course: true
      })));
    } catch (err) {
      console.error('Error fetching Canvas courses:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedCategories = [...customCategories, newCategory.trim()];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ categories: updatedCategories })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setCustomCategories(updatedCategories);
      setNewCategory('');
      setShowAddCategory(false);
      
      // Set the new category as selected
      setValues(prev => ({ ...prev, category: newCategory.trim() }));
    } catch (err) {
      console.error('Error adding category:', err);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleSubmit = () => {
    // Reset errors
    setErrors({});
    
    // Validate required fields
    const newErrors: typeof errors = {};
    
    if (!values.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!values.category) {
      newErrors.category = 'Category is required';
    }

    // If there are errors, show validation dialog
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowValidationDialog(true);
      return;
    }

    try {
      // Get the selected course
      const selectedCourseObj = courses.find(c => c.id === selectedCourse);
      
      const formattedTask = {
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        course: selectedCourseObj?.name || null,
        // Only set course_id if it's a Canvas course
        course_id: selectedCourseObj?.is_canvas_course ? selectedCourseObj.id : null,
        priority: values.priority,
        due_date: values.due_date.toISOString(),
        work_date: values.work_date ? new Date(values.work_date).toISOString() : null,
      };

      onSubmit(formattedTask);
    } catch (err) {
      console.error('Error formatting task:', err);
      Alert.alert('Error', 'Failed to create task. Please check your inputs and try again.');
    }
  };

  const renderPrioritySelector = () => {
    const priorities = [1, 2, 3, 4, 5];
    
    return (
      <View style={styles.priorityContainer}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Priority</Text>
        <View style={styles.priorityButtons}>
          {priorities.map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setValues({ ...values, priority: level })}
              style={[
                styles.priorityButton,
                {
                  backgroundColor: values.priority === level ? 
                    getPriorityColor(level, theme) : 
                    theme.colors.surfaceVariant,
                }
              ]}
            >
              <Text style={[
                styles.priorityText,
                { color: values.priority === level ? 'white' : theme.colors.textSecondary }
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderCategorySelection = () => (
    <View style={styles.categorySelection}>
      <Text style={styles.sectionTitle}>Category</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {[...PRESET_CATEGORIES, ...customCategories].map(category => (
          <TouchableOpacity
            key={category}
            onPress={() => setValues(prev => ({ ...prev, category }))}
            style={[
              styles.categoryChip,
              {
                backgroundColor: values.category === category ? 
                  theme.colors.primaryContainer : 
                  theme.colors.surfaceVariant
              }
            ]}
          >
            <MaterialCommunityIcons
              name={getCategoryIcon(category)}
              size={18}
              color={values.category === category ? 
                theme.colors.onPrimaryContainer : 
                theme.colors.onSurfaceVariant
              }
            />
            <Text style={[
              styles.categoryChipText,
              {
                color: values.category === category ? 
                  theme.colors.onPrimaryContainer : 
                  theme.colors.onSurfaceVariant
              }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowAddCategory(true)}
          style={[styles.categoryChip, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.categoryChipText, { color: theme.colors.onSurfaceVariant }]}>
            Add New
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          shadowOpacity: headerShadowOpacity,
        }
      ]}>
        <IconButton
          icon="close"
          size={24}
          onPress={onClose}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {initialValues ? 'Edit Task' : 'New Task'}
        </Text>
        <IconButton
          icon="check"
          size={24}
          onPress={handleSubmit}
        />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Surface style={styles.formCard}>
          <TextInput
            label="Title"
            value={values.title}
            onChangeText={(text) => {
              setValues({ ...values, title: text });
              if (errors.title) {
                setErrors({ ...errors, title: undefined });
              }
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.title}
            placeholder="Enter task title"
          />

          {renderPrioritySelector()}

          <View style={styles.courseSelection}>
            <Text style={styles.sectionTitle}>Course</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {courses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  onPress={() => {
                    setSelectedCourse(course.id);
                    setValues(prev => ({
                      ...prev,
                      course: course.name
                    }));
                  }}
                  style={[
                    styles.courseChip,
                    {
                      backgroundColor: selectedCourse === course.id ? 
                        theme.colors.primaryContainer : 
                        theme.colors.surfaceVariant
                    }
                  ]}
                >
                  <MaterialCommunityIcons
                    name={course.is_canvas_course ? 'school' : 'book'}
                    size={18}
                    color={selectedCourse === course.id ? 
                      theme.colors.onPrimaryContainer : 
                      theme.colors.onSurfaceVariant
                    }
                  />
                  <Text style={[
                    styles.courseChipText,
                    {
                      color: selectedCourse === course.id ? 
                        theme.colors.onPrimaryContainer : 
                        theme.colors.onSurfaceVariant
                    }
                  ]}>
                    {course.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {renderCategorySelection()}

          <TextInput
            label="Description"
            value={values.description}
            onChangeText={(text) => setValues({ ...values, description: text })}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <View style={styles.dateSection}>
            <TouchableOpacity 
              onPress={() => setShowDueDatePicker(true)}
              style={styles.dateButton}
            >
              <MaterialCommunityIcons 
                name="calendar" 
                size={24} 
                color={theme.colors.primary}
              />
              <Text style={styles.dateText}>
                Due Date: {values.due_date?.toLocaleDateString() || 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateSection}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Work Date (Optional)</Text>
            <TouchableOpacity 
              onPress={() => setShowWorkDatePicker(true)}
              style={[styles.dateButton, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color={theme.colors.secondary}
              />
              {values.work_date ? (
                <>
                  <Text style={[styles.dateText, { color: theme.colors.textPrimary }]}>
                    {values.work_date.toLocaleDateString()}
                  </Text>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={theme.colors.secondary}
                  />
                  <Text style={[styles.dateText, { color: theme.colors.textPrimary }]}>
                    {values.work_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </>
              ) : (
                <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                  Set work date
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Surface>
      </Animated.ScrollView>

      <Portal>
        <Dialog
          visible={showValidationDialog}
          onDismiss={() => setShowValidationDialog(false)}
        >
          <Dialog.Title>Required Fields Missing</Dialog.Title>
          <Dialog.Content>
            {Object.entries(errors).map(([field, message]) => (
              <Text 
                key={field}
                style={{ color: theme.colors.error, marginBottom: 8 }}
              >
                • {message}
              </Text>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowValidationDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showAddCategory}
          onDismiss={() => setShowAddCategory(false)}
        >
          <Dialog.Title>Add New Category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={newCategory}
              onChangeText={setNewCategory}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddCategory(false)}>Cancel</Button>
            <Button onPress={handleAddCategory}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <DateTimePickerModal
        isVisible={showDueDatePicker}
        mode="datetime"
        onConfirm={(date) => {
          setValues(prev => ({
            ...prev,
            due_date: new Date(date)
          }));
          setShowDueDatePicker(false);
        }}
        onCancel={() => setShowDueDatePicker(false)}
        date={values.due_date || new Date()}
      />

      <DateTimePickerModal
        isVisible={showWorkDatePicker}
        mode="datetime"
        onConfirm={(date) => {
          setValues(prev => ({
            ...prev,
            work_date: new Date(date)
          }));
          setShowWorkDatePicker(false);
        }}
        onCancel={() => setShowWorkDatePicker(false)}
        date={values.work_date || new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  headerTitle: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  priorityContainer: {
    marginBottom: 16,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  courseSelection: {
    marginBottom: 16,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
    paddingVertical: 4,
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
    elevation: 2,
  },
  courseChipText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 4,
    elevation: 2,
  },
  categoryChipText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dateSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdownButton: {
    width: '100%',
    marginTop: 4,
  },
  categorySelection: {
    marginBottom: 16,
    paddingVertical: 8,
  },
});

// Helper functions
const getPriorityColor = (priority: number, theme: AppTheme) => {
  switch (priority) {
    case 1: // High
      return '#FF4B4B'; // Vibrant red
    case 2:
      return '#FFA726'; // Bright orange
    case 3:
      return '#66BB6A'; // Fresh green
    case 4:
      return '#42A5F5'; // Bright blue
    default: // Low
      return '#9E9E9E'; // Neutral grey
  }
};

const getCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'homework':
      return 'book-open-variant';
    case 'quiz':
      return 'pencil';
    case 'exam':
      return 'file-document';
    case 'project':
      return 'folder';
    case 'lab':
      return 'flask';
    case 'discussion':
      return 'message-text';
    case 'reading':
      return 'book-open-page-variant';
    case 'paper':
      return 'file-document-edit';
    case 'presentation':
      return 'presentation';
    case 'study':
      return 'book';
    case 'other':
      return 'dots-horizontal';
    default:
      return 'checkbox-marked-circle-outline';
  }
};
