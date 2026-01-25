# Role Permissions Management - User Guide

## 🎯 Quick Start

1. **Access:** In sidebar, go to **Settings → Role Permissions** (admin only)
2. **View:** See a matrix of all 6 roles × 10 modules × 4 actions
3. **Configure:** Check/uncheck permissions as needed
4. **Save:** Click "Save Changes" to apply

---

## 📋 Permissions Matrix Layout

### Columns: User Roles (6)
```
Admin | Doctor | Nurse | Receptionist | Lab Technician | Pharmacist
```

### Rows: Modules (10)
```
Dashboard
Patients
Appointments
Laboratory
Pharmacy
Billing
Reports
Accounts
Staff
User Management
```

### Cells: Actions (4 per role-module)
```
View | Create | Edit | Delete
```

---

## 🎯 Typical Permission Configurations

### 1. **Admin Role** (Full Access)
```
✅ All modules: View ✓ Create ✓ Edit ✓ Delete ✓
```

### 2. **Doctor Role**
```
Dashboard:        V✓ C✓ E✓ D✗
Patients:         V✓ C✓ E✓ D✗
Appointments:     V✓ C✓ E✓ D✗
Laboratory:       V✓ C✓ E✗ D✗
Pharmacy:         V✓ C✗ E✗ D✗
Billing:          V✓ C✗ E✗ D✗
Reports:          V✓ C✗ E✗ D✗
Accounts:         V✗ C✗ E✗ D✗
Staff:            V✗ C✗ E✗ D✗
User Management:  V✗ C✗ E✗ D✗
```

### 3. **Nurse Role**
```
Dashboard:        V✓ C✗ E✗ D✗
Patients:         V✓ C✓ E✓ D✗
Appointments:     V✓ C✓ E✗ D✗
Laboratory:       V✓ C✓ E✗ D✗
Pharmacy:         V✓ C✗ E✗ D✗
Billing:          V✗ C✗ E✗ D✗
Reports:          V✗ C✗ E✗ D✗
Accounts:         V✗ C✗ E✗ D✗
Staff:            V✗ C✗ E✗ D✗
User Management:  V✗ C✗ E✗ D✗
```

### 4. **Receptionist Role**
```
Dashboard:        V✓ C✗ E✗ D✗
Patients:         V✓ C✓ E✗ D✗
Appointments:     V✓ C✓ E✓ D✗
Laboratory:       V✗ C✗ E✗ D✗
Pharmacy:         V✗ C✗ E✗ D✗
Billing:          V✓ C✓ E✗ D✗
Reports:          V✗ C✗ E✗ D✗
Accounts:         V✗ C✗ E✗ D✗
Staff:            V✗ C✗ E✗ D✗
User Management:  V✗ C✗ E✗ D✗
```

### 5. **Lab Technician Role**
```
Dashboard:        V✓ C✗ E✗ D✗
Patients:         V✓ C✗ E✗ D✗
Appointments:     V✗ C✗ E✗ D✗
Laboratory:       V✓ C✓ E✓ D✗
Pharmacy:         V✗ C✗ E✗ D✗
Billing:          V✗ C✗ E✗ D✗
Reports:          V✗ C✗ E✗ D✗
Accounts:         V✗ C✗ E✗ D✗
Staff:            V✗ C✗ E✗ D✗
User Management:  V✗ C✗ E✗ D✗
```

### 6. **Pharmacist Role**
```
Dashboard:        V✓ C✗ E✗ D✗
Patients:         V✓ C✗ E✗ D✗
Appointments:     V✗ C✗ E✗ D✗
Laboratory:       V✗ C✗ E✗ D✗
Pharmacy:         V✓ C✓ E✓ D✗
Billing:          V✗ C✗ E✗ D✗
Reports:          V✗ C✗ E✗ D✗
Accounts:         V✗ C✗ E✗ D✗
Staff:            V✗ C✗ E✗ D✗
User Management:  V✗ C✗ E✗ D✗
```

---

## 📖 Permission Definitions

### **View (V)**
- User can **see and access** this module
- Without View, other permissions are disabled
- Example: Doctor can view Pharmacy but can't create/edit/delete

### **Create (C)**
- User can **add new records** in this module
- Requires View to be enabled
- Example: Doctor can create new appointments

### **Edit (E)**
- User can **modify existing records** in this module
- Requires View to be enabled
- Example: Nurse can update patient information

### **Delete (D)**
- User can **remove records** in this module
- Requires View to be enabled
- Example: Admin can delete old invoices (Doctors cannot)

---

## 🎮 How to Use the Interface

### Step 1: Navigate to Role Permissions
```
Sidebar → Settings (gear icon) → Role Permissions
OR
URL: http://localhost:8081/admin/permissions
```

### Step 2: Find What You Want to Configure
**Looking for a specific role + module combination?**

Example: "Can Doctor edit Appointments?"

1. Find the **"Appointments"** row (left side)
2. Find the **"Doctor"** column (top)
3. Look at the **Edit (E)** cell under Doctor
4. ☑ = Doctor CAN edit, ☐ = Doctor CANNOT edit

### Step 3: Make Changes
**To enable a permission:**
1. Click the checkbox to check it
2. See "● Unsaved changes" indicator appear

**To disable a permission:**
1. Click the checkbox to uncheck it
2. See "● Unsaved changes" indicator appear

### Step 4: Save or Discard

