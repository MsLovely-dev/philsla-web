# User Stories: Comprehensive Feature Guide
## PhilSA – Philippine Student Assessment Platform

This document describes 20 key user stories for the PhilSA system, covering all major modules from student registration to national analytics.

---

### 1. Student Sign-up
**Story:** As a **STUDENT**, I want to create an account so I can start my college application.
* **Steps:** Fill in name, email, and password. Confirm my email.
* **Check:** I can log in after signing up.

### 2. Uploading School Records
**Story:** As a **STUDENT**, I want to upload my grades and ID so a reviewer can check them.
* **Steps:** Go to the "Documents" page. Drag and drop my Grade 12 card and PhilSys ID.
* **Check:** The files show up as "Uploaded" and I can see a preview.

### 3. Choosing a Test Center
**Story:** As a **STUDENT**, I want to pick where I take my test so it’s near my home.
* **Steps:** Open the map or list. Pick the school closest to me. Select an available date.
* **Check:** My dashboard shows my chosen date and place as "Reserved."

### 4. Getting my Exam Permit
**Story:** As a **STUDENT**, I want to print my permit so I can enter the test room.
* **Steps:** Click "Download Permit." A PDF with my photo and QR code appears.
* **Check:** The QR code on the permit works when scanned.

### 5. Taking the Live Test
**Story:** As a **STUDENT**, I want to answer questions on the computer so I don't have to use paper.
* **Steps:** Click "Start." Read the question. Click A, B, C, or D. Click "Next."
* **Check:** My progress bar moves as I answer, and I can't open other tabs.

### 6. Seeing my Final Score
**Story:** As a **STUDENT**, I want to see how I did so I know if I passed.
* **Steps:** Go to "Results" after the release date. View my scores for Math, Science, and English.
* **Check:** It shows if I am "Qualified" for the universities I picked.

### 7. Reviewing Applications
**Story:** As an **ADMISSIONS_REVIEWER**, I want to check student files and take necessary actions to ensure data integrity and proper test allocation.
* **Steps:** 
    1. Open the list of new students and select a profile.
    2. Review grades and uploaded documents.
    3. Perform one of the following:
       - **APPROVE**: Confirm everything is correct.
       - **REJECT**: Deny for invalid/fake info.
       - **CORRECTION**: Send back with notes for minor fixes.
       - **REASSIGN CENTER**: Move the student to a different test hub if needed.
* **Check:** The student's status or test center updates immediately, and audit logs record the decision.

### 8. Asking for Corrections
**Story:** As an **ADMISSIONS_REVIEWER**, I want to tell a student to fix their blurry photo.
* **Steps:** Click "Needs Correction." Type a note: "Please upload a clearer ID photo." Click "Send."
* **Check:** The student gets a message and their application opens again for editing.

### 9. Managing Test Slots
**Story:** As an **EXAM_ADMINISTRATOR**, I want to add more seats to a test center.
* **Steps:** Go to "Center Capacity." Increase the slots for Manila Center from 100 to 200.
* **Check:** Students can now book the extra 100 seats.

### 10. Adding New Test Questions
**Story:** As an **ITEM_WRITER**, I want to add new Math questions so students don't see the same ones every year.
* **Steps:** Go to "Question Bank." Type a question. Add four choices. Mark the correct one. Save.
* **Check:** The question appears in the Math subject list.

### 11. Creating the "Set A" Exam
**Story:** As an **EXAM_ADMINISTRATOR**, I want to pick 50 questions to be in the final exam.
* **Steps:** Go to "Exam Sets." Pick 20 Math, 20 English, and 10 Science questions. Click "Publish."
* **Check:** The system names this "Set A" and it’s ready for the test day.

### 12. Watching Students Live (Proctoring)
**Story:** As a **PROCTOR**, I want to see the student's camera so I know they aren't cheating.
* **Steps:** Open the "Proctor Console." Look at the grid of student faces on my screen.
* **Check:** The system flags any student who looks away from the screen for too long.

### 13. Checking Student Attendance
**Story:** As a **PROCTOR**, I want to scan student QR codes at the door so I know who is present.
* **Steps:** Use my phone or laptop camera to scan the student's permit.
* **Check:** The student’s status in my list changes to "Present."

### 14. Reporting a Cheating Incident
**Story:** As a **PROCTOR**, I want to mark if a student used a phone during the test.
* **Steps:** Click "Flag Incident" on the student's video. Type "Used a secret phone." Click "Save Event."
* **Check:** The incident is saved in the record for the head admin to see.

