-- Fix invoice deletion and disable auto-generation of duplicate invoices
-- Issue 1: Invoice deletion was blocked by missing DELETE RLS policy
-- Issue 2: Trigger was creating draft invoices automatically, causing duplicate invoice generation

-- 1. Add DELETE policy for invoices to allow staff to delete
DROP POLICY IF EXISTS "Authorized staff can delete invoices" ON public.invoices;

CREATE POLICY "Authorized staff can delete invoices" ON public.invoices FOR DELETE TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    );

-- 2. Disable the auto-generation trigger that creates duplicate invoices
-- The trigger was creating invoices automatically for every prescription, which caused overbilling
-- Instead, pharmacy staff should manually create invoices via the UI with proper quantities
DROP TRIGGER IF EXISTS trigger_create_invoice_for_prescription ON public.prescriptions;

-- Keep the function in place in case we need it later, but don't use it
-- DROP FUNCTION IF EXISTS public.create_invoice_for_prescription();
