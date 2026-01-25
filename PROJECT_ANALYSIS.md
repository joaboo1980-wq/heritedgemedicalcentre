# Heritage Medical Centre - Hospital Management System Analysis

## Project Overview
This is a **React + TypeScript + Vite** hospital management system with **Supabase** backend, featuring role-based access control (RBAC), patient management, appointments, laboratory tests, pharmacy, billing, and reporting.

---

## Architecture & Tech Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router v6.30.1
- **State Management**: TanStack React Query 5.83.0
- **Form Handling**: React Hook Form 7.61.1 + Zod 3.25.76 (validation)
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.17
- **Notifications**: Sonner 1.7.4
- **Icons**: Lucide React 0.462.0
- **Charts**: Recharts 2.15.4

### Backend
- **Database**: Supabase (PostgreSQL 14.1)
- **Authentication**: Supabase Auth (JWT-based)
- **Real-time**: Supabase Realtime subscriptions
- **API**: Supabase REST API

### Environment Variables (.env)
```
VITE_SUPABASE_PROJECT_ID=krhpwnjcwmwpocfkthog
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://krhpwnjcwmwpocfkthog.supabase.co
```

---

## Application Flow

### 1. Authentication Flow
```
User → Auth Page (/auth)
  ↓
Email/Password Sign-In (Supabase Auth)
  ↓
AuthContext (src/contexts/AuthContext.tsx)
  ├─ Fetch User Session
  ├─ Fetch User Profile (from profiles table)
  └─ Fetch User Roles (via RPC: get_user_roles)
  ↓
If authenticated → Redirect to /dashboard
If not → Stay on /auth
```

**Key Components**:
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) - Authentication state management
- [src/pages/Auth.tsx](src/pages/Auth.tsx) - Login page

**User State includes**:
- `user` - Supabase Auth user object
- `session` - JWT session
- `profile` - User profile (full_name, email, avatar_url, department)
- `roles` - Array of roles assigned to user
- `loading` - Auth state loading indicator

---

## Database Schema

### Core Tables

#### 1. **auth.users** (Supabase managed)
- Authentication users with email/password

#### 2. **profiles**
```
id (UUID) → profiles table PK
user_id (UUID) → References auth.users
full_name, email, avatar_url, department
created_at, updated_at
```
Purpose: Extended user information

#### 3. **user_roles**
```
id (UUID) → PK
user_id (UUID) → References auth.users
role (app_role ENUM)
created_at
Constraint: UNIQUE(user_id, role)
```
Roles: `admin`, `doctor`, `nurse`, `receptionist`, `lab_technician`, `pharmacist`

#### 4. **role_permissions**
```
id (UUID) → PK
role (app_role) - Which role
module (TEXT) - Which module (dashboard, patients, appointments, laboratory, pharmacy, billing, reports, staff, user_management)
can_view, can_create, can_edit, can_delete (BOOLEAN)
created_at, updated_at
```

### Clinical Data Tables

#### 5. **patients**
```
id, patient_number (unique), first_name, last_name
date_of_birth, gender (male/female/other)
phone, email, address
blood_type (A+, A-, B+, B-, AB+, AB-, O+, O-, NULL)
allergies (TEXT[]), medical_notes
emergency_contact_name, emergency_contact_phone
insurance_provider, insurance_number
created_by (UUID) → References auth.users
created_at, updated_at
```
**RPC Function**: `insert_patient()` - Atomically creates patient with auto-generated patient_number (P2026-XXXXX format)

#### 6. **appointments**
```
id, patient_id (FK → patients), doctor_id (FK → auth.users)
appointment_date, appointment_time, duration_minutes (default: 30)
status (scheduled, confirmed, in_progress, completed, cancelled, no_show)
reason, notes, department
created_at, updated_at
```

#### 7. **lab_tests** (Test Catalog)
```
id, test_code (unique), test_name
category, description, normal_range, unit
price, turnaround_hours (default: 24)
created_at
```
**Examples**: CBC, Glucose, TSH, CRP, Blood Culture, etc. (~100+ tests standardized)

