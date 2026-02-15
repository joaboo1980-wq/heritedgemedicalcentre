-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- appointment_scheduled, appointment_reminder, lab_results_ready, lab_results_abnormal, prescription_ready, low_stock_alert, invoice_payment_pending, etc.
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  is_read BOOLEAN DEFAULT false,
  reference_id UUID, -- ID of related resource (appointment, lab order, invoice, etc.)
  reference_type TEXT, -- 'appointment', 'lab_order', 'invoice', 'prescription', etc.
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policy: Users can view their own notifications
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: System/authenticated users can insert notifications
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON public.notifications;
CREATE POLICY "authenticated_insert_notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- RLS Policy: Users can update their own notifications (for marking as read)
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own notifications
DROP POLICY IF EXISTS "users_delete_own_notifications" ON public.notifications;
CREATE POLICY "users_delete_own_notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);
