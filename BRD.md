# Business Requirements Document (BRD)
## PhilSA – Philippine Student Assessment Platform

### 1. Project Overview
**PhilSA** is a complete system for college entrance exams in the Philippines. It is a safe and easy-to-use website where students can apply for college and take their entrance tests. It helps bridge the gap between high school and college by making the test process the same for everyone.

### 2. Goals
- **One Standard**: Make sure every university uses the same fair test system.
- **Safety and Honesty**: Use smart tools and cameras to make sure nobody cheats during the exam.
- **Easy for Everyone**: Make sure students from all over the country can use it, even those in far-off places.
- **Better Decisions**: Give the government (DepEd, CHED, etc.) clear reports so they can improve education in the country.

### 3. People Using the System
| Role | What they do |
| :--- | :--- |
| **STUDENT** | Create an account, apply for exams, take tests, and see their scores. |
| **ADMISSIONS_REVIEWER** | Check student documents and decide if they are allowed to take the test. |
| **UNIVERSITY_ADMIN** | Manage list of courses, sets test dates, and decides who gets into college. |
| **EXAM_ADMINISTRATOR** | Manages test questions and decides how the exams are given nationwide. |
| **ITEM_WRITER** | Writes and checks the questions for the exams. |
| **PROCTOR** | Watches students while they take tests to make sure everything is fair. |
| **GRADER** | Checks parts of the test that are not Multiple Choice (like short stories or essays). |
| **SYSTEM_ADMIN** | Manages user accounts and keeps an eye on the whole system to keep it running. |
| **EXECUTIVE** | Looks at big reports to see how students are doing across the nation. |

### 4. What the System Does

#### 4.1. Applying and Signing Up
- **Simple Signup**: Ask for simple info like name, family income, and address.
- **Registry Verification**: Integrate with the Philippine National ID (PhilSys) registry and the Department of Education (DepEd) Learner Reference Number (LRN) registry. This verifies the applicant's identity and automatically pulls their verified credentials, reducing errors and ensuring proper test center mapping.
- **School Info**: Ask for student numbers and grades from high school.
- **Choosing Schools**: Let students pick which colleges and courses they like best.
- **Upload Center**: A safe place to upload IDs and school records.

#### 4.2. Managing Exams
- **Question Bank**: A list of different test types (A/B/C/D, True/False, or long answers).
- **Test Plans**: Decide how many questions for each subject and how long the test lasts.
- **Quick Upload**: Add many questions or test dates at once.

#### 4.3. Taking the Test
- **Test Page**: A clean screen where students focus only on their exam.
- **Live Watching**: Watchers can see student cameras and get alerts if something looks wrong.
- **Check-in**: Use QR codes to mark who is present.
- **Video Records**: Save videos of the test in case someone needs to check them later.

#### 4.4. Scores and Reports
- **Easy Scoring**: Grade simple questions automatically and send hard ones to a grader.
- **Result Tables**: Create clear reports for schools and the government.
- **Dashboards**: Simple charts that show how students in different regions are performing.

#### 4.5. Safety
- **Action Logs**: Keep a list of everything staff and admins do so no one can change data secretly.
- **System Check**: Make sure the website is working correctly and following safety rules.

### 5. Tools We Use
- **App Build**: Made with React and Vite for a fast experience.
- **Design**: Clean and modern look that works on phones and computers.
- **Animations**: Smooth movements when you click buttons or change pages.

### 6. What is Not Included (Yet)
- **Real Server**: Right now, the data is just for show; a real backend will be added later.
- **Payments**: We are not handling exam fees yet.
- **Hardware**: We don't provide the actual computers at test centers.

### 7. Future Plans
- Use AI to grade long student essays.
- Make it work even without internet for very far-off areas.
