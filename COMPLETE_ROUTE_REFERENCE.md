# Complete Route & Permission Configuration Reference

## All Application Routes

### Public Routes (No Authentication Required)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/auth` | Auth.tsx | Login/Registration page |
| `/forgot-password` | ForgotPassword.tsx | Password reset request |
| `/reset-password` | ResetPassword.tsx | Password reset completion |

### Protected Routes (Require Authentication)

#### Dashboard Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/` | RootRedirect | - | - | Redirects to role-specific dashboard |
| `/dashboard` | DashboardRedirect | dashboard | - | Redirects to role-specific dashboard |
| `/admin-dashboard` | Dashboard | dashboard | admin | Admin main dashboard |
| `/reception-dashboard` | ReceptionDashboard | dashboard | receptionist | Receptionist main dashboard |
| `/doctor-dashboard` | DoctorDashboard | dashboard | doctor | Doctor main dashboard |
| `/laboratory-dashboard` | LaboratoryDashboard | dashboard | lab_technician | Lab technician main dashboard |
| `/nursing-dashboard` | NursingDashboard | dashboard | nurse | Nurse main dashboard |
| `/pharmacy-dashboard` | PharmacyDashboard | dashboard | pharmacist | Pharmacist main dashboard |

#### Clinical & Patient Management Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/patients` | Patients | patients | - | Patient list and management |
| `/doctor-examination` | DoctorExamination | patients | - | Doctor examination form |
| `/appointments` | Appointments | appointments | - | Appointment management |
| `/admin/appointments` | AdminAppointments | appointments | admin | Admin appointment control |

#### Staff Management Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/staff` | Staff | staff | - | Staff list and management |
| `/staff-schedule` | StaffSchedule | staff | - | Staff scheduling |
| `/admin/users` | UserManagement | user_management | - | User and role management |

#### Laboratory & Pharmacy Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/laboratory` | Laboratory | laboratory | - | Lab test management |
| `/pharmacy` | Pharmacy | pharmacy | - | Drug inventory management |

#### Financial Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/billing` | Billing | billing | - | Patient billing |
| `/invoices` | Invoices | billing | - | Invoice management |
| `/accounts` | Accounts | accounts | - | Financial accounts |

#### Reporting Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/reports` | Reports | reports | - | Analytics dashboard (12 tabs) |
| `/generate-report` | GenerateReport | generate_reports | - | Staff report generation |
| `/generate-nurse-report` | GenerateNurseReport | dashboard | nurse | Nurse-specific report generation |
| `/submitted-reports` | SubmittedReports | generate_reports | admin | Admin report review & appraisal |

#### User Services Routes
| Route | Component | Required Module | Required Role | Purpose |
|-------|-----------|-----------------|---------------|---------|
| `/profile` | Profile | dashboard | - | User profile management |
| `/academic-documents` | AcademicDocuments | user_management | - | Staff document submission |
| `/admin/academic-documents` | ReviewAcademicDocuments | user_management | admin | Admin document review |

#### Error Route
| Route | Component | Purpose |
|-------|-----------|---------|
| `*` (any unmatched path) | NotFound | 404 error page |

---

## Module Permission Matrix

### Module List (12 Total)
1. **dashboard** - Access to main dashboard views
2. **patients** - Patient management (view, create, edit, delete)
3. **appointments** - Appointment management
4. **laboratory** - Lab test management
5. **pharmacy** - Pharmacy/drug management
6. **billing** - Patient billing and invoicing
7. **reports** - View analytics and reports
8. **generate_reports** - Create and submit custom reports
9. **accounts** - Financial/accounting functions
10. **staff** - Staff management
11. **staff_schedule** - Staff scheduling
12. **user_management** - User and role management

### Permission Levels (Per Module)
Each module has 4 granular permissions:
- `can_view` - Can view data
- `can_create` - Can create new records
- `can_edit` - Can modify existing records
- `can_delete` - Can delete records

### Default Role Permissions

#### Admin Role
**All modules**: ✅ Full access (view, create, edit, delete)
- Special privileges: Can manage all users, approve documents, review reports
- Dashboard: /admin-dashboard
- Key access points:
  - All dashboards
  - User management (/admin/users)
  - Document review (/admin/academic-documents)
  - Report appraisal (/submitted-reports)

