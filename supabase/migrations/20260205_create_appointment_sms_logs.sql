-- Create table to track SMS reminders sent to patients
CREATE TABLE IF NOT EXISTS public.appointment_sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('confirmation', 'reminder_24h', 'reminder_1h', 'cancellation', 'reschedule')),
    message_content TEXT NOT NULL,
    twilio_message_sid TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view SMS logs"
ON public.appointment_sms_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only system can insert SMS logs"
ON public.appointment_sms_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only system can update SMS logs"
ON public.appointment_sms_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_appointment_id ON public.appointment_sms_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_patient_id ON public.appointment_sms_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.appointment_sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON public.appointment_sms_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.appointment_sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON public.appointment_sms_logs(twilio_message_sid);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_appointment_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_appointment_sms_logs_updated_at_trigger ON public.appointment_sms_logs;
CREATE TRIGGER update_appointment_sms_logs_updated_at_trigger
BEFORE UPDATE ON public.appointment_sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_appointment_sms_logs_updated_at();
