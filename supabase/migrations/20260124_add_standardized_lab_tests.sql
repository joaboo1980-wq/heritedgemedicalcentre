-- Insert internationally standardized lab tests
-- Using ON CONFLICT to handle existing tests (update if exists, insert if new)
INSERT INTO public.lab_tests (test_code, test_name, category, description, normal_range, unit, price, turnaround_hours) VALUES
-- Hematology Tests
('CBC', 'Complete Blood Count (CBC)', 'Hematology', 'Measures white blood cells, red blood cells, hemoglobin, hematocrit, and platelets', 'Variable by age/sex', 'Cells/mcL', 15.00, 4),
('RBC', 'Red Blood Cell Count', 'Hematology', 'Measures the number of red blood cells in blood', 'M: 4.7-6.1M, F: 4.2-5.4M', 'Million cells/mcL', 10.00, 4),
('WBC', 'White Blood Cell Count', 'Hematology', 'Measures the number of white blood cells', '4.5-11.0', 'K cells/mcL', 10.00, 4),
('HGB', 'Hemoglobin', 'Hematology', 'Measures oxygen-carrying protein in red blood cells', 'M: 13.5-17.5, F: 12.0-15.5', 'g/dL', 8.00, 4),
('HCT', 'Hematocrit', 'Hematology', 'Percentage of blood that is red blood cells', 'M: 41-53%, F: 36-46%', '%', 8.00, 4),
('PLT', 'Platelet Count', 'Hematology', 'Measures the number of blood platelets', '150-400', 'K/mcL', 10.00, 4),
('MCV', 'Mean Corpuscular Volume', 'Hematology', 'Average size of red blood cells', '80-100', 'fL', 8.00, 4),
('MCH', 'Mean Corpuscular Hemoglobin', 'Hematology', 'Average amount of hemoglobin in red blood cells', '27-33', 'pg', 8.00, 4),

-- Chemistry Tests - Metabolic Panel
('GLU', 'Glucose (Fasting)', 'Chemistry', 'Measures blood sugar levels in fasting state', '70-100', 'mg/dL', 12.00, 4),
('BUN', 'Blood Urea Nitrogen', 'Chemistry', 'Measures kidney function through urea levels', '7-20', 'mg/dL', 12.00, 4),
('CRE', 'Creatinine', 'Chemistry', 'Measures kidney function and muscle metabolism', 'M: 0.7-1.3, F: 0.6-1.1', 'mg/dL', 12.00, 4),
('NA', 'Sodium', 'Chemistry', 'Measures sodium concentration in blood', '136-145', 'mEq/L', 12.00, 4),
('K', 'Potassium', 'Chemistry', 'Measures potassium concentration in blood', '3.5-5.0', 'mEq/L', 12.00, 4),
('CL', 'Chloride', 'Chemistry', 'Measures chloride concentration in blood', '98-107', 'mEq/L', 12.00, 4),
('CO2', 'Carbon Dioxide (Bicarbonate)', 'Chemistry', 'Measures acid-base balance in blood', '23-29', 'mEq/L', 12.00, 4),

-- Liver Function Tests
('ALB', 'Albumin', 'Chemistry', 'Measures liver protein production', '3.5-5.5', 'g/dL', 12.00, 4),
('TBIL', 'Total Bilirubin', 'Chemistry', 'Measures liver function and red blood cell breakdown', '0.1-1.2', 'mg/dL', 12.00, 4),
('DBIL', 'Direct Bilirubin', 'Chemistry', 'Measures conjugated bilirubin in blood', '0.0-0.3', 'mg/dL', 12.00, 4),
('ALT', 'Alanine Aminotransferase', 'Chemistry', 'Liver enzyme that indicates liver damage', '7-56', 'U/L', 12.00, 4),
('AST', 'Aspartate Aminotransferase', 'Chemistry', 'Liver enzyme that indicates liver damage', '10-40', 'U/L', 12.00, 4),
('ALP', 'Alkaline Phosphatase', 'Chemistry', 'Enzyme that indicates liver and bone disease', '30-120', 'U/L', 12.00, 4),
('GGT', 'Gamma-Glutamyl Transferase', 'Chemistry', 'Liver enzyme', 'M: 0-65, F: 0-36', 'U/L', 12.00, 4),

-- Lipid Profile
('CHOL', 'Total Cholesterol', 'Chemistry', 'Measures total cholesterol in blood', '<200', 'mg/dL', 12.00, 4),
('LDL', 'LDL Cholesterol', 'Chemistry', 'Measures bad cholesterol', '<100', 'mg/dL', 12.00, 4),
('HDL', 'HDL Cholesterol', 'Chemistry', 'Measures good cholesterol', '>40 M, >50 F', 'mg/dL', 12.00, 4),
('TRI', 'Triglycerides', 'Chemistry', 'Measures fat in blood', '<150', 'mg/dL', 12.00, 4),

