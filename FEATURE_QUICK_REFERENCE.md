# Quick Feature Reference Guide

## 🚀 How to Access Each Feature

### 📊 Reporting System
**For Staff (Generate Reports):**
1. Login as doctor/nurse/staff
2. Click **Sidebar → Reports → Generate Reports**
3. Select report type (7 options available)
4. Apply filters (department, date range)
5. Click **Generate** or **Download CSV**

**For Admin (Review Submissions):**
1. Login as admin
2. Click **Sidebar → Reports → Submitted Reports**
3. View staff submissions with pending status
4. Click **Review** on any report
5. Add comments and assign 1-5 star rating
6. Click **Approve** or **Reject**

**Dashboard Analytics:**
1. Click **Sidebar → Reports → View All Analytics**
2. Choose from 12 report tabs
3. View live data from Supabase
4. Export individual reports as CSV

---

### 🔔 Notifications System
**Access Notifications:**
1. Look for **bell icon (🔔)** in header (top right)
2. Shows unread count badge
3. Click to open dropdown
4. View notifications by type:
   - Task assignments
   - Patient updates
   - Appointment reminders
   - Lab results
   - Document approvals
   - System alerts

**Manage Notifications:**
- Click notification to mark as read
- Click ❌ to delete individual notification
- Click "Clear all" to delete all notifications
- Notifications sync in real-time across tabs

---

### 📄 Academic Documents (NEW)
**For Staff (Submit Documents):**
1. Login as staff member
2. Click **Sidebar → User Management → Academic Documents**
3. Click **+ Add Document**
4. Select document type:
   - Passport Photo
   - Degree Certificate
   - Professional License
   - Other Certification
   - Other Document
5. Upload file (max 10MB)
6. Click **Submit**
7. View submission status:
   - ⏳ Pending (awaiting review)
   - ✅ Approved (with comments)
   - ❌ Rejected (with reason)

**For Admin (Review Documents):**
1. Login as admin
2. Click **Sidebar → User Management → Review Documents**
3. Filter by status (All, Pending, Approved, Rejected)
4. Click **Review** on any document
5. In dialog:
   - View document (click preview)
   - Add review comments
   - Set rating (1-5 stars, optional)
   - Click **Approve** or **Reject**
6. Add required reason field
7. Document status updates instantly

---

### 👤 Profile Management
**Access Your Profile:**
1. Click **profile icon** in header (top right dropdown)
2. Click **Profile Settings**

**Profile Page Tabs:**

**Personal Info Tab:**
- Edit full name
- View email (read-only)
- Select department
- Click **Save Changes**

**Avatar Tab:**
- Click **Choose File** to select image
- Supported: JPEG, PNG, GIF
- Max size: 5MB
- Preview image before upload
- Click **Upload Avatar**
- Avatar displays in header

**Security Tab:**
- **Change Password**: Enter current password and new password
- Password must be 8+ characters
- Click **Update Password**
- **Account Info**: View user ID, email, account created date
- **Sign Out**: Click to logout

---

### 🔑 Password Reset
**Forgot Your Password:**
1. On login page, click **"Forgot Password?"**
2. Enter your email address
3. Click **Send Reset Link**
4. Check your email inbox
5. Click link in email (redirects to reset page)
6. Enter new password (min 8 characters)
7. Confirm password matches
8. Click **Reset Password**
9. Redirected to login, use new password

---

### 👥 User Management (Admin Only)
**Create New User:**
1. Click **Sidebar → User Management → Manage Users**
2. Click **+ New User**
3. Enter email address
4. Select role (Doctor, Nurse, Admin, etc.)
5. Click **Create Account**
6. System automatically sends password reset email
7. New user follows "Forgot Password" flow to set password

**Edit User:**
1. Find user in list
2. Click **Edit**
3. Change name, email, department, role
4. Click **Save**

**Delete User:**
1. Find user in list
2. Click **❌ Delete**
3. Confirm deletion
4. User account deactivated

---

## 🎯 Feature Availability by Role

### Admin Dashboard
- Dashboard (full access)
- Patients (full CRUD)
- Appointments (full CRUD)
- Laboratory (full CRUD)
- Pharmacy (full CRUD)
- Billing (full access)
- Reports (view all analytics)
- Generate Reports (create reports)
- Accounts (financial)
- Staff (manage staff)
- Staff Schedule (manage schedules)
- User Management (all functions)
- **Academic Documents**: Review submitted documents
- **Notifications**: All types
- **Profile**: Edit personal info & avatar
- **Password Reset**: Change password

