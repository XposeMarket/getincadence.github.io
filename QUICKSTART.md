# Cadence CRM - Signup Fix Guide

## The Problem
Getting "Failed to create user profile" when trying to sign up.

## The Solution
Your database tables don't exist yet. Here's how to fix it in **3 minutes**:

---

## 🚀 Quick Start (3 Steps)

### 1️⃣ Create Database Tables

**Go here:** https://app.supabase.com/project/npbsrjtwwohlmkwrwwgn/sql/new

**Then:**
1. Open file: `supabase/migrations/000_initial_schema.sql` (in your project)
2. Copy the ENTIRE contents (Ctrl+A, Ctrl+C)
3. Paste into the SQL Editor in Supabase
4. Click **RUN** (or press Ctrl+Enter)
5. Wait 3-5 seconds for "Success" message

**Verify it worked:**
- Click on **Table Editor** in Supabase sidebar
- You should see 8 new tables: `orgs`, `users`, `pipelines`, `pipeline_stages`, `contacts`, `deals`, `tasks`, `activities`

### 2️⃣ Disable Email Confirmation (Optional, for easier testing)

**Go here:** https://app.supabase.com/project/npbsrjtwwohlmkwrwwgn/auth/providers

**Then:**
1. Click on **Email** provider
2. Toggle OFF **"Confirm email"**
3. Click **Save**

This lets you sign up instantly without waiting for a confirmation email.

### 3️⃣ Try Signing Up Again

1. Go to http://localhost:3000/signup
2. Use a **NEW email** (one you haven't tried before)
   - Example: `test123@example.com`
3. Fill out the form:
   - Full name: Your Name
   - Email: test123@example.com
   - Company: Test Company
   - Password: test1234 (at least 8 characters)
4. Click **Create account**

**You should:**
✅ See a loading spinner
✅ Get redirected to `/dashboard`
✅ Be logged in successfully!

---

## 📋 What Changed

I've updated these files to help you debug:

### Updated Files:
1. **`app/(auth)/signup/page.tsx`**
   - Better error handling
   - Handles both confirmed and unconfirmed signups
   - Clearer error messages

2. **`app/api/auth/setup/route.ts`**
   - Added detailed logging
   - Shows exactly what's happening during signup
   - Better error messages

3. **New Files Created:**
   - `supabase/migrations/000_initial_schema.sql` - Complete database schema
   - `app/(auth)/verify-email/page.tsx` - Email verification page
   - `app/auth/callback/route.ts` - Handles email confirmation links
   - `DATABASE_SETUP.md` - Detailed setup instructions
   - `TROUBLESHOOTING.md` - Debug guide
   - `QUICKSTART.md` - This file!

---

## 🔍 How to Debug

Check your **terminal** where Next.js is running. You'll now see logs like:

```
=== Setup API Called ===
User ID: abc-123-xyz
Email: test@example.com
Full Name: Test User
Org Name: Test Company
Admin client created
Creating organization...
Organization created successfully: org-xyz
Creating user profile...
User profile created successfully ✅
```

If something fails, the logs will tell you exactly what went wrong.

---

## ❌ Still Not Working?

### Check these:

1. **Did you run the SQL migration?**
   - Go to Supabase Table Editor
   - Do you see 8 tables?
   - If NO → Go back to Step 1

2. **Are you using a new email?**
   - Don't reuse emails you've tried before
   - Try: `yourname+test1@gmail.com`

3. **Is your .env.local correct?**
   - Check file exists: `D:\Websites\Cadence\.env.local`
   - Has all 3 Supabase keys

4. **Check terminal logs**
   - Look for error messages
   - Share them if you need help

### Get More Help

Read the detailed guides:
- **`TROUBLESHOOTING.md`** - Full debugging guide
- **`DATABASE_SETUP.md`** - Database setup details

---

## ✅ Success Checklist

After signup works, you should have:

- [x] User account in Supabase Auth
- [x] User profile in `users` table
- [x] Organization in `orgs` table
- [x] Default pipeline with 6 stages
- [x] Logged in to dashboard
- [x] No errors in console

---

## 🎯 Next Steps

Once signup works:

1. **Test the dashboard** - Make sure it loads
2. **Create a contact** - Test the contacts page
3. **Create a deal** - Test the deals page
4. **Check settings** - We already analyzed this page!

Need help with any of these? Let me know! 🚀
