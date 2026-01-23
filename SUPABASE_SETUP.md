# Supabase Integration Setup Guide

This guide will help you connect your Ms. Shaimaa Faisal Educational Platform to Supabase.

---

## Step 1: Get Your Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create a new account
3. Create a new project or select an existing one
4. Navigate to **Settings** > **API** in the left sidebar
5. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxx.supabase.co`)
   - **anon/public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

---

## Step 2: Configure Environment Variables

Your `.env` file has been created with your existing Supabase credentials. If you need to update them:

1. Open the `.env` file in the root directory
2. Update these values with your actual Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**IMPORTANT:** Never commit your `.env` file to Git. It's already added to `.gitignore`.

---

## Step 3: Create Database Tables

You need to run the SQL schema to create all necessary tables in your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `supabase_schema.sql` from your project root
5. Copy the entire content and paste it into the SQL Editor
6. Click **Run** to execute the schema

### Option B: Using Supabase CLI

```bash
supabase db push
```

---

## Step 4: Verify Database Tables

After running the schema, verify that the following tables were created:

1. **students** - User accounts with authentication
2. **courses** - Educational content (videos, PDFs)
3. **exams** - Quiz/exam definitions
4. **results** - Student performance tracking

You can check this in **Table Editor** in your Supabase dashboard.

---

## Step 5: Install Dependencies

Make sure all npm packages are installed:

```bash
npm install
```

This will install the newly added `dotenv` package along with other dependencies.

---

## Step 6: Test the Connection

Start your server:

```bash
npm start
```

You should see:
```
Supabase client initialized successfully
```

If you see an error about missing credentials, double-check your `.env` file.

---

## Step 7: Configure Row Level Security (RLS)

The SQL schema includes basic RLS policies, but you may want to review them:

1. Go to **Authentication** > **Policies** in Supabase Dashboard
2. Review the policies for each table
3. The default policies allow:
   - Students to read their own data
   - Anyone to register (insert into students table)
   - Authenticated users to view courses and exams
   - Students to insert their own results

---

## Troubleshooting

### Error: "Missing Supabase credentials"
- Make sure your `.env` file exists in the project root
- Verify that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Check for typos in the variable names

### Error: "relation does not exist"
- You haven't run the SQL schema yet
- Go to Supabase SQL Editor and execute `supabase_schema.sql`

### Error: "invalid JWT token"
- You're using the wrong key
- Make sure you're using the **anon/public** key, not the service role key
- Copy the key again from Supabase Dashboard > Settings > API

### Tables created but getting "permission denied"
- RLS policies may not have been applied
- Re-run the RLS policy sections from the SQL schema
- Check **Authentication** > **Policies** in your dashboard

---

## Database Schema Overview

### students Table
```sql
- id (uuid, primary key)
- username (text, unique)
- password (text, hashed)
- grade (integer, 4-9)
- role (text, 'student' or 'admin')
- is_active (boolean)
- created_at (timestamp)
```

### courses Table
```sql
- id (bigserial, primary key)
- title (text)
- grade (integer, 4-9)
- type (text, 'video' or 'pdf')
- file_path (text)
- description (text)
- created_at (timestamp)
```

### exams Table
```sql
- id (bigserial, primary key)
- title (text)
- grade (integer, 4-9)
- duration (integer, in minutes)
- questions (jsonb)
- created_at (timestamp)
```

### results Table
```sql
- id (bigserial, primary key)
- username (text)
- grade (integer, 4-9)
- exam_title (text)
- score (integer)
- total (integer)
- status (text)
- date (timestamp)
- created_at (timestamp)
```

---

## Deployment to Vercel

When deploying to Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your anon/public key

Vercel will automatically load these environment variables for your serverless functions.

---

## Security Best Practices

1. **Never** commit `.env` to version control
2. Use the **anon/public** key for client-side code
3. Keep the **service role** key secret (don't use it in frontend)
4. Review and test RLS policies before going to production
5. Regularly backup your database
6. Monitor your Supabase dashboard for unusual activity

---

## Next Steps

After completing the setup:

1. Test user registration at `/signup.html`
2. Test admin login at `/index.html`
3. Create a test exam in the admin panel
4. Upload course content
5. Test the student dashboard

---

## Support

If you encounter issues:
- Check Supabase logs in the Dashboard
- Review server console output
- Verify all environment variables are set correctly
- Ensure your Supabase project is active (not paused)

---

**Setup Date:** January 2026
**Platform:** Ms. Shaimaa Faisal Educational Platform
**Database:** Supabase PostgreSQL