### 15. Playing Back Test Videos
**Story:** As a **SYSTEM_ADMIN**, I want to watch the test video again to confirm cheating.
* **Steps:** Search for the student ID. Click "Play Video." Jump to the time where the watcher flagged them.
* **Check:** I can see clearly what happened on their screen and camera.

### 16. Checking Essay Answers (Grading)
**Story:** As a **GRADER**, I want to read student essays so I can give them points.
* **Steps:** Open the "Grading Queue." Read the student's story. Type a score (1 to 10). Submit.
* **Check:** The student’s score is updated automatically.

### 17. Creating New Staff Accounts
**Story:** As a **SYSTEM_ADMIN**, I want to give a new teacher access to the system.
* **Steps:** Go to "User Management." Type their name and email. Pick a role like "ITEM_WRITER" as their job.
* **Check:** The teacher gets an email to set their own password.

### 18. Looking at Audit Logs
**Story:** As a **SYSTEM_ADMIN**, I want to see who changed a student's score.
* **Steps:** Go to "Audit Trail." Search for "Score Change." See the name of the person who did it.
* **Check:** It shows the old score, the new score, and the time it was changed.

### 19. Checking the National Dashboard
**Story:** As an **EXECUTIVE**, I want to see which region has the highest scores.
* **Steps:** Open the "Analytics" page. Look at the map of the Philippines.
* **Check:** The map colors change to show where the smartest students are.

---

### 20. Setting Course Slots for Universities
**Story:** As a **UNIVERSITY_ADMIN**, I want to set how many nursing students we can take.
* **Steps:** Go to "Manage Courses." Pick "Nursing." Type "50" for the number of seats. Click "Save."
* **Check:** After the test, only the top 50 students can be "Accepted" into nursing.

### 21. Secure Login with Multi-Factor Authentication
**Story:** As a **STUDENT** or **STAFF**, I want to pick how I receive my security code so I can log in safely even if I don't have access to my email.
* **Steps:** Enter Email -> Enter Password -> Select "Email" or "Mobile" -> Enter the 6-digit code sent to my device.
* **Check:** I can only enter the system if I provide the correct code from my chosen method.

### 22. PhilSys Identity Verification & Autofill
**Story:** As a **STUDENT**, I want to enter my PhilSys Number (PCN) and verify it so that my personal details are authenticated and automatically filled out.
* **Steps:** Go to "My Application." Enter my PhilSys Number. Click "Verify & Autofill" (or "Verify").
* **Check:** The system simulates connecting to the PhilSys API and populates my verified personal details (First Name, Last Name, Birth Date, Gender) automatically.

### 23. DepEd LRN Registry Authentication & Helpdesk Routing
**Story:** As a **STUDENT**, I want to link my DepEd LRN to authenticate my high school academic records and test mismatch troubleshooting.
* **Steps:** 
    1. Enter my Learner Reference Number (LRN).
    2. Click "Verify" to fetch my academic profile from the DepEd Registry.
    3. To test a mismatch, enter an LRN ending in 9 (or click "Simulate Mismatch").
* **Check:** A successful verification links my DepEd profile. A simulated mismatch provides immediate feedback and directs me to helpdesk routing for resolution.

---

## 8. System Statuses (The Process Steps)

In PhilSA, everything follows a step-by-step process. Here is what each status means:

### A. Application Statuses (Your Paperwork)
* **PENDING**: Your application is in line. A reviewer will check it soon.
* **FOR_CORRECTION**: There is a mistake in your form (like a blurry photo). You need to fix it and submit again.
* **APPROVED**: Your papers are all good! You are now allowed to get your exam permit.
* **REJECTED**: Your application was denied (usually because of incorrect or fake info).
* **ACCEPTED**: Congratulations! A university has picked you based on your exam score.

### B. Exam Statuses (Your Test Progress)
* **NOT_SCHEDULED**: You haven't chosen when or where to take the test yet.
* **SCHEDULED**: You have a set date, time, and place for your test.
* **CHECKED_IN**: You have arrived at the test center and scanned your QR code.
* **IN_PROGRESS**: You are currently answering the exam questions.
* **SUBMITTED**: You have finished the test and sent your answers.
* **GRADED**: Your test has been checked, but the scores are not yet public.
* **RESULTS_RELEASED**: You can now log in and see your final scores.
