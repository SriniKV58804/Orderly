
import type { Task } from '../types';

interface StudyPlanResponse {
  subtasks: string[];
  timeEstimates: string[];
  techniques: string[];
  keyPoints: string[];
  resources: string[];
}

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export class AIService {
  private static async generateContent(prompt: string): Promise<string> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error('Missing Gemini API key');
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      console.log('Making API request to Gemini...');
      const response = await fetch(`${API_URL}?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data.candidates[0].content.parts[0].text);
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  static async generateStudyPlan(task: Task): Promise<StudyPlanResponse> {
    try {
      const prompt = `
        Generate a detailed study plan for this task. 
        Respond with valid JSON only, using this exact format:
        {
          "subtasks": ["task1", "task2", ...],
          "timeEstimates": ["estimate1", "estimate2", ...],
          "techniques": ["technique1", "technique2", ...],
          "keyPoints": ["point1", "point2", ...],
          "resources": ["resource1", "resource2", ...]
        }

        Task Details:
        Title: ${task.title}
        Description: ${task.description || 'No description provided'}
        Category: ${task.category}
        Due Date: ${new Date(task.due_date).toLocaleDateString()}

        Rules:
        1. Create 3-5 specific subtasks
        2. Provide time estimates for each subtask
        3. Suggest 3-4 study techniques
        4. List 3-5 key points to focus on
        5. Recommend 2-3 resources
        6. Response must be valid JSON only, no other text
      `;

      const responseText = await this.generateContent(prompt);
      
      // Clean and parse the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!jsonResponse.subtasks || !jsonResponse.timeEstimates || 
          !jsonResponse.techniques || !jsonResponse.keyPoints || 
          !jsonResponse.resources) {
        throw new Error('Invalid response structure from AI');
      }

      return {
        subtasks: jsonResponse.subtasks.map((item: string) => item.trim()),
        timeEstimates: jsonResponse.timeEstimates.map((item: string) => item.trim()),
        techniques: jsonResponse.techniques.map((item: string) => item.trim()),
        keyPoints: jsonResponse.keyPoints.map((item: string) => item.trim()),
        resources: jsonResponse.resources.map((item: string) => item.trim()),
      };
    } catch (error) {
      console.error('Error generating study plan:', error);
      throw new Error('Failed to generate study plan');
    }
  }

  static async suggestPriority(task: Task): Promise<number> {
    try {
      const prompt = `
        Analyze this task and respond with a single number (1-5) indicating priority level.
        5 is highest priority, 1 is lowest.
        Respond with only the number, no other text.

        Task Details:
        Title: ${task.title}
        Description: ${task.description || 'No description provided'}
        Category: ${task.category}
        Due Date: ${new Date(task.due_date).toLocaleDateString()}
        Work Date: ${task.work_date ? new Date(task.work_date).toLocaleDateString() : 'Not set'}

        Consider:
        1. Urgency based on due date
        2. Complexity of the task
        3. Category importance
        4. Time required
      `;

      const response = await this.generateContent(prompt);
      const priority = parseInt(response.trim());
      return isNaN(priority) ? 3 : Math.min(Math.max(priority, 1), 5);
    } catch (error) {
      console.error('Error suggesting priority:', error);
      return 3;
    }
  }

  static async suggestWorkDate(task: Task): Promise<Date> {
    try {
      const prompt = `
        Suggest an optimal work/study date for this task.
        Respond with only the date in YYYY-MM-DD format, no other text.

        Task Details:
        Title: ${task.title}
        Description: ${task.description || 'No description provided'}
        Category: ${task.category}
        Due Date: ${new Date(task.due_date).toLocaleDateString()}

        Consider:
        1. Time needed for the task
        2. Buffer time for revisions
        3. Best practices for the category
      `;

      const response = await this.generateContent(prompt);
      const date = new Date(response.trim());
      return isNaN(date.getTime()) ? task.due_date : date;
    } catch (error) {
      console.error('Error suggesting work date:', error);
      return task.due_date;
    }
  }
} 