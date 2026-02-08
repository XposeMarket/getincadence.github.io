# Troubleshooting "Failed to create user profile"

## Quick Fix Steps

### Step 1: Run the Database Migration ⭐ **DO THIS FIRST**

The error means your database tables don't exist yet. Follow the `DATABASE_SETUP.md` guide to create them.

**Quick version:**
1. Go to https://app.supabase.com/project/npbsrjtwwohlmkwrwwgn/sql/new
2. Copy the contents of `supabase/migrations/000_initial_schema.sql`
3. Paste and click "Run"
4. Verify tables exist in Table Editor

### Step 2: Check Your Terminal Logs

With the updated API route, you'll now see detailed logs. Look for:

```
=== Setup API Called ===
User ID: [uuid]
Email: [email]
Creating organization...
Organization created successfully: [org_id]
Creating user profile...
User data: { ... }
```

If you see an error, it will tell you exactly what went wrong.

### Step 3: Common Issues

#### Issue: "relation 'users' does not exist"
**Solution:** You didn't run the migration. Go to Step 1.

#### Issue: "duplicate key value violates unique constraint"
**Solution:** You're trying to sign up with an email that already exists.
- Go to Supabase Dashboard → Authentication → Users
- Delete the existing user
- Try again with a fresh email

#### Issue: "permission denied for table users"
**Solution:** RLS policies might be blocking. The migration includes "allow all" policies, but if you modified them:
1. Go to Supabase → Table Editor → `users` table
2. Click on "RLS" tab
3. Make sure "Enable RLS" is ON
4. Make sure you have a policy like "Allow all operations for demo"

#### Issue: Error mentions "auth.users" foreign key
**Solution:** Supabase auth user doesn't exist yet. This shouldn't happen with the signup flow, but if it does:
- Make sure you're actually signed up in Supabase Auth (check Dashboard → Authentication)
- The user ID from signup should match the ID you're passing to setup

### Step 4: Test with Fresh Email

After running the migration:
1. Use a COMPLETELY NEW email (not one you've tried before)
2. Try signup again
3. Check your terminal for the detailed logs

## Still Having Issues?

### Enable More Detailed Supabase Logging

Add this to your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

### Check Supabase Logs

1. Go to https://app.supabase.com/project/npbsrjtwwohlmkwrwwgn/logs/explorer
2. Look for errors in the logs
3. Filter by "postgres-logs" to see database errors

### Verify Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://npbsrjtwwohlmkwrwwgn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

All three must be correct.

### Manual Database Check

Go to Supabase → SQL Editor and run:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if users table has correct structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

You should see all 8 tables (orgs, users, pipelines, pipeline_stages, contacts, deals, tasks, activities).

## Success Indicators

When signup works, you should see in terminal:
```
=== Setup API Called ===
User ID: [uuid]
Email: test@example.com
Full Name: Test User
Org Name: Test Company
Admin client created
Creating organization...
Organization created successfully: [org-uuid]
Creating user profile...
User data: { id: [uuid], org_id: [org-uuid], email: 'test@example.com', full_name: 'Test User', role: 'admin' }
User profile created successfully
Creating default pipeline...
```

And in the browser:
- No error message
- Redirected to `/dashboard`
- Logged in successfully

## Need More Help?

Share these logs:
1. Your terminal output (the detailed logs)
2. Any error messages in browser console (F12)
3. Screenshot of Supabase Table Editor showing what tables exist
