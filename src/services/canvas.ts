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
  assignment_group_id?: number;
  group_name?: string;
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
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.statusText}`);
    }

    return response.json();
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
    const courses = await this.fetchAllPages<CanvasCourse>('/courses?enrollment_state=active');
    
    // Filter out duplicate courses by keeping only the most recent enrollment
    const uniqueCourses = new Map();
    courses.forEach(course => {
      if (!uniqueCourses.has(course.name) || course.id > uniqueCourses.get(course.name).id) {
        uniqueCourses.set(course.name, course);
      }
    });
    
    return Array.from(uniqueCourses.values());
  }

  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    const today = new Date().toISOString();
    const assignments = await this.fetchAllPages<CanvasAssignment>(
      `/courses/${courseId}/assignments?bucket=future&start_date=${today}&include[]=description&include[]=assignment_group`
    );

    // Get assignment groups for proper categorization
    const groups = await this.getAssignmentGroups(courseId);
    const groupMap = new Map(groups.map(group => [group.id, group]));

    // Associate assignments with their groups
    return assignments.map(assignment => ({
      ...assignment,
      group_name: groupMap.get(assignment.assignment_group_id)?.name || 'Uncategorized'
    }));
  }

  async getAssignmentGroups(courseId: number): Promise<CanvasAssignmentGroup[]> {
    const groups = await this.fetchAllPages<CanvasAssignmentGroup>(
      `/courses/${courseId}/assignment_groups?include[]=assignments`
    );

    // Filter out empty groups and ensure assignments are properly linked
    return groups.filter(group => group.assignments && group.assignments.length > 0);
  }
}