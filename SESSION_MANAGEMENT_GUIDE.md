# Session Management & Duplicate Records Issue

## Problem Statement
When multiple people log into the same account simultaneously from different computers, it can cause:
1. **Duplicate Records**: Multiple users creating records with the same created_by ID
2. **Data Conflicts**: Concurrent writes causing data inconsistencies
3. **Audit Trail Issues**: Unable to track which physical person took which action
4. **Security Risk**: Unauthorized access if account credentials are shared

## Current System Status
- ✅ **Supabase Auth**: Handles authentication
- ✅ **Row-Level Security (RLS)**: Enforces data access policies
- ❌ **Session Tracking**: Not currently implemented
- ❌ **Concurrent Login Prevention**: Not enforced

## Recommendations

### Option 1: Single Session Per User (RECOMMENDED for Healthcare)
**Best for**: Medical systems where audit trails are critical and accountability must be clear

**Implementation**:
- Only allow 1 active session per user at a time
- When user logs in from a new device, automatically log them out from the old device
- Timestamp each action with user ID + session ID for full auditability

**Pros**:
- Eliminates duplicate records from same user
- Clear audit trail - always know exactly which person took which action
- Prevents credential sharing
- Better compliance with healthcare regulations (HIPAA, GDPR)

**Cons**:
- Frustrated staff if they need to work from multiple devices
- Support requests when deployments log users out

### Option 2: Multiple Sessions with User/Device Tracking (ALTERNATIVE)
**Best for**: Systems where staff may need multiple simultaneous logins (e.g., support tickets)

**Implementation**:
- Allow multiple sessions per user
- Track device info, IP, and timestamp for each session
- Require users to explicitly select which device made each action
- Implement audit logging that includes session ID

**Pros**:
- More flexible for staff workflows
- Still maintains audit trail
- Enables multi-device workflows

**Cons**:
- More complex implementation
- Users must select device context for each action
- Doesn't prevent accidental credential sharing

### Option 3: Role-Based Concurrent Limits
**Best for**: Hybrid approach

**Implementation**:
- Pharmacists: Maximum 1 concurrent session (critical role)
- Doctors: Maximum 2 concurrent sessions (may need multi-device)
- Nurses: Maximum 2 concurrent sessions
- Receptionists: Maximum 3 concurrent sessions
- Admins: Unlimited (with audit logging)

## What's Been Created

### Migration: `20260216_create_user_sessions_tracking.sql`
Creates infrastructure for session tracking:
- `user_sessions` table with session tokens, expiration, device info
- RLS policies for user privacy
- `cleanup_expired_sessions()` function for maintenance

## What Still Needs Implementation

### Frontend Changes Needed
1. Store session token in localStorage/sessionStorage after login
2. Include session token in API requests
3. Handle session expiration with re-authentication prompt
4. Detect logout from other device and prompt user to log back in

### Backend Changes Needed
1. Update login flow to:
   - Generate session token
   - Check for existing active sessions
   - Either: Terminate old session (Option 1) OR create new session (Option 2)
2. Update every Create/Update operation to include session_id in audit logs
3. Implement session cleanup job to remove expired sessions

### Authentication Context
Location: `src/contexts/AuthContext.tsx` or similar

Changes needed:
```typescript
// After successful login
const sessionToken = generateSessionToken();
await trackSession(userId, sessionToken, deviceInfo);

// Before any data mutation
const mutation = useMyMutation({
  mutationFn: async (data) => {
    // Include current session in request
    return await api.post('/endpoint', {
      ...data,
      session_id: currentSessionToken
    });
  }
});
```

## How It Fixes Duplicate Records

**Before** (Multiple concurrent sessions):
```
User Role: Pharmacist
Device 1: Logged in 09:00 AM (creates 5 invoices)
Device 2: Logged in 09:15 AM (creates 5 more invoices with same timestamp range)
⚠️ Result: 10 invoices created, audit unclear who created which
```

**After** (Single session enforcement):
```
User Role: Pharmacist
Device 1: Logged in 09:00 AM (creates 5 invoices)
Device 2: Login attempt → Auto-logout from Device 1 → Session token invalidated
         → Re-authentication required on Device 1
✅ Result: 5 invoices, clear audit trail, no duplicates
```

## Immediate Steps

1. **Apply Migration** (Already prepared in migrations folder)
   ```bash
   supabase migration up
   ```

2. **Review Temporary Workaround**
   - Document which staff members have shared accounts
   - Create individual user accounts for each person
   - This is essential for audit trails in healthcare settings

3. **Inform Team** (Before implementing enforced single-session)
   - Staff should log out before switching devices
   - If logged in from Device 1, they cannot access from Device 2 until Device 1 logs out
   - This prevents duplicate records and ensures accountability

## GDPR/HIPAA Compliance Notes

For healthcare systems, having concurrent sessions from same user is risky:
- **GDPR**: Cannot clearly identify who accessed/modified data
- **HIPAA**: Audit logs must show who accessed PHI (Protected Health Information)
- **Legal**: If error occurs, cannot determine blame/responsibility

**Recommendation**: Implement Option 1 (Single Session Per User) for full compliance

## Testing the Fix

1. **Current Issue**: Try logging in from 2 computers with same account
   - Both sessions should be prevented or tracked
   
2. **After Fix**: Try logging in from 2 computers with same account
   - Device 2 login should either:
     - Fail with message "Already logged in from another device"
     - Or: Succeed but Device 1 session becomes invalid

3. **Duplicate Check**: 
   - Create data from Device 1
   - Verify if Device 2 login is blocked or only allows viewing

## Timeline

- **Immediate**: Communicate to staff about account sharing
- **This Week**: Apply user_sessions migration  
- **Next Sprint**: Implement frontend session handling + enforced single-session logic
- **Following Sprint**: Add comprehensive audit logging with session IDs

