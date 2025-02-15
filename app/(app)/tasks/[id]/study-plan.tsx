import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, ActivityIndicator, useTheme, Button, Card, List, Divider, Portal, Dialog, IconButton, Surface, ProgressBar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { AIService } from '../../../../src/services/ai';
import type { Task } from '../../../../src/types';
import type { AppTheme } from '../../../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface StudyPlanResponse {
  subtasks: string[];
  timeEstimates: string[];
  techniques: string[];
  keyPoints: string[];
  resources: string[];
}

export default function StudyPlanScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const [task, setTask] = useState<Task | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerateDialogVisible, setRegenerateDialogVisible] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    fetchTask();
  }, [id]);
  const fetchTask = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setTask(data);
      await fetchStudyPlan(data.id, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
      setLoading(false);
    }
  };

  const fetchStudyPlan = async (taskId: string, taskData: Task) => {
    try {
      const { data, error: planError } = await supabase
        .from('study_plans')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (planError && planError.code !== 'PGRST116') { // Not found error
        throw planError;
      }

      if (data) {
        setStudyPlan({
          subtasks: data.subtasks,
          timeEstimates: data.time_estimates,
          techniques: data.techniques,
          keyPoints: data.key_points,
          resources: data.resources,
        });
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch study plan');
      setLoading(false);
    }
  };

  const generateAndSaveStudyPlan = async (taskData: Task) => {
    try {
      setGenerating(true);
      const plan = await AIService.generateStudyPlan(taskData);
      
      const { data, error: saveError } = await supabase
        .from('study_plans')
        .insert({
          task_id: taskData.id,
          subtasks: plan.subtasks,
          time_estimates: plan.timeEstimates,
          techniques: plan.techniques,
          key_points: plan.keyPoints,
          resources: plan.resources
        })
        .select()
        .single();

      if (saveError) {
        console.error('Save error details:', saveError);
        throw saveError;
      }
      
      setStudyPlan(plan);
    } catch (err) {
      console.error('Full error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerateDialogVisible(false);
    if (!task) return;

    try {
      setGenerating(true);
      const plan = await AIService.generateStudyPlan(task);
      
      const { error: updateError } = await supabase
        .from('study_plans')
        .update({
          ...plan,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', task.id);

      if (updateError) throw updateError;
      setStudyPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate study plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading || generating) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Surface style={styles.loadingCard}>
          <ActivityIndicator size={48} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.loadingTitle}>
            {generating ? 'Creating Your Study Plan' : 'Loading'}
          </Text>
          <Text style={styles.loadingSubtext}>
            {generating ? 'Analyzing task and generating personalized plan...' : 'Fetching your study plan...'}
          </Text>
          {generating && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={generationProgress}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round(generationProgress * 100)}%
              </Text>
            </View>
          )}
        </Surface>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Surface style={styles.errorCard}>
          <IconButton
            icon="alert-circle"
            size={48}
            iconColor={theme.colors.error}
          />
          <Text variant="titleMedium" style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.errorButton}
          >
            Go Back
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <>
      <LinearGradient
        colors={[theme.colors.primary + '15', theme.colors.background]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInUp.duration(500)}
            style={styles.header}
          >
            <View style={styles.titleContainer}>
              <Text variant="displaySmall" style={styles.title}>
                Study Plan
              </Text>
              <Text 
                variant="titleMedium" 
                style={[styles.taskTitle, { color: theme.colors.primary }]}
              >
                {task?.title}
              </Text>
            </View>
            {studyPlan ? (
              <IconButton
                icon="refresh"
                mode="contained-tonal"
                size={24}
                onPress={() => setRegenerateDialogVisible(true)}
                style={styles.regenerateButton}
              />
            ) : (
              <Button
                mode="contained"
                onPress={() => generateAndSaveStudyPlan(task!)}
                loading={generating}
                icon="magic"
              >
                Generate Plan
              </Button>
            )}
          </Animated.View>

          {!studyPlan && !generating && (
            <Animated.View 
              entering={FadeInUp.duration(500).delay(100)}
            >
              <Surface style={styles.emptyState}>
                <IconButton
                  icon="book-plus"
                  size={48}
                  iconColor={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.emptyStateTitle}>
                  No Study Plan Yet
                </Text>
                <Text style={styles.emptyStateText}>
                  Generate a personalized study plan to break down your task into manageable steps
                </Text>
              </Surface>
            </Animated.View>
          )}

          {studyPlan && (
            <>
              <Animated.View 
                entering={FadeInUp.duration(500).delay(200)}
              >
                <Surface style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <IconButton
                      icon="format-list-checks"
                      size={24}
                      iconColor={theme.colors.primary}
                    />
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Task Breakdown
                    </Text>
                  </View>
                  <View style={styles.timelineContainer}>
                    {studyPlan.subtasks.map((subtask, index) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineDotContainer}>
                          <View 
                            style={[
                              styles.timelineDot,
                              { backgroundColor: theme.colors.primary }
                            ]} 
                          />
                          {index !== studyPlan.subtasks.length - 1 && (
                            <View 
                              style={[
                                styles.timelineLine,
                                { backgroundColor: theme.colors.primary + '30' }
                              ]}
                            />
                          )}
                        </View>
                        <Surface style={styles.timelineContent}>
                          <Text style={styles.subtaskText}>{subtask}</Text>
                          <Text 
                            style={[
                              styles.timeEstimate,
                              { color: theme.colors.primary }
                            ]}
                          >
                            {studyPlan.timeEstimates[index]}
                          </Text>
                        </Surface>
                      </View>
                    ))}
                  </View>
                </Surface>
              </Animated.View>

              <Animated.View 
                entering={FadeInUp.duration(500).delay(300)}
              >
                <Surface style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <IconButton
                      icon="lightbulb-outline"
                      size={24}
                      iconColor={theme.colors.secondary}
                    />
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Study Techniques
                    </Text>
                  </View>
                  {studyPlan.techniques.map((technique, index) => (
                    <Surface 
                      key={index}
                      style={[
                        styles.techniqueItem,
                        index === 0 && styles.techniqueItemFirst,
                        index === studyPlan.techniques.length - 1 && styles.techniqueItemLast
                      ]}
                    >
                      <Text style={styles.techniqueText}>{technique}</Text>
                    </Surface>
                  ))}
                </Surface>
              </Animated.View>

              <Animated.View 
                entering={FadeInUp.duration(500).delay(400)}
              >
                <Surface style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <IconButton
                      icon="star-outline"
                      size={24}
                      iconColor={theme.colors.error}
                    />
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Key Focus Points
                    </Text>
                  </View>
                  <View style={styles.keyPointsGrid}>
                    {studyPlan.keyPoints.map((point, index) => (
                      <Surface 
                        key={index}
                        style={[
                          styles.keyPointCard,
                          { backgroundColor: theme.colors.primary + '08' }
                        ]}
                      >
                        <Text style={styles.keyPointText}>{point}</Text>
                      </Surface>
                    ))}
                  </View>
                </Surface>
              </Animated.View>

              <Animated.View 
                entering={FadeInUp.duration(500).delay(500)}
              >
                <Surface style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <IconButton
                      icon="book-outline"
                      size={24}
                      iconColor={theme.colors.primary}
                    />
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Resources Needed
                    </Text>
                  </View>
                  {studyPlan.resources.map((resource, index) => (
                    <Surface 
                      key={index}
                      style={[
                        styles.resourceItem,
                        index === 0 && styles.resourceItemFirst,
                        index === studyPlan.resources.length - 1 && styles.resourceItemLast
                      ]}
                    >
                      <View 
                        style={[
                          styles.resourceNumber,
                          { backgroundColor: theme.colors.primary + '15' }
                        ]}
                      >
                        <Text style={[styles.resourceNumberText, { color: theme.colors.primary }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.resourceText}>{resource}</Text>
                    </Surface>
                  ))}
                </Surface>
              </Animated.View>
            </>
          )}

          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.backButton}
            contentStyle={styles.backButtonContent}
          >
            Back to Task
          </Button>
        </ScrollView>
      </LinearGradient>

      <Portal>
        <Dialog
          visible={regenerateDialogVisible}
          onDismiss={() => setRegenerateDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Regenerate Study Plan?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will create a new personalized study plan for your task. The current plan will be replaced.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRegenerateDialogVisible(false)}>
              Cancel
            </Button>
            <Button 
              mode="contained"
              onPress={handleRegenerate}
              style={styles.dialogButton}
            >
              Regenerate
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
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
    padding: 16,
    paddingTop: 24,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskTitle: {
    opacity: 0.8,
  },
  regenerateButton: {
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timelineContainer: {
    padding: 16,
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDotContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  subtaskText: {
    fontSize: 16,
    marginBottom: 4,
  },
  timeEstimate: {
    fontSize: 14,
    fontWeight: '500',
  },
  techniqueItem: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  techniqueItemFirst: {
    borderTopWidth: 0,
  },
  techniqueItemLast: {
    borderBottomWidth: 0,
  },
  techniqueText: {
    fontSize: 16,
    lineHeight: 24,
  },
  keyPointsGrid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keyPointCard: {
    width: (width - 80) / 2,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  keyPointText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  resourceItemFirst: {
    borderTopWidth: 0,
  },
  resourceItemLast: {
    borderBottomWidth: 0,
  },
  resourceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resourceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    width: '90%',
    maxWidth: 400,
  },
  loadingTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  loadingSubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  progressContainer: {
    width: '100%',
    marginTop: 24,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
    opacity: 0.7,
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    width: '90%',
    maxWidth: 400,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 280,
  },
  backButton: {
    marginTop: 32,
    marginBottom: 16,
    borderRadius: 12,
  },
  backButtonContent: {
    paddingVertical: 8,
  },
  dialog: {
    borderRadius: 20,
  },
  dialogButton: {
    marginLeft: 8,
  },
});