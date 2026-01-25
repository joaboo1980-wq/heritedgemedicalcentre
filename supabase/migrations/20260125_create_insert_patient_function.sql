-- Create RPC function to insert patient with atomic patient_number generation
CREATE OR REPLACE FUNCTION public.insert_patient(
  p_first_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE,
  p_gender TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_blood_type TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_insurance_provider TEXT DEFAULT NULL,
  p_insurance_number TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS SETOF public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_number TEXT;
  v_year_prefix TEXT;
  v_seq_num INTEGER;
  v_new_patient public.patients;
BEGIN
  -- Log function call
  RAISE WARNING '[INSERT_PATIENT] Function called with first_name=%, last_name=%, dob=%', p_first_name, p_last_name, p_date_of_birth;
  
  -- Generate patient number atomically
  v_year_prefix := 'P' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number safely
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 6) AS INTEGER)), 0) + 1
  INTO v_seq_num
  FROM public.patients
  WHERE patient_number LIKE v_year_prefix || '%'
  FOR UPDATE; -- Lock to prevent race conditions
  
  v_patient_number := v_year_prefix || '-' || LPAD(v_seq_num::TEXT, 5, '0');
  
  RAISE WARNING '[INSERT_PATIENT] Generated patient_number=%', v_patient_number;
  
  -- Insert patient with generated patient_number
  INSERT INTO public.patients (
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone,
    email,
    address,
    blood_type,
    emergency_contact_name,
    emergency_contact_phone,
    insurance_provider,
    insurance_number,
    created_by,
    patient_number
  ) VALUES (
    p_first_name,
    p_last_name,
    p_date_of_birth,
    p_gender,
    p_phone,
    p_email,
    p_address,
    p_blood_type,
    p_emergency_contact_name,
    p_emergency_contact_phone,
    p_insurance_provider,
    p_insurance_number,
    p_created_by,
    v_patient_number
  )
  RETURNING * INTO v_new_patient;
  
  RAISE WARNING '[INSERT_PATIENT] Patient inserted with id=%', v_new_patient.id;
  
  RETURN NEXT v_new_patient;
  
  RAISE WARNING '[INSERT_PATIENT] Function returning patient record';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_patient TO authenticated;
