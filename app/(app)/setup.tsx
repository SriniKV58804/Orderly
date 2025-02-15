import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, useTheme, TextInput, IconButton, Surface, ProgressBar, Chip, Portal, Dialog, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppTheme } from '../../src/theme';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const STEPS = [
  {
    title: 'Welcome',
    subtitle: "Let's get your workspace set up",
    icon: 'school',
  },
  {
    title: 'Canvas Integration',
    subtitle: 'Connect with your learning management system',
    icon: 'web',
  },
  {
    title: 'Course Setup',
    subtitle: 'Add your courses and categories',
    icon: 'book-multiple',
  },
  {
    title: 'All Set!',
    subtitle: "You're ready to start managing your tasks",
    icon: 'check-circle',
  },
];

const DEFAULT_CATEGORIES = ['homework', 'quiz', 'project', 'exam'];
const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
];

interface Course {
  name: string;
  categories: string[];
}

export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [useCanvas, setUseCanvas] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [canvasDomain, setCanvasDomain] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  const getThemedStyles = () => ({
    instructionText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  });

  const handleAddCourse = () => {
    if (currentCourse && !courses.find(c => c.name.toLowerCase() === currentCourse.toLowerCase())) {
      setCourses([...courses, { name: currentCourse, categories: [] }]);
      setCurrentCourse('');
    }
  };

  const handleAddCategory = (courseName: string) => {
    if (currentCategory) {
      setCourses(courses.map(course => {
        if (course.name === courseName && !course.categories.includes(currentCategory.toLowerCase())) {
          return {
            ...course,
            categories: [...course.categories, currentCategory.toLowerCase()]
          };
        }
        return course;
      }));
      setCurrentCategory('');
    }
  };

  const handleRemoveCategory = (courseName: string, category: string) => {
    setCourses(courses.map(course => {
      if (course.name === courseName) {
        return {
          ...course,
          categories: course.categories.filter(c => c !== category)
        };
      }
      return course;
    }));
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (useCanvas) {
        // If using Canvas, just update user preferences
        const { error: updateError } = await supabase
          .from('users')
          .update({
            timezone,
            setup_completed: true,
            use_canvas: true,
            canvas_token: canvasToken,
            canvas_domain: canvasDomain,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // If not using Canvas, save manual courses and categories
        const { error: coursesError } = await supabase
          .from('courses')
          .insert(courses.map(course => ({
            user_id: user.id,
            name: course.name,
            categories: course.categories
          })));

        if (coursesError) throw coursesError;

        // Update user preferences
        const { error: updateError } = await supabase
          .from('users')
          .update({
            timezone,
            setup_completed: true,
            use_canvas: false,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      router.replace('/(app)/(tabs)/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
              backgroundColor: index === step 
                ? theme.colors.primary 
                : index < step 
                  ? theme.colors.secondary
                  : theme.colors.surfaceVariant,
              width: index === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderWelcomeStep = () => (
    <Animated.View 
      entering={FadeInRight} 
      exiting={FadeOutLeft}
      style={styles.stepContainer}
    >
      <Surface style={styles.welcomeCard}>
        <MaterialCommunityIcons
          name="school"
          size={64}
          color={theme.colors.primary}
          style={styles.welcomeIcon}
        />
        <Text variant="headlineMedium" style={styles.welcomeTitle}>
          Welcome to IntelliPlanAI
        </Text>
        <Text style={styles.welcomeText}>
          Let's get your workspace set up for a more productive academic journey.
        </Text>
      </Surface>
    </Animated.View>
  );

  const renderCanvasStep = () => (
    <Animated.View 
      entering={FadeInRight} 
      exiting={FadeOutLeft}
      style={styles.stepContainer}
    >
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name="web"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.cardTitle}>
            Canvas Integration
          </Text>
        </View>
        
        <View style={styles.toggleContainer}>
          <Text variant="bodyLarge" style={styles.toggleLabel}>
            Use Canvas Integration
          </Text>
          <Switch
            value={useCanvas}
            onValueChange={setUseCanvas}
            color={theme.colors.primary}
          />
        </View>

        {useCanvas && (
          <Animated.View entering={FadeIn} style={styles.canvasForm}>
            <TextInput
              label="Canvas Domain"
              value={canvasDomain}
              onChangeText={setCanvasDomain}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., canvas.university.edu"
            />
            <TextInput
              label="Access Token"
              value={canvasToken}
              onChangeText={setCanvasToken}
              mode="outlined"
              style={styles.input}
              secureTextEntry
            />
            <Text style={styles.helperText}>
              You can find your access token in Canvas under Account → Settings → New Access Token
            </Text>
          </Animated.View>
        )}
      </Surface>
    </Animated.View>
  );

  const renderCoursesStep = () => (
    <Animated.View 
      entering={FadeInRight} 
      exiting={FadeOutLeft}
      style={styles.stepContainer}
    >
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name="book-multiple"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.cardTitle}>
            Course Setup
          </Text>
        </View>

        <View style={styles.courseInput}>
          <TextInput
            label="Course Name"
            value={currentCourse}
            onChangeText={setCurrentCourse}
            mode="outlined"
            style={styles.input}
          />
          <IconButton
            icon="plus"
            mode="contained"
            onPress={handleAddCourse}
            disabled={!currentCourse.trim()}
          />
        </View>

        <ScrollView style={styles.courseList}>
          {courses.map((course, index) => (
            <Surface 
              key={index}
              style={[
                styles.courseCard,
                selectedCourse === index && { borderColor: theme.colors.primary }
              ]}
            >
              <View style={styles.courseHeader}>
                <MaterialCommunityIcons
                  name="book"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.courseName}>
                  {course.name}
                </Text>
                <IconButton
                  icon="plus"
                  size={20}
                  onPress={() => {
                    setSelectedCourse(index);
                    setShowAddCategoryDialog(true);
                  }}
                />
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {course.categories.map((category, catIndex) => (
                  <Chip
                    key={catIndex}
                    style={styles.categoryChip}
                    icon={getCategoryIcon(category)}
                  >
                    {category}
                  </Chip>
                ))}
              </ScrollView>
            </Surface>
          ))}
        </ScrollView>
      </Surface>
    </Animated.View>
  );

  const renderCompletionStep = () => (
    <Animated.View 
      entering={FadeInRight} 
      exiting={FadeOutLeft}
      style={styles.stepContainer}
    >
      <Surface style={styles.completionCard}>
        <MaterialCommunityIcons
          name="check-circle"
          size={80}
          color={theme.colors.primary}
          style={styles.completionIcon}
        />
        <Text variant="headlineMedium" style={styles.completionTitle}>
          All Set!
        </Text>
        <Text style={styles.completionText}>
          Your workspace is ready. Let's start managing your academic journey more effectively.
        </Text>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primary + '15', theme.colors.background]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text variant="headlineSmall" style={styles.stepTitle}>
                {STEPS[step].title}
              </Text>
              <Text variant="bodyLarge" style={styles.stepSubtitle}>
                {STEPS[step].subtitle}
              </Text>
            </View>
            <IconButton
              icon="logout"
              iconColor={theme.colors.error}
              size={24}
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </View>

          {renderStepIndicator()}

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && renderWelcomeStep()}
            {step === 1 && renderCanvasStep()}
            {step === 2 && renderCoursesStep()}
            {step === 3 && renderCompletionStep()}
          </ScrollView>

          <View style={styles.navigation}>
            {step > 0 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.navigationButton}
              >
                Back
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleNext}
              loading={loading}
              style={[styles.navigationButton, styles.nextButton]}
            >
              {step === STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Portal>
        <Dialog
          visible={showAddCategoryDialog}
          onDismiss={() => setShowAddCategoryDialog(false)}
        >
          <Dialog.Title>Add Category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={currentCategory}
              onChangeText={setCurrentCategory}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleAddCategory}
              disabled={!currentCategory.trim()}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepSubtitle: {
    opacity: 0.7,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
    transition: '0.3s',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontWeight: '600',
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    elevation: 2,
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    flex: 1,
  },
  canvasForm: {
    gap: 16,
  },
  input: {
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: -8,
  },
  courseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  courseList: {
    maxHeight: 400,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseName: {
    flex: 1,
    marginLeft: 8,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  completionCard: {
    padding: 32,
    borderRadius: 16,
    elevation: 2,
    alignItems: 'center',
  },
  completionIcon: {
    marginBottom: 16,
  },
  completionTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionText: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
    maxWidth: 280,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  navigationButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  nextButton: {
    marginLeft: 'auto',
  },
  logoutButton: {
    margin: 0,
  },
}); 