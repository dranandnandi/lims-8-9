// Clean rebuilt Reports page with date grouping (Today first), filters, bulk actions, preview modal.
import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, Send, Calendar, User, Printer, Search, X, MessageCircle, Phone } from 'lucide-react';
import { generateAndDownloadReport, generateSampleReportData } from '../utils/pdfGenerator';
import { database } from '../utils/supabase';

interface Report {
  id: string;
  patient_id: string;
  result_id: string | null;
  status: string; // Generated | Printed | Delivered
  generated_date: string; // ISO yyyy-mm-dd
  doctor: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  test_name?: string;
  report_type?: string;
  patients?: { name?: string; email?: string; phone?: string };
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState('All');
  const [selectedTestType, setSelectedTestType] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await database.reports.getAll();
        if (error) throw error;
        const mapped = (data || []).map((r: any) => ({
          ...r,
            test_name: r.results?.test_name || r.test_name || 'Test',
            report_type: r.report_type || 'Standard'
        }));
        setReports(mapped);
      } catch (e: any) {
        setError(e.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statuses = ['All','Generated','Printed','Delivered'];
  const doctors = ['All', ...Array.from(new Set(reports.map(r=>r.doctor).filter(Boolean)))];
  const testTypes = ['All', ...Array.from(new Set(reports.map(r=>r.report_type || 'Standard').filter(Boolean)))];
  const dateRanges = ['All','Today','Yesterday','Last 7 Days','Last 30 Days'];

  const filtered = reports.filter(r => {
    let ok = true;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      const match = [
        r.test_name?.toLowerCase().includes(t),
        r.id.toLowerCase().includes(t),
        r.patients?.name?.toLowerCase().includes(t),
        r.patients?.email?.toLowerCase().includes(t)
      ].some(Boolean);
      ok = ok && match;
    }
    if (selectedStatus !== 'All') ok = ok && r.status === selectedStatus;
    if (selectedDoctor !== 'All') ok = ok && r.doctor === selectedDoctor;
    if (selectedTestType !== 'All') ok = ok && (r.report_type || 'Standard') === selectedTestType;
    if (selectedDateRange !== 'All') {
      const d = new Date(r.generated_date);
      const today = new Date();
      const diffDays = (today.getTime() - d.getTime())/86400000;
      if (selectedDateRange === 'Today') ok = d.toDateString() === today.toDateString();
      if (selectedDateRange === 'Yesterday') { const y = new Date(); y.setDate(y.getDate()-1); ok = d.toDateString() === y.toDateString(); }
      if (selectedDateRange === 'Last 7 Days') ok = diffDays < 7;
      if (selectedDateRange === 'Last 30 Days') ok = diffDays < 30;
    }
    return ok;
  });

  interface Group { key:string; date:Date; reports:Report[]; isToday:boolean }
  const groups: Group[] = (() => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const map: Record<string,{date:Date; reports:Report[]}> = { [todayKey]: { date: today, reports: [] } };
    filtered.forEach(r => { const d = new Date(r.generated_date); const k = d.toISOString().split('T')[0]; if(!map[k]) map[k] = { date:d, reports:[] }; map[k].reports.push(r); });
    return Object.entries(map).map(([k,v]) => ({ key:k, date:v.date, reports:v.reports, isToday:k===todayKey }))
      .sort((a,b) => { if(a.isToday) return -1; if(b.isToday) return 1; return b.date.getTime()-a.date.getTime(); });
  })();

  const shortId = (id:string) => id.slice(0,4).toUpperCase();
  const statusBadge = (s:string) => s==='Delivered' ? 'bg-green-100 text-green-700' : s==='Printed' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700';
  const patientInfo = (r:Report) => r.patients?.name || r.patient_id;

  const toggleSelect = (id:string) => setSelectedReports(prev => { const next = new Set(prev); next.has(id)?next.delete(id):next.add(id); setShowBulkActions(next.size>0); return next; });
  const toggleSelectAll = () => { if(selectedReports.size===filtered.length){ setSelectedReports(new Set()); setShowBulkActions(false);} else { setSelectedReports(new Set(filtered.map(r=>r.id))); setShowBulkActions(true);} };

  const downloadReport = async (id:string) => { setDownloading(p=>new Set(p).add(id)); try { const sample = generateSampleReportData(); await generateAndDownloadReport(sample); } finally { setDownloading(p=>{ const n=new Set(p); n.delete(id); return n; }); } };
  const sendReport = async (id:string) => { await downloadReport(id); setReports(prev => prev.map(r=> r.id===id? { ...r, status:'Delivered'}:r)); };
  const printReport = async (id:string) => { await downloadReport(id); setReports(prev => prev.map(r=> r.id===id? { ...r, status:'Printed'}:r)); };
  const bulkDownload = async () => { for(const id of selectedReports) await downloadReport(id); };
  const bulkEmail = async () => { for(const id of selectedReports) await sendReport(id); };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button onClick={()=>{ const sample = generateSampleReportData(); generateAndDownloadReport(sample); }} className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"><FileText className="h-4 w-4"/> Sample Report</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center"><div className="bg-blue-100 p-3 rounded-lg"><FileText className="h-6 w-6 text-blue-600"/></div><div className="ml-4"><div className="text-2xl font-bold">{reports.length}</div><div className="text-sm text-gray-600">Total Reports</div></div></div>
        <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center"><div className="bg-green-100 p-3 rounded-lg"><Send className="h-6 w-6 text-green-600"/></div><div className="ml-4"><div className="text-2xl font-bold">{reports.filter(r=>r.status==='Delivered').length}</div><div className="text-sm text-gray-600">Delivered</div></div></div>
        <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center"><div className="bg-orange-100 p-3 rounded-lg"><Calendar className="h-6 w-6 text-orange-600"/></div><div className="ml-4"><div className="text-2xl font-bold">{reports.filter(r=>r.generated_date===new Date().toISOString().split('T')[0]).length}</div><div className="text-sm text-gray-600">Today</div></div></div>
        <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center"><div className="bg-purple-100 p-3 rounded-lg"><User className="h-6 w-6 text-purple-600"/></div><div className="ml-4"><div className="text-2xl font-bold">{new Set(reports.map(r=>r.doctor)).size}</div><div className="text-sm text-gray-600">Doctors</div></div></div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search by patient, email or report ID" className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Date:</span><select value={selectedDateRange} onChange={e=>setSelectedDateRange(e.target.value)} className="border px-2 py-1 rounded">{dateRanges.map(r=> <option key={r}>{r}</option>)}</select></div>
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Status:</span><select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)} className="border px-2 py-1 rounded">{statuses.map(s=> <option key={s}>{s}</option>)}</select></div>
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Doctor:</span><select value={selectedDoctor} onChange={e=>setSelectedDoctor(e.target.value)} className="border px-2 py-1 rounded">{doctors.map(d=> <option key={d}>{d}</option>)}</select></div>
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Test Type:</span><select value={selectedTestType} onChange={e=>setSelectedTestType(e.target.value)} className="border px-2 py-1 rounded">{testTypes.map(t=> <option key={t}>{t}</option>)}</select></div>
          </div>
        </div>
        {filtered.length>0 && (
          <div className="px-6 py-3 border-b flex items-center bg-gray-50">
            <input type="checkbox" checked={selectedReports.size===filtered.length && filtered.length>0} onChange={toggleSelectAll} className="h-4 w-4 text-blue-600 border-gray-300 rounded"/>
            <span className="ml-2 text-sm text-gray-700">Select All ({filtered.length})</span>
            {showBulkActions && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-gray-600">{selectedReports.size} selected</span>
                <button onClick={bulkEmail} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700">Email</button>
                <button onClick={bulkDownload} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700">Download</button>
                <button onClick={()=>{ setSelectedReports(new Set()); setShowBulkActions(false); }} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
              </div>
            )}
          </div>
        )}
        <div>
          {groups.length===0 && <div className="p-12 text-center text-gray-500">No reports found</div>}
          {groups.map(g => (
            <div key={g.key} className="border-t first:border-t-0 border-gray-200">
              <div className={`px-6 py-3 sticky top-0 bg-white border-b flex items-center justify-between ${g.isToday? 'border-green-400':'border-gray-200'}`}> 
                <div className={`p-3 rounded-lg flex items-center justify-between w-full ${g.isToday?'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200':'bg-gray-50 border border-gray-200'}`}> 
                  <h4 className={`text-sm font-semibold ${g.isToday?'text-green-800':'text-gray-700'}`}>{g.isToday? '📅 Today' : g.date.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${g.isToday?'bg-green-100 text-green-800 border border-green-200':'bg-gray-100 text-gray-700 border border-gray-200'}`}>{g.reports.length} report{g.reports.length!==1?'s':''}</span>
                    <span className={`px-2 py-0.5 rounded-full ${g.isToday?'bg-blue-100 text-blue-800 border border-blue-200':'bg-gray-100 text-gray-700 border border-gray-200'}`}>{g.reports.filter(r=>r.status==='Delivered').length} delivered</span>
                  </div>
                </div>
              </div>
              {g.reports.length===0 && g.isToday ? (
                <div className="px-6 py-8 text-center text-gray-500 bg-gray-50">No reports generated today</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {g.reports.map(r => (
                    <div key={r.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <input type="checkbox" checked={selectedReports.has(r.id)} onChange={()=>toggleSelect(r.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded"/>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-sm font-semibold text-gray-900">🧪 {r.test_name || 'Test'} • <span className="text-blue-600">{r.report_type || 'Standard'}</span></h4>
                            </div>
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                              <span>👤 {patientInfo(r)}</span>
                              <span>• {r.patients?.email || 'No email'}</span>
                              <span>• {new Date(r.generated_date).toLocaleDateString('en-GB')}</span>
                              <span>• <span className="text-blue-600">#{shortId(r.id)}</span></span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setSelectedReport(r)} title="Preview" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="h-4 w-4"/></button>
                          <button onClick={()=>downloadReport(r.id)} title="Download PDF" className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" disabled={downloading.has(r.id)}>{downloading.has(r.id)? <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/>:<Download className="h-4 w-4"/>}</button>
                          <button onClick={()=>sendReport(r.id)} title="Send Email" className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Send className="h-4 w-4"/></button>
                          <button onClick={()=>printReport(r.id)} title="Print" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><Printer className="h-4 w-4"/></button>
                          {r.patients?.phone && <button onClick={()=>{/* whatsapp share placeholder */}} title="WhatsApp" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><MessageCircle className="h-4 w-4"/></button>}
                          {r.patients?.phone && <button onClick={()=>window.open(`tel:${r.patients?.phone}`, '_self')} title="Call" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Phone className="h-4 w-4"/></button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 text-sm text-gray-600">📄 Total Reports: <span className="font-medium">{filtered.length}</span></div>
      </div>
      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Report Preview</h2>
              <button onClick={()=>setSelectedReport(null)} className="p-1 text-gray-500 hover:text-gray-700"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-6 text-sm space-y-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-gray-700">Patient</div>
                  <div>{patientInfo(selectedReport)}</div>
                  <div>{selectedReport.patients?.email || 'No email'}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">Report</div>
                  <div>ID: {selectedReport.id}</div>
                  <div>Date: {selectedReport.generated_date}</div>
                  <div>Status: {selectedReport.status}</div>
                </div>
              </div>
              <div className="border rounded p-4 bg-gray-50">PDF preview placeholder...</div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>downloadReport(selectedReport.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs">Download</button>
                <button onClick={()=>sendReport(selectedReport.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs">Email</button>
                <button onClick={()=>printReport(selectedReport.id)} className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs">Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;