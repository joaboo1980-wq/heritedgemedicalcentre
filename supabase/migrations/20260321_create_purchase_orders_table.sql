-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'partial', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2),
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_purchase_orders_supplier_name ON public.purchase_orders(supplier_name);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX idx_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_medication_id ON public.purchase_order_items(medication_id);

-- RLS Policies for purchase_orders
CREATE POLICY "Pharmacists can create purchase orders"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Pharmacists can view purchase orders"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Pharmacists can update their purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete purchase orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase_order_items
CREATE POLICY "Pharmacists can create order items"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Pharmacists can view order items"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Pharmacists can update order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete order items"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