#### 8. **lab_orders**
```
id, order_number (unique), patient_id (FK), ordered_by (FK → auth.users)
test_id (FK → lab_tests)
status (pending, sample_collected, processing, completed, cancelled)
priority (normal, urgent, stat)
result_value, result_notes, is_abnormal
sample_collected_at, completed_at, completed_by (FK → auth.users)
created_at, updated_at
```

#### 9. **medications**
```
id, medication_code (unique), name, generic_name
category, form (tablet, capsule, syrup, injection, cream, drops, inhaler, other)
strength, manufacturer
unit_price, stock_quantity, reorder_level
expiry_date, requires_prescription
created_at, updated_at
```

#### 10. **prescriptions**
```
id, prescription_number (unique), patient_id (FK)
prescribed_by (FK → auth.users), appointment_id (FK → appointments, optional)
status (pending, dispensed, partially_dispensed, cancelled)
notes
created_at, updated_at
```

#### 11. **prescription_items** (Line items for prescriptions)
```
id, prescription_id (FK), medication_id (FK)
quantity, dosage, frequency, duration, instructions
dispensed_quantity
created_at
```

#### 12. **invoices** (Billing)
```
id, invoice_number (unique), patient_id (FK)
appointment_id (FK, optional)
status (draft, pending, paid, partially_paid, cancelled, overdue)
subtotal, tax_amount, discount_amount, total_amount, amount_paid
due_date, notes
created_by (FK → auth.users)
created_at, updated_at
```

#### 13. **invoice_items** (Line items for invoices)
```
id, invoice_id (FK)
description, item_type (consultation, lab_test, medication, procedure, room, other)
quantity, unit_price, total_price
created_at
```

#### 14. **payments**
```
id, payment_number (unique), invoice_id (FK)
amount, payment_method (cash, card, mobile_money, insurance, bank_transfer)
reference_number, received_by (FK → auth.users), notes
created_at
```

#### 15. **notifications**
```
id, user_id (FK → auth.users)
title, message, type (lab_result, appointment, low_stock, billing, system)
priority (low, normal, high, urgent)
is_read, read_at
reference_id, reference_type
created_at
```

---

## Row Level Security (RLS) Policies

### General Rules:
- **Admins**: Full access to all modules
- **Doctors**: Can view/create/update clinical data
- **Nurses**: Can view/update clinical data
- **Receptionist**: Can view patients, manage appointments
- **Lab Technician**: Can view/update lab orders
- **Pharmacist**: Can view medications, manage prescriptions

### Key Functions:
```sql
has_role(_user_id, _role) → BOOLEAN
get_user_roles(_user_id) → SETOF app_role
has_module_permission(_user_id, _module, _permission) → BOOLEAN
insert_patient(...) → patients row (RPC function)
```

---

## Application Pages & Routes

### Route Structure (Protected via `ProtectedRoute` component)
```
/                          → Redirects to /dashboard or /auth
/auth                      → Login page (public)
/dashboard                 → Dashboard with stats and charts (protected)
/patients                  → Patient management (protected)
/appointments              → Appointment scheduling (protected)
/laboratory                → Lab orders and tests (protected)
/pharmacy                  → Medications and prescriptions (protected)
/staff                     → Staff management (protected)
/billing                   → Invoice and payment management (protected)
/reports                   → Analytics and reports (protected)
/admin/users               → User and role management (admin only)
*                          → 404 Not Found page
```

### Page Components:
- [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) - Stats, charts, recent activity
- [src/pages/Patients.tsx](src/pages/Patients.tsx) - Patient list, CRUD operations
- [src/pages/Appointments.tsx](src/pages/Appointments.tsx) - Schedule, reschedule appointments
- [src/pages/Laboratory.tsx](src/pages/Laboratory.tsx) - Lab order management
- [src/pages/Pharmacy.tsx](src/pages/Pharmacy.tsx) - Medication & prescription management
- [src/pages/Billing.tsx](src/pages/Billing.tsx) - Invoice and payment tracking
- [src/pages/Reports.tsx](src/pages/Reports.tsx) - Analytics dashboards
- [src/pages/Staff.tsx](src/pages/Staff.tsx) - Staff directory
- [src/pages/UserManagement.tsx](src/pages/UserManagement.tsx) - User/role administration

