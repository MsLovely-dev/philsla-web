# PhilSA System Modules & Pages

This document provides a comprehensive list of all modules and pages within the PhilSA Philippine Student Assessment Platform, categorized by user role and functional area.

---

## 1. Public & Core Pages
*   **Landing Page**: The main gateway to the platform. (`/`)
*   **Login Page**: Secure entry with Multi-Factor Authentication. (`/login`)
*   **Student Registration**: Initial sign-up and application portal. (`/register`)
*   **Main Dashboard**: Unified homepage for logged-in users. (`/dashboard`)

## 2. Student Module (**STUDENT**)
*   **My Application**: Form to manage personal, school, and document details. (`/student/application`)
*   **Exam Permit**: View and download the official test permit with QR code. (`/student/permit`)
*   **Results View**: Access final scores and university admission status. (`/student/results`)
*   **Live Exam Delivery**: The secure, full-screen testing interface. (`/exam/live`)

## 3. Admissions Specialist (**ADMISSIONS_REVIEWER**)
*   **Applications Overview**: List of all student applications pending review. (`/admin/reviewer/applications`)
*   **Application Detail**: Deep-dive review of a single student's files and details. (`/admin/reviewer/applications/:id`)
*   **Testing Center Availability**: Real-time monitor of seat capacity across regions. (`/admin/reviewer/availability`)

## 4. University Admin (**UNIVERSITY_ADMIN**)
*   **University Applicant List**: Students targeting specific university courses. (`/admin/university/applications`)
*   **University Applicant Detail**: Detailed view for university-level approval. (`/admin/university/applications/:id`)
*   **Course Management**: Setting quotas and degree availability. (`/admin/university/courses`)
*   **Exam Schedule Planning**: Picking dates and slots for campus-based exams. (`/admin/university/schedules`)
*   **University Analytics**: Deep dive into applicant demographics and trends. (`/admin/university/analytics`)

## 5. Exam Management Hub (**EXAM_ADMINISTRATOR**)
*   **Hub Overview**: Command center for national exam status. (`/admin/hub/overview`)
*   **Question Bank Management**: Central vault for all assessment items. (`/admin/hub/questions`)
*   **Exam Set Configuration**: Building "Set A", "Set B", etc., from the bank. (`/admin/hub/exam-sets`)
*   **Bulk Data Upload**: Importing legacy records or massive question sets. (`/admin/hub/upload`)
*   **Assessment Audit Trail**: Tracking changes to test content. (`/admin/hub/audit`)

## 6. Results & Analytics Hub
*   **Score Management**: Raw score calculation and verification. (`/admin/results/scores`)
*   **Reporting Matrix**: Cross-tabulation of scores by school or track. (`/admin/results/matrix`)
*   **National Results Management**: Orchestrating the global release of scores. (`/admin/reports`)
*   **Item Blueprints**: Defining subject weights and difficulty levels. (**ITEM_WRITER**) (`/admin/blueprints`)

## 7. Proctoring Module (**PROCTOR**)
*   **Proctor Console**: Main dashboard for exam day operations. (`/proctor/console`)
*   **Proctoring Schedule**: Personal assignment list for proctors. (`/proctor/schedule`)
*   **Readiness Check**: Hardware and room verification for proctors. (`/proctor/readiness`)
*   **Attendance Check-in**: Scanning student QR codes at test centers. (`/proctor/attendance`)
*   **Live Test Monitoring**: Multi-grid view of student webcams during the test. (`/proctor/monitoring`)

## 8. Grading Module (**GRADER**)
*   **Subjective Grading Queue**: Interface for checking essays and short answers. (`/grader/queue`)

## 9. System Security & Administration (**SYSTEM_ADMIN**)
*   **User Management**: Managing staff accounts and RBAC roles. (`/admin/users`)
*   **System Compliance**: Monitoring platform health and security protocols. (`/admin/system`)
*   **Proctor Resource Management**: Assigning proctors to physical centers. (`/admin/proctors`)
*   **Video Recordings Command**: Index of all recorded test sessions. (`/admin/recordings`)
*   **Incident Evidence Locker**: Dedicated vault for flagged cheating footage. (`/admin/recordings/incidents`)
*   **Video Playback Center**: HD player for reviewing test session recordings. (`/admin/recordings/playback/:id`)
*   **System Audit Infrastructure**: Immutable logs of every admin action. (`/admin/logs`)

## 10. Executive Dashboard (**EXECUTIVE**)
*   **National Performance**: High-level map and charts for government policy. (`/admin/government`)
