# Security Verification Checklist

## Pre-Testing Setup
- [ ] Application running locally or in staging
- [ ] Browser DevTools open (F12)
- [ ] Admin account available for testing
- [ ] Test user account with limited permissions

---

## Test 1: localStorage Has No Session Tokens ✅

### Steps:
1. Open browser DevTools (F12)
2. Go to **Application** → **Storage** → **Local Storage** → Select your domain
3. Verify the following keys are **NOT present**:
   - `sessionToken`
   - `auth_token`
   - `access_token`
   - `jwt`
   - `token`
   - `bearer_token`

### Result:
- [ ] Only safe data present (theme, language, preferences)
- [ ] No JWT tokens visible in localStorage
- [ ] **PASS** / **FAIL**

### Security Implication:
- Prevents XSS attacks from stealing authentication tokens via `localStorage.getItem()`

---

## Test 2: JWT Not Exposed to JavaScript ✅

### Steps:
1. Navigate to any authenticated page (e.g., dashboard)
2. Open DevTools Console (F12 → Console tab)
3. Run these commands:
   ```javascript
   // Check window object for tokens
   console.log(window.jwt);
   console.log(window.token);
   console.log(window.sessionToken);
   console.log(window.authToken);
   ```
4. All should return `undefined`

5. Check sessionStorage:
   ```javascript
   console.log(sessionStorage.getItem('token'));
   console.log(sessionStorage.getItem('jwt'));
   ```
6. Should return `null`

7. Look at Network tab → any request → Headers:
   - JWT should **only appear in `Authorization` header**
   - Never in request body, URL, or cookies (unless httpOnly + Secure flags)

### Result:
- [ ] All window properties return `undefined`
- [ ] sessionStorage has no tokens
- [ ] Authorization header contains JWT (in request headers)
- [ ] No token in URL query parameters
- [ ] **PASS** / **FAIL**

### Security Implication:
- If XSS occurs, attacker can't access JWT via JavaScript
- Token only accessible via HTTP headers (requires deeper attack)

---

## Test 3: Can't Access Pages Without Authentication ✅

### Steps:
1. **Sign out** of the application
2. Manually enter these URLs in address bar:
   - `localhost:5173/dashboard`
   - `localhost:5173/reception`
   - `localhost:5173/pharmacy`
   - `localhost:5173/user-management`

### Expected Behavior:
- [ ] All pages redirect to `/auth` (login page)
- [ ] Cannot see page content
- [ ] URL changes to `/auth` immediately

3. Now **sign in** with valid credentials
4. Repeat steps 2-3 with same URLs

### Result:
- [ ] Without auth: All pages redirect to login
- [ ] With auth: All pages load normally
- [ ] **PASS** / **FAIL**

### Security Implication:
- Prevents unauthorized access via direct URL manipulation

---

## Test 4: Can't Manipulate JWT in Browser ✅

### Steps:
1. Open DevTools Console on authenticated page
2. Try to inject a fake token:
   ```javascript
   // This should NOT work
   localStorage.setItem('token', 'fake_jwt_token_12345');
   ```
3. Refresh the page or navigate to a protected route

