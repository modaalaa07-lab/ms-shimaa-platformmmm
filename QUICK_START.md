# Quick Start Guide

Follow these steps to get your platform running with Supabase:

## 1. Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Go to: https://app.supabase.com > Your Project > SQL Editor
-- Copy and paste the content from supabase_schema.sql
-- Click Run
```

## 2. Environment Variables

Your `.env` file is already configured with:
```
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

These credentials are ready to use.

## 3. Install Dependencies

```bash
npm install
```

## 4. Start the Server

```bash
npm start
```

You should see: `Supabase client initialized successfully`

## 5. Access the Platform

- **Admin Panel:** http://localhost:3000/admin.html
  - Username: `Mohamed Morsy`
  - Password: `123`

- **Student Signup:** http://localhost:3000/signup.html
- **Student Login:** http://localhost:3000/index.html

## Testing Checklist

- [ ] Run the SQL schema in Supabase
- [ ] Verify 4 tables created (students, courses, exams, results)
- [ ] Test admin login
- [ ] Create a test exam
- [ ] Register a new student
- [ ] Activate the student from admin panel
- [ ] Login as student
- [ ] Take an exam

## Common Commands

```bash
# Start server
npm start

# Check if Supabase is connected
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"

# View logs
npm start | grep -i supabase
```

## Need Help?

See `SUPABASE_SETUP.md` for detailed instructions.