-- Cardiac Markers
('CK-MB', 'Creatinine Kinase-MB', 'Chemistry', 'Cardiac enzyme for heart damage detection', '<5', 'ng/mL', 20.00, 2),
('TNI', 'Troponin I', 'Chemistry', 'Cardiac protein marker for heart attack', '<0.04', 'ng/mL', 25.00, 2),
('BNP', 'B-Type Natriuretic Peptide', 'Chemistry', 'Heart failure marker', '<100', 'pg/mL', 25.00, 4),

-- Kidney Function
('eGFR', 'Estimated Glomerular Filtration Rate', 'Chemistry', 'Estimates kidney filtering ability', '>60', 'mL/min/1.73m2', 12.00, 4),
('URIC', 'Uric Acid', 'Chemistry', 'Measures uric acid levels', 'M: 3.5-7.2, F: 2.6-6.0', 'mg/dL', 12.00, 4),

-- Blood Typing & Serology
('ABO', 'ABO Blood Type', 'Serology', 'Determines ABO blood group', 'A, B, AB, O', '-', 8.00, 4),
('RH', 'Rh Factor', 'Serology', 'Determines Rh positive or negative status', 'Positive/Negative', '-', 8.00, 4),
('RPR', 'Rapid Plasma Reagin', 'Serology', 'Syphilis screening test', 'Non-Reactive', '-', 15.00, 4),
('HIV', 'HIV Antibody Test', 'Serology', 'Tests for HIV infection', 'Negative', '-', 20.00, 8),
('HBsAg', 'Hepatitis B Surface Antigen', 'Serology', 'Tests for hepatitis B infection', 'Negative', '-', 20.00, 8),
('HCV', 'Hepatitis C Antibody', 'Serology', 'Tests for hepatitis C infection', 'Negative', '-', 20.00, 8),
('HBV', 'Hepatitis B Antibody', 'Serology', 'Tests for hepatitis B immunity', 'Variable', 'mIU/mL', 20.00, 8),

-- Thyroid Function
('TSH', 'Thyroid Stimulating Hormone', 'Endocrinology', 'Primary thyroid screening test', '0.4-4.0', 'mIU/L', 15.00, 4),
('T3', 'Triiodothyronine', 'Endocrinology', 'Thyroid hormone test', '80-200', 'ng/dL', 15.00, 4),
('T4', 'Thyroxine', 'Endocrinology', 'Thyroid hormone test', '4.5-12.0', 'mcg/dL', 15.00, 4),
('FT3', 'Free T3', 'Endocrinology', 'Free thyroid hormone T3', '2.3-4.2', 'pg/mL', 15.00, 4),
('FT4', 'Free T4', 'Endocrinology', 'Free thyroid hormone T4', '0.8-1.8', 'ng/dL', 15.00, 4),

-- Urinalysis
('UA', 'Urinalysis Complete', 'Urinalysis', 'Complete analysis of urine including physical, chemical, and microscopic examination', 'Normal values variable', '-', 10.00, 4),
('UGlu', 'Urine Glucose', 'Urinalysis', 'Detects glucose in urine', 'Negative', '-', 5.00, 4),
('UProt', 'Urine Protein', 'Urinalysis', 'Detects protein in urine', 'Negative/<150mg/day', 'mg/dL', 5.00, 4),
('UKet', 'Urine Ketones', 'Urinalysis', 'Detects ketones in urine', 'Negative', '-', 5.00, 4),

-- Coagulation Studies
('PT', 'Prothrombin Time', 'Coagulation', 'Measures blood clotting ability', '11-13.5', 'seconds', 15.00, 4),
('INR', 'International Normalized Ratio', 'Coagulation', 'Standardized PT measurement', '0.8-1.1', 'ratio', 15.00, 4),
('PTT', 'Partial Thromboplastin Time', 'Coagulation', 'Measures blood clotting ability', '25-35', 'seconds', 15.00, 4),

-- Immunology
('CRP', 'C-Reactive Protein', 'Immunology', 'Inflammation marker', '<3.0', 'mg/L', 18.00, 4),
('ESR', 'Erythrocyte Sedimentation Rate', 'Immunology', 'Inflammation marker', 'M: 0-15, F: 0-20', 'mm/hour', 12.00, 4),
('RF', 'Rheumatoid Factor', 'Immunology', 'Tests for rheumatoid arthritis', 'Negative', 'IU/mL', 20.00, 4),

-- Blood Cultures
('BC', 'Blood Culture', 'Microbiology', 'Culture test for bacterial/fungal infections', 'No growth', '-', 25.00, 48),
('CSF', 'Cerebrospinal Fluid Culture', 'Microbiology', 'Spinal fluid culture for meningitis', 'No growth', '-', 30.00, 48),

