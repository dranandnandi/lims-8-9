import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Clock as ClockIcon, CheckCircle, AlertTriangle, Eye, User, Calendar, TestTube, ChevronDown, ChevronUp, Paperclip, Brain, FileText, TrendingUp, Send } from 'lucide-react';
import { initializeStorage } from '../utils/localStorage';
import { database } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import OrderForm from '../components/Orders/OrderForm';
import OrderDetailsModal from '../components/Orders/OrderDetailsModal';
import EnhancedOrders from '../components/Orders/EnhancedOrdersPage';

interface ExtractedValue {
  parameter: string;
  value: string;
  unit: string;
  reference: string;
  flag?: string;
}

interface Order {
  id: string;
  patient_name: string;
  patient_id: string;
  tests: string[];
  status: 'Order Created' | 'Sample Collection' | 'In Progress' | 'Pending Approval' | 'Completed' | 'Delivered';
  priority: 'Normal' | 'Urgent' | 'STAT';
  order_date: string;
  expected_date: string;
  total_amount: number;
  doctor: string;
  // Sample tracking fields
  sample_id?: string;
  color_code?: string;
  color_name?: string;
  qr_code_data?: string;
  // Additional computed properties
  totalTests: number;
  completedResults: number;
  abnormalResults: number;
  hasAttachments: boolean;
  results?: any[];
  patient?: {
    name?: string;
    age?: string;
    gender?: string;
  };
}

