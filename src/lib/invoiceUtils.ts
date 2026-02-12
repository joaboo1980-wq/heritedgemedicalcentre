/**
 * Invoice utilities for PDF generation and email
 */

export const generatePDF = async (
  element: HTMLElement | null,
  filename: string
) => {
  if (!element) {
    throw new Error('Element not found for PDF generation');
  }

  try {
    // Dynamically import html2canvas and jspdf
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).jsPDF;

    // Generate canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const y = 10;
    pdf.addImage(imgData, 'PNG', 10, y, imgWidth, imgHeight);

    // Handle multi-page PDFs
    let heightLeft = imgHeight - pageHeight + 20;
    let position = 0;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF. Make sure html2canvas and jspdf are installed.');
  }
};

export const printInvoice = (element: HTMLElement | null) => {
  if (!element) {
    throw new Error('Element not found for printing');
  }

  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }

  const elementClone = element.cloneNode(true) as HTMLElement;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Print Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          * { box-sizing: border-box; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${elementClone.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export const sendInvoiceEmail = async (
  invoiceNumber: string,
  patientEmail: string,
  patientName: string,
  pdfData: string
) => {
  try {
    // Call backend API to send email
    // This assumes you have an API endpoint set up
    const response = await fetch('/api/send-invoice-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceNumber,
        recipientEmail: patientEmail,
        recipientName: patientName,
        pdfData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

/**
 * Format currency for display in invoices
 */
export const formatCurrency = (amount: number, currency: string = 'UGX'): string => {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * Generate invoice filename
 */
export const generateInvoiceFilename = (invoiceNumber: string, patientName: string, status?: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const statusSuffix = status ? `-${status}` : '';
  return `${invoiceNumber}-${patientName.replace(/\s+/g, '-')}${statusSuffix}-${timestamp}.pdf`;
};
