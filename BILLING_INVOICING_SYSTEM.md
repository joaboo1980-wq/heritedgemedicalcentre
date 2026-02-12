# Billing & Invoicing System - Complete Overview

## System Architecture

```
Healthcare Management System
│
├── INVOICES PAGE ────────────────────────────────────────────┐
│   Purpose: Invoice Lifecycle Management                      │
│   Create → Send → Track → Collect → Reconcile                │
│                                                               │
│   Features:                                                  │
│   ✅ Create draft invoices from scratch                      │
│   ✅ Mark draft invoices as sent (status: pending)          │
│   ✅ Record payments (partial or full)                      │
│   ✅ Auto-calculate invoice status:                         │
│       - "pending" = unpaid                                  │
│       - "partially_paid" = partial payment received         │
│       - "paid" = fully paid                                 │
│   ✅ View professional invoice templates                    │
│   ✅ Download invoices as PDF                               │
│   ✅ Print invoices                                         │
│   ✅ Send invoices via email                                │
│   ✅ View proof of payment for paid invoices                │
│   ✅ Delete invoices                                        │
│   ✅ Search and filter by status                            │
│   ✅ Track outstanding AR (Accounts Receivable)            │
│                                                               │
│   KPIs Displayed:                                            │
│   • Draft Invoices Count                                     │
│   • Pending Payment Count                                    │
│   • Paid Invoices Count                                      │
│   • Total Outstanding AR (UGX)                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘

│
├── BILLING PAGE ──────────────────────────────────────────────┐
│   Purpose: Payment Collection & Reconciliation               │
│   Track → Reconcile → Report → Analyze                       │
│                                                               │
│   Features:                                                  │
│   ✅ Unified payment tracking dashboard                      │
│   ✅ Record payments for ANY outstanding invoice            │
│   ✅ View AR aging (current/30/60/90/90+)                   │
│   ✅ Overdue invoice highlighting                           │
│   ✅ Collection rate percentage                             │
│   ✅ Partially paid invoice tracking                        │
│   ✅ Unpaid invoice monitoring                              │
│   ✅ Days overdue calculation                               │
│   ✅ Multi-tab filtering:                                   │
│       - All Outstanding                                      │
│       - Overdue Only                                         │
│       - Partially Paid                                       │
│       - Awaiting First Payment                               │
│   ✅ Search by invoice # or patient name                    │
│   ✅ One-click payment recording                            │
│   ✅ Payment validation (prevent overpayment)              │
│                                                               │
│   KPIs Displayed:                                            │
│   • Total Billed (lifetime)                                  │
│   • Total Collected (lifetime)                               │
│   • Outstanding Balance                                      │
│   • Collection Rate %                                        │
│   • Overdue Count & Amount                                   │
│   • Partially Paid Count & Amount                            │
│   • Awaiting First Payment Count & Amount                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

│
├── ACCOUNTS PAGE ─────────────────────────────────────────────┐
│   Purpose: Financial Records & GL Integration                │
│   Chart of Accounts → Transactions → Reconciliation          │
│                                                               │
│   Accounts Used:                                             │
│   • AR (Accounts Receivable) Account                         │
│     - Increases when invoice created                        │
│     - Decreases when payment received                       │
│     - Balance = Total Outstanding AR                        │
│   • Income Account                                           │
│     - Credited when invoice created                         │
│   • Cash/Bank Account                                        │
│     - Debited when payment received                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow

### Creating an Invoice
```
1. User on Invoices page
2. Click "Create Invoice"
3. Select Patient & Due Date
4. Add Line Items (Services/Products)
5. Click "Create Invoice"

System:
  → Inserts Invoice record (status: draft)
  → Inserts Invoice Items
  → GL Entry: Debit AR, Credit Income
  → Creates Payment Log entry
  → Query Invalidation → UI Updates
```

### Sending Invoice to Patient
```
1. User opens Draft Invoice
2. Clicks "Mark as Sent"
3. Confirm dialog (optional)

System:
  → Updates invoice status: draft → pending
  → Notification: "Invoice marked as sent"
  → Query Invalidation → UI Updates
```

### Recording Payment
```
Method A: From Invoices Page
  1. Open Pending/Partially Paid Invoice
  2. Click "Record Payment"
  3. Enter amount
  4. Confirm

Method B: From Billing Page
  1. View outstanding invoices
  2. Click "Record Payment" row button
  3. Enter amount
  4. Confirm

System:
  → Calculate new payment amount
  → Auto-determine status:
     - If amount = balance → "paid"
     - If amount < balance → "partially_paid"
  → Update invoice
  → Insert Payment Log entry
  → GL Entry: Debit Cash, Credit AR
  → Update AR balance in Accounts
  → Query Invalidation → Both pages update
  → Notification: "Payment recorded successfully"