const Orders: React.FC = () => {
  const location = useLocation();
  const preSelectedPatient = location.state?.selectedPatient;
  const { user } = useAuth();
  
  // View toggle state
  const [viewMode, setViewMode] = useState<'traditional' | 'patient-centric'>('traditional');
  
  const [orders, setOrders] = useState<Order[]>([]);
  // removed loading & error state (not currently surfaced in UI)
  const [completionSummary, setCompletionSummary] = useState({
    allDone: 0,
    mostlyDone: 0,
    pending: 0,
    awaitingApproval: 0
  });
  const [expandedOrders, setExpandedOrders] = useState<{[key: string]: boolean}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCompletion, setSelectedCompletion] = useState('All');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Load orders from localStorage on component mount
  React.useEffect(() => {
    initializeStorage();
    fetchOrders();
    
    // If there's a pre-selected patient, open the order form
    if (preSelectedPatient) {
      setShowOrderForm(true);
    }
  }, [preSelectedPatient]);

  const fetchOrders = async () => {
  // loading/error state removed
    
    try {
      const { data, error } = await database.orders.getAll();
      
      if (error) {
  // capture error silently (state removed)
        console.error('Error loading orders:', error);
      } else {
        // Transform and calculate completion summary
        const formattedOrders = data.map((order: any) => {
          const totalTests = order.order_tests?.length || 0;
          const completedResults = order.results?.filter((r: any) => r.status === 'Approved' || r.status === 'Reported').length || 0;
          const abnormalResults = order.results?.filter((r: any) => 
            r.result_values?.some((rv: any) => rv.flag && rv.flag !== '')
          ).length || 0;
          
          return {
          ...order,
          patientName: order.patient_name,
          patientId: order.patient_id,
          orderDate: order.order_date,
          expectedDate: order.expected_date,
          totalAmount: order.total_amount,
          tests: order.order_tests ? order.order_tests.map((test: any) => test.test_name) : [],
          patient: order.patients,
          totalTests,
          completedResults,
          abnormalResults,
          hasAttachments: order.attachments && order.attachments.length > 0
          };
        });
        
        // Sort orders by creation date (newest first)
        const sortedOrders = formattedOrders.sort((a, b) => {
          const dateA = new Date(a.order_date);
          const dateB = new Date(b.order_date);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Calculate completion summary
        const summary = sortedOrders.reduce((acc, order) => {
          if (order.status === 'Completed' || order.status === 'Delivered') {
            acc.allDone++;
          } else if (order.status === 'Pending Approval') {
            acc.awaitingApproval++;
          } else if (order.completedResults > 0 && order.completedResults >= order.totalTests * 0.75) {
            acc.mostlyDone++;
          } else {
            acc.pending++;
          }
          return acc;
        }, { allDone: 0, mostlyDone: 0, pending: 0, awaitingApproval: 0 });
        
        setOrders(sortedOrders);
        setCompletionSummary(summary);
        
        // If there's a selected order, update it with fresh data from the refreshed orders
        setSelectedOrder(prevSelected => {
          if (prevSelected) {
            const updatedOrder = sortedOrders.find(order => order.id === prevSelected.id);
            return updatedOrder || prevSelected;
          }
          return prevSelected;
        });
      }
    } catch (err) {
  // swallow fetch error (state removed)
      console.error('Error:', err);
    } finally {
  // finished loading (state removed)
    }
  };

  const statuses = ['All', 'Order Created', 'Sample Collection', 'In Progress', 'Pending Approval', 'Completed', 'Delivered'];
  const completionFilters = ['All', 'All Done', 'Mostly Done', 'Pending', 'Awaiting Approval'];

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || order.status === selectedStatus;
    
    let matchesCompletion = true;
    if (selectedCompletion !== 'All') {
      switch (selectedCompletion) {
        case 'All Done':
          matchesCompletion = order.status === 'Completed' || order.status === 'Delivered';
          break;
        case 'Mostly Done':
          matchesCompletion = order.completedResults > 0 && order.completedResults >= order.totalTests * 0.75 && order.status !== 'Completed' && order.status !== 'Delivered';
          break;
        case 'Pending':
          matchesCompletion = order.status === 'Order Created' || order.status === 'Sample Collection' || (order.completedResults === 0);
          break;
        case 'Awaiting Approval':
          matchesCompletion = order.status === 'Pending Approval';
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCompletion;
  });

  // Group orders by date (starting with today)
  const groupOrdersByDate = () => {
    const today = new Date();
    const groups: { [key: string]: { date: Date; dateString: string; orders: Order[]; isToday: boolean; isFuture: boolean } } = {};
    
    // Always include today, even if no orders
    const todayString = today.toISOString().split('T')[0];
    groups[todayString] = {
      date: today,
      dateString: todayString,
      orders: [],
      isToday: true,
      isFuture: false
    };
    
    // Group filtered orders by date
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.order_date);
      const orderDateString = orderDate.toISOString().split('T')[0];
      
      if (!groups[orderDateString]) {
        groups[orderDateString] = {
          date: orderDate,
          dateString: orderDateString,
          orders: [],
          isToday: orderDateString === todayString,
          isFuture: orderDate > today
        };
      }
      
      groups[orderDateString].orders.push(order);
    });
    
    // Convert to array and sort (today first, then by date descending)
    return Object.values(groups).sort((a, b) => {
      if (a.isToday) return -1;
      if (b.isToday) return 1;
      return b.date.getTime() - a.date.getTime();
    });
  };

  const orderGroups = groupOrdersByDate();

  const formatDateHeader = (group: any) => {
    const { date, isToday, isFuture } = group;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isToday) {
      return `📅 Today - ${date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `📅 Yesterday - ${date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      })}`;
    } else if (isFuture) {
      return `📅 ${date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })} (Future)`;
    } else {
      const diffTime = today.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return `📅 ${date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })} (${diffDays} days ago)`;
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
  const { data: _updateData, error } = await database.orders.update(orderId, {
        status: newStatus
      });
      
      if (error) {
        console.error('Error updating order status:', error);
        return;
      }
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as Order['status'] }
          : order
      ));
      
      // Close modal after status update
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSubmitOrderResults = async (orderId: string, resultsData: ExtractedValue[]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Create a new result entry
    const newResult = {
      order_id: order.id,
      patient_name: order.patient_name,
      patient_id: order.patient_id,
      test_name: order.tests.join(', '), // Combine all tests
      status: 'Under Review' as const,
      entered_by: user?.user_metadata?.full_name || user?.email || 'Tech. AI Assistant',
      entered_date: new Date().toISOString().split('T')[0],
      values: resultsData.map(item => ({
        parameter: item.parameter,
        value: item.value,
        unit: item.unit,
        reference_range: item.reference,
        flag: item.flag
      }))
    };

    // Save the result
    try {
  const { data: _resultData, error } = await database.results.create(newResult);
      if (error) {
        console.error('Error creating result:', error);
        return;
      }
      
      // Refresh orders to reflect any automatic status changes
      await fetchOrders();
      console.log('Result submitted and order status automatically checked');
    } catch (err) {
      console.error('Error creating result:', err);
      return;
    }

    // Order status is automatically updated in database.results.create via checkAndUpdateStatus
    // No need for manual status update to 'Pending Approval'
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      const deliveredBy = user?.user_metadata?.full_name || user?.email || 'System';
  const { data: _deliveredData, error } = await database.orders.markAsDelivered(orderId, deliveredBy);
      
      if (error) {
        console.error('Error marking order as delivered:', error);
        return;
      }
      
      // Refresh orders to reflect the delivery status
      await fetchOrders();
      console.log('Order marked as delivered successfully');
    } catch (err) {
      console.error('Error marking order as delivered:', err);
    }
  };

  const handleAddOrder = async (formData: any) => {
    try {
      // Convert to snake_case for Supabase
      const orderData = {
        patient_name: formData.patient_name,
        patient_id: formData.patient_id,
        tests: formData.tests,
        status: formData.status,
        priority: formData.priority,
        order_date: formData.order_date,
        expected_date: formData.expected_date,
        total_amount: formData.total_amount,
        doctor: formData.doctor,
        created_by: user?.id, // Add the current user's ID
      };
      
  const { data: _createData, error } = await database.orders.create(orderData);
      
      if (error) {
        console.error('Error creating order:', error);
        return;
      }
      
      // Refresh the orders list to get the new order with all its related data
      await fetchOrders();
      
      setShowOrderForm(false);
    } catch (err) {
      console.error('Error creating order:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Order Created': 'bg-purple-100 text-purple-800',
      'Sample Collection': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-orange-100 text-orange-800',
      'Pending Approval': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Delivered': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Normal': 'bg-gray-100 text-gray-800',
      'Urgent': 'bg-orange-100 text-orange-800',
      'STAT': 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Order Created':
        return <Calendar className="h-4 w-4" />;
      case 'Sample Collection':
        return <TestTube className="h-4 w-4" />;
      case 'In Progress':
        return <ClockIcon className="h-4 w-4" />;
      case 'Pending Approval':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Delivered':
        return <User className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {viewMode === 'traditional' ? 'Test Orders - Technician View' : 'Patient Sessions'}
          </h1>
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('traditional')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'traditional'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Traditional View
            </button>
            <button
              onClick={() => setViewMode('patient-centric')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'patient-centric'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Patient-Centric
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowOrderForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          {viewMode === 'traditional' ? 'Create Order' : 'New Session'}
        </button>
      </div>

      {/* Conditional Rendering based on view mode */}
      {viewMode === 'patient-centric' ? (
        <EnhancedOrders 
          orders={orders}
          onAddOrder={handleAddOrder}
          onUpdateStatus={handleUpdateOrderStatus}
          onRefreshOrders={fetchOrders}
          onNewSession={() => {
            // Logic for creating a new session
            console.log('Creating new session...');
            setShowOrderForm(true);
          }}
          onNewPatientVisit={() => {
            // Logic for creating a new patient visit
            console.log('Creating new patient visit...');
            setShowOrderForm(true);
          }}
        />
      ) : (
        <>
          {/* Traditional Orders View */}
          <div className="flex items-center justify-between">
            <h2 className="sr-only">Test Orders - Technician View</h2>
          </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">{completionSummary.allDone}</div>
              <div className="text-sm text-green-700">All Done</div>
            </div>
            <div className="bg-green-500 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">{completionSummary.mostlyDone}</div>
              <div className="text-sm text-blue-700">Mostly Done</div>
            </div>
            <div className="bg-blue-500 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-900">{completionSummary.pending}</div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
            <div className="bg-yellow-500 p-2 rounded-lg">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-900">{completionSummary.awaitingApproval}</div>
              <div className="text-sm text-orange-700">Awaiting Approval</div>
            </div>
            <div className="bg-orange-500 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, order ID, or patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={selectedCompletion}
            onChange={(e) => setSelectedCompletion(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {completionFilters.map(filter => (
              <option key={filter} value={filter}>{filter}</option>
            ))}
          </select>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Test Orders ({filteredOrders.length})
          </h3>
        </div>
        
        {orderGroups.length === 0 || orderGroups.every(group => group.orders.length === 0) ? (
          <div className="text-center py-12">
            <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedStatus !== 'All' || selectedCompletion !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'No test orders have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {orderGroups.map((group) => (
              <div key={group.dateString} className="px-6">
                {/* Date Header */}
                <div className={`flex items-center justify-between py-4 border-b-2 mb-6 ${
                  group.isToday ? 'border-blue-200 bg-blue-50 -mx-6 px-6 rounded-lg' : 'border-gray-200'
                }`}>
                  <h4 className={`text-lg font-semibold ${
                    group.isToday ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {formatDateHeader(group)}
                  </h4>
                  <div className={`flex items-center space-x-3 ${
                    group.isToday ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    <span className="text-sm font-medium">
                      {group.orders.length === 0 ? 'No orders' : `${group.orders.length} order${group.orders.length !== 1 ? 's' : ''}`}
                    </span>
                    {group.isToday && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Today
                      </span>
                    )}
                    {group.isFuture && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Future
                      </span>
                    )}
                  </div>
                </div>

                {/* Orders for this date */}
                {group.orders.length === 0 ? (
                  <div className={`text-center py-8 rounded-lg ${
                    group.isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <Calendar className={`h-8 w-8 mx-auto mb-3 ${
                      group.isToday ? 'text-blue-400' : 'text-gray-400'
                    }`} />
                    <p className={`text-sm ${
                      group.isToday ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {group.isToday 
                        ? 'No orders created today yet. Create your first order!' 
                        : 'No orders for this date'
                      }
                    </p>
                    {group.isToday && (
                      <button
                        onClick={() => setShowOrderForm(true)}
                        className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Order
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {group.orders.map((order) => {
              const isExpanded = expandedOrders[order.id];
              const completionPercentage = order.totalTests > 0 ? (order.completedResults / order.totalTests) * 100 : 0;
              
              return (
                <div 
                  key={order.id} 
                  className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-all ${
                    order.abnormalResults > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  {/* Header with Order ID and Critical Flag */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {order.abnormalResults > 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <h4 className={`font-bold text-lg ${order.abnormalResults > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                          Order #{order.id.slice(-6)}
                        </h4>
                        {order.abnormalResults > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {order.abnormalResults} Abnormal
                          </span>
                        )}
                        {order.hasAttachments && (
                          <div title="Has attachments">
                            <Paperclip className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ordered: {new Date(order.order_date).toLocaleDateString()} • Expected: {new Date(order.expected_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Status and Priority Chips */}
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900">
                      {order.patient?.name || order.patient_name} • {order.patient?.age || 'N/A'}y • {order.patient?.gender || 'N/A'}
                    </span>
                  </div>

                  {/* Sample Tracking Information */}
                  {(order as any).sample_id && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: (order as any).color_code }}
                            title={`Sample Color: ${(order as any).color_name}`}
                          />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">Sample ID: {(order as any).sample_id}</div>
                            <div className="text-gray-600">{(order as any).color_name}</div>
                          </div>
                        </div>
                        {(order as any).qr_code_data && (
                          <div className="text-xs text-gray-500">
                            QR: {(order as any).sample_id}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tests Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <TestTube className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-600">{order.tests.length} tests</span>
                        </div>
                        {order.abnormalResults > 0 && (
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-red-600 font-medium">{order.abnormalResults} abnormal</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-green-600">{order.completedResults}/{order.totalTests} done</span>
                        </div>
                      </div>
                      
                      <div className="text-lg font-bold text-green-600">₹{order.total_amount.toLocaleString()}</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    
                    {/* Test Names */}
                    <div className="flex flex-wrap gap-1">
                      {order.tests.slice(0, 3).map((test, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          {test}
                        </span>
                      ))}
                      {order.tests.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          +{order.tests.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    {/* Expandable Details */}
                    {isExpanded && order.results && order.results.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="space-y-2">
                          {order.results.slice(0, 5).map((result: any, index: number) => (
                            <div key={index} className="text-xs">
                              <div className="font-medium text-gray-700">{result.test_name || 'Test Result'}</div>
                              {result.result_values && result.result_values.length > 0 && (
                                <div className="ml-2 space-y-1">
                                  {result.result_values.slice(0, 3).map((value: any, vIndex: number) => (
                                    <div key={vIndex} className="flex items-center justify-between">
                                      <span className="text-gray-600">{value.parameter}</span>
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium">{value.value} {value.unit}</span>
                                        {value.flag && (
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                            value.flag === 'H' ? 'bg-red-100 text-red-800' :
                                            value.flag === 'L' ? 'bg-blue-100 text-blue-800' :
                                            'bg-orange-100 text-orange-800'
                                          }`}>
                                            {value.flag}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {result.result_values.length > 3 && (
                                    <div className="text-gray-500 text-center">
                                      +{result.result_values.length - 3} more parameters
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {order.results.length > 5 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{order.results.length - 5} more results
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Toggle Details Button */}
                    {order.results && order.results.length > 0 && (
                      <button
                        onClick={() => toggleOrderExpansion(order.id)}
                        className="w-full mt-2 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show Details ({order.results.length} results)
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Entry and Doctor Information */}
                  <div className="text-xs text-gray-600 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>Dr. {order.doctor}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{new Date(order.order_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                      
                      <button 
                        className="flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        AI
                      </button>
                      
                      {order.hasAttachments && (
                        <button 
                          className="flex items-center px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                        >
                          <Paperclip className="h-3 w-3 mr-1" />
                          Attach
                        </button>
                      )}
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1">
                      {order.status === 'Pending Approval' && (
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                          title="Approve Order"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      {order.status === 'Completed' && (
                        <button 
                          onClick={() => handleMarkAsDelivered(order.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                          title="Mark as Delivered"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-blue-900 font-medium">Total Orders Today: {orders.length}</span>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-red-900 font-medium">Abnormal: {orders.filter(o => o.abnormalResults > 0).length}</span>
            </div>
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
            <span className="text-purple-900 font-medium">
              Avg TAT: {orders.length > 0 ? 
                Math.round(orders.reduce((sum, o) => {
                  const orderDate = new Date(o.order_date);
                  const now = new Date();
                  const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
                  return sum + diffHours;
                }, 0) / orders.length) : 0}h
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions for Technicians */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Sample Collection</h3>
          <p className="text-blue-800 text-sm mb-4">
            {orders.filter(o => o.status === 'Sample Collection').length} orders awaiting sample collection
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            View Collection Queue
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">New Orders</h3>
          <p className="text-purple-800 text-sm mb-4">
            {orders.filter(o => o.status === 'Order Created').length} orders need sample preparation
          </p>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Plan Collection
          </button>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">In Progress</h3>
          <p className="text-orange-800 text-sm mb-4">
            {orders.filter(o => o.status === 'In Progress').length} tests currently being processed
          </p>
          <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
            Process Tests
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">AI OCR Ready</h3>
          <p className="text-green-800 text-sm mb-4">
            Use AI to extract results from test images automatically
          </p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            AI Tools
          </button>
        </div>
      </div>

        </>
      )}

      {/* Order Form Modal (available in both views) */}
      {showOrderForm && (
        <OrderForm
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleAddOrder}
          preSelectedPatient={preSelectedPatient}
        />
      )}

      {/* Order Details Modal (shared) */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onSubmitResults={handleSubmitOrderResults}
        />
      )}
    </div>
  );
};

export default Orders;