# Productivity App - Task Manager

## Table of Contents
- [Introduction](#introduction)
- [User Authentication](#user-authentication)
- [First-Time User Setup](#first-time-user-setup)
- [Dashboard Overview](#dashboard-overview)
- [Calendar and Task Management](#calendar-and-task-management)
- [Assignment and Task Entry](#assignment-and-task-entry)
- [Task Management Screen](#task-management-screen)
- [AI-Powered Features](#ai-powered-features)
- [Study Guide Generation](#study-guide-generation)
- [Monetization Strategies](#monetization-strategies)
- [Development Roadmap](#development-roadmap)

## Introduction
This productivity app is designed as a task manager for users, helping them track and manage assignments, personal tasks, and study schedules efficiently. It integrates with Canvas to import assignments and provides AI-powered recommendations for prioritization and study planning.

## User Authentication
### Login Screen
- Users are met with a professional login screen
- Options to:
  - Login with Google
  - Login with Email and Password
- Email signup requires confirmation

### Post-Authentication
- Users are redirected to the app home screen upon successful authentication

## First-Time User Setup
Users have two options for initial setup:
1. Enter Canvas Access Token to import assignments
2. Manually enter assignments into the app

**Canvas Integration:**
- Pop-up screen displays available courses
- Users can select courses to sync
- Course selection can be modified later

## Dashboard Overview
### Calendar Interface
- Interactive professional calendar displaying:
  - Assignment due dates
  - General tasks (extracurricular activities, personal tasks)
- Multiple view options:
  - Month
  - Week
  - Day

### Dashboard Elements
- Daily assignment list
- AI-recommended task priorities
- Floating Action Button (FAB) for manual task addition

## Calendar and Task Management
### Task Creation Options
- Title
- Time of execution
- Repeatability:
  - Daily
  - Weekly
  - Custom
- Brief description
- Task type differentiation (general vs. assignment)

## Assignment and Task Entry
### Manual Entry (via FAB)
Required fields:
- Title
- Due date
- Category (Homework, Quiz, Project, etc.)
- Brief description
- Priority setting:
  - AI-generated (via Gemini 2.0 API)
  - Manual override option
- Recommended workday:
  - AI-generated
  - Manual override option

## Task Management Screen
### Detailed Assignment View
- Full assignment description and directions
- Management options:
  - Manual workday assignment
  - Manual priority setting
  - AI-powered recommendations

## AI-Powered Features
Gemini 2.0 API Integration provides:
- Assignment priority suggestions
- Optimal workday recommendations
- Task breakdown into manageable steps

## Study Guide Generation
### Assessment Support
- AI-powered study guide generation
- Dedicated study material organization screen
- Structured study plans based on:
  - Assessment due date
  - Difficulty level

## Conclusion
This app provides a comprehensive task management solution for students, featuring:
- Canvas integration
- Manual task management
- AI-powered scheduling
- Automated study guide generation

The platform offers both free and premium-tiered experiences, ensuring accessibility while maintaining scalability.

## Database Schema

### Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    canvas_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    work_date TIMESTAMP,
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    is_canvas_task BOOLEAN DEFAULT false,
    canvas_task_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### Study Guides Table
CREATE TABLE study_guides (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    content TEXT,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### Canvas Courses Table
CREATE TABLE canvas_courses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    canvas_course_id VARCHAR(255),
    course_name VARCHAR(255),
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### Tech Stack
- Expo React Native with Typescript, Expo and Expo Router
- Supabase for database and authentication
- Google Gemini 2.0 API for AI-powered features