```

### Viewing Professional Invoice
```
1. Click "View Invoice" or "View Details"
2. Full professional template displays:
   - Company logo and branding
   - Patient information
   - Invoice details
   - Line items
   - Payment summary
   - Status indicators
   - Overdue warnings (if applicable)

Options from View:
  → "Download PDF" - Client-side PDF generation
  → "Print" - Browser print dialog
  → "Proof of Payment" - For paid invoices
  → "Email Invoice" - Pre-formatted HTML email
```

## Invoice Status Lifecycle

```
DRAFT
  ↓
  [User clicks "Mark as Sent"]
  ↓
PENDING (Awaiting Payment)
  ↓
  [Payment recorded]
  ├→ Full payment? → PAID ✅
  └→ Partial payment? → PARTIALLY_PAID
                          ↓
                        [Additional payment]
                          ↓
                        PAID ✅
```

## Usage Scenarios

### Scenario 1: Patient Visits & Creates Invoice
```
Receptionist:
1. Patient completes consultation
2. Go to Invoices page
3. Click "Create Invoice"
4. Select patient
5. Add consultation fee: UGX 100,000
6. Click "Create Invoice"
7. Invoice created with:
   - Status: draft
   - Invoice #: INV-XXXX
   - Amount: UGX 100,000
   - Outstanding AR increases

Accountant (later):
1. Goes to Billing page
2. Filters "All Outstanding"
3. Sees unpaid invoice
4. Clicks "View Invoice" → email to patient

Patient:
1. Receives professional invoice via email
2. Can download PDF copy
3. Visits clinic to pay
```

### Scenario 2: Payment Recording
```
Patient arrives with payment: UGX 100,000

Receptionist (in Billing page):
1. Finds invoice (search by name)
2. Clicks "Record Payment"
3. Enters: UGX 100,000
4. Clicks "Record Payment"

System:
  → Updates invoice:
     - amount_paid: 0 → 100,000
     - status: pending → paid
  → GL Entry recorded
  → AR balance updated
  → Notification: "Payment recorded successfully"

Receptionist can now:
1. Generates "Proof of Payment" PDF
2. Prints receipt for patient
3. Patient leaves with proof

Accountant later:
1. Checks Invoices page
2. Sees invoice is "paid"
3. Collection rate increased
4. Outstanding AR decreased
```

### Scenario 3: Partial Payment
```
Invoice Amount: UGX 500,000
Patient pays: UGX 200,000

Receptionist (in Billing page):
1. Finds invoice
2. Clicks "Record Payment"
3. Enters: UGX 200,000

System:
  → Updates invoice:
     - amount_paid: 0 → 200,000
     - status: pending → partially_paid
     - Balance Due: UGX 300,000
  → Status shows "PARTIALLY PAID"
  → AR balance updated
  → Invoice still appears on Billing page

Later when patient pays remaining:
1. Another payment record: UGX 300,000
2. Status changes to "paid"
3. Removed from outstanding list
```

### Scenario 4: Overdue Invoice
```
Invoice Due: 2026-02-01
Today: 2026-02-15 (14 days overdue)

In Billing page:
1. Patient filters "Overdue" tab
2. Sees red highlighted invoice
3. Table shows: "14 days" in "Days Overdue" column

In Invoice template:
1. User opens invoice
2. Red banner shows:
   "⚠️ OVERDUE - PAYMENT REQUIRED"
   "This invoice is 14 days overdue"
3. Due date shown in red

Receptor can:
1. Click "Email Invoice"
2. Patient receives reminder email
3. Balance due emphasized
4. Urgent payment message included
```

## Feature Comparison

| Feature | Invoices | Billing |
|---------|----------|---------|
| Create Invoices | ✅ | ❌ |
| View Invoices | ✅ | ✅ |
| Record Payments | ✅ (single) | ✅ (dashboard) |
| Professional Template | ✅ | View only |
| Download PDF | ✅ | ❌ |
| Print | ✅ | ❌ |
| Email | ✅ | ❌ |
| Outstanding AR View | ✅ (stats) | ✅ (main focus) |
| Collection Rate | ✅ | ✅ |
| Aging Analysis | ❌ | ✅ |
| Overdue Tracking | ❌ | ✅ |
| Payment History | Via logs | Via tables |

## Key Differences

### Invoices Page
- **Focus**: Invoice creation and viewing
- **Users**: Billing staff, receptionists
- **Actions**: Create, mark sent, record payment, view, download/print
- **View**: Individual invoice details
- **Time**: Per-invoice basis

### Billing Page
- **Focus**: Payment collection and reconciliation
- **Users**: Accounting staff, billing managers
- **Actions**: Monitor outstanding, record payments in bulk, track aging
- **View**: Dashboard of all outstanding invoices
- **Time**: Portfolio/aging analysis focus

## Database Schema

### Invoices Table
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR UNIQUE,  -- INV-XXXX
  patient_id UUID NOT NULL REFERENCES patients(id),
  status VARCHAR DEFAULT 'draft',  -- draft, pending, partially_paid, paid
  subtotal NUMERIC,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Calculated field
  balance_due = (total_amount - amount_paid)
);
```

