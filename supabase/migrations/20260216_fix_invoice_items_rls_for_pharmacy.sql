-- Fix invoice and invoice_items RLS policies to allow pharmacists to create invoices
-- Pharmacists need to be able to insert and update invoices and invoice items when creating invoices in the pharmacy module

-- Drop existing policies for invoices
DROP POLICY IF EXISTS "Authorized staff can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authorized staff can update invoices" ON public.invoices;

-- Create new INSERT policy for invoices - allow pharmacists, receptionists, and admins
CREATE POLICY "Authorized staff can create invoices" ON public.invoices FOR INSERT TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    );

-- Create new UPDATE policy for invoices - allow pharmacists, receptionists, and admins
CREATE POLICY "Authorized staff can update invoices" ON public.invoices FOR UPDATE TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    );

-- Drop existing policies for invoice_items
DROP POLICY IF EXISTS "Authorized staff can manage invoice items" ON public.invoice_items;

-- Create new INSERT policy for invoice_items - allow pharmacists, receptionists, and admins
CREATE POLICY "Authorized staff can create invoice items" ON public.invoice_items FOR INSERT TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    );

-- Create new UPDATE policy for invoice_items - allow pharmacists, receptionists, and admins
CREATE POLICY "Authorized staff can update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
        OR public.has_role(auth.uid(), 'pharmacist')
    );

-- Create new DELETE policy for invoice_items - allow admins and receptionists only
CREATE POLICY "Authorized staff can delete invoice items" ON public.invoice_items FOR DELETE TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'receptionist')
    );

-- Existing SELECT policies continue to work - staff can view invoices and invoice items
