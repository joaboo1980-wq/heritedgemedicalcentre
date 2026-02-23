/**
 * EXAMPLE: How to Update Existing Mutations with Session Validation
 * 
 * This file shows BEFORE and AFTER examples of how to integrate
 * session validation into your existing useMutation calls.
 * 
 * Applied to: Pharmacy.tsx, Invoices.tsx, and other pages with mutations
 */

// ============================================
// EXAMPLE 1: Creating an Invoice with Session Validation
// ============================================

// BEFORE (without session validation):
/*
const createSimpleInvoiceMutation = useMutation({
  mutationFn: async (data: typeof simplifiedInvoiceForm) => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        patient_id: data.patient_id,
        due_date: data.due_date,
        subtotal: subtotal,
        total_amount: subtotal,
        // ... other fields
      })
      .select()
      .single();
    
    if (error) throw error;
    return invoice;
  },
});
*/

// AFTER (with session validation):
/*
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { withSessionValidation } from '@/utils/sessionValidationAPI';

const createSimpleInvoiceMutation = useMutation({
  mutationFn: async (data: typeof simplifiedInvoiceForm) => {
    const authContext = useContext(AuthContext);
    const userId = authContext?.user?.id;
    const sessionToken = authContext?.sessionToken;

    // Validate session before proceeding
    const result = await withSessionValidation(
      userId!,
      sessionToken!,
      async () => {
        const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const { data: invoice, error } = await supabase
          .from('invoices')
          .insert({
            patient_id: data.patient_id,
            due_date: data.due_date,
            subtotal: subtotal,
            total_amount: subtotal,
            // ... other fields
          })
          .select()
          .single();
        
        if (error) throw error;
        return invoice;
      },
      'Create Invoice'
    );

    if (!result) throw new Error('Session validation failed');
    return result;
  },
});
*/

// ============================================
// EXAMPLE 2: Dispensing Medication with Session Validation
// ============================================

// BEFORE (without session validation):
/*
const dispenseMedicationMutation = useMutation({
  mutationFn: async (prescriptionId: string) => {
    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'dispensed' })
      .eq('id', prescriptionId);
    
    if (error) throw error;
  },
});
*/

// AFTER (with session validation):
/*
const dispenseMedicationMutation = useMutation({
  mutationFn: async (prescriptionId: string) => {
    const authContext = useContext(AuthContext);
    const userId = authContext?.user?.id;
    const sessionToken = authContext?.sessionToken;

    const result = await withSessionValidation(
      userId!,
      sessionToken!,
      async () => {
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: 'dispensed' })
          .eq('id', prescriptionId);
        
        if (error) throw error;
        return { success: true };
      },
      'Dispense Medication'
    );

    if (!result) throw new Error('Session validation failed');
    return result;
  },
});
*/

// ============================================
// EXAMPLE 3: Using Hooks in Components
// ============================================

/*
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export const MyComponent = () => {
  const authContext = useContext(AuthContext);
  const { validateSession, withSessionValidation } = useSessionValidation();

  // Option A: Check session before user initiates an action
  const handleCreateInvoice = async () => {
    const isValid = await validateSession();
    if (!isValid) {
      console.error('Session invalid - user will be logged out');
      return;
    }
    
    // Session is valid, proceed with invoice creation
    // ... open modal, make mutation, etc
  };

  // Option B: Wrap the mutation call itself
  const handleSave = async (data: any) => {
    const result = await withSessionValidation(
      async () => {
        // This only runs if session is valid
        return await supabase.from('invoices').insert(data);
      }
    );

    if (result) {
      console.log('Save succeeded');
    }
  };

  return (
    <button onClick={handleCreateInvoice}>Create Invoice</button>
  );
};
*/

// ============================================
// FULL IMPLEMENTATION CHECKLIST
// ============================================

export const IMPLEMENTATION_CHECKLIST = {
  step1: {
    title: 'Update AuthContext ✅',
    files: ['src/contexts/AuthContext.tsx'],
    status: 'DONE',
  },
  step2: {
    title: 'Create Session Hooks',
    files: ['src/hooks/useSessionValidation.ts'],
    status: 'DONE',
  },
  step3: {
    title: 'Create API Utils',
    files: ['src/utils/sessionValidationAPI.ts'],
    status: 'DONE',
  },
  step4: {
    title: 'Update Mutations in Pages',
    files: [
      'src/pages/Pharmacy.tsx - createSimpleInvoiceMutation',
      'src/pages/Pharmacy.tsx - dispenseMedicationMutation',
      'src/pages/Invoices.tsx - createInvoiceMutation',
      'src/pages/Invoices.tsx - deleteInvoiceMutation',
      'src/pages/DoctorExamination.tsx - saveMedicalExaminationMutation',
      // Add more as needed
    ],
    status: 'TODO - Copy pattern from examples above',
  },
  step5: {
    title: 'Test Session Enforcement',
    testCases: [
      'Login from Device A',
      'Login from Device B with same account',
      'Verify Device A gets logged out',
      'Verify Device B can make requests',
      'Create data from Device B',
      'Verify no duplicate records',
    ],
    status: 'TODO',
  },
};

// ============================================
// QUICK COPY-PASTE TEMPLATE FOR ANY MUTATION
// ============================================

export const MUTATION_TEMPLATE = `
const myMutation = useMutation({
  mutationFn: async (data: MyDataType) => {
    const authContext = useContext(AuthContext);
    const userId = authContext?.user?.id;
    const sessionToken = authContext?.sessionToken;

    // Wrap your entire mutation logic in withSessionValidation
    const result = await withSessionValidation(
      userId!,
      sessionToken!,
      async () => {
        // Your actual supabase operation here
        const { data: result, error } = await supabase
          .from('table_name')
          .insert(data)
          .select();
        
        if (error) throw error;
        return result;
      },
      'My Operation Name' // User-friendly name for error messages
    );

    if (!result) throw new Error('Session validation failed');
    return result;
  },
  onSuccess: () => {
    toast.success('Success!');
    queryClient.invalidateQueries({ queryKey: ['my_data'] });
  },
  onError: (error: Error) => {
    toast.error('Failed: ' + error.message);
  },
});
`;

export default MUTATION_TEMPLATE;
