// pdfService.ts
// Production-ready server-side service for generating lab report PDFs and saving to Supabase Storage.
// - No test/demo code
// - No localStorage or browser-only APIs
// - No console spam or alerts
// - Expects to run on the server (e.g., Next.js Route Handler / Server Action / Cloud Function)

import { createClient } from '@supabase/supabase-js';

// ---------- Environment (server-only) ----------
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only secret
const PDFCO_API_KEY = process.env.PDFCO_API_KEY!; // server-only secret
const PDFCO_API_URL = 'https://api.pdf.co/v1/pdf/convert/from/html';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase server environment not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}
if (!PDFCO_API_KEY) {
  throw new Error('PDF.co API key not configured (PDFCO_API_KEY).');
}

// ---------- Supabase (service role) ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Types ----------
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
  flag?: string; // e.g., 'H', 'L', 'C'
}

export interface ReportData {
  patient: PatientInfo;
  report: ReportDetails;
  testResults: TestResult[];
  interpretation?: string;
  template?: LabTemplate;
}

// ---------- Default Template ----------
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
    authorizedBy: 'Authorized Signatory',
    disclaimer: 'This report is generated electronically and is valid without a physical signature.',
  },
  styling: {
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Arial, sans-serif',
  },
};

// ---------- HTML Generator ----------
function generateReportHTML(data: ReportData): string {
  const { patient, report, testResults, interpretation } = data;
  const template = data.template || defaultLabTemplate;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Report - ${report.reportId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${template.styling.fontFamily}; padding: 30px; color: #333; line-height: 1.6; font-size: 12px; }
    .header { text-align: center; border-bottom: 3px solid ${template.styling.primaryColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .lab-name { font-size: 24px; font-weight: bold; color: ${template.styling.primaryColor}; margin-bottom: 6px; }
    .lab-info { font-size: 12px; color: ${template.styling.secondaryColor}; }
    .report-title { text-align: center; font-size: 18px; font-weight: bold; color: ${template.styling.primaryColor}; margin: 22px 0; text-transform: uppercase; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-box { background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 5px solid ${template.styling.primaryColor}; }
    .info-title { font-weight: bold; color: ${template.styling.primaryColor}; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .info-item { margin: 6px 0; font-size: 12px; display: flex; justify-content: space-between; }
    .info-label { font-weight: bold; color: ${template.styling.secondaryColor}; min-width: 120px; }
    .section-title { font-size: 16px; font-weight: bold; color: ${template.styling.primaryColor}; margin-top: 18px; padding-bottom: 8px; border-bottom: 2px solid ${template.styling.primaryColor}; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 10px 6px; text-align: left; font-size: 12px; }
    th { background: ${template.styling.primaryColor}; color: #fff; text-align: center; font-size: 11px; letter-spacing: 0.5px; }
    td { text-align: center; vertical-align: middle; }
    td:first-child { text-align: left; font-weight: 600; }
    .result-value { font-weight: bold; }
    .flag-h { color: #dc3545; font-weight: bold; }
    .flag-l { color: #0066cc; font-weight: bold; }
    .flag-c { color: #ff6600; font-weight: bold; }
    .interpretation-box { background: #f6fafe; padding: 14px; border-left: 5px solid ${template.styling.primaryColor}; border-radius: 8px; margin-top: 16px; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 2px solid ${template.styling.secondaryColor}; font-size: 10px; color: ${template.styling.secondaryColor}; }
    @media print { body { padding: 15px; } .info-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="lab-name">${template.header.labName}</div>
    <div class="lab-info">${template.header.address}<br>Phone: ${template.header.phone} | Email: ${template.header.email}</div>
  </div>

  <div class="report-title">Laboratory Report</div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">Patient Information</div>
      <div class="info-item"><span class="info-label">Name:</span><span>${patient.name}</span></div>
      <div class="info-item"><span class="info-label">Patient ID:</span><span>${patient.id}</span></div>
      <div class="info-item"><span class="info-label">Age:</span><span>${patient.age} years</span></div>
      <div class="info-item"><span class="info-label">Gender:</span><span>${patient.gender}</span></div>
      ${patient.referredBy ? `<div class="info-item"><span class="info-label">Referred By:</span><span>${patient.referredBy}</span></div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-title">Report Details</div>
      <div class="info-item"><span class="info-label">Report ID:</span><span>${report.reportId}</span></div>
      <div class="info-item"><span class="info-label">Collection Date:</span><span>${new Date(report.collectionDate).toLocaleDateString('en-IN')}</span></div>
      <div class="info-item"><span class="info-label">Report Date:</span><span>${new Date(report.reportDate).toLocaleDateString('en-IN')}</span></div>
      <div class="info-item"><span class="info-label">Test Type:</span><span>${report.reportType}</span></div>
    </div>
  </div>

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
      ${testResults
        .map(
          (r) => `<tr>
            <td>${r.parameter}</td>
            <td class="result-value ${r.flag ? `flag-${r.flag.toLowerCase()}` : ''}">${r.result}</td>
            <td>${r.unit || '-'}</td>
            <td>${r.referenceRange || '-'}</td>
            <td>${r.flag ? `<span class="flag-${r.flag.toLowerCase()}">${r.flag}</span>` : '-'}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  ${
    interpretation
      ? `<div class="interpretation-box"><strong>Clinical Interpretation:</strong><div>${interpretation}</div></div>`
      : ''
  }

  <div class="footer">
    ${template.footer.disclaimer ? `${template.footer.disclaimer}<br/>` : ''}
    Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  </div>
</body>
</html>`;
}

// ---------- PDF.co (server) ----------
async function generatePDFBytesViaPDFCo(html: string, filename: string): Promise<Uint8Array> {
  const requestBody = {
    name: filename,
    html,
    async: false,
    margins: '15mm',
    paperSize: 'A4',
    orientation: 'portrait',
    printBackground: true,
    scale: 1.0,
    mediaType: 'print',
    displayHeaderFooter: false,
  };

  const resp = await fetch(PDFCO_API_URL, {
    method: 'POST',
    headers: { 'x-api-key': PDFCO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    throw new Error(`PDF.co API error: ${resp.status} ${resp.statusText}`);
  }

  const json = (await resp.json()) as { error?: boolean; message?: string; url?: string };
  if (json.error || !json.url) {
    throw new Error(`PDF.co API error: ${json.message || 'No URL returned'}`);
  }

  const pdfResp = await fetch(json.url);
  if (!pdfResp.ok) {
    throw new Error(`Failed to download generated PDF: ${pdfResp.status} ${pdfResp.statusText}`);
  }

  const ab = await pdfResp.arrayBuffer();
  return new Uint8Array(ab);
}

// ---------- Supabase Storage ----------
async function uploadPDFToStorage(bytes: Uint8Array, orderId: string): Promise<{ path: string; publicUrl: string }> {
  // Deterministic path: overwrite the same file each time using upsert
  const filePath = `${orderId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(filePath, bytes, {
      contentType: 'application/pdf',
      cacheControl: '0',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: pub } = supabase.storage.from('reports').getPublicUrl(filePath);
  return { path: filePath, publicUrl: pub.publicUrl };
}

// ---------- DB Update ----------
async function updateReportRecord(orderId: string, storagePath: string, publicUrl: string) {
  const { error } = await supabase
    .from('reports')
    .update({
      pdf_url: publicUrl,
      storage_path: storagePath,
      pdf_generated_at: new Date().toISOString(),
      status: 'completed',
      report_status: 'generated',
    })
    .eq('order_id', orderId);

  if (error) throw error;
}

// ---------- Main Orchestrator (server) ----------
export async function generateAndSavePDFReport(orderId: string, data: ReportData): Promise<string> {
  if (!orderId) throw new Error('orderId is required');

  const html = generateReportHTML(data);
  const filename = `${data.patient.name.replace(/\s+/g, '_')}_${data.report.reportId}.pdf`;

  const pdfBytes = await generatePDFBytesViaPDFCo(html, filename);
  const { path, publicUrl } = await uploadPDFToStorage(pdfBytes, orderId);
  await updateReportRecord(orderId, path, publicUrl);

  return publicUrl; // consider returning a signed URL in apps that require privacy
}

// ---------- Optional helper (server) ----------
export function buildReportHTML(data: ReportData): string {
  return generateReportHTML(data);
}

export default {
  generateAndSavePDFReport,
  buildReportHTML,
  defaultLabTemplate,
};