-- Stool Analysis
('SC', 'Stool Culture', 'Microbiology', 'Culture test for gastrointestinal pathogens', 'No pathogenic growth', '-', 20.00, 48),
('SP', 'Stool Parasites', 'Microbiology', 'Detects parasitic infections', 'Negative', '-', 15.00, 24),

-- Imaging/Radiology (codes)
('XR-CXR', 'Chest X-Ray', 'Radiology', 'Radiographic imaging of chest', 'Normal', '-', 30.00, 4),
('XR-BONY', 'Bone X-Ray', 'Radiology', 'Radiographic imaging of bone', 'Normal', '-', 25.00, 4),
('US', 'Ultrasound', 'Radiology', 'Ultrasound imaging', 'Normal', '-', 35.00, 4),
('CT', 'CT Scan', 'Radiology', 'Computed tomography scan', 'Normal', '-', 75.00, 4),

-- Vitamin/Mineral Tests
('B12', 'Vitamin B12', 'Chemistry', 'Measures B12 levels', '200-900', 'pg/mL', 18.00, 4),
('FOLD', 'Folate', 'Chemistry', 'Measures folate levels', '>5.4', 'ng/mL', 18.00, 4),
('D', 'Vitamin D 25-Hydroxy', 'Chemistry', 'Measures vitamin D status', '>30', 'ng/mL', 25.00, 4),
('CA', 'Calcium', 'Chemistry', 'Measures calcium levels', '8.5-10.2', 'mg/dL', 12.00, 4),
('PHOS', 'Phosphorus', 'Chemistry', 'Measures phosphorus levels', '2.5-4.5', 'mg/dL', 12.00, 4),
('MG', 'Magnesium', 'Chemistry', 'Measures magnesium levels', '1.7-2.2', 'mg/dL', 12.00, 4),
('FE', 'Iron (Serum)', 'Chemistry', 'Measures iron levels', 'M: 60-170, F: 50-170', 'mcg/dL', 12.00, 4),
('FERR', 'Ferritin', 'Chemistry', 'Measures iron storage levels', 'M: 24-336, F: 11-307', 'ng/mL', 12.00, 4),

-- Tumor Markers
('PSA', 'Prostate Specific Antigen', 'Oncology', 'Cancer marker for prostate cancer', '<4.0', 'ng/mL', 30.00, 4),
('CEA', 'Carcinoembryonic Antigen', 'Oncology', 'Cancer marker for various cancers', '<2.5', 'ng/mL', 30.00, 4),
('CA19-9', 'Cancer Antigen 19-9', 'Oncology', 'Cancer marker for gastrointestinal cancers', '<37', 'U/mL', 30.00, 4),
('AFP', 'Alpha-Fetoprotein', 'Oncology', 'Cancer marker for liver cancer', '<10', 'ng/mL', 30.00, 4),

-- Diabetes Testing
('HbA1c', 'Hemoglobin A1c', 'Chemistry', 'Average blood glucose over 2-3 months', '<5.7%', '%', 15.00, 4),
('PP-GLU', 'Postprandial Glucose', 'Chemistry', 'Blood glucose 2 hours after meals', '<140', 'mg/dL', 12.00, 4),

-- Additional Common Tests
('ASO', 'Anti-Streptolysin O', 'Serology', 'Tests for streptococcal infection', '<200', 'IU/mL', 15.00, 4),
('LA', 'Lactate', 'Chemistry', 'Measures lactic acid', '0.5-2.0', 'mmol/L', 18.00, 4),
('LDH', 'Lactate Dehydrogenase', 'Chemistry', 'Enzyme indicating cell damage', '140-280', 'U/L', 12.00, 4),
('CPK', 'Creatine Phosphokinase', 'Chemistry', 'Enzyme indicating muscle/heart damage', 'M: 52-336, F: 26-192', 'U/L', 12.00, 4),
('AMY', 'Amylase', 'Chemistry', 'Enzyme indicating pancreatic disease', '30-110', 'U/L', 12.00, 4),
('LIP', 'Lipase', 'Chemistry', 'Enzyme indicating pancreatic disease', '0-60', 'U/L', 12.00, 4),
('PHE', 'Phenylalanine', 'Chemistry', 'Newborn screening for PKU', '<2', 'mg/dL', 20.00, 4),
('TSH-NB', 'TSH Newborn Screening', 'Endocrinology', 'Newborn thyroid screening', '<10', 'mIU/L', 15.00, 4)
ON CONFLICT (test_code) DO UPDATE SET 
  test_name = EXCLUDED.test_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  normal_range = EXCLUDED.normal_range,
  unit = EXCLUDED.unit,
  price = EXCLUDED.price,
  turnaround_hours = EXCLUDED.turnaround_hours;