#### Doctor Role
| Module | Permissions | Notes |
|--------|-------------|-------|
| dashboard | ✅ view | Access doctor dashboard |
| patients | ✅ view, create, edit | Full patient management |
| appointments | ✅ view, create, edit, delete | Full appointment access |
| laboratory | ✅ view, create | Can create/view lab requests |
| pharmacy | ✅ view | View-only pharmacy access |
| reports | ✅ view | Access analytics |
| generate_reports | ✅ view, create | Can generate reports |
| accounts | ❌ | No access |
| staff | ❌ | No access |
| staff_schedule | ❌ | No access |
| user_management | ✅ view, create | Can submit documents |

- Dashboard: /doctor-dashboard
- Cannot: Approve documents, manage users, manage schedules

#### Nurse Role
| Module | Permissions | Notes |
|--------|-------------|-------|
| dashboard | ✅ view | Access nurse dashboard |
| patients | ✅ view, create (limited) | Can view patients, add notes |
| appointments | ✅ view, edit | Can view/update appointments |
| laboratory | ✅ view | View lab results |
| pharmacy | ✅ view | View-only |
| reports | ✅ view | Access analytics |
| generate_reports | ✅ view, create | Can generate nursing reports |
| accounts | ❌ | No access |
| staff | ❌ | No access |
| staff_schedule | ❌ | No access |
| user_management | ✅ view, create | Can submit documents |

- Dashboard: /nursing-dashboard
- Special route: /generate-nurse-report

#### Receptionist Role
| Module | Permissions | Notes |
|--------|-------------|-------|
| dashboard | ✅ view | Access reception dashboard |
| patients | ✅ view | View patient info |
| appointments | ✅ view, create, edit, delete | Full appointment management |
| laboratory | ❌ | No access |
| pharmacy | ❌ | No access |
| billing | ✅ view, edit | View/update bills |
| reports | ✅ view | Access basic analytics |
| generate_reports | ❌ | No access |
| accounts | ❌ | No access |
| staff | ❌ | No access |
| staff_schedule | ❌ | No access |
| user_management | ❌ | No access |

- Dashboard: /reception-dashboard

#### Lab Technician Role
| Module | Permissions | Notes |
|--------|-------------|-------|
| dashboard | ✅ view | Access lab dashboard |
| patients | ✅ view | Can view patient data |
| appointments | ❌ | No access |
| laboratory | ✅ view, create, edit, delete | Full lab management |
| pharmacy | ❌ | No access |
| reports | ✅ view | Access lab-specific reports |
| generate_reports | ❌ | No access |
| accounts | ❌ | No access |
| staff | ❌ | No access |
| staff_schedule | ❌ | No access |
| user_management | ✅ view, create | Can submit documents |

- Dashboard: /laboratory-dashboard

#### Pharmacist Role
| Module | Permissions | Notes |
|--------|-------------|-------|
| dashboard | ✅ view | Access pharmacy dashboard |
| patients | ❌ | No access |
| appointments | ❌ | No access |
| laboratory | ❌ | No access |
| pharmacy | ✅ view, create, edit, delete | Full drug management |
| billing | ✅ view | View billing info |
| reports | ✅ view | Access reports |
| generate_reports | ❌ | No access |
| accounts | ❌ | No access |
| staff | ❌ | No access |
| staff_schedule | ❌ | No access |
| user_management | ✅ view, create | Can submit documents |

- Dashboard: /pharmacy-dashboard

---

## Authentication Flow

### Login Flow
```
User navigates to "/"
  ↓
RootRedirect checks auth
  ├─ Not authenticated: Redirect to "/auth"
  ├─ Authenticated: Redirect to role-specific dashboard
  └─ Loading: Show spinner

Login form at "/auth"
  ↓
User enters email/password
  ↓
Supabase.auth.signInWithPassword()
  ├─ Success: Tokens stored in localStorage
  ├─ Failure: Show error message
  └─ Updates AuthContext.user and AuthContext.roles
  ↓
Redirects to role-specific dashboard
```

### Protected Route Check
```
ProtectedRoute component validates:
  1. Is user authenticated?
     - No: Redirect to "/auth"
     - Yes: Continue
  
  2. Does user have required module permission?
     - No: Show "Access Denied" page
     - Yes: Continue
  
  3. If requiredRole specified, does user have that role?
     - No: Show "Access Denied" page
     - Yes: Render component
```

### Password Reset Flow
```
User at "/auth" clicks "Forgot Password"
  ↓
Redirects to "/forgot-password"
  ↓
User enters email
  ↓
supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })
  ↓
Email sent (1-2 minutes)
  ↓
User clicks link in email
  ↓
Redirected to "/reset-password" with #access_token in URL
  ↓
Supabase auto-creates session from token
  ↓
User enters new password
  ↓
supabase.auth.updateUser({ password })
  ↓
Session ended
  ↓
Redirect to "/auth"
  ↓
Login with new password
```

