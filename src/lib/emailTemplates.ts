/**
 * Email template for invoices
 */

export interface InvoiceEmailData {
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate?: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicEmail?: string;
}

export const generateInvoiceEmailTemplate = (data: InvoiceEmailData): string => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #0066cc, #0052a3); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; font-size: 14px; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #0066cc; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table td { padding: 8px; border-bottom: 1px solid #ddd; }
          table td.label { font-weight: bold; width: 40%; }
          table td.value { text-align: right; }
          .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 3px; }
          .paid { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; border-radius: 3px; }
          .footer { background: #333; color: white; padding: 20px; border-radius: 0 0 5px 5px; font-size: 12px; text-align: center; }
          .footer p { margin: 5px 0; }
          .btn { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>Invoice Payment Notice</h1>
            <p>Invoice #${data.invoiceNumber}</p>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Greeting -->
            <div class="section">
              <p>Dear ${data.patientName},</p>
              <p>Thank you for choosing ${data.clinicName || 'Heritage Medical Centre'} for your healthcare needs. This is a reminder about your outstanding invoice.</p>
            </div>

            <!-- Invoice Details -->
            <div class="section">
              <h3>Invoice Summary</h3>
              <table>
                <tr>
                  <td class="label">Invoice Number:</td>
                  <td class="value"><strong>${data.invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td class="label">Total Amount:</td>
                  <td class="value">UGX ${data.totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td class="label">Amount Paid:</td>
                  <td class="value" style="color: #28a745;">UGX ${data.amountPaid.toLocaleString()}</td>
                </tr>
                <tr>
                  <td class="label"><strong>Balance Due:</strong></td>
                  <td class="value" style="color: #dc3545; font-weight: bold;">UGX ${data.balanceDue.toLocaleString()}</td>
                </tr>
                ${data.dueDate ? `<tr>
                  <td class="label">Due Date:</td>
                  <td class="value">${data.dueDate}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Balance Status -->
            ${data.balanceDue === 0 ? `
              <div class="paid">
                <strong>✓ Invoice Paid in Full</strong>
                <p>Thank you for your prompt payment. We appreciate your business.</p>
              </div>
            ` : `
              <div class="highlight">
                <strong>Outstanding Balance: UGX ${data.balanceDue.toLocaleString()}</strong>
                <p>Please arrange payment at your earliest convenience to avoid any service delays.</p>
              </div>
            `}

            <!-- Payment Instructions -->
            <div class="section">
              <h3>Payment Methods</h3>
              <p>You can settle this invoice through any of the following methods:</p>
              <ul>
                <li>Visit our clinic during business hours</li>
                <li>Bank transfer to our institutional account</li>
                <li>Mobile money (MTN, Airtel, or Equity)</li>
                <li>Credit/Debit card payment</li>
              </ul>
              <p>Please reference invoice #${data.invoiceNumber} with your payment.</p>
            </div>

            <!-- Contact Information -->
            <div class="section">
              <h3>Contact Us</h3>
              <p>If you have any questions regarding this invoice or need assistance with payment arrangements, please don't hesitate to contact us:</p>
              <table>
                <tr>
                  <td class="label">Phone:</td>
                  <td class="value">${data.clinicPhone || '+256 414 XXXXXX'}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${data.clinicEmail || 'billing@heritage-med.ug'}</td>
                </tr>
              </table>
            </div>

            <!-- Closing -->
            <div class="section">
              <p>Thank you for being a valued patient at ${data.clinicName || 'Heritage Medical Centre'}. We look forward to serving you again soon.</p>
              <p>Best regards,<br><strong>Billing Department</strong><br>${data.clinicName || 'Heritage Medical Centre'}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>&copy; 2026 ${data.clinicName || 'Heritage Medical Centre'}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>For inquiries, contact billing@heritage-med.ug</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};

/**
 * Send invoice email via email service
 * Requires backend API implementation
 */
export const sendInvoiceViaEmail = async (
  recipientEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
