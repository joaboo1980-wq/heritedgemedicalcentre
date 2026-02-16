-- Add prescription_id to invoices table and auto-generate invoices when prescriptions are created
-- This implements the requirement: when a drug is prescribed, automatically generate an invoice
-- that must be cleared/paid before dispensing the drug

-- Step 1: Add prescription_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_prescription_id ON public.invoices(prescription_id);

-- Step 3: Create function to automatically generate invoice when prescription is created
CREATE OR REPLACE FUNCTION public.create_invoice_for_prescription()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_amount DECIMAL(12,2) := 0;
  v_item RECORD;
  v_medication RECORD;
BEGIN
  -- Only create invoice if prescription is being created (INSERT operation)
  IF TG_OP = 'INSERT' THEN
    -- Calculate total amount from prescription items (medications)
    SELECT COALESCE(SUM(pi.quantity * COALESCE(m.unit_price, 0)), 0)
    INTO v_total_amount
    FROM public.prescription_items pi
    LEFT JOIN public.medications m ON pi.medication_id = m.id
    WHERE pi.prescription_id = NEW.id;

    -- Create invoice for the prescription
    INSERT INTO public.invoices (
      prescription_id,
      patient_id,
      appointment_id,
      invoice_number,
      status,
      subtotal,
      total_amount,
      amount_paid,
      tax_amount,
      discount_amount,
      due_date,
      notes,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      NEW.appointment_id,
      'INV-' || NEW.prescription_number || '-' || to_char(now(), 'YYYYMMDD'),
      'pending', -- Invoice starts as pending (awaiting payment)
      v_total_amount,
      v_total_amount,
      0,
      0,
      CURRENT_DATE + INTERVAL '7 days', -- Due in 7 days
      'Medication prescription invoice - must be paid before dispensing',
      NEW.prescribed_by,
      now(),
      now()
    ) RETURNING id INTO v_invoice_id;

    -- Create invoice items for each medication in the prescription
    FOR v_item IN
      SELECT pi.*, m.name, m.unit_price
      FROM public.prescription_items pi
      LEFT JOIN public.medications m ON pi.medication_id = m.id
      WHERE pi.prescription_id = NEW.id
    LOOP
      INSERT INTO public.invoice_items (
        invoice_id,
        description,
        item_type,
        quantity,
        unit_price,
        total_price,
        created_at
      ) VALUES (
        v_invoice_id,
        'Medication: ' || COALESCE(v_item.name, 'Unknown') || ' - Dosage: ' || v_item.dosage || ' - Frequency: ' || v_item.frequency,
        'medication',
        v_item.quantity,
        COALESCE(v_item.unit_price, 0),
        v_item.quantity * COALESCE(v_item.unit_price, 0),
        now()
      );
    END LOOP;

    RAISE NOTICE 'Invoice % created for prescription %', v_invoice_id, NEW.prescription_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_invoice_for_prescription ON public.prescriptions;

-- Step 5: Create trigger to call the function when a new prescription is inserted
CREATE TRIGGER trigger_create_invoice_for_prescription
AFTER INSERT ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.create_invoice_for_prescription();

-- Step 6: Update RLS policy for invoices to allow viewing of prescription-related invoices
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
CREATE POLICY "Staff can view invoices" ON public.invoices
FOR SELECT TO authenticated
USING (true);

-- Allow pharmacists to view invoices associated with prescriptions they're dispensing
DROP POLICY IF EXISTS "Pharmacists can view prescription invoices" ON public.invoices;
CREATE POLICY "Pharmacists can view prescription invoices" ON public.invoices
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'admin')
);
