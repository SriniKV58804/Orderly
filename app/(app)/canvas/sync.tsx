import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Animated, Dimensions, Platform } from 'react-native';
import { Text, Button, Card, Checkbox, useTheme, ActivityIndicator, Chip, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { CanvasService } from '../../../src/services/canvas';
import type { AppTheme } from '../../../src/theme';
import * as Haptics from 'expo-haptics';

export default function CanvasSyncScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { width } = Dimensions.get('window');

  // Animation values using useRef to persist between renders
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mainContent: {
      flex: 1,
    },
    headerSection: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceVariant,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingBottom: 16,
    },
    titleContainer: {
      flex: 1,
      marginRight: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.secondary,
      opacity: 0.8,
    },
    importSection: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    importButton: {
      flex: 1,
      borderRadius: 12,
    },
    selectAllButton: {
      minWidth: 120,
      borderRadius: 12,
      marginLeft: 12,
    },
    error: {
      margin: 16,
      padding: 16,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 12,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    courseCard: {
      marginBottom: 16,
      borderRadius: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      overflow: 'hidden',
    },
    courseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    courseName: {
      flex: 1,
      marginLeft: 12,
      fontSize: 18,
      fontWeight: '600',
    },
    courseContent: {
      marginTop: 16,
      paddingHorizontal: 8,
    },
    courseSelectAllButton: {
      marginBottom: 16,
      borderRadius: 12,
    },
    assignmentsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 8,
    },
    assignmentChip: {
      borderRadius: 20,
      height: 36,
    },
    selectedChip: {
      backgroundColor: theme.colors.primaryContainer,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24, // Adjust for iPhone home indicator
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
      // Add padding top for gradient effect if desired
      paddingTop: 20,
    },
    noAssignments: {
      color: theme.colors.secondary,
      fontStyle: 'italic',
      textAlign: 'center',
      padding: 16,
    },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16, // Changed from dynamic value to fixed
      borderRadius: 16,
      paddingHorizontal: 24,
      zIndex: 1000, // Ensure FAB stays on top
    },
    loadingContainer: {
      backgroundColor: theme.colors.surface,
      padding: 32,
      borderRadius: 16,
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.secondary,
      fontSize: 16,
    },
  });

  useEffect(() => {
    initializeCanvas();
  }, []);

  // Initialization function remains the same
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

      // Start entrance animations after data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Canvas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // FAB animation
    Animated.spring(fabAnim, {
      toValue: selectedAssignments.size > 0 ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [selectedAssignments.size]);

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

      // Get selected assignments
      const assignmentsToImport = assignments.filter(a => selectedAssignments.has(a.id));
      
      // Get unique course IDs from selected assignments
      const selectedCourseIds = new Set(assignmentsToImport.map(a => a.course_id));

      // Get existing Canvas courses for this user
      const { data: existingCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_canvas_course', true);

      // Create a map of canvas_course_id to database course id
      const courseIdMap = new Map(
        existingCourses?.map(course => [course.canvas_course_id, course.id]) || []
      );
      
      // Only create courses that don't exist yet
      const newCourses = courses
        .filter(course => selectedCourseIds.has(course.id))
        .filter(course => !courseIdMap.has(course.id.toString()))
        .map(course => ({
          user_id: user.id,
          name: course.name,
          canvas_course_id: course.id.toString(),
          is_canvas_course: true
        }));

      if (newCourses.length > 0) {
        const { data: syncedNewCourses, error: coursesError } = await supabase
          .from('courses')
          .insert(newCourses)
          .select();

        if (coursesError) {
          console.error('Course creation error:', coursesError);
          throw new Error('Failed to create courses');
        }

        // Add new courses to the map
        syncedNewCourses?.forEach(course => {
          courseIdMap.set(course.canvas_course_id, course.id);
        });
      }

      // Get existing Canvas tasks to avoid duplicates
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('canvas_task_id')
        .eq('user_id', user.id)
        .eq('is_canvas_task', true);

      const existingTaskIds = new Set(existingTasks?.map(task => task.canvas_task_id) || []);

      // Get assignment groups and prepare categories
      const selectedGroupIds = new Set(
        assignmentsToImport.map(a => {
          const group = Array.from(assignmentGroups.values())
            .find(g => g.assignments?.some(groupA => groupA.id === a.id));
          return group?.id;
        }).filter(Boolean)
      );

      // Only create categories if we have some
      if (selectedGroupIds.size > 0) {
        // Get existing categories
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

        // Set a far future date for assignments without due dates (Dec 31, 2099)
        const DEFAULT_DUE_DATE = new Date(2099, 11, 31).toISOString();

        // Create only new tasks
        const newTasks = assignmentsToImport
          .filter(assignment => !existingTaskIds.has(assignment.id.toString()))
          .map(assignment => {
            const courseId = courseIdMap.get(assignment.course_id.toString());
            const courseName = courses.find(c => c.id === assignment.course_id)?.name;
            
            if (!courseId || !courseName) {
              console.error('No matching course found for assignment:', assignment);
              return null;
            }

            const group = Array.from(assignmentGroups.values())
              .find(g => g.assignments?.some(a => a.id === assignment.id));

            return {
              user_id: user.id,
              title: assignment.name,
              description: cleanHtmlDescription(assignment.description),
              due_date: assignment.due_at ? new Date(assignment.due_at).toISOString() : DEFAULT_DUE_DATE,
              category: assignment.group_name || 'Uncategorized',
              priority: 3,
              is_canvas_task: true,
              canvas_task_id: assignment.id.toString(),
              course_id: courseId,
              course: courseName,
              status: 'pending'
            };
          })
          .filter((task): task is NonNullable<typeof task> => task !== null);

        if (newTasks.length > 0) {
          const { error: taskError } = await supabase
            .from('tasks')
            .insert(newTasks);

          if (taskError) {
            console.error('Task creation error:', taskError);
            throw new Error(`Failed to create tasks: ${taskError.message}`);
          }
        }

        // Success! Go back to tasks screen
        router.back();
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleChipPress = useCallback((assignmentId: number) => {
    Haptics.selectionAsync();
    const newSelected = new Set(selectedAssignments);
    if (newSelected.has(assignmentId)) {
      newSelected.delete(assignmentId);
    } else {
      newSelected.add(assignmentId);
    }
    setSelectedAssignments(newSelected);
  }, [selectedAssignments]);

  

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={48} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mainContent}>
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Canvas Sync</Text>
              <Text style={styles.subtitle}>Import your assignments</Text>
            </View>
          </View>
          
          <Animated.View 
            style={[
              styles.importSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {selectedAssignments.size > 0 ? (
              <Button
                mode="contained"
                onPress={handleImport}
                loading={loading}
                disabled={loading}
                style={styles.importButton}
                icon="download"
              >
                Import {selectedAssignments.size} Assignment{selectedAssignments.size !== 1 ? 's' : ''}
              </Button>
            ) : (
              <Button
                mode="contained"
                disabled
                style={styles.importButton}
                icon="download"
              >
                Select Assignments to Import
              </Button>
            )}
            <Button
              mode="contained-tonal"
              onPress={handleSelectAllCourses}
              style={styles.selectAllButton}
            >
              {selectAllCourses ? 'Deselect All' : 'Select All'}
            </Button>
          </Animated.View>
        </View>

        {error && (
          <Animated.View style={[styles.error, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {courses.map((course, index) => (
            <Animated.View
              key={course.id}
              style={{
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ],
                opacity: fadeAnim,
              }}
            >
              <Card style={styles.courseCard}>
                <Card.Content>
                  <View style={styles.courseHeader}>
                    <Checkbox.Android
                      status={selectedCourses.has(course.id) ? 'checked' : 'unchecked'}
                      onPress={() => handleCourseSelect(course.id)}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.courseName}>{course.name}</Text>
                  </View>

                  {selectedCourses.has(course.id) && (
                    <Animated.View 
                      style={[
                        styles.courseContent,
                        { opacity: fadeAnim }
                      ]}
                    >
                      <Button
                        mode="outlined"
                        onPress={() => handleCourseSelectAll(course.id)}
                        style={styles.courseSelectAllButton}
                      >
                        {courseSelectAll[course.id] ? 'Deselect All' : 'Select All Assignments'}
                      </Button>

                      <View style={styles.assignmentsContainer}>
                        {assignments
                          .filter(a => a.course_id === course.id)
                          .map(assignment => (
                            <Chip
                              key={assignment.id}
                              selected={selectedAssignments.has(assignment.id)}
                              onPress={() => handleChipPress(assignment.id)}
                              style={[
                                styles.assignmentChip,
                                selectedAssignments.has(assignment.id) && styles.selectedChip
                              ]}
                              elevation={2}
                            >
                              {assignment.name}
                            </Chip>
                          ))}
                        {assignments.filter(a => a.course_id === course.id).length === 0 && (
                          <Text style={styles.noAssignments}>
                            No future assignments found
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  )}
                </Card.Content>
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
        </View>
      
    
    </SafeAreaView>
  );
}