### Doctor Dashboard
- Patients (view, create, edit)
- Appointments (full CRUD)
- Laboratory (view, create)
- Reports (view analytics)
- **Academic Documents**: Submit documents
- **Notifications**: Appointment reminders, results
- **Profile**: Edit personal info & avatar
- **Password Reset**: Change password

### Nurse Dashboard
- Patients (view, limited create)
- Appointments (view, edit)
- Laboratory (view)
- **Nursing Tasks**: Full access
- **Academic Documents**: Submit documents
- **Notifications**: Task assignments
- **Profile**: Edit personal info & avatar
- **Password Reset**: Change password

### Receptionist Dashboard
- Appointments (full CRUD)
- Patients (view)
- Billing (view invoices)
- Reports (view)
- **Notifications**: Appointment alerts
- **Profile**: Edit personal info & avatar
- **Password Reset**: Change password

### Lab Technician Dashboard
- Laboratory (full CRUD)
- Patients (view)
- **Notifications**: Lab request alerts
- **Profile**: Edit personal info & avatar
- **Password Reset**: Change password

---

## 🛠️ Troubleshooting

### Profile Changes Not Saving
- Check internet connection
- Verify you're logged in
- Try refreshing page (F5)
- Check browser console for errors (F12)

### Avatar Not Uploading
- File size must be under 5MB
- Only JPEG, PNG, GIF formats supported
- Check storage quota in Supabase
- Try different image file

### Password Reset Email Not Received
- Check spam folder
- Verify email address is correct
- Wait 5 minutes (email may be delayed)
- Check Supabase email configuration

### Documents Not Appearing in Review
- Ensure documents were submitted successfully
- Admin may not have permission for that module
- Try refreshing the page
- Check filter (Status = "All")

### Notifications Not Appearing
- Ensure notifications are enabled in browser
- Check that you're logged in
- Verify role has permission for notification type
- Realtime subscription may be loading

---

## 🔄 Data Workflow Examples

### Complete Document Approval Workflow:
```
1. Staff submits passport photo in AcademicDocuments page
2. Document appears as "Pending" in their history
3. Admin views ReviewAcademicDocuments page
4. Document appears in filtered "Pending" list
5. Admin clicks "Review", examines document
6. Admin adds comments "Approved" and selects 5 stars
7. Admin clicks "Approve"
8. Document status changes to "Approved"
9. Staff sees "✅ Approved" with admin comments
10. Notification sent to staff: "Your document has been approved"
```

### Complete Report Generation Workflow:
```
1. Staff selects "Patient Flow" report
2. Selects department and date range
3. Clicks "Generate"
4. System queries database
5. Report displays with 10 rows of patient data
6. Staff reviews data
7. Clicks "Download CSV"
8. Spreadsheet downloads to computer
9. Staff includes CSV in email report submission
10. Admin reviews submission with rating
```

### Complete Password Reset Workflow:
```
1. User clicks "Forgot Password?" on login
2. Enters email address
3. Supabase sends reset email (1-2 minutes)
4. User opens email from HeritageClinic
5. Clicks "Reset Password" link in email
6. Redirected to /reset-password with token
7. User enters new password (8+ chars)
8. Confirms password
9. Clicks "Reset Password"
10. Success message shown
11. Redirected to login page
12. Logs in with new password
```

---

## 📱 Responsive Design

All new features are mobile-friendly:
- ✅ Profile page works on mobile
- ✅ Academic documents uploads on mobile
- ✅ Notifications responsive on all screen sizes
- ✅ Reports have horizontal scroll on mobile devices
- ✅ Buttons and dropdowns touch-friendly

---

## 🔐 Permission Requirements

### To View Reports Analytics:
- Permission: `reports` module with `view` access
- Default roles: Admin, Doctor, Manager

### To Generate Reports:
- Permission: `generate_reports` module with `create` access
- Default roles: Admin, Doctor

### To Review Academic Documents:
- Permission: `user_management` module with `edit` access
- Default roles: Admin only

### To Edit Profile:
- Permission: Own user context
- Default roles: All authenticated users

### To Change Password:
- Permission: Own user context
- Default roles: All authenticated users

### To Submit Academic Documents:
- Permission: `user_management` module with `create` access
- Default roles: Doctor, Nurse, Staff

---

## 🚨 Important Notes

1. **Passwords**: Minimum 8 characters, no complexity requirements enforced by default
2. **File Uploads**: Max 5MB for avatars, 10MB for documents
3. **Notifications**: Real-time, check periodically for new alerts
4. **CSV Export**: Only available for reports, documents export as PDF/image links
5. **Avatars**: Public URLs permanently accessible after upload
6. **Documents**: Only accessible to submitter and admins until approved

---

**Last Updated**: February 15, 2026
**Version**: 1.0.0
