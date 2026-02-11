import { format, isPast } from 'date-fns';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
}

interface PatientInfo {
  first_name: string;
  last_name: string;
  patient_number: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceTemplateProps {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total_amount: number;
    amount_paid: number;
    due_date: string | null;
    created_at: string;
    patients?: PatientInfo;
  };
  invoiceItems: InvoiceItem[];
  isProofOfPayment?: boolean;
}

export const InvoiceTemplate = ({ invoice, invoiceItems, isProofOfPayment }: InvoiceTemplateProps) => {
  const balanceDue = invoice.total_amount - invoice.amount_paid;
  const isOverdue = invoice.due_date && isPast(new Date(invoice.due_date)) && balanceDue > 0;
  const daysOverdue = invoice.due_date ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
  const tax = 0; // Can be configured
  const total = subtotal + tax;

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white text-gray-900">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-8 border-b-2">
        <div className="flex-1">
          <img 
            src="/assets/heritage-logo.jpg" 
            alt="Heritage Medical Centre" 
            className="h-16 object-contain mb-2"
            onError={(e) => {
              // Fallback to text if logo not found
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">Heritage Medical Centre</h1>
            <p className="text-sm text-gray-600 mt-1">Premium Healthcare Services</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-primary mb-2">INVOICE</div>
          {isProofOfPayment && (
            <div className="bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1 rounded font-bold text-sm">
              PROOF OF PAYMENT
            </div>
          )}
        </div>
      </div>

      {/* Billing Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold text-gray-600 uppercase mb-3 tracking-widest">Bill To</h3>
          <div className="space-y-1">
            <p className="font-bold text-lg">
              {invoice.patients?.first_name} {invoice.patients?.last_name}
            </p>
            <p className="text-sm text-gray-600">Patient #{invoice.patients?.patient_number}</p>
            {invoice.patients?.email && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {invoice.patients.email}
              </p>
            )}
            {invoice.patients?.phone && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {invoice.patients.phone}
              </p>
            )}
            {invoice.patients?.address && (
              <p className="text-sm text-gray-600 flex items-start gap-2">
                <MapPin className="h-3 w-3 mt-0.5" />
                {invoice.patients.address}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Invoice #:</span>
            <span className="font-mono font-bold text-lg">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold">{format(new Date(invoice.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Due Date:</span>
            <span className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
              {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'Upon Receipt'}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-gray-600">Status:</span>
            <span className={`font-bold px-2 py-1 rounded text-xs ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              invoice.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              'bg-red-100 text-red-700'
            }`}>
              {invoice.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-3 px-3 text-xs font-bold text-gray-700 uppercase">Description</th>
            <th className="text-center py-3 px-3 text-xs font-bold text-gray-700 uppercase">Type</th>
            <th className="text-right py-3 px-3 text-xs font-bold text-gray-700 uppercase">Qty</th>
            <th className="text-right py-3 px-3 text-xs font-bold text-gray-700 uppercase">Unit Price</th>
            <th className="text-right py-3 px-3 text-xs font-bold text-gray-700 uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="py-3 px-3 text-sm">{item.description}</td>
              <td className="py-3 px-3 text-sm text-center text-gray-600 capitalize">{item.item_type}</td>
              <td className="py-3 px-3 text-sm text-right">{item.quantity}</td>
              <td className="py-3 px-3 text-sm text-right">UGX {item.unit_price.toLocaleString()}</td>
              <td className="py-3 px-3 text-sm text-right font-semibold">UGX {item.total_price.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 text-sm border-t">
            <span>Subtotal:</span>
            <span className="font-semibold">UGX {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-sm border-b-2">
            <span>Tax (0%):</span>
            <span className="font-semibold">UGX 0</span>
          </div>
          <div className="flex justify-between py-3 text-lg font-bold bg-primary/10 px-4 py-3 rounded">
            <span>Total Amount Due:</span>
            <span>UGX {total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-sm mt-2">
            <span>Amount Paid:</span>
            <span className="font-semibold text-green-600">UGX {invoice.amount_paid.toLocaleString()}</span>
          </div>
          {balanceDue > 0 && (
            <div className={`flex justify-between py-2 text-sm font-bold px-3 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              <span>Balance Due:</span>
              <span>UGX {balanceDue.toLocaleString()}</span>
            </div>
          )}
          {isOverdue && daysOverdue > 0 && (
            <div className="mt-2 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded">
              ⚠️ This invoice is {daysOverdue} days overdue
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Banner */}
      {invoice.status === 'paid' && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8 rounded">
          <p className="text-green-800 font-semibold">✓ PAID IN FULL</p>
          <p className="text-green-700 text-sm">This invoice has been settled. Thank you for your prompt payment.</p>
        </div>
      )}

      {isOverdue && balanceDue > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded">
          <p className="text-red-800 font-semibold">⚠️ OVERDUE - PAYMENT REQUIRED</p>
          <p className="text-red-700 text-sm">This invoice is {daysOverdue} days overdue. Please remit payment immediately.</p>
        </div>
      )}

      {invoice.status === 'partially_paid' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
          <p className="text-blue-800 font-semibold">PARTIAL PAYMENT RECEIVED</p>
          <p className="text-blue-700 text-sm">Balance of UGX {balanceDue.toLocaleString()} is still due.</p>
        </div>
      )}

      {/* Footer */}
      <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t text-xs text-gray-600">
        <div>
          <h4 className="font-bold text-gray-900 mb-2">Contact Us</h4>
          <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> +256 414 XXX XXX</p>
          <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> billing@heritage-med.ug</p>
          <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Kampala, Uganda</p>
        </div>
        <div className="text-right">
          <h4 className="font-bold text-gray-900 mb-2">Payment Terms</h4>
          <p>Net {invoice.due_date ? Math.floor((new Date(invoice.due_date).getTime() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 30} days</p>
          <p className="text-gray-500 text-xs mt-2">Invoice ID: {invoice.id}</p>
        </div>
      </div>

      {/* Print Notice */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
        <p>This is an official invoice from Heritage Medical Centre. Please keep for your records.</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
