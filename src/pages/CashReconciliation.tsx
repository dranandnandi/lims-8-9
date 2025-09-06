import React, { useState } from 'react';
import { Calendar, DollarSign, Calculator, ArrowRight, CheckCircle, XCircle, AlertTriangle, Printer, Download } from 'lucide-react';
import PaymentSummaryReport from '../components/Billing/PaymentSummaryReport';

const CashReconciliation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Cash reconciliation state
  const [systemAmount, setSystemAmount] = useState<number>(12500); // This would come from the payments table
  const [actualAmount, setActualAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isReconciled, setIsReconciled] = useState<boolean | null>(null);
  
  const handleReconcile = () => {
    const actualAmountNum = parseFloat(actualAmount);
    if (isNaN(actualAmountNum)) {
      return;
    }
    
    setIsReconciled(Math.abs(actualAmountNum - systemAmount) < 1); // Allow for minor rounding differences
  };
  
  const difference = actualAmount ? Math.abs(parseFloat(actualAmount) - systemAmount) : 0;
  const differencePercent = systemAmount > 0 ? (difference / systemAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Cash Reconciliation</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'daily' 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Daily Reconciliation
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'report' 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Payment Reports
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* Date Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Select Date:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Reconciliation Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Cash Reconciliation Form</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Cash Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={`₹${systemAmount.toLocaleString()}`}
                      disabled
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-medium"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Total cash collections for {new Date(date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Cash Count
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      placeholder="Enter actual cash amount"
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Enter the physical cash counted at the end of day
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter any notes about discrepancies or explanations"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handleReconcile}
                  disabled={!actualAmount}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  Reconcile Cash
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Reconciliation Summary</h2>
              
              {isReconciled === null ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Calculator className="h-16 w-16 mb-4 text-gray-300" />
                  <p>Enter the actual cash amount and click "Reconcile Cash" to see the summary</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    {isReconciled ? (
                      <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                      </div>
                    ) : (
                      <div className="bg-red-100 p-4 rounded-full">
                        <XCircle className="h-16 w-16 text-red-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                      {isReconciled ? 'Cash Reconciled Successfully' : 'Cash Discrepancy Detected'}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {isReconciled 
                        ? 'The system amount matches the physical cash count.' 
                        : 'There is a difference between the system amount and physical cash count.'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">System Amount:</span>
                      <span className="font-medium">₹{systemAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Actual Amount:</span>
                      <span className="font-medium">₹{parseFloat(actualAmount).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className={`font-medium ${isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                        Difference:
                      </span>
                      <span className={`font-medium ${isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{difference.toLocaleString()} ({differencePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  
                  {!isReconciled && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-1">Action Required</h4>
                          <p className="text-sm text-yellow-700">
                            Please verify all cash transactions and physical cash. Document the reason for the discrepancy in the notes section.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Report
                    </button>
                    <button className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Download className="h-4 w-4 mr-2" />
                      Save Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Reconciliations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Reconciliations
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reconciled By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Sample data - in a real app, this would come from the database */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹12,500
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹12,500
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹0 (0.00%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reconciled
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      Admin User
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(Date.now() - 86400000).toLocaleDateString()} {/* Yesterday */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹15,750
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹15,500
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      ₹250 (1.59%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Discrepancy
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      Admin User
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <PaymentSummaryReport />
      )}
    </div>
  );
};

export default CashReconciliation;