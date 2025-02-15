import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Text, Button, Card, Checkbox, useTheme, ActivityIndicator, Chip, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { CanvasService } from '../../../src/services/canvas';
import type { AppTheme } from '../../../src/theme';

export default function CanvasSyncScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mainContent: {
      flex: 1,
      paddingBottom: 100,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 8,
    },
    titleContainer: {
      flex: 1,
      marginRight: 16,
    },
    selectAllButton: {
      minWidth: 120,
    },
    error: {
      padding: 16,
      paddingTop: 0,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    courseList: {
      padding: 16,
      paddingTop: 0,
    },
    courseCard: {
      marginBottom: 16,
    },
    courseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    courseName: {
      flex: 1,
      marginLeft: 8,
    },
    courseContent: {
      marginTop: 16,
    },
    courseSelectAllButton: {
      marginBottom: 16,
    },
    assignmentsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
      gap: 8,
    },
    assignmentChip: {
      marginVertical: 4,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceVariant,
      backgroundColor: theme.colors.surface,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 1000,
    },
    importButton: {
      width: '100%',
      height: 48,
    },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 32,
      borderRadius: 32,
      zIndex: 1000,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [canvasService, setCanvasService] = useState<CanvasService | null>(null);
  const [assignmentGroups, setAssignmentGroups] = useState<Map<number, any>>(new Map());
  const [selectAllCourses, setSelectAllCourses] = useState(false);
  const [courseSelectAll, setCourseSelectAll] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    initializeCanvas();
  }, []);

  const initializeCanvas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('canvas_domain, canvas_token')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData.canvas_domain || !userData.canvas_token) {
        throw new Error('Canvas not configured');
      }

      const service = new CanvasService(userData.canvas_domain, userData.canvas_token);
      setCanvasService(service);
      
      const courses = await service.getCourses();
      setCourses(courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Canvas');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = async (courseId: number) => {
    try {
      if (!canvasService) return;
      setLoading(true);

      if (selectedCourses.has(courseId)) {
        selectedCourses.delete(courseId);
        setSelectedCourses(new Set(selectedCourses));
        setAssignments(assignments.filter(a => a.course_id !== courseId));
      } else {
        const [newAssignments, groups] = await Promise.all([
          canvasService.getAssignments(courseId),
          canvasService.getAssignmentGroups(courseId)
        ]);

        // Store assignment groups in the map
        groups.forEach(group => {
          assignmentGroups.set(group.id, group);
        });
        setAssignmentGroups(new Map(assignmentGroups));

        // Add new assignments to the list
        setAssignments([...assignments, ...newAssignments]);
        selectedCourses.add(courseId);
        setSelectedCourses(new Set(selectedCourses));
      }
    } catch (err) {
      console.error('Course selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch course assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllCourses = async () => {
    try {
      setLoading(true);
      const newValue = !selectAllCourses;
      setSelectAllCourses(newValue);

      if (newValue) {
        // Select all courses and fetch their assignments
        const allCourseIds = courses.map(c => c.id);
        
        // Fetch assignments for all courses in parallel
        const assignmentPromises = allCourseIds.map(async (courseId) => {
          if (!canvasService) return;
          
          const [newAssignments, groups] = await Promise.all([
            canvasService.getAssignments(courseId),
            canvasService.getAssignmentGroups(courseId)
          ]);

          // Store assignment groups
          groups.forEach(group => {
            assignmentGroups.set(group.id, group);
          });

          return newAssignments;
        });

        const allNewAssignments = (await Promise.all(assignmentPromises)).flat().filter(Boolean);
        
        // Update state
        setAssignmentGroups(new Map(assignmentGroups));
        setAssignments(allNewAssignments);
        setSelectedCourses(new Set(allCourseIds));
        setSelectedAssignments(new Set(allNewAssignments.map(a => a.id)));
        
        // Set all courses to selected
        const newCourseSelectAll = {};
        allCourseIds.forEach(id => {
          newCourseSelectAll[id] = true;
        });
        setCourseSelectAll(newCourseSelectAll);
      } else {
        // Deselect everything
        setSelectedCourses(new Set());
        setSelectedAssignments(new Set());
        setAssignments([]);
        setCourseSelectAll({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select all courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelectAll = async (courseId: number) => {
    const newValue = !courseSelectAll[courseId];
    setCourseSelectAll({ ...courseSelectAll, [courseId]: newValue });

    const courseAssignments = assignments.filter(a => a.course_id === courseId);
    const courseAssignmentIds = new Set(courseAssignments.map(a => a.id));

    if (newValue) {
      // Select all assignments for this course
      setSelectedAssignments(new Set([...selectedAssignments, ...courseAssignmentIds]));
    } else {
      // Deselect all assignments for this course
      const newSelected = new Set(selectedAssignments);
      courseAssignmentIds.forEach(id => newSelected.delete(id));
      setSelectedAssignments(newSelected);
    }
  };

  const cleanHtmlDescription = (html: string | null): string => {
    if (!html) return '';
    
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    
    // Replace HTML entities
    const withoutEntities = withoutTags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Remove extra whitespace
    return withoutEntities
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First delete any existing Canvas items for this user
      await Promise.all([
        supabase
          .from('courses')
          .delete()
          .eq('user_id', user.id)
          .eq('is_canvas_course', true),
        supabase
          .from('categories')
          .delete()
          .eq('user_id', user.id)
          .eq('is_canvas_category', true),
        supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id)
          .eq('is_canvas_task', true)
      ]);

      // Get selected assignments
      const assignmentsToImport = assignments.filter(a => selectedAssignments.has(a.id));
      
      // Get unique course IDs from selected assignments
      const selectedCourseIds = new Set(assignmentsToImport.map(a => a.course_id));
      
      // Create courses
      const coursesToCreate = courses
        .filter(course => selectedCourseIds.has(course.id))
        .map(course => ({
          user_id: user.id,
          name: course.name,
          canvas_course_id: course.id.toString(),
          is_canvas_course: true
        }));

      if (coursesToCreate.length === 0) {
        throw new Error('No courses selected');
      }

      // Insert courses
      const { data: syncedCourses, error: coursesError } = await supabase
        .from('courses')
        .insert(coursesToCreate)
        .select();

      if (coursesError) {
        console.error('Course creation error:', coursesError);
        throw new Error('Failed to create courses');
      }

      if (!syncedCourses || syncedCourses.length === 0) {
        throw new Error('No courses were created');
      }

      // Get assignment groups for selected assignments
      const selectedGroupIds = new Set(
        assignmentsToImport.map(a => {
          const group = Array.from(assignmentGroups.values())
            .find(g => g.assignments?.some(groupA => groupA.id === a.id));
          return group?.id;
        }).filter(Boolean)
      );

      let syncedCategories = [];
      
      // Only create categories if we have some
      if (selectedGroupIds.size > 0) {
        try {
          // First get existing categories for this user
          const { data: existingCategories } = await supabase
            .from('users')
            .select('categories')
            .eq('id', user.id)
            .single();

          const userCategories = new Set(existingCategories?.categories || []);
          
          // Get new category names from assignment groups
          const newCategories = Array.from(assignmentGroups.values())
            .filter(group => selectedGroupIds.has(group.id))
            .map(group => group.name || 'Uncategorized')
            .filter(name => !userCategories.has(name));

          if (newCategories.length > 0) {
            // Update user's categories array
            const updatedCategories = [...Array.from(userCategories), ...newCategories];
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ categories: updatedCategories })
              .eq('id', user.id);

            if (updateError) {
              console.error('Failed to update user categories:', updateError);
              throw updateError;
            }
          }

          // Now create the tasks with the category names
          const tasks = assignmentsToImport.map(assignment => {
            const course = syncedCourses.find(c => c.canvas_course_id === assignment.course_id.toString());
            if (!course) {
              console.error('No matching course found for assignment:', assignment);
              return null;
            }

            const group = Array.from(assignmentGroups.values())
              .find(g => g.assignments?.some(a => a.id === assignment.id));

            return {
              user_id: user.id,
              title: assignment.name,
              description: cleanHtmlDescription(assignment.description),
              due_date: assignment.due_at ? new Date(assignment.due_at).toISOString() : null,
              category: group?.name || 'Uncategorized',
              priority: 3,
              is_canvas_task: true,
              canvas_task_id: assignment.id.toString(),
              course_id: course.id,
              course: course.name,
              status: 'pending'
            };
          }).filter(task => task !== null);

          if (tasks.length === 0) {
            throw new Error('No valid tasks to create');
          }

          console.log('Creating tasks:', tasks);

          const { error: taskError } = await supabase
            .from('tasks')
            .insert(tasks);

          if (taskError) {
            console.error('Task creation error:', taskError);
            throw new Error(`Failed to create tasks: ${taskError.message}`);
          }

          // Success! Go back to tasks screen
          router.back();
        } catch (err) {
          console.error('Import error:', err);
          throw err;
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="headlineMedium" numberOfLines={2}>
              Import Canvas Assignments
            </Text>
          </View>
          <Button
            mode="contained-tonal"
            onPress={handleSelectAllCourses}
            style={styles.selectAllButton}
          >
            <Text>{selectAllCourses ? 'Deselect All' : 'Select All'}</Text>
          </Button>
        </View>

        {error && (
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        )}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.courseList}>
            {courses.map(course => (
              <Card key={course.id} style={styles.courseCard}>
                <Card.Content>
                  <View style={styles.courseHeader}>
                    <Checkbox.Android
                      status={selectedCourses.has(course.id) ? 'checked' : 'unchecked'}
                      onPress={() => handleCourseSelect(course.id)}
                    />
                    <Text variant="titleMedium" style={styles.courseName}>
                      {course.name}
                    </Text>
                  </View>

                  {selectedCourses.has(course.id) && (
                    <View style={styles.courseContent}>
                      <Button
                        mode="outlined"
                        onPress={() => handleCourseSelectAll(course.id)}
                        style={styles.courseSelectAllButton}
                      >
                        <Text>
                          {courseSelectAll[course.id] ? 'Deselect All' : 'Select All Assignments'}
                        </Text>
                      </Button>

                      <View style={styles.assignmentsContainer}>
                        {assignments
                          .filter(a => a.course_id === course.id)
                          .map(assignment => (
                            <Chip
                              key={assignment.id}
                              selected={selectedAssignments.has(assignment.id)}
                              onPress={() => {
                                const newSelected = new Set(selectedAssignments);
                                if (newSelected.has(assignment.id)) {
                                  newSelected.delete(assignment.id);
                                } else {
                                  newSelected.add(assignment.id);
                                }
                                setSelectedAssignments(newSelected);
                              }}
                              style={styles.assignmentChip}
                            >
                              <Text>{assignment.name}</Text>
                            </Chip>
                          ))}
                        {assignments.filter(a => a.course_id === course.id).length === 0 && (
                          <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>
                            No future assignments found
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        </ScrollView>
      </View>

      {selectedAssignments.size > 0 && (
        <FAB
          icon="check"
          label={`Import ${selectedAssignments.size} Assignment${selectedAssignments.size !== 1 ? 's' : ''}`}
          onPress={handleImport}
          loading={loading}
          disabled={loading}
          style={[styles.fab, { bottom: 32 }]}
          theme={{
            colors: {
              onPrimary: theme.colors.onPrimary,
              primary: theme.colors.primary
            }
          }}
        />
      )}
    </SafeAreaView>
  );
} 