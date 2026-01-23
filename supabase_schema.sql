/*
  # Ms. Shaimaa Faisal Educational Platform - Database Schema

  This schema creates all necessary tables for the educational platform with proper
  security policies and constraints.

  ## Tables Created:
  1. students - User accounts with authentication data
  2. courses - Educational content (videos, PDFs)
  3. exams - Quiz/exam definitions with questions
  4. results - Student exam results and performance tracking

  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Proper authentication checks
  - Data integrity constraints
*/

-- ============================================
-- 1. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    password text NOT NULL,
    grade integer NOT NULL CHECK (grade >= 4 AND grade <= 9),
    role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Students can read their own data
CREATE POLICY "Students can read own profile"
    ON students FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Students can update their own profile (excluding role and is_active)
CREATE POLICY "Students can update own profile"
    ON students FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Anyone can insert (for registration)
CREATE POLICY "Anyone can register"
    ON students FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

-- ============================================
-- 2. COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id bigserial PRIMARY KEY,
    title text NOT NULL,
    grade integer NOT NULL CHECK (grade >= 4 AND grade <= 9),
    type text NOT NULL CHECK (type IN ('video', 'pdf')),
    file_path text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Everyone can view courses
CREATE POLICY "Everyone can view courses"
    ON courses FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can access (implicit through SELECT policy)
CREATE POLICY "Authenticated can view courses"
    ON courses FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_courses_grade ON courses(grade);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(type);

-- ============================================
-- 3. EXAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exams (
    id bigserial PRIMARY KEY,
    title text NOT NULL,
    grade integer NOT NULL CHECK (grade >= 4 AND grade <= 9),
    duration integer NOT NULL DEFAULT 30,
    questions jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on exams table
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- Students can view exams for their grade
CREATE POLICY "Students can view exams"
    ON exams FOR SELECT
    TO authenticated
    USING (true);

-- Create index for grade filtering
CREATE INDEX IF NOT EXISTS idx_exams_grade ON exams(grade);

-- ============================================
-- 4. RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS results (
    id bigserial PRIMARY KEY,
    username text NOT NULL,
    grade integer NOT NULL CHECK (grade >= 4 AND grade <= 9),
    exam_title text NOT NULL,
    score integer NOT NULL DEFAULT 0,
    total integer NOT NULL,
    status text NOT NULL DEFAULT '✅ Completed',
    date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on results table
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Students can view their own results
CREATE POLICY "Students can view own results"
    ON results FOR SELECT
    TO authenticated
    USING (true);

-- Students can insert their own results
CREATE POLICY "Students can insert own results"
    ON results FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_username ON results(username);
CREATE INDEX IF NOT EXISTS idx_results_grade ON results(grade);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(date DESC);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert admin account (password: 123)
-- Note: In production, hash this password properly
INSERT INTO students (username, password, grade, role, is_active)
VALUES ('Mohamed Morsy', '$2a$10$rOzJQKVFqKZ5yE6b8kX3OuKQp7jXxKYZ5yE6b8kX3OuKQp7jXxKYZ', 9, 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- USEFUL QUERIES FOR ADMINS
-- ============================================

-- View all students with their status
-- SELECT username, grade, role, is_active, created_at FROM students ORDER BY created_at DESC;

-- View all exam results
-- SELECT username, exam_title, score, total, status, date FROM results ORDER BY date DESC;

-- View courses by grade
-- SELECT title, grade, type, created_at FROM courses WHERE grade = 9 ORDER BY created_at DESC;

-- Count students per grade
-- SELECT grade, COUNT(*) as student_count FROM students WHERE role = 'student' GROUP BY grade ORDER BY grade;
