import { supabase } from './supabase';

// PDF.co API configuration
const PDFCO_API_KEY = import.meta.env.VITE_PDFCO_API_KEY || 'landinquiryfirm@gmail.com_AEu7lrDUacQsWOHuJ757dQDYPrJz6XbsYQcX2HrSVXf1LX8cvBn94TPzmfpeVgrT';
const PDFCO_API_URL = 'https://api.pdf.co/v1/pdf/convert/from/html';

// Interfaces from pdfGenerator.ts
export interface LabTemplate {
  id: string;
  name: string;
  header: {
    labName: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
  footer: {
    signature: string;
    authorizedBy: string;
    disclaimer?: string;
  };
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
}

export interface PatientInfo {
  name: string;
  id: string;
  age: number;
  gender: string;
  referredBy?: string;
}

export interface ReportDetails {
  reportId: string;
  collectionDate: string;
  reportDate: string;
  reportType: string;
}

export interface TestResult {
  parameter: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag?: string;
}

export interface ReportData {
  patient: PatientInfo;
  report: ReportDetails;
  testResults: TestResult[];
  interpretation?: string;
  template?: LabTemplate;
}

// Default lab template
export const defaultLabTemplate: LabTemplate = {
  id: 'medilab-default',
  name: 'MediLab Diagnostics Default',
  header: {
    labName: 'MediLab Diagnostics',
    address: '123 Health Street, Medical District, City - 560001',
    phone: '+91 80 1234 5678',
    email: 'reports@medilab.com',
  },
  footer: {
    signature: 'Digital Signature',
    authorizedBy: 'Dr. Sarah Wilson, MD',
    disclaimer: 'This report is generated electronically and is valid without signature.',
  },
  styling: {
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Arial, sans-serif',
  },
};

// Template management functions
export const saveLabTemplate = (template: LabTemplate): void => {
  try {
    const templates = getLabTemplates();
    const updatedTemplates = templates.filter(t => t.id !== template.id);
    updatedTemplates.push(template);
    localStorage.setItem('lims_lab_templates', JSON.stringify(updatedTemplates));
  } catch (error) {
    console.error('Error saving lab template:', error);
  }
};

export const getLabTemplates = (): LabTemplate[] => {
  try {
    const templates = localStorage.getItem('lims_lab_templates');
    return templates ? JSON.parse(templates) : [defaultLabTemplate];
  } catch (error) {
    console.error('Error loading lab templates:', error);
    return [defaultLabTemplate];
  }
};

export const getLabTemplate = (id: string): LabTemplate => {
  const templates = getLabTemplates();
  return templates.find(t => t.id === id) || defaultLabTemplate;
};

// Enhanced HTML template generator
const generateUniversalHTMLTemplate = (data: ReportData): string => {
  const { patient, report, testResults, interpretation } = data;
  const template = data.template || defaultLabTemplate;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Report - ${report.reportId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${template.styling.fontFamily}; 
      padding: 30px; 
      margin: 0;
      color: #333;
      line-height: 1.6;
      font-size: 12px;
    }
    .header { 
      text-align: center; 
      border-bottom: 3px solid ${template.styling.primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header .lab-name {
      font-size: 28px;
      font-weight: bold;
      color: ${template.styling.primaryColor};
      margin-bottom: 8px;
    }
    .header .lab-info {
      font-size: 12px;
      color: ${template.styling.secondaryColor};
      line-height: 1.4;
    }
    .report-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: ${template.styling.primaryColor};
      margin: 25px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin: 25px 0;
    }
    .info-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 5px solid ${template.styling.primaryColor};
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .info-title {
      font-weight: bold;
      color: ${template.styling.primaryColor};
      margin-bottom: 15px;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-item {
      margin: 8px 0;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
    }
    .info-label {
      font-weight: bold;
      color: ${template.styling.secondaryColor};
      min-width: 120px;
    }
    .info-value {
      color: #333;
      font-weight: 500;
    }
    .results-section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: ${template.styling.primaryColor};
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${template.styling.primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px 8px; 
      text-align: left;
      font-size: 12px;
    }
    th {
      background: ${template.styling.primaryColor};
      color: white;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 11px;
    }
    td {
      text-align: center;
      vertical-align: middle;
    }
    td:first-child {
      text-align: left;
      font-weight: 600;
      color: #333;
    }
    .result-value {
      font-weight: bold;
      font-size: 13px;
    }
    .flag-h {
      color: #dc3545;
      font-weight: bold;
    }
    .flag-l {
      color: #0066cc;
      font-weight: bold;
    }
    .flag-c {
      color: #ff6600;
      font-weight: bold;
    }
    .interpretation-box {
      background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
      padding: 20px;
      border-radius: 8px;
      border-left: 5px solid ${template.styling.primaryColor};
      margin: 30px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .interpretation-title {
      font-weight: bold;
      color: ${template.styling.primaryColor};
      margin-bottom: 12px;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .interpretation-text {
      line-height: 1.6;
      color: #333;
      font-size: 13px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid ${template.styling.secondaryColor};
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 30px 0;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 8px;
      font-weight: bold;
      font-size: 12px;
    }
    .footer-info {
      text-align: center;
      font-size: 10px;
      color: ${template.styling.secondaryColor};
      margin-top: 20px;
      font-style: italic;
    }
    .generation-info {
      text-align: center;
      font-size: 10px;
      color: ${template.styling.secondaryColor};
      margin-top: 15px;
    }
    @media print {
      body { margin: 0; padding: 15px; }
      .page-break { page-break-before: always; }
      .info-grid { grid-template-columns: 1fr; gap: 15px; }
      .signature-section { grid-template-columns: 1fr; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="lab-name">${template.header.labName}</div>
    <div class="lab-info">
      ${template.header.address}<br>
      Phone: ${template.header.phone} | Email: ${template.header.email}
    </div>
  </div>

  <div class="report-title">Laboratory Report</div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">Patient Information</div>
      <div class="info-item">
        <span class="info-label">Name:</span>
        <span class="info-value">${patient.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Patient ID:</span>
        <span class="info-value">${patient.id}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Age:</span>
        <span class="info-value">${patient.age} years</span>
      </div>
      <div class="info-item">
        <span class="info-label">Gender:</span>
        <span class="info-value">${patient.gender}</span>
      </div>
      ${patient.referredBy ? `
      <div class="info-item">
        <span class="info-label">Referred By:</span>
        <span class="info-value">${patient.referredBy}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="info-box">
      <div class="info-title">Report Details</div>
      <div class="info-item">
        <span class="info-label">Report ID:</span>
        <span class="info-value">${report.reportId}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Collection Date:</span>
        <span class="info-value">${new Date(report.collectionDate).toLocaleDateString('en-IN')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Report Date:</span>
        <span class="info-value">${new Date(report.reportDate).toLocaleDateString('en-IN')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Test Type:</span>
        <span class="info-value">${report.reportType}</span>
      </div>
    </div>
  </div>

  <div class="results-section">
    <div class="section-title">Test Results</div>
    <table>
      <thead>
        <tr>
          <th style="width: 35%;">Parameter</th>
          <th style="width: 15%;">Result</th>
          <th style="width: 10%;">Unit</th>
          <th style="width: 25%;">Reference Range</th>
          <th style="width: 15%;">Flag</th>
        </tr>
      </thead>
      <tbody>
        ${testResults.map(result => `
          <tr>
            <td>${result.parameter}</td>
            <td class="result-value ${result.flag ? `flag-${result.flag.toLowerCase()}` : ''}">${result.result}</td>
            <td>${result.unit || '-'}</td>
            <td>${result.referenceRange || '-'}</td>
            <td>${result.flag ? `<span class="flag-${result.flag.toLowerCase()}">${result.flag}</span>` : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${interpretation ? `
  <div class="interpretation-box">
    <div class="interpretation-title">Clinical Interpretation</div>
    <div class="interpretation-text">${interpretation}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">
          Laboratory Technician
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          ${template.footer.authorizedBy}
        </div>
      </div>
    </div>
    
    ${template.footer.disclaimer ? `
    <div class="footer-info">
      ${template.footer.disclaimer}
    </div>
    ` : ''}
    
    <div class="generation-info">
      Report generated on: ${new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}
    </div>
  </div>
</body>
</html>`;
};

// Enhanced PDF generation with PDF.co API
export const generatePDFWithAPI = async (reportData: ReportData): Promise<string> => {
  console.log('Generating PDF with PDF.co API...');
  
  if (!PDFCO_API_KEY) {
    throw new Error('PDF.co API key not configured');
  }

  const htmlContent = generateUniversalHTMLTemplate(reportData);
  const filename = `${reportData.patient.name.replace(/\s+/g, '_')}_${reportData.report.reportId}.pdf`;

  const requestBody = {
    name: filename,
    html: htmlContent,
    async: false,
    margins: "15mm",
    paperSize: "A4",
    orientation: "portrait",
    printBackground: true,
    scale: 1.0,
    mediaType: "print",
    displayHeaderFooter: false
  };

  try {
    const response = await fetch(PDFCO_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': PDFCO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`PDF.co API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`PDF.co API error: ${result.message}`);
    }

    console.log('PDF generated successfully:', result.url);
    return result.url;
  } catch (error) {
    console.error('PDF.co generation failed:', error);
    throw error;
  }
};

// Fallback PDF generation using browser print
export const generatePDFWithBrowser = (reportData: ReportData): string => {
  console.log('Generating PDF with browser fallback...');
  
  const htmlContent = generateUniversalHTMLTemplate(reportData);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  console.log('Browser PDF blob created');
  return url;
};

// Save PDF to Supabase storage
export const savePDFToStorage = async (pdfBlob: Blob, orderId: string): Promise<string> => {
  console.log('Saving PDF to Supabase storage...');
  
  try {
    const fileName = `reports/${orderId}_${Date.now()}.pdf`;
    
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    console.log('PDF saved to storage:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Failed to save PDF to storage:', error);
    throw error;
  }
};

// Update database with PDF information
export const updateReportWithPDFInfo = async (orderId: string, pdfUrl: string): Promise<void> => {
  console.log('Updating database with PDF info...');
  
  try {
    const { error } = await supabase
      .from('reports')
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('order_id', orderId);

    if (error) {
      throw error;
    }

    console.log('Database updated successfully');
  } catch (error) {
    console.error('Failed to update database:', error);
    throw error;
  }
};

// Main PDF generation function with comprehensive error handling
export async function generateAndSavePDFReport(orderId: string, reportData: ReportData): Promise<string | null> {
  console.log('generateAndSavePDFReport called for:', orderId);
  
  try {
    // Check if PDF already exists
    const { data: existingReport } = await supabase
      .from('reports')
      .select('pdf_url, pdf_generated_at')
      .eq('order_id', orderId)
      .single();

    if (existingReport?.pdf_url) {
      console.log('PDF already exists:', existingReport.pdf_url);
      
      // Verify URL is still valid
      try {
        const response = await fetch(existingReport.pdf_url, { method: 'HEAD' });
        if (response.ok) {
          return existingReport.pdf_url;
        }
      } catch (error) {
        console.warn('Existing PDF URL is invalid, regenerating...');
      }
    }

    let pdfUrl: string | null = null;
    let pdfBlob: Blob | null = null;

    // Try PDF.co API first
    try {
      pdfUrl = await generatePDFWithAPI(reportData);
      
      if (pdfUrl && pdfUrl.includes('pdf.co')) {
        // Download PDF from PDF.co and convert to blob
        const response = await fetch(pdfUrl);
        if (response.ok) {
          pdfBlob = await response.blob();
        }
      }
    } catch (error) {
      console.warn('PDF.co generation failed, trying browser fallback:', error);
    }

    // Fallback to browser generation if API failed
    if (!pdfUrl || !pdfBlob) {
      pdfUrl = generatePDFWithBrowser(reportData);
      if (pdfUrl.startsWith('blob:')) {
        const response = await fetch(pdfUrl);
        pdfBlob = await response.blob();
      }
    }

    if (!pdfBlob) {
      console.error('Failed to generate PDF blob');
      return null;
    }

    // Save to Supabase storage
    const storageUrl = await savePDFToStorage(pdfBlob, orderId);
    
    // Update database
    await updateReportWithPDFInfo(orderId, storageUrl);

    return storageUrl;
  } catch (error) {
    console.error('PDF generation and save failed:', error);
    return null;
  }
}

// View PDF report (opens in new tab)
export async function viewPDFReport(orderId: string, reportData: ReportData): Promise<string | null> {
  console.log('viewPDFReport called for:', orderId);
  
  try {
    const pdfUrl = await generateAndSavePDFReport(orderId, reportData);
    return pdfUrl;
  } catch (error) {
    console.error('View PDF error:', error);
    return null;
  }
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

    // Create download link
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Report_${reportData.patient.name.replace(/\s+/g, '_')}_${orderId}.pdf`;
    link.target = '_blank';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Download initiated successfully');
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return false;
  }
}

// Generate sample report data for testing
export const generateSampleReportData = (template: LabTemplate = defaultLabTemplate): ReportData => {
  return {
    patient: {
      name: 'Ravi Mehta',
      id: 'PTX100256',
      age: 45,
      gender: 'Male',
      referredBy: 'Dr. Anjali Desai',
    },
    report: {
      reportId: 'RPT20250629',
      collectionDate: '2025-06-28',
      reportDate: '2025-06-29',
      reportType: 'Liver Function Test (LFT)',
    },
    testResults: [
      { parameter: 'SGOT (AST)', result: '72', unit: 'U/L', referenceRange: '15–37', flag: 'H' },
      { parameter: 'SGPT (ALT)', result: '105', unit: 'U/L', referenceRange: '16–63', flag: 'H' },
      { parameter: 'Total Bilirubin', result: '1.9', unit: 'mg/dL', referenceRange: '0.2–1', flag: 'H' },
      { parameter: 'Albumin', result: '2.8', unit: 'g/dL', referenceRange: '3.4–5', flag: 'L' },
    ],
    interpretation: 'Liver enzymes are elevated, and total bilirubin is above the normal limit. Suggestive of hepatic stress. Clinical correlation advised.',
    template,
  };
};

// Utility function to download PDF from URL
export const downloadPDFFromURL = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};