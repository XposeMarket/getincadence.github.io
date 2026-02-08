# CRITICAL: Organization Data Isolation Fix

## The Problem
**ALL data queries are missing `org_id` filtering!** This means:
- Every org can see ALL contacts, companies, deals, tasks, activities
- Complete data breach between organizations
- Zero data isolation

## The Root Cause
Every Supabase query in the app looks like this:
```typescript
// WRONG - No org_id filter!
supabase.from('contacts').select('*')
supabase.from('deals').select('*')
supabase.from('activities').select('*')
```

## The Solution
Every query MUST filter by `org_id`:
```typescript
// CORRECT - Filters by organization
const orgId = await getCurrentUserOrgId()
supabase.from('contacts').select('*').eq('org_id', orgId)
supabase.from('deals').select('*').eq('org_id', orgId)
supabase.from('activities').select('*').eq('org_id', orgId)
```

## Files That Need Fixing

### 1. Dashboard (`app/(dashboard)/dashboard/page.tsx`)
**Lines 135-158** - ALL queries missing org_id:

```typescript
// BEFORE (BROKEN):
const [activitiesRes, contactsRes, companiesRes, dealsRes, ...] = await Promise.all([
  supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(50),
  supabase.from('contacts').select('id', { count: 'exact', head: true }),
  supabase.from('companies').select('id', { count: 'exact', head: true }),
  supabase.from('deals').select('id, name, amount'),
  supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  // ... more queries
])

// AFTER (FIXED):
const orgId = await getCurrentUserOrgId()
if (!orgId) {
  setLoading(false)
  return
}

const [activitiesRes, contactsRes, companiesRes, dealsRes, ...] = await Promise.all([
  supabase.from('activities').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
  supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  supabase.from('companies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  supabase.from('deals').select('id, name, amount').eq('org_id', orgId),
  supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open'),
  // ... add .eq('org_id', orgId) to ALL queries
])
```

### 2. Contacts Page (`app/(dashboard)/contacts/page.tsx`)
Add org_id filter to:
- Contact list query
- Search query
- Stats query

### 3. Companies Page (`app/(dashboard)/companies/page.tsx`)
Add org_id filter to:
- Company list query
- Search query
- Stats query

### 4. Deals Page (`app/(dashboard)/deals/page.tsx`)
Add org_id filter to:
- Deals query by pipeline stage
- Pipeline query
- Stats query

### 5. Tasks Page (`app/(dashboard)/tasks/page.tsx`)
Add org_id filter to:
- Tasks list query
- Task creation
- Task updates

### 6. Individual Record Pages
- `app/(dashboard)/contacts/[id]/page.tsx` - Verify contact belongs to org
- `app/(dashboard)/companies/[id]/page.tsx` - Verify company belongs to org
- `app/(dashboard)/deals/[id]/page.tsx` - Verify deal belongs to org

## Implementation Steps

### Step 1: Add the Helper
File already created: `lib/org-helpers.ts`

```typescript
import { getCurrentUserOrgId } from '@/lib/org-helpers'
```

### Step 2: Fix Dashboard (HIGH PRIORITY)
File: `app/(dashboard)/dashboard/page.tsx`

Replace the `loadData` function around line 120:

```typescript
const loadData = async () => {
  setLoading(true)

  // GET ORG ID FIRST
  const orgId = await getCurrentUserOrgId()
  if (!orgId) {
    console.error('No org_id found for user')
    setLoading(false)
    return
  }

  // Add .eq('org_id', orgId) to EVERY query
  let activityQuery = supabase
    .from('activities')
    .select('*')
    .eq('org_id', orgId)  // ADD THIS
    .order('created_at', { ascending: false })
    .limit(50)

  // Apply filter logic...
  if (filter === 'contacts') {
    activityQuery = activityQuery.or('activity_type.eq.contact_created,activity_type.eq.contact_updated')
  } // ... etc

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [activitiesRes, contactsRes, companiesRes, dealsRes, tasksCountRes, activities7Res, activities30Res, tasksListRes, overdueTasksRes, dueTodayTomorrowRes] = await Promise.all([
    activityQuery,
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('deals').select('id, name, amount').eq('org_id', orgId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open'),
    supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', sevenDaysAgo),
    supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', thirtyDaysAgo),
    supabase.from('tasks').select('id, title, due_date, status').eq('org_id', orgId).eq('status', 'open').order('due_date', { ascending: true }).limit(10),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).lt('due_date', now.toISOString()).not('status', 'eq', 'completed'),
    supabase.from('tasks').select('id, title, due_date').eq('org_id', orgId).neq('status', 'completed').lte('due_date', format(tomorrow, 'yyyy-MM-dd')).gte('due_date', format(now, 'yyyy-MM-dd')).order('due_date', { ascending: true })
  ])

  // Rest of the function stays the same...
  if (activitiesRes.data) setActivities(activitiesRes.data)

  const deals = dealsRes.data || []
  const recent7DealIds = new Set((activities7Res.data || []).map((a: any) => a.deal_id).filter(Boolean))
  const recent30DealIds = new Set((activities30Res.data || []).map((a: any) => a.deal_id).filter(Boolean))

  const noActivityList = deals.filter((d: any) => !recent7DealIds.has(d.id)).slice(0, 5)
  const stalledList = deals.filter((d: any) => !recent30DealIds.has(d.id)).slice(0, 5)
  const overdueTasksListLocal = (tasksListRes.data || []).filter((t: any) => t.due_date && new Date(t.due_date) < now).slice(0, 5)

  setStats({
    contacts: contactsRes.count || 0,
    companies: companiesRes.count || 0,
    deals: deals.length || 0,
    tasks: tasksCountRes.count || 0,
    noActivity7: noActivityList.length,
  })

  setTasksList(tasksListRes.data || [])
  setNoActivity7List(noActivityList)
  setStalledDealsList(stalledList)
  setOverdueTasksList(overdueTasksListLocal)
  setDueTodayTomorrowList(dueTodayTomorrowRes.data || [])

  setLoading(false)
}
```

### Step 3: Fix All Other Pages
Apply the same pattern to EVERY page that queries data:
1. Import `getCurrentUserOrgId`
2. Get org_id at the start of data fetching
3. Add `.eq('org_id', orgId)` to EVERY query

## Testing After Fix

1. **Create test data in Account 1**:
   - Add a contact named "Test Contact A"
   - Add a deal named "Test Deal A"

2. **Log out and create Account 2**

3. **Check Account 2 dashboard**:
   - Should show ZERO contacts, deals, tasks
   - Should NOT see "Test Contact A" or "Test Deal A"

4. **Create test data in Account 2**:
   - Add a contact named "Test Contact B"

5. **Log back into Account 1**:
   - Should ONLY see "Test Contact A"
   - Should NOT see "Test Contact B"

## Why This Happened

The app was built without proper multi-tenancy from the start. The database has `org_id` columns, but the application queries never used them.

## Security Impact

**CRITICAL**: This is a complete data breach. Any user can:
- See all contacts from all organizations
- See all deals from all organizations  
- See all tasks from all organizations
- Potentially modify data from other orgs

## Priority

**🔴 CRITICAL - FIX IMMEDIATELY**

This must be fixed before any production use or additional users are added.
