-- Create duty_rosters table for admin-created schedules
CREATE TABLE IF NOT EXISTS public.duty_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  shift_type VARCHAR(50) NOT NULL, -- 'morning', 'afternoon', 'night', 'on-call'
  location VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, shift_date, shift_start_time)
);

-- Create staff_availability table for real-time status updates
CREATE TABLE IF NOT EXISTS public.staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  availability_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'available', 'unavailable', 'lunch', 'break', 'sick_leave', 'off_duty', 'out'
  start_time TIME,
  end_time TIME,
  reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, availability_date)
);

-- Enable RLS
ALTER TABLE public.duty_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duty_rosters
CREATE POLICY "Staff can view rosters"
ON public.duty_rosters
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create rosters"
ON public.duty_rosters
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rosters"
ON public.duty_rosters
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rosters"
ON public.duty_rosters
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for staff_availability
CREATE POLICY "Staff can view availability"
ON public.staff_availability
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can update own availability"
ON public.staff_availability
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = updated_by OR updated_by IS NULL);

CREATE POLICY "Staff can update own availability records"
ON public.staff_availability
FOR UPDATE
TO authenticated
USING (staff_id IN (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all availability"
ON public.staff_availability
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_duty_rosters_staff_id ON public.duty_rosters(staff_id);
CREATE INDEX idx_duty_rosters_shift_date ON public.duty_rosters(shift_date);
CREATE INDEX idx_duty_rosters_staff_date ON public.duty_rosters(staff_id, shift_date);
CREATE INDEX idx_staff_availability_staff_id ON public.staff_availability(staff_id);
CREATE INDEX idx_staff_availability_date ON public.staff_availability(availability_date);
CREATE INDEX idx_staff_availability_staff_date ON public.staff_availability(staff_id, availability_date);

-- Create trigger for updated_at
CREATE TRIGGER update_duty_rosters_updated_at
BEFORE UPDATE ON public.duty_rosters
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_staff_availability_updated_at
BEFORE UPDATE ON public.staff_availability
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