---

## Key Hooks & Custom Logic

### 1. **useAuth()** (AuthContext)
- `user`, `session`, `profile`, `roles`, `loading`
- `signIn(email, password)`, `signOut()`
- `hasRole(role)`, `isAdmin`

### 2. **usePermissions()** ([src/hooks/usePermissions.tsx](src/hooks/usePermissions.tsx))
- Fetches `role_permissions` table
- `hasPermission(module, action)` - Check if user can perform action
- `getModulePermissions(module)` - Get all permissions for module

### 3. **useDashboardStats()** ([src/hooks/useDashboard.tsx](src/hooks/useDashboard.tsx))
- `totalPatients`, `todayAppointments`, `monthlyRevenue`
- `pendingLabOrders`, `lowStockMedications`
- Trend data, department breakdown
- **Fetches**: patients, appointments, invoices, lab_orders, medications

### 4. **useNotifications()** ([src/hooks/useNotifications.tsx](src/hooks/useNotifications.tsx))
- Fetches user notifications from `notifications` table
- `markAsRead(id)`, `markAllAsRead()`
- `deleteNotification(id)`
- Real-time subscription via Supabase

---

## Component Hierarchy

```
App.tsx
├── AuthProvider
│   └── BrowserRouter
│       ├── RootRedirect (/ → /dashboard or /auth)
│       └── Routes
│           ├── /auth → Auth page
│           ├── /dashboard (nested: DashboardLayout)
│           │   ├── ProtectedRoute
│           │   │   └── Dashboard
│           │   ├── /patients
│           │   │   └── Patients
│           │   ├── /appointments
│           │   │   └── Appointments
│           │   ├── /laboratory
│           │   │   └── Laboratory
│           │   ├── /pharmacy
│           │   │   └── Pharmacy
│           │   ├── /staff
│           │   │   └── Staff
│           │   ├── /billing
│           │   │   └── Billing
│           │   ├── /reports
│           │   │   └── Reports
│           │   └── /admin/users
│           │       └── UserManagement
│           └── * → NotFound
```

### Layout Components:
- [src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx) - Main layout with Sidebar & Header
- [src/components/layout/Header.tsx](src/components/layout/Header.tsx) - Top navigation
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) - Side navigation menu
- [src/components/layout/ProtectedRoute.tsx](src/components/layout/ProtectedRoute.tsx) - Route protection with permission checks
- [src/components/layout/PermissionGuard.tsx](src/components/layout/PermissionGuard.tsx) - Conditionally render based on permissions

---

## Data Flow Examples

### Example 1: Patient Registration
```
Patients.tsx → Dialog (Add Patient button)
  ↓
Form with: first_name, last_name, date_of_birth, gender, phone, email, blood_type, etc.
  ↓
useMutation → supabase.rpc('insert_patient', { params })
  ↓
Database: insert_patient() function
  ├─ Generate patient_number atomically (P2026-XXXXX)
  └─ INSERT into patients table
  ↓
Success → Refetch patients query → Update UI table
```

### Example 2: Lab Order Creation
```
Laboratory.tsx → Dialog (Order Lab Test)
  ↓
Select: patient, test, priority, notes
  ↓
useMutation → supabase.from('lab_orders').insert({
  order_number: auto-generated,
  patient_id, test_id, status: 'pending', ...
})
  ↓
Database: lab_order inserted with RLS checks
  ↓
Success → Create notification for lab technician
  ↓
Lab Tech can then:
  1. Mark sample_collected_at
  2. Update status → 'processing'
  3. Add result_value, result_notes, is_abnormal
  4. Mark completed_at, completed_by
  5. Create notification for patient
```

### Example 3: Billing Flow
```
Appointments.tsx → Appointment status → 'completed'
  ↓
Billing.tsx → Create Invoice
  ├─ Get appointment details
  ├─ Fetch services (consultation, lab tests used, medications)
  └─ Calculate: subtotal + tax - discount = total
  ↓
useMutation → supabase.from('invoices').insert()
  ↓
Create invoice_items for each service
  ↓
Payment received → supabase.from('payments').insert()
  ↓
Update invoice.status → 'paid', amount_paid
```