---

## Route Access Examples

### Scenario 1: New Receptionist User
```
1. Admin creates user with email receptionist@clinic.com, role: receptionist
2. Email sent with password reset link
3. User opens /reset-password with token
4. Sets password
5. Redirected to /auth
6. Logs in
7. Redirected to /reception-dashboard (role-based)
8. Can access: /patients (view only), /appointments (full), /billing (view)
9. Cannot access: /laboratory, /staff, /generate-report, /admin/users
```

### Scenario 2: Doctor Submitting Report
```
1. Doctor logs in → /doctor-dashboard
2. Sees "Reports" in sidebar
3. Clicks "Generate Report" → /generate-report
4. Route checks: has "generate_reports" module with "create"? Yes
5. Selects report type (7 options)
6. Generates and downloads CSV
7. Can also submit for admin appraisal
```

### Scenario 3: Admin Reviewing Documents
```
1. Admin logs in → /admin-dashboard
2. Sees "User Management" sidebar section
3. Clicks "Review Documents" → /admin/academic-documents
4. Route checks: has "user_management" AND is admin role? Yes
5. Views list of pending documents
6. Reviews, comments, approves/rejects
7. Staff receives notification
```

### Scenario 4: Unauthorized Access Attempt
```
1. Lab Tech tries to access /staff-schedule
2. Route protection checks: user.roles includes required role? No
3. Shows "Access Denied" error page
4. Suggests going back to dashboard
```

---

## Configuration Notes

### ProtectedRoute Component
Located in `src/components/layout/ProtectedRoute.tsx`

```typescript
<ProtectedRoute 
  module="generate_reports"           // Required module
  requiredRole="admin"                // Optional: specific role required
  requiredAction="create"             // Optional: specific action type
>
  <YourComponent />
</ProtectedRoute>
```

### Checking Permissions in Components

```typescript
// Using usePermissions hook
const { hasPermission, canAccessModule } = usePermissions();

// Check specific action on module
if (hasPermission('generate_reports', 'create')) {
  // Show create button
}

// Check module access
if (canAccessModule('laboratory')) {
  // Show laboratory menu item
}
```

### Adding New Routes

Template for adding new routes:
```typescript
<Route path="/new-feature" element={
  <ProtectedRoute module="new_module" requiredRole="admin">
    <NewFeature />
  </ProtectedRoute>
} />
```

Then add the module to:
1. `src/types/roles.ts` - Add to RoleModulePermissions interface
2. `src/hooks/usePermissions.tsx` - Add to ModuleName type
3. Database - seeded in role_permissions table

---

## Testing Route Access

### By Role
```
Admin test user: 
  - Can access all routes except public routes return to dashboard
  - /admin-dashboard loads
  - /submitted-reports loads
  - /admin/academic-documents loads

Doctor test user:
  - /doctor-dashboard loads
  - /generate-report loads
  - /admin/academic-documents returns Access Denied
  - /staff returns Access Denied

Receptionist test user:
  - /reception-dashboard loads
  - /appointments loads
  - /generate-report returns Access Denied
  - /laboratory returns Access Denied
```

### By Permission
```
For any user, verify:
  - Accessible module pages load ✅
  - Inaccessible module pages show Access Denied ✅
  - Sidebar shows only allowed options ✅
  - Buttons for restricted actions are hidden ✅
```

---

## Troubleshooting Routes

### User always redirected to /auth
- Check if user session is valid in browser localStorage
- Check if Supabase credentials are correct
- User may be logged out (5-minute inactivity timeout)

### "Access Denied" showing for authorized user
- Check user's roles in profiles/user_roles tables
- Verify role has permission for the module
- Clear browser cache (Ctrl+Shift+Delete)
- Check with admin role (admin bypasses most checks)

### Route parameters not working
- Routes are case-sensitive: /Doctor-Dashboard ≠ /doctor-dashboard
- Use exact paths from this reference
- Check for trailing slashes: /reports/ ≠ /reports

### Profile page not loading
- `/profile` requires authenticated user
- Check login works first
- Module "dashboard" must be accessible
- Check browser console for JavaScript errors

---

**Last Updated**: February 15, 2026
**Application Version**: 1.0.0
**Documentation Version**: 2.0 (Complete Route & Permission Reference)
