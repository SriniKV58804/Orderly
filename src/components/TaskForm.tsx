import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { TextInput, useTheme, Button, Text, Surface, IconButton, Portal, Dialog, Menu } from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppTheme } from '../theme';
import { supabase } from '../lib/supabase';

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

export function TaskForm({ onSubmit, initialValues, onClose }: TaskFormProps) {
  const theme = useTheme<AppTheme>();
  const [categories, setCategories] = useState<string[]>([]);
  const [values, setValues] = useState<FormValues>(() => {
    let dueDate: Date;
    try {
      dueDate = initialValues?.due_date ? 
        new Date(initialValues.due_date) : 
        new Date();
    } catch (e) {
      dueDate = new Date();
    }

    let workDate: Date | null = null;
    try {
      workDate = initialValues?.work_date ? 
        new Date(initialValues.work_date) : 
        null;
    } catch (e) {
      workDate = null;
    }

    return {
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      category: initialValues?.category || '',
      course: initialValues?.course || '',
      priority: initialValues?.priority || 3,
      due_date: dueDate,
      work_date: workDate,
    };
  });
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
    fetchUserCategories();
    fetchUserCourses();
  }, []);

  const fetchUserCategories = async () => {
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
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchUserCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('Fetching courses for user:', user.id);

      // Fetch both regular and Canvas courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          is_canvas_course,
          canvas_course_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Show newest first

      if (coursesError) {
        console.error('Course fetch error:', coursesError);
        throw coursesError;
      }

      console.log('Fetched courses:', coursesData);

      if (!coursesData) {
        console.log('No courses found');
        setCourses([]);
        return;
      }

      // Process courses with proper icons and names
      const processedCourses = coursesData.map(course => ({
        id: course.id,
        name: course.is_canvas_course ? `${course.name} (Canvas)` : course.name,
        is_canvas_course: course.is_canvas_course,
        canvas_course_id: course.canvas_course_id
      }));

      console.log('Processed courses:', processedCourses);
      setCourses(processedCourses);

      // If editing, select the current course
      if (initialValues?.course_id) {
        setSelectedCourse(initialValues.course_id);
        const selectedCourse = processedCourses.find(c => c.id === initialValues.course_id);
        if (selectedCourse) {
          setValues(prev => ({
            ...prev,
            course: selectedCourse.name
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      Alert.alert('Error', 'Failed to fetch courses. Please try again.');
    }
  };

  const handleSubmit = () => {
    console.log('Current values:', values);
    console.log('Due date type:', typeof values.due_date);
    console.log('Due date value:', values.due_date);

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
      // Force create a new Date object
      const now = new Date();
      let submissionDueDate = values.due_date ? new Date(values.due_date) : now;
      
      if (!(submissionDueDate instanceof Date) || isNaN(submissionDueDate.getTime())) {
        console.error('Invalid due date, using current date');
        submissionDueDate = now;
      }

      const formattedTask = {
        title: values.title,
        description: values.description,
        category: values.category,
        course: values.course,
        priority: values.priority,
        course_id: selectedCourse,
        due_date: submissionDueDate.toISOString(),
        work_date: values.work_date ? new Date(values.work_date).toISOString() : null,
      };

      console.log('Submitting task:', formattedTask);
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
                      course: course.name,
                      course_id: course.id
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

          {selectedCourse && (
            <View style={styles.categorySelection}>
              <Text style={styles.sectionTitle}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
              >
                {categories.map(category => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setValues({ ...values, category })}
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
              </ScrollView>
            </View>
          )}

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
      </Portal>

      <DateTimePickerModal
        isVisible={showDueDatePicker}
        mode="datetime"
        onConfirm={(date: Date) => {
          console.log('Date picker value:', date);
          const newDate = new Date(date);
          console.log('New date object:', newDate);
          
          if (newDate instanceof Date && !isNaN(newDate.getTime())) {
            setValues(prev => ({
              ...prev,
              due_date: newDate
            }));
            console.log('Updated values:', values);
          } else {
            console.error('Invalid date from picker');
            setValues(prev => ({
              ...prev,
              due_date: new Date()
            }));
          }
          setShowDueDatePicker(false);
        }}
        onCancel={() => setShowDueDatePicker(false)}
        date={new Date()}
      />

      <DateTimePickerModal
        isVisible={showWorkDatePicker}
        mode="datetime"
        onConfirm={(date) => {
          setValues({ ...values, work_date: date });
          setShowWorkDatePicker(false);
        }}
        onCancel={() => setShowWorkDatePicker(false)}
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
    marginBottom: 8,
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  courseChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
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
  }
});

// Helper functions
const getPriorityColor = (priority: number, theme: AppTheme) => {
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
      return theme.colors.surfaceVariant;
  }
};

const getCategoryIcon = (category: string): "book-open-variant" | "pencil" | "folder" | "file-document" | "book" | "clipboard-text" | "book-open-page-variant" | "magnify" | "checkbox-marked-circle-outline" => {
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