### Expected Behavior:
- [ ] Application still works normally (uses Supabase's internal JWT)
- [ ] Injected token is ignored
- [ ] Real JWT comes from Supabase session, not localStorage

4. Try accessing the Network tab and modifying Authorization header:
   - [ ] You cannot modify request headers from Console (browser prevents this)
   - [ ] Any manual modification would fail signature validation at Supabase

### Result:
- [ ] Cannot inject fake tokens via localStorage
- [ ] Cannot modify Authorization headers from console
- [ ] Server-side validation rejects invalid JWTs
- [ ] **PASS** / **FAIL**

### Security Implication:
- JWT signature verified server-side using RS256 key that only Supabase has
- Attacker cannot forge tokens even if they steal one

---

## Test 5: Session Persists Across Page Refresh ✅

### Steps:
1. Sign in to application
2. Navigate to `/dashboard` (or any protected page)
3. Open DevTools → Network tab
4. **Refresh page** (F5 or Ctrl+R)

### Expected Behavior:
- [ ] Page loads immediately (no redirect to login)
- [ ] Network request shows JWT in Authorization header
- [ ] Session restored automatically

### Result:
- [ ] Session persists after page refresh
- [ ] No re-login required
- [ ] JWT restored from Supabase session
- [ ] **PASS** / **FAIL**

### Security Implication:
- JWT stored in memory means page refresh correctly restores session
- XSS attacker cannot steal token (no localStorage fallback)

---

## Test 6: Multiple Tabs Share Same Session ✅

### Steps:
1. Sign in on **Tab 1**
2. Open **Tab 2** to same application
3. Navigate to `/dashboard` on Tab 2

### Expected Behavior:
- [ ] Tab 2 shows dashboard (already authenticated via shared session)
- [ ] Both tabs use same Supabase session
- [ ] Logout on Tab 1 affects Tab 2

### Steps to verify logout sync:
1. Sign out on **Tab 1**
2. Try to load protected page on **Tab 2**

### Expected Behavior:
- [ ] Tab 2 detects session loss
- [ ] Redirects to login on Tab 2

### Result:
- [ ] Sessions synced across multiple tabs
- [ ] Logout affects all tabs
- [ ] **PASS** / **FAIL**

### Security Implication:
- Prevents attacker from using old sessions in other tabs
- Centralized session management at Supabase level

---

## Test 7: Password Policy Enforced ✅

### Steps:
1. Navigate to password reset page
2. Try these passwords:

| Password | Should Block? | Reason |
|----------|---------------|--------|
| `abc123` | ✅ YES | Missing uppercase |
| `Abcdefgh` | ✅ YES | Missing number |
| `Abc1` | ✅ YES | Too short (< 8) |
| `ValidPass123` | ❌ NO | Meets all requirements |

3. For each password:
   - Watch the requirements checklist appear
   - Verify ✓/✗ marks update in real-time
   - Try to submit (should be disabled until valid)

### Result:
- [ ] Invalid passwords blocked with clear feedback
- [ ] Valid password allows submission
- [ ] Requirements display correctly
- [ ] **PASS** / **FAIL**

### Security Implication:
- Prevents weak passwords
- Real-time feedback improves user experience while maintaining security

---

## Test 8: RLS Policies Enforce Authorization ✅

### Steps:
1. **Sign in as Doctor**
2. Navigate to Patients page
3. Verify you can only see **your own patients**

4. Try to manually query another doctor's patients:
   ```javascript
   // Open DevTools Console
   // (This is for testing only - should fail)
   ```

### Expected Behavior:
- [ ] Can view own patients only
- [ ] Cannot see other doctors' patient data
- [ ] Database RLS policy prevents unauthorized access

5. **Sign in as Pharmacist**
6. Try to delete a medication (should succeed)

7. Try to delete a doctor's examination (should fail)

### Result:
- [ ] RLS policies correctly restrict data access
- [ ] Role-based access control enforced
- [ ] **PASS** / **FAIL**

### Security Implication:
- Even if JWT somehow leaked, attacker can only access their own role's data
- Database-level security prevents data breaches

---

## Summary Results Table

| Test | Status | Notes |
|------|--------|-------|
| 1. No tokens in localStorage | [ ] PASS / [ ] FAIL | |
| 2. JWT not in JavaScript scope | [ ] PASS / [ ] FAIL | |
| 3. Unauthenticated access blocked | [ ] PASS / [ ] FAIL | |
| 4. JWT manipulation prevented | [ ] PASS / [ ] FAIL | |
| 5. Session persists on refresh | [ ] PASS / [ ] FAIL | |
| 6. Multi-tab session sync | [ ] PASS / [ ] FAIL | |
| 7. Password policy enforced | [ ] PASS / [ ] FAIL | |
| 8. RLS authorization works | [ ] PASS / [ ] FAIL | |

## Overall Result
- [ ] **ALL PASS** - System is secure
- [ ] **Some failures** - See notes above and fix issues

---

## Remediation (if failures occur)

### If localStorage contains tokens:
- [ ] Check AuthContext.tsx - sessionToken should not be stored
- [ ] Remove any `localStorage.setItem('sessionToken'...)`

### If JWT visible in JavaScript:
- [ ] Check window property assignments
- [ ] Remove any `window.token =` assignments
- [ ] Verify Supabase auth is handling JWT storage

### If pages accessible without auth:
- [ ] Check route guards in main router
- [ ] Verify `useAuth()` hook validates user

### If RLS failures:
- [ ] Review database policies in Supabase dashboard
- [ ] Verify policies match user roles
- [ ] Test with Supabase SQL editor

---

## Additional Security Notes

✅ **Currently Implemented:**
- In-memory JWT storage by Supabase SDK
- 45-minute auto-refresh before 60-min expiration
- RS256 signature verification at server
- RLS policies enforced at database level
- Password complexity requirements
- XSS protection via no localStorage tokens

⚠️ **Future Enhancements (not in scope):**
- CSRF token validation (httpOnly cookies with SameSite)
- Rate limiting on login attempts
- Account lockout after failed attempts
- Session audit logs
- Device fingerprinting
- 2FA/MFA implementation