**To Save:**
- Click blue **"Save Changes"** button
- Wait for confirmation message
- Changes are now in database

**To Discard:**
- Click **"Discard Changes"** button
- All changes reverted to original state

---

## 💡 Smart Features

### 1. **Dependency Logic**
```
Example: Doctor role, Patients module

If View ☑ is UNCHECKED:
  ├─ Create ☐ (disabled - grayed out)
  ├─ Edit ☐ (disabled - grayed out)
  └─ Delete ☐ (disabled - grayed out)

Why? Can't create/edit/delete something you can't see!

If View ☑ is CHECKED:
  ├─ Create ☑ (enabled - clickable)
  ├─ Edit ☑ (enabled - clickable)
  └─ Delete ☑ (enabled - clickable)
```

### 2. **Unsaved Changes Indicator**
```
When you toggle a permission:
  - "● Unsaved changes" appears (yellow/orange text)
  - "Save Changes" button becomes active (blue)
  - "Discard Changes" button becomes active
```

### 3. **Change Tracking**
```
You modify:
  Dashboard → Doctor: View ON
  Patients → Doctor: Create OFF
  
Only these 2 changes are sent to database (efficient!)
Unchanged permissions are ignored
```

---

## 🎯 Common Tasks

### Task 1: Give Doctor access to Billing
```
1. Find "Billing" row
2. Find "Doctor" column
3. Check View ☑ (doctor can see billing)
4. Click Save Changes
✓ Done! Doctor can now see billing page
```

### Task 2: Prevent Nurse from Deleting Patients
```
1. Find "Patients" row
2. Find "Nurse" column
3. Uncheck Delete ☐
4. Click Save Changes
✓ Done! Nurse can view/create/edit but NOT delete patients
```

### Task 3: Give Receptionist full Billing access
```
1. Find "Billing" row
2. Find "Receptionist" column
3. Check View ☑ Create ☑ Edit ☑ Delete ☑
4. Click Save Changes
✓ Done! Receptionist has full billing access
```

### Task 4: Create a Read-Only Doctor
```
1. Find all modules where Doctor has access
2. For each: View ☑, but Create ☐ Edit ☐ Delete ☐
3. Click Save Changes
✓ Done! Doctor can view everything but can't make changes
```

---

## ⚙️ How Permissions Work in the App

### What happens when permissions are applied?

**1. During Login:**
```
User logs in
  ↓
App loads user's role
  ↓
App queries role_permissions table for that role
  ↓
Sidebar menu shows only allowed modules
  ↓
User sees filtered navigation
```

**2. Accessing a Page:**
```
User clicks "Patients" in sidebar
  ↓
App checks: "Does this role have View on Patients?"
  ↓
If YES: Shows page ✓
If NO: Shows "Access Denied" ✗
```

**3. Performing Actions:**
```
User wants to Create a new patient
  ↓
App checks: "Does this role have Create on Patients?"
  ↓
If YES: Shows [Create Patient] button ✓
If NO: Button is hidden/disabled ✗
```

---

## ❓ FAQ

**Q: When do permission changes take effect?**
A: After user logs out and logs back in. Current session may need page refresh.

**Q: Can I override permissions for a single user?**
A: No, permissions are role-based. Create new roles for different needs.

**Q: What if I accidentally deny admin access to everything?**
A: Admin role always has full access (hardcoded override).

**Q: Can I add new modules?**
A: Yes, contact your developer to add new modules and update role_permissions.

**Q: Can I change permission names (View/Create/Edit/Delete)?**
A: No, these are hardcoded. But you can modify what they mean in your org.

**Q: How many roles/modules can I have?**
A: Technically unlimited, but UI works best with 5-10 roles and 10-20 modules.

---

## 🔒 Important Notes

- Only **Admins** can access this page
- Changes affect **all users** with that role (immediately after re-login)
- **Always backup** before making major permission changes
- Test changes with a non-admin user first
- No user action history (audit log not implemented)

---

## 📊 Permission Matrix Visual

```
                 ADMIN    DOCTOR   NURSE   RECEPTIONIST   LAB TECH   PHARMACIST
                 ────────────────────────────────────────────────────────────
Dashboard        V C E D  V C E    V       V               V          V
Patients         V C E D  V C E    V C E   V C E           V
Appointments     V C E D  V C E    V C E   V C E
Laboratory       V C E D  V C E    V C E                   V C E
Pharmacy         V C E D  V        V       V                          V C E
Billing          V C E D  V        V       V C E
Reports          V C E D  V C E    V C E   V               V
Accounts         V C E D  V C E    V C E   V               V          V
Staff            V C E D
User Management  V C E D
```

Legend: V=View, C=Create, E=Edit, D=Delete, blank=No access

---

## ✅ Checklist for Setup

- [ ] Ensure you're logged in as Admin
- [ ] Navigate to Settings → Role Permissions
- [ ] Verify all 6 roles appear as column headers
- [ ] Verify all 10 modules appear as row headers
- [ ] Try toggling a permission
- [ ] Click "Save Changes"
- [ ] Verify success message appears
- [ ] Test with a non-admin user (permissions take effect on re-login)

---

## 🎉 Summary

You now have **complete control** over what each user role can do:

✅ 6 roles × 10 modules × 4 actions = 240 possible permissions
✅ Change permissions anytime from a clean UI
✅ Save changes to database instantly
✅ Revert unwanted changes easily
✅ Smart logic prevents invalid configurations

**Start managing your role permissions now!**
