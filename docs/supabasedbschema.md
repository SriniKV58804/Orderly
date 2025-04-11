# Database Schema Documentation

## Tables Overview

This schema represents a learning management system that connects users, courses, tasks, and study materials.

## Table: users

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| email | text | User's email address | |
| full_name | text | User's full name | |
| canvas_token | text | Authentication token for Canvas integration | |
| created_at | timestamp | When the user was created | |
| updated_at | timestamp | When the user was last updated | |
| timezone | text | User's timezone preference | |
| categories | text | User's category preferences | |
| setup_completed | bool | Whether user completed onboarding | |
| use_canvas | bool | Whether user uses Canvas integration | |
| canvas_domain | varchar | User's Canvas domain | |
| canvas_access_token | varchar | Access token for Canvas API | |

## Table: courses

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| user_id | uuid | Reference to the user | Foreign Key → users.id |
| name | text | Course name | |
| categories | text | Course categories/tags | |
| created_at | timestamp | When the course was created | |
| canvas_course_id | text | Canvas course identifier | |
| course_code | text | Course code/reference | |
| is_canvas_course | bool | Whether it's synced with Canvas | |
| updated_at | timestamp | When the course was last updated | |

## Table: tasks

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| user_id | uuid | Reference to the user | Foreign Key → users.id |
| title | varchar | Task title | |
| description | text | Task description | |
| due_date | timestamp | When the task is due | |
| work_date | timestamp | When to work on the task | |
| priority | int4 | Task priority level | |
| category | varchar | Task category | |
| status | varchar | Current status of the task | |
| is_canvas_task | bool | Whether it's synced with Canvas | |
| canvas_task_id | varchar | Canvas task identifier | |
| created_at | timestamp | When the task was created | |
| updated_at | timestamp | When the task was last updated | |
| course | varchar | Course name (denormalized) | |
| course_id | uuid | Reference to the course | Foreign Key → courses.id |

## Table: study_plans

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| task_id | uuid | Reference to the task | Foreign Key → tasks.id |
| subtasks | text | Sub-tasks to complete | |
| time_estimates | text | Estimated time for tasks | |
| techniques | text | Study techniques to use | |
| key_points | text | Important points to remember | |
| resources | text | Study resources | |
| created_at | timestamp | When the plan was created | |
| updated_at | timestamp | When the plan was last updated | |

## Table: study_guides

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| user_id | uuid | Reference to the user | Foreign Key → users.id |
| task_id | uuid | Reference to the task | Foreign Key → tasks.id |
| content | text | Study guide content | |
| generated_date | timestamp | When the guide was generated | |
| last_modified | timestamp | When the guide was last modified | |

## Table: canvas_courses

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| user_id | uuid | Reference to the user | Foreign Key → users.id |
| canvas_course_id | varchar | Canvas course identifier | |
| course_name | varchar | Name of the course in Canvas | |
| is_synced | bool | Whether it's synced with the system | |
| created_at | timestamp | When the record was created | |
| updated_at | timestamp | When the record was last updated | |

## Table: assignment_groups

| Column | Type | Description | Key |
|--------|------|-------------|-----|
| id | uuid | Unique identifier | Primary Key |
| user_id | uuid | Reference to the user | Foreign Key → users.id |
| course_id | uuid | Reference to the course | Foreign Key → courses.id |
| canvas_group_id | varchar | Canvas assignment group ID | |
| name | varchar | Group/category name | |
| created_at | timestamp | When the group was created | |
| updated_at | timestamp | When the group was last updated | |

## Relationships

- **users** ←→ **courses**: One-to-many (one user can have many courses)
- **users** ←→ **tasks**: One-to-many (one user can have many tasks)
- **users** ←→ **study_guides**: One-to-many (one user can have many study guides)
- **users** ←→ **canvas_courses**: One-to-many (one user can have many Canvas courses)
- **courses** ←→ **tasks**: One-to-many (one course can have many tasks)
- **tasks** ←→ **study_plans**: One-to-one (one task has one study plan)
- **tasks** ←→ **study_guides**: One-to-many (one task can have multiple study guides)

## Authentication

The schema shows Canvas LMS integration with tokens stored in both the users table and specialized Canvas-related tables.


