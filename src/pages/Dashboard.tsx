import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TestTube, ClipboardList, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import WorkflowStatus from '../components/Dashboard/WorkflowStatus';
import RevenueChart from '../components/Dashboard/RevenueChart';
import TestStatusSummary from '../components/Dashboard/TestStatusSummary';
import { loadResults, initializeStorage } from '../utils/localStorage';
import { database, supabase } from '../utils/supabase';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    totalPatients: 0,
    activeOrders: 0,
    pendingResults: 0,
    monthlyRevenue: 0,
  });

  React.useEffect(() => {
    initializeStorage();
    
    const fetchStats = async () => {
      const results = loadResults();
      
      try {
        // Fetch patients from Supabase
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('*');
        
        if (patientsError) {
          console.error('Error loading patients:', patientsError);
          return;
        }
        
        // Fetch orders from Supabase
        const { data: orders, error } = await database.orders.getAll();
        if (error) {
          console.error('Error loading orders:', error);
          return;
        }
        
        // Calculate real stats from stored data
        const activeOrders = orders.filter(o => o.status !== 'Completed' && o.status !== 'Delivered').length;
        const pendingResults = results.filter(r => r.status === 'Under Review').length;
        const monthlyRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        
        setStats({
          totalPatients: patients?.length || 0,
          activeOrders,
          pendingResults,
          monthlyRevenue,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    
    fetchStats();
  }, []);

  const dashboardStats = [
    {
      title: 'Active Orders',
      value: stats.activeOrders.toString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: ClipboardList,
      color: 'blue' as const,
    },
    {
      title: 'Pending Results',
      value: stats.pendingResults.toString(),
      change: '-15%',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'orange' as const,
    },
    {
      title: 'Total Patients',
      value: stats.totalPatients.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'green' as const,
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      change: '+22%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'purple' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Test Status Summary */}
      <TestStatusSummary />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>

        {/* Workflow Status */}
        <div>
          <WorkflowStatus />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/patients')}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              Register New Patient
            </button>
            <button 
              onClick={() => navigate('/orders')}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <TestTube className="h-5 w-5 mr-2" />
              Create Test Order
            </button>
            <button 
              onClick={() => navigate('/results')}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              Enter Results
            </button>
            <button 
              onClick={() => navigate('/ai-tools')}
              className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              AI Photo Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;