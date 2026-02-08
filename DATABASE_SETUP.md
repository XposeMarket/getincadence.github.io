# Database Setup Guide

## Problem: "Failed to create user profile"

This error occurs because the database tables don't exist yet in your Supabase project.

## Solution: Run the Database Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to your Supabase project**: https://app.supabase.com/project/npbsrjtwwohlmkwrwwgn

2. **Navigate to SQL Editor**:
   - Click on the **SQL Editor** icon in the left sidebar
   - Or go to: Database → SQL Editor

3. **Create a new query**:
   - Click **"New query"** button

4. **Copy and paste the schema**:
   - Open the file: `supabase/migrations/000_initial_schema.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor

5. **Run the migration**:
   - Click **"Run"** button (or press Ctrl/Cmd + Enter)
   - Wait for it to complete (should take a few seconds)

6. **Verify tables were created**:
   - Go to **Table Editor** in the left sidebar
   - You should see all the new tables: `orgs`, `users`, `pipelines`, `pipeline_stages`, `contacts`, `deals`, `tasks`, `activities`

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref npbsrjtwwohlmkwrwwgn

# Push migrations
supabase db push
```

## What This Migration Does

The schema creates the following tables:

### Core Tables:
- **orgs** - Organizations/companies
- **users** - User profiles (links to Supabase auth.users)
- **pipelines** - Sales pipelines
- **pipeline_stages** - Stages within pipelines (Lead, Qualified, etc.)
- **contacts** - Contact/person records
- **deals** - Opportunities/deals in the pipeline
- **tasks** - To-do items
- **activities** - Activity log (calls, emails, notes)

### Features Included:
- ✅ Proper foreign key relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) enabled
- ✅ Simple "allow all" policies for demo/development
- ✅ Automatic `updated_at` triggers
- ✅ UUID primary keys

## After Running the Migration

Try signing up again! The error should be resolved.

### Testing Signup:

1. Clear your browser cache or use incognito mode
2. Go to: http://localhost:3000/signup
3. Fill out the form with:
   - A NEW email address (one you haven't tried before)
   - Full name
   - Company name
   - Password (at least 8 characters)
4. Click "Create account"

You should now be:
- Redirected to `/dashboard`
- Have an organization created
- Have a user profile created
- Have a default sales pipeline with stages

## Troubleshooting

### Still getting "Failed to create user profile"?

1. **Check the browser console** (F12) for detailed error messages
2. **Check your terminal** where Next.js is running for server logs
3. **Verify tables exist** in Supabase Table Editor
4. **Check RLS policies** are set to "Allow all" for testing

### Getting other errors?

- **"User already exists"** - The email is already registered. Try a different email or delete the user from Supabase Auth.
- **"Email rate limit exceeded"** - Wait an hour or disable email confirmation (see previous instructions)
- **Connection errors** - Verify your `.env.local` has the correct Supabase credentials

## Security Note

⚠️ The current RLS policies allow ALL operations for demo purposes. Before going to production, you should implement proper policies that restrict users to only their organization's data.

Example production policy:
```sql
CREATE POLICY "Users can only access their org" ON contacts
  FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));
```
