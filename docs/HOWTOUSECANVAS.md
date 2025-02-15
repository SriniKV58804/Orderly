# Canvas API Guide

This guide will walk you through how to use the Canvas API to fetch course IDs, fetch assignments from a course, and fetch assignment categories.

## Prerequisites

- **Canvas API Token**: You need an API token to authenticate your requests. You can generate one from your Canvas account settings.
- **Canvas Instance URL**: The base URL of your Canvas instance (e.g., `https://yourinstitution.instructure.com`).

## Fetching Course IDs

To fetch the list of courses you are enrolled in, you can use the following endpoint:


GET /api/v1/courses
Example Request

curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -X GET "https://yourinstitution.instructure.com/api/v1/courses"
Example Response

[
    {
        "id": 12345,
        "name": "Introduction to Computer Science",
        "course_code": "CS101",
        "enrollments": [
            {
                "type": "student",
                "role": "StudentEnrollment"
            }
        ]
    },
    {
        "id": 67890,
        "name": "Advanced Mathematics",
        "course_code": "MATH301",
        "enrollments": [
            {
                "type": "student",
                "role": "StudentEnrollment"
            }
        ]
    }
]
Notes
The id field in the response is the course ID you will use in subsequent API calls.

Fetching Assignments from a Course
To fetch the list of assignments for a specific course, use the following endpoint:


GET /api/v1/courses/:course_id/assignments
Example Request

curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -X GET "https://yourinstitution.instructure.com/api/v1/courses/12345/assignments"
Example Response

[
    {
        "id": 101,
        "name": "Homework 1",
        "description": "Complete exercises 1-5.",
        "due_at": "2023-10-01T23:59:59Z",
        "points_possible": 100,
        "course_id": 12345
    },
    {
        "id": 102,
        "name": "Midterm Exam",
        "description": "Covering chapters 1-5.",
        "due_at": "2023-11-15T23:59:59Z",
        "points_possible": 200,
        "course_id": 12345
    }
]
Notes
Replace :course_id with the actual course ID you want to fetch assignments for.

Fetching Assignment Categories
To fetch the list of assignment categories (also known as assignment groups) for a specific course, use the following endpoint:


GET /api/v1/courses/:course_id/assignment_groups
Example Request

curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -X GET "https://yourinstitution.instructure.com/api/v1/courses/12345/assignment_groups"
Example Response

[
    {
        "id": 1,
        "name": "Homework",
        "group_weight": 30,
        "assignments": [
            {
                "id": 101,
                "name": "Homework 1",
                "due_at": "2023-10-01T23:59:59Z",
                "points_possible": 100
            },
            {
                "id": 102,
                "name": "Homework 2",
                "due_at": "2023-10-15T23:59:59Z",
                "points_possible": 100
            }
        ]
    },
    {
        "id": 2,
        "name": "Exams",
        "group_weight": 70,
        "assignments": [
            {
                "id": 103,
                "name": "Midterm Exam",
                "due_at": "2023-11-15T23:59:59Z",
                "points_possible": 200
            },
            {
                "id": 104,
                "name": "Final Exam",
                "due_at": "2023-12-15T23:59:59Z",
                "points_possible": 300
            }
        ]
    }
]
Notes
The assignments field within each assignment group contains the list of assignments belonging to that category.

Conclusion
This guide covered the basics of using the Canvas API to fetch course IDs, assignments, and assignment categories. You can expand on this by exploring other endpoints provided by the Canvas API to interact with more features of the platform.

For more detailed information, refer to the official Canvas API documentation.

Copy

This Markdown file provides a clear and concise guide on how to use the Canvas API for the specified tasks. You can save this content in a `.md` file and use it as a reference or share it with others.