### Invoice Items Table
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  description VARCHAR NOT NULL,
  item_type VARCHAR,  -- consultation, lab_test, medication, procedure, room
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,  -- quantity * unit_price
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Logs Table (Optional but Recommended)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC NOT NULL,
  payment_date DATE DEFAULT TODAY(),
  payment_method VARCHAR,  -- cash, card, bank, check
  reference VARCHAR,  -- Payment for INV-XXXX
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Analytics Available

### From Invoices Page
```
Total Invoices: Count of all invoices
Draft Count: Invoices not yet sent
Pending Count: Invoices awaiting payment
Paid Count: Fully paid invoices
Outstanding AR: Sum of all balances due
```

### From Billing Page
```
Total Billed: Lifetime revenue invoiced
Total Collected: Lifetime payments
Outstanding: Current AR balance
Collection Rate: (Collected / Billed) * 100
Overdue Count: Invoices past due date
Overdue Amount: Total $ past due
Partially Paid Count: 
Days Overdue: For each invoice
AR Aging:
  Current (0-30 days)
  30-60 days
  60-90 days
  90+ days
```

## Reports Available

Currently can generate from data:
1. **Outstanding Invoices Report** (Billing page → download table)
2. **Collection Summary** (Invoices page → stats)
3. **Aged AR Report** (Billing page → tabs)
4. **Individual Invoice PDF** (Any invoice → Download PDF)
5. **Proof of Payment PDF** (Paid invoices → Proof of Payment)

## Integration Points

### With Chart of Accounts
- AR Account: Balance = Total Outstanding AR
- Income Account: Credited for every invoice
- Cash Account: Debited for every payment

### With Appointments
- Each service = invoice line item
- Appointment → generates line item
- Multiple appointments → 1 invoice (optional)

### With Patient Records
- Invoice accessible from patient profile
- Payment history visible
- Contact info used for email

### With Reports
- AR Aging Report uses invoice data
- Collection Rate in Reports dashboard
- Outstanding balance in financial reports

## Configuration Options

### Payment Methods (in Payment Dialog)
Currently: Simple amount entry
Could add: Cash, Card, Bank Transfer, Mobile Money

### Invoice Terms
Currently: Due date field
Could add: Net 30, Net 60, Due on Demand

### Status Customization
Current: draft, pending, partially_paid, paid
Could add: overdue, cancelled, disputed

### Email Settings
Currently: HTML template framework ready
Could add: Custom sender, reply-to, logo in email

## User Permissions

| Action | Required Permission |
|--------|---------------------|
| View Invoices | view_invoices |
| Create Invoice | create_invoice |
| Edit Invoice | edit_invoice |
| Delete Invoice | delete_invoice |
| Record Payment | record_payment |
| View Billing Dashboard | view_billing |
| Download PDF | view_invoices |
| Email Invoice | send_email |

## Best Practices

1. **Invoice Numbering**: INV-XXXX (auto-generated)
2. **Due Dates**: Set default terms (Net 30)
3. **Description**: Use clear service descriptions
4. **Patient Email**: Keep updated for email sending
5. **Payment Recording**: Record immediately upon receipt
6. **Review**: Reconcile daily/weekly
7. **Archiving**: Keep PDFs for records
8. **Reminders**: Send before and after due date

## Troubleshooting

### Issue: Invoice not appearing in Billing page
**Solution**: Check invoice status (must be pending or partially_paid to show as outstanding)

### Issue: Payment not updating invoice status
**Solution**: Check that payment amount doesn't exceed balance due

### Issue: PDF not generating
**Solution**: Check image paths, refresh, try simpler invoice, check browser console

### Issue: Email not sending
**Solution**: Requires backend API at /api/send-email, check server implementation

## Future Enhancements

- [ ] Recurring/subscription invoices
- [ ] Invoice templates (multiple designs)
- [ ] Automated payment reminders (email/SMS)
- [ ] Payment plans (installments)
- [ ] Expense categorization (link to GL)
- [ ] Multi-currency support
- [ ] Invoice approval workflow
- [ ] Custom invoice numbering schemes
- [ ] Batch invoice generation from templates
- [ ] Integration with payment gateways

---

## Summary

**Invoices Page**: Creates and manages individual invoices through their lifecycle
**Billing Page**: Monitors all outstanding payments and provides reconciliation dashboard

Together they provide complete invoice and payment management for the healthcare practice! 🏥
