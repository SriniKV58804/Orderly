// import { EXPO_PUBLIC_SUPABASE_URL } from '@env';

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string;
  points_possible: number;
  course_id: number;
  html_url: string;
}

interface CanvasAssignmentGroup {
  id: number;
  name: string;
  group_weight: number;
  assignments: {
    id: number;
    name: string;
    due_at: string;
    points_possible: number;
  }[];
}

export class CanvasService {
  private domain: string;
  private token: string;

  constructor(domain: string, token: string) {
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.token = token;
  }

  private async fetchFromCanvas(endpoint: string) {
    const url = `https://${this.domain}/api/v1${endpoint}`;
    console.log('Canvas API Request:', {
      url,
      domain: this.domain,
      endpoint,
      tokenLength: this.token.length
    });
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Canvas API Error:', {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Canvas API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Canvas API Success:', {
        url,
        responseSize: JSON.stringify(data).length
      });
      return data;
    } catch (error) {
      console.error('Canvas API Exception:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async fetchAllPages<T>(endpoint: string): Promise<T[]> {
    let allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${endpoint}${separator}page=${page}&per_page=100`;
      const response = await fetch(`https://${this.domain}/api/v1${url}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Canvas API error: ${response.statusText}`);
      }

      const items = await response.json();
      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems = [...allItems, ...items];
        page++;
      }
    }

    return allItems;
  }

  async getCourses(): Promise<CanvasCourse[]> {
    console.log('Fetching Canvas courses...');
    try {
      const courses = await this.fetchAllPages<CanvasCourse>('/courses?enrollment_state=active');
      console.log('Retrieved courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  }

  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    const today = new Date().toISOString();
    return this.fetchAllPages<CanvasAssignment>(
      `/courses/${courseId}/assignments?bucket=future&start_date=${today}&include[]=description`
    );
  }

  async getAssignmentGroups(courseId: number): Promise<CanvasAssignmentGroup[]> {
    return this.fetchAllPages<CanvasAssignmentGroup>(
      `/courses/${courseId}/assignment_groups?include[]=assignments`
    );
  }
} 