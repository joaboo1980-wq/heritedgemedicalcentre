# Medication Scheduling - Quick Reference Guide

## For Nurses

### Viewing Due Medications

1. Go to **Nursing Dashboard**
2. Scroll to **Medication Schedule** section (below Task Progress)
3. See two categories:
   - **Overdue (Red)** - Give immediately
   - **Due Soon (Yellow)** - Within the next hour

### Recording Medication Administration

**Quick Method (1-click):**
1. Find medication in list
2. Click dropdown menu (⋮)
3. Click "Record Given"
4. Pre-filled dosage and route appear
5. Add any notes (side effects, patient reaction)
6. Click "Record Administration"
7. Success! ✅ Audit trail updated automatically

**Alternative (via dropdown):**
1. Click dropdown (⋮) next to medication
2. Select "Record Given"
3. Confirm details
4. Submit

### Skipping a Dose

**When to skip:**
- Patient refuses medication
- Patient has side effects
- Vomiting within 30 min of administration
- Medical contraindication arises

**How to skip:**
1. Click dropdown (⋮)
2. Select "Skip Dose"
3. **MUST** provide reason (system enforces)
4. Click "Skip Dose"
5. ✅ Recorded in audit trail with reason

### Viewing Medication History

1. Go to **Nursing Dashboard**
2. Scroll to **Medication Administration History** section
3. See all past administrations with:
   - Who administered it
   - Exact time
   - Dosage + route
   - Any notes or skip reasons

**Filters available:**
- **Search:** Find specific medication by name
- **Status:** Show only Administered / Skipped / Refused / Delayed
- **Date Range:** Last 7 / 30 / 90 days

### Common Tasks

**"I need to see all medications given today"**
→ Filter by Date: "Last 7 days" + Status: "Administered"

**"When was the last time Maria got her Metformin?"**
→ Search bar: "Metformin" + look for patient Maria's entries

**"Why was this dose skipped?"**
→ Click that row in history table → See "Reason" field

---

## For Administrators

### Understanding the System

**Automatic Process:**
1. Doctor creates prescription
2. Pharmacy marks as "dispensed"
3. System auto-generates 30 days of doses
4. Nurses see them as they become due

**No Manual Work Needed** ✅

### Monitoring Compliance

**Via Dashboard:**
1. Go to **Medication Administration History**
2. Read statistics:
   - **Total:** All medications
   - **Administered:** Successfully given
   - **Skipped:** Legitimate reasons
   - **Refused:** Patient refused
   - **Delayed:** Given late

**Example Metrics:**
- If Administered = 95% → Excellent compliance
- If Skipped = 3% → Within normal range
- If Refused = 2% → Acceptable

### Investigating Issues

**"Why are 5 doses of Aspirin for Patient X still pending?"**
1. Go to Medication History
2. Search: "Aspirin"
3. Filter Patient: "X"
4. Check if marked as skipped (with reason)
5. Check if not yet due (future dates)

**"Has nurse John given any medications today?"**
1. Go to Medication History
2. Filter Status: "Administered"
3. Filter Date: "Today"
4. Check administered_by column

### Generating Reports

**For audits:**
1. Open Medication History
2. Subject to date range filters (7/30/90 days)
3. Export table data (copy visible rows)
4. Sort by date/status as needed

---

## System Features

### Real-Time Updates
✅ Dashboard updates every 2 minutes automatically  
✅ When you record a medication, list updates instantly  
✅ No manual refresh needed

### Safety Features
✅ Medications only show when they become due  
✅ Overdue medications highlighted in red (urgent)  
✅ Reason **required** for skipped doses  
✅ Complete audit trail (who, when, why)  
✅ Cannot lose records (all timestamped)

### Role-Based Access
✅ **Nurses:** See only their assigned patients' medications  
✅ **Admins:** See all medications across all patients  
✅ **Doctors:** Can view prescriptions and history

---

## Key Concepts

### Status Values

| Status | Meaning | Next Step |
|--------|---------|-----------|
| **Pending** | Not yet due (scheduled for future) | Wait, system will make "due" |
| **Due** | Time to give (within 1 hour of scheduled) | Administer or skip |
| **Administered** | Successfully given | Record in audit trail ✅ |
| **Skipped** | Not given (with reason) | Track reason in audit |

### Status Transitions (Automatic)

```
pending ──[1 hour before time]──> due ──[nurse clicks]──> administered
                                         or
                                      ──[nurse skips]──> skipped
```

**Key Point:** You never manually set a status. System does it automatically!

### Routes (How Medication Given)

- **Oral (PO)** - By mouth
- **IV** - Intravenous
- **IM** - Intramuscular
- **SC** - Subcutaneous
- **Topical** - On skin
- **Inhaled** - Breathed in

---

## FAQ

**Q: How often are medications scheduled?**  
A: When prescription is dispensed, system generates 30 days of doses automatically based on frequency.

**Q: What if I miss giving a medication on time?**  
A: It stays "Due" indefinitely. Give it when you notice (still recorded with actual time). If can't give, skip with reason.

**Q: Can I change dosage when giving?**  
A: Yes! Dialog has "Dosage Given" field editable.

**Q: Is there a log of changes?**  
A: Yes! Every administration is logged with timestamp, nurse name, and exact dosage.

**Q: What if patient refuses?**  
A: Use "Skip Dose" feature. Mark status as "refused" with reason "Patient refused".

**Q: Can I edit after recording?**  
A: Currently no edit after recording. Must contact admin to adjust records.

**Q: How do I know what dose was scheduled vs what was given?**  
A: History shows both. Original dosage is in prescription_items, "Dosage Given" is what nurse actually gave.

**Q: Who can see medication records?**  
A: Nurse sees own patients only. Admins see all. Doctors can view their prescriptions.

---

## Troubleshooting

### Medication not appearing in list
- **Cause:** Not yet due (still pending)
- **Solution:** Check scheduled_time. Will appear automatically when due.

### Can't click "Record Given"
- **Cause:** Loading or no permission
- **Solution:** Wait for page to fully load. Verify you're logged in as nurse.

### "User not authenticated" error
- **Cause:** Session expired
- **Solution:** Log out and log back in

### History not updating after recording
- **Cause:** Page cache
- **Solution:** Refresh browser (F5)

### Need to undo a recording
- **Solution:** Contact administrator (records can't be deleted, only new ones added)

---

## Pro Tips

💡 **Check dashboard first thing in morning** to see all medications for the day

💡 **Use search** to quickly find complex medication names

💡 **Batch recordings** - Do all medications for one patient together, then move on

💡 **Always add notes** - Helps other nurses understand patient reactions

💡 **Review skipped doses** - At end of shift, verify reasons are appropriate

💡 **Use phone reminder** - Set personal phone alerts for medications at specific times

---

## Contact Support

**Dashboard Not Loading?**
→ Check internet connection, try different browser

**Can't Record Medication?**
→ Check if you have "nurse" role assigned in system

**Question About Patient Medication?**
→ Ask prescriber (doctor) or pharmacist

**Need Report or Data Export?**
→ Ask administrator with audit trail details needed

---

## Important Reminders

⚠️ **Always verify patient identity** before administering  
⚠️ **Check for allergies** in care plan before giving  
⚠️ **Record immediately** after administering, don't wait  
⚠️ **Provide reason** if skipping (system requires it)  
⚠️ **Contact doctor** if major side effects observed  

---

**System Updated: February 14, 2026**  
**Features: Automatic Scheduling | Real-Time Reminders | Complete Audit Trail**