---

## Key API Endpoints (Via Supabase Client)

### REST Operations:
```typescript
// Select
supabase.from('patients').select('*').eq('id', id)
supabase.from('appointments').select('*').gte('appointment_date', date)

// Insert
supabase.from('patients').insert(patientData)
supabase.rpc('insert_patient', { p_first_name, p_last_name, ... })

// Update
supabase.from('patients').update(updateData).eq('id', id)

// Delete
supabase.from('patients').delete().eq('id', id)

// Count
supabase.from('patients').select('*', { count: 'exact', head: true })
```

### RPC Functions:
```typescript
supabase.rpc('get_user_roles', { _user_id: userId })
supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
supabase.rpc('has_module_permission', { _user_id, _module, _permission })
supabase.rpc('insert_patient', { p_first_name, ..., p_created_by })
```

### Authentication:
```typescript
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.getSession()
supabase.auth.onAuthStateChange(callback)
```

---

## Query Client Setup (TanStack React Query)

```typescript
const queryClient = new QueryClient();

// All queries are wrapped with QueryClientProvider
// Features:
// - Automatic caching and refetching
// - Stale state management
// - Background synchronization
// - Error boundary handling
```

---

## State Management Pattern

### 1. **Server State** (React Query)
- Patient list, appointments, lab orders, invoices
- Dashboard statistics
- Notifications
- **Managed by**: `useQuery()` hooks with invalidation

### 2. **UI State** (React Local State)
- Dialog open/closed
- Form inputs
- Search filters
- **Managed by**: `useState()` in components

### 3. **Authentication State** (AuthContext)
- Current user, session, roles, profile
- **Managed by**: Supabase Auth + AuthContext

### 4. **Permission State** (usePermissions hook)
- User permissions per module
- **Managed by**: useQuery to `role_permissions` table

---

## Error Handling & Notifications

### Toast Notifications (Sonner):
```typescript
toast.success('Patient created successfully')
toast.error('Failed to update appointment')
toast.loading('Processing...')
```

### Database Errors:
- Caught in try-catch blocks
- Logged to console
- User-friendly messages via toast
- Loading states show pending operations

---

## Security Measures

1. **Row Level Security (RLS)**:
   - All tables have RLS enabled
   - Policies enforce access based on user roles
   - Functions use SECURITY DEFINER

2. **Authentication**:
   - Supabase JWT tokens
   - Session persistence in localStorage
   - Auto-refresh tokens

3. **Authorization**:
   - Role-based access control (6 roles)
   - Module-level permissions
   - ProtectedRoute component enforces access

4. **Input Validation**:
   - React Hook Form + Zod schema validation
   - Client-side and implicit server-side (via constraints)

---

## Next Steps for Issue Resolution

When you provide errors, I can help with:

1. **Database Issues**: Schema mismatches, RLS policy violations, data consistency
2. **API Issues**: Supabase query failures, permission errors, RPC function errors
3. **Frontend Issues**: Component state, routing, permission checks, UI rendering
4. **Authentication Issues**: Login failures, role assignment, session management
5. **Data Flow Issues**: Mutation failures, query invalidation, real-time sync

---

## File Structure Summary

```
src/
├── App.tsx                 → Main app with routes
├── main.tsx               → Entry point
├── pages/                 → Page components
├── components/            → UI components (layout, dashboard, notifications, user-management, ui)
├── contexts/              → AuthContext for global auth state
├── hooks/                 → Custom hooks (usePermissions, useDashboard, useNotifications)
├── integrations/supabase/ → Supabase client & types
├── lib/                   → Utilities
└── assets/                → Images and media

supabase/
├── config.toml           → Supabase configuration
└── migrations/           → Database migration files

Configuration files:
├── vite.config.ts        → Vite build config
├── tsconfig.json         → TypeScript config
├── tailwind.config.ts    → Tailwind CSS config
├── package.json          → Dependencies & scripts
└── .env                  → Environment variables
```

I'm ready to debug issues! Please share the errors you're experiencing.
