import { supabase } from './supabase';
import { generatePDF } from './pdfGeneratorNew';

interface ReportData {
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
    referredBy?: string;
  };
  report: {
    reportId: string;
    collectionDate: string;
    reportDate: string;
    reportType: string;
  };
  testResults: Array<{
    parameter: string;
    result: string;
    unit: string;
    referenceRange: string;
    flag?: string;
  }>;
  interpretation?: string;
}

// Generate and save PDF report to Supabase storage
export async function generateAndSavePDFReport(orderId: string, reportData: ReportData): Promise<string | null> {
  console.log('generateAndSavePDFReport called for:', orderId);
  
  try {
    // Check if PDF already exists in database
    const { data: existingReport } = await supabase
      .from('reports')
      .select('pdf_url, pdf_generated_at')
      .eq('order_id', orderId)
      .single();

    if (existingReport?.pdf_url) {
      console.log('PDF already exists:', existingReport.pdf_url);
      
      // Verify the URL is still valid
      try {
        const response = await fetch(existingReport.pdf_url, { method: 'HEAD' });
        if (response.ok) {
          return existingReport.pdf_url;
        }
      } catch (error) {
        console.warn('Existing PDF URL is invalid, regenerating...');
      }
    }

    // Generate PDF using pdfGeneratorNew
    const pdfUrl = await generatePDF(reportData);
    
    if (!pdfUrl) {
      console.error('Failed to generate PDF');
      return null;
    }

    // If it's a PDF.co URL, download and save to Supabase storage
    if (pdfUrl.includes('pdf.co')) {
      const pdfBlob = await fetch(pdfUrl).then(res => res.blob());
      
      const fileName = `reports/${orderId}_${Date.now()}.pdf`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      // Update database with PDF URL
      const { error: updateError } = await supabase
        .from('reports')
        .update({ 
          pdf_url: publicUrl,
          pdf_generated_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('order_id', orderId);

      if (updateError) {
        console.error('Failed to update report with PDF URL:', updateError);
      }

      return publicUrl;
    }

    // For blob URLs or other URLs, just return as is
    return pdfUrl;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return null;
  }
}

// View PDF report (opens in new tab)
export async function viewPDFReport(orderId: string, reportData: ReportData): Promise<string | null> {
  console.log('viewPDFReport called for:', orderId);
  const pdfUrl = await generateAndSavePDFReport(orderId, reportData);
  return pdfUrl;
}

// Download PDF report
export async function downloadPDFReport(orderId: string, reportData: ReportData): Promise<boolean> {
  console.log('downloadPDFReport called for:', orderId);
  
  try {
    const pdfUrl = await generateAndSavePDFReport(orderId, reportData);
    if (!pdfUrl) {
      console.error('No PDF URL generated');
      return false;
    }

    // For blob URLs, handle differently
    if (pdfUrl.startsWith('blob:')) {
      // Open in new window for blob URLs
      window.open(pdfUrl, '_blank');
      return true;
    }

    // For regular URLs, create download link
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `report_${orderId}_${Date.now()}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return false;
  }
}