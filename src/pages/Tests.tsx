import React, { useState } from 'react';
import { Plus, Search, Filter, TestTube, Edit, Eye, DollarSign, Layers, Beaker, Package } from 'lucide-react';
import TestForm from '../components/Tests/TestForm';
import AnalyteForm from '../components/Tests/AnalyteForm';
import TestGroupForm from '../components/Tests/TestGroupForm';
import PackageForm from '../components/Tests/PackageForm';
import TestDetailModal from '../components/Tests/TestDetailModal';
import AnalyteDetailModal from '../components/Tests/AnalyteDetailModal';
import TestGroupDetailModal from '../components/Tests/TestGroupDetailModal';
import PackageDetailModal from '../components/Tests/PackageDetailModal';
import { database } from '../utils/supabase';
import { Test, TestGroup, Analyte, Package as PackageType } from '../utils/localStorage';

const Tests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [analytes, setAnalytes] = useState<Analyte[]>([]);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showAnalyteForm, setShowAnalyteForm] = useState(false);
  const [showTestGroupForm, setShowTestGroupForm] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showTestDetail, setShowTestDetail] = useState(false);
  const [showAnalyteDetail, setShowAnalyteDetail] = useState(false);
  const [showTestGroupDetail, setShowTestGroupDetail] = useState(false);
  const [showPackageDetail, setShowPackageDetail] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedAnalyte, setSelectedAnalyte] = useState<Analyte | null>(null);
  const [selectedTestGroup, setSelectedTestGroup] = useState<TestGroup | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editingAnalyte, setEditingAnalyte] = useState<Analyte | null>(null);
  const [editingTestGroup, setEditingTestGroup] = useState<TestGroup | null>(null);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'groups' | 'analytes' | 'legacy'>('groups');

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Load analytes from database
        const { data: dbAnalytesData, error: analytesError } = await database.analytes.getAll();
        if (analytesError) {
          console.error('Error loading analytes from database:', analytesError);
          setAnalytes([]);
        } else {
          // Transform the Supabase analytes data to match our Analyte interface
          const transformedAnalytes = (dbAnalytesData || []).map(analyte => ({
            id: analyte.id,
            name: analyte.name,
            unit: analyte.unit,
            referenceRange: analyte.reference_range || analyte.referenceRange,
            lowCritical: analyte.low_critical,
            highCritical: analyte.high_critical,
            interpretation: analyte.interpretation,
            category: analyte.category,
            isActive: analyte.is_active ?? true,
            createdDate: analyte.created_at || new Date().toISOString()
          }));
          setAnalytes(transformedAnalytes);
        }
        
        // Load test groups from database
        const { data: dbTestGroupsData, error: testGroupsError } = await database.testGroups.getAll();
        if (testGroupsError) {
          console.error('Error loading test groups from database:', testGroupsError);
          setTestGroups([]);
        } else {
          // Transform the Supabase data to match our TestGroup interface
          const transformedTestGroups = (dbTestGroupsData || []).map(group => ({
            id: group.id,
            name: group.name,
            code: group.code,
            category: group.category,
            clinicalPurpose: group.clinical_purpose,
            price: group.price,
            turnaroundTime: group.turnaround_time,
            sampleType: group.sample_type,
            requiresFasting: group.requires_fasting,
            isActive: group.is_active,
            createdDate: group.created_at,
            default_ai_processing_type: group.default_ai_processing_type,
            group_level_prompt: group.group_level_prompt,
            analytes: group.test_group_analytes ? group.test_group_analytes.map(tga => tga.analyte_id) : []
          }));
          setTestGroups(transformedTestGroups);
        }

        // For now, set tests and packages to empty arrays since they don't exist in database
        setTests([]);
        setPackages([]);
      } catch (error) {
        console.error('Error loading data:', error);
        setAnalytes([]);
        setTestGroups([]);
        setTests([]);
        setPackages([]);
      }
    };
    
    loadData();
  }, []);

  const categories = ['All', 'Hematology', 'Biochemistry', 'Serology', 'Microbiology', 'Immunology'];

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || pkg.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTestGroups = testGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || group.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAnalytes = analytes.filter(analyte => {
    const matchesSearch = analyte.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         analyte.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || analyte.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredLegacyTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      'Hematology': 'bg-red-100 text-red-800',
      'Biochemistry': 'bg-blue-100 text-blue-800',
      'Serology': 'bg-green-100 text-green-800',
      'Microbiology': 'bg-purple-100 text-purple-800',
      'Immunology': 'bg-orange-100 text-orange-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

    const handleAddTest = (_formData: any) => {
    // TODO: Implement database storage for individual tests
    // For now, tests are managed through test groups
    console.warn('Individual tests are not supported. Please use test groups instead.');
    alert('Individual tests are not supported. Please use test groups instead.');
    setShowTestForm(false);
  };

  const handleAddAnalyte = async (formData: any) => {
    console.log('Creating analyte with data:', formData); // Debug log
    try {
      // Use database function to create analyte
      const { data: newAnalyte, error } = await database.analytes.create({
        name: formData.name,
        unit: formData.unit,
        reference_range: formData.referenceRange,
        low_critical: formData.lowCritical,
        high_critical: formData.highCritical,
        interpretation_low: formData.interpretation?.low,
        interpretation_normal: formData.interpretation?.normal,
        interpretation_high: formData.interpretation?.high,
        category: formData.category,
        is_active: formData.isActive ?? true,
      });
      
      if (error) {
        console.error('Error creating analyte:', error);
        alert('Failed to create analyte. Please try again.');
        return;
      }
      
      if (newAnalyte) {
        // Transform and add to local state for immediate UI update
        const transformedAnalyte = {
          id: newAnalyte.id,
          name: newAnalyte.name,
          unit: newAnalyte.unit,
          referenceRange: newAnalyte.reference_range,
          lowCritical: newAnalyte.low_critical,
          highCritical: newAnalyte.high_critical,
          interpretation: newAnalyte.interpretation_low || '', // Simplified for localStorage interface
          category: newAnalyte.category,
          isActive: newAnalyte.is_active,
          createdDate: newAnalyte.created_at || new Date().toISOString()
        };
        
        setAnalytes(prev => [...prev, transformedAnalyte]);
        setShowAnalyteForm(false);
        alert('Analyte created successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to create analyte. Please try again.');
    }
  };

  const handleAddTestGroup = async (formData: any) => {
    console.log('Creating test group with data:', formData); // Debug log
    try {
      // Use database function instead of localStorage
      const { data: newTestGroup, error } = await database.testGroups.create(formData);
      
      if (error) {
        console.error('Error creating test group:', error);
        alert('Failed to create test group. Please try again.');
        return;
      }
      
      if (newTestGroup) {
        // Add to local state for immediate UI update
        setTestGroups(prev => [...prev, newTestGroup]);
        setShowTestGroupForm(false);
        alert('Test group created successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to create test group. Please try again.');
    }
  };

  const handleAddPackage = (_formData: any) => {
    // TODO: Implement database storage for packages
    // For now, packages are not supported
    console.warn('Packages are not supported yet. Please use test groups instead.');
    alert('Packages are not supported yet. Please use test groups instead.');
    setShowPackageForm(false);
  };

  // View handlers
  const handleViewPackage = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setShowPackageDetail(true);
  };

  const handleViewTestGroup = (group: TestGroup) => {
    setSelectedTestGroup(group);
    setShowTestGroupDetail(true);
  };

  const handleViewAnalyte = (analyte: Analyte) => {
    setSelectedAnalyte(analyte);
    setShowAnalyteDetail(true);
  };

  const handleViewLegacyTest = (test: Test) => {
    setSelectedTest(test);
    setShowTestDetail(true);
  };

  // Edit handlers
  const handleEditPackage = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleEditTestGroup = (group: TestGroup) => {
    setEditingTestGroup(group);
    setShowTestGroupForm(true);
  };

  const handleEditAnalyte = (analyte: Analyte) => {
    setEditingAnalyte(analyte);
    setShowAnalyteForm(true);
  };

  const handleEditLegacyTest = (test: Test) => {
    setEditingTest(test);
    setShowTestForm(true);
  };

  // Update handlers
  const handleUpdatePackage = (formData: any) => {
    if (!editingPackage) return;
    
    const updatedPackage = {
      ...editingPackage,
      name: formData.name,
      description: formData.description,
      testGroupIds: formData.testGroupIds,
      price: formData.price,
      discountPercentage: formData.discountPercentage,
      category: formData.category,
      validityDays: formData.validityDays,
      isActive: formData.isActive,
    };
    
    setPackages(prev => prev.map(p => p.id === editingPackage.id ? updatedPackage : p));
    setShowPackageForm(false);
    setEditingPackage(null);
  };

  const handleUpdateTestGroup = async (formData: any) => {
    if (!editingTestGroup) return;
    
    console.log('Updating test group with data:', formData); // Debug log
    try {
      // Use database function to update in database
      const { data: updatedTestGroup, error } = await database.testGroups.update(editingTestGroup.id, formData);
      
      if (error) {
        console.error('Error updating test group:', error);
        alert('Failed to update test group. Please try again.');
        return;
      }
      
      if (updatedTestGroup) {
        // Fetch the complete updated test group with analytes from database
        const { data: completeTestGroup, error: fetchError } = await database.testGroups.getById(editingTestGroup.id);
        
        if (fetchError) {
          console.error('Error fetching updated test group:', fetchError);
          // Fallback to form data for analytes
          setTestGroups(prev => prev.map(g => g.id === editingTestGroup.id ? {
            ...updatedTestGroup,
            clinicalPurpose: updatedTestGroup.clinical_purpose,
            turnaroundTime: updatedTestGroup.turnaround_time,
            sampleType: updatedTestGroup.sample_type,
            requiresFasting: updatedTestGroup.requires_fasting,
            isActive: updatedTestGroup.is_active,
            createdDate: updatedTestGroup.created_at,
            analytes: formData.analytes || [] // Use form data as fallback
          } : g));
        } else if (completeTestGroup) {
          // Update local state with the complete data from database
          setTestGroups(prev => prev.map(g => g.id === editingTestGroup.id ? {
            id: completeTestGroup.id,
            name: completeTestGroup.name,
            code: completeTestGroup.code,
            category: completeTestGroup.category,
            clinicalPurpose: completeTestGroup.clinical_purpose,
            turnaroundTime: completeTestGroup.turnaround_time,
            sampleType: completeTestGroup.sample_type,
            requiresFasting: completeTestGroup.requires_fasting,
            isActive: completeTestGroup.is_active,
            createdDate: completeTestGroup.created_at,
            price: completeTestGroup.price,
            default_ai_processing_type: completeTestGroup.default_ai_processing_type,
            group_level_prompt: completeTestGroup.group_level_prompt,
            analytes: completeTestGroup.test_group_analytes ? 
              completeTestGroup.test_group_analytes.map((tga: any) => tga.analyte_id) : []
          } : g));
        }
        
        setShowTestGroupForm(false);
        setEditingTestGroup(null);
        alert('Test group updated successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to update test group. Please try again.');
    }
  };

  const handleUpdateAnalyte = async (formData: any) => {
    if (!editingAnalyte) return;
    
    console.log('Updating analyte with data:', formData); // Debug log
    try {
      // Use database function to update analyte
      const { data: updatedAnalyte, error } = await database.analytes.update(editingAnalyte.id, {
        name: formData.name,
        unit: formData.unit,
        reference_range: formData.referenceRange,
        low_critical: formData.lowCritical,
        high_critical: formData.highCritical,
        interpretation_low: formData.interpretation?.low,
        interpretation_normal: formData.interpretation?.normal,
        interpretation_high: formData.interpretation?.high,
        category: formData.category,
        is_active: formData.isActive,
      });
      
      if (error) {
        console.error('Error updating analyte:', error);
        alert('Failed to update analyte. Please try again.');
        return;
      }
      
      if (updatedAnalyte) {
        // Transform and update local state
        const transformedAnalyte = {
          id: updatedAnalyte.id,
          name: updatedAnalyte.name,
          unit: updatedAnalyte.unit,
          referenceRange: updatedAnalyte.reference_range,
          lowCritical: updatedAnalyte.low_critical,
          highCritical: updatedAnalyte.high_critical,
          interpretation: updatedAnalyte.interpretation_low || '', // Simplified for localStorage interface
          category: updatedAnalyte.category,
          isActive: updatedAnalyte.is_active,
          createdDate: updatedAnalyte.created_at || editingAnalyte.createdDate
        };
        
        setAnalytes(prev => prev.map(a => a.id === editingAnalyte.id ? transformedAnalyte : a));
        setShowAnalyteForm(false);
        setEditingAnalyte(null);
        alert('Analyte updated successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to update analyte. Please try again.');
    }
  };

  const handleUpdateTest = (formData: any) => {
    if (!editingTest) return;
    
    const updatedTest = {
      ...editingTest,
      name: formData.name,
      category: formData.category,
      method: formData.method,
      sampleType: formData.sampleType,
      price: parseFloat(formData.price),
      turnaroundTime: formData.turnaroundTime,
      referenceRange: formData.referenceRange,
      units: formData.units,
      description: formData.description,
      isActive: formData.isActive,
      requiresFasting: formData.requiresFasting,
      criticalValues: formData.criticalValues,
      interpretation: formData.interpretation,
    };
    
    setTests(prev => prev.map(t => t.id === editingTest.id ? updatedTest : t));
    setShowTestForm(false);
    setEditingTest(null);
  };

  // Close handlers
  const handleClosePackageForm = () => {
    setShowPackageForm(false);
    setEditingPackage(null);
  };

  const handleCloseTestGroupForm = () => {
    setShowTestGroupForm(false);
    setEditingTestGroup(null);
  };

  const handleCloseAnalyteForm = () => {
    setShowAnalyteForm(false);
    setEditingAnalyte(null);
  };

  const handleCloseTestForm = () => {
    setShowTestForm(false);
    setEditingTest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Management System</h1>
          <p className="text-gray-600 mt-1">Manage analytes, test groups, and diagnostic panels</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowAnalyteForm(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Beaker className="h-4 w-4 mr-2" />
            Add Analyte
          </button>
          <button 
            onClick={() => setShowPackageForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Package
          </button>
          <button 
            onClick={() => setShowTestGroupForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Test Group
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'groups'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Layers className="h-4 w-4 mr-2" />
            Test Groups ({testGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('analytes')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'analytes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Beaker className="h-4 w-4 mr-2" />
            Analytes ({analytes.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{packages.length}</div>
              <div className="text-sm text-gray-600">Health Packages</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Layers className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{testGroups.length}</div>
              <div className="text-sm text-gray-600">Test Groups</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Beaker className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{analytes.length}</div>
              <div className="text-sm text-gray-600">Analytes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">₹{packages.length > 0 ? Math.round(packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length) : 0}</div>
              <div className="text-sm text-gray-600">Avg Package Price</div>
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
              placeholder="Search tests by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Test Groups ({testGroups.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPackages.map((pkg) => {
                  const includedGroups = testGroups.filter(group => pkg.testGroupIds.includes(group.id));
                  const originalPrice = includedGroups.reduce((sum, group) => sum + group.price, 0);
                  const savings = originalPrice - pkg.price;
                  
                  return (
                    <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                          <div className="text-sm text-gray-500">ID: {pkg.id}</div>
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">{pkg.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800`}>
                          {pkg.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{pkg.testGroupIds.length} groups</div>
                        <div className="text-xs text-gray-500">
                          {includedGroups.slice(0, 2).map(group => group.name).join(', ')}
                          {pkg.testGroupIds.length > 2 && ` +${pkg.testGroupIds.length - 2} more`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">₹{pkg.price}</div>
                        {savings > 0 && (
                          <div className="text-xs text-green-600">Save ₹{savings}</div>
                        )}
                        {pkg.discountPercentage > 0 && (
                          <div className="text-xs text-blue-600">{pkg.discountPercentage}% off</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {pkg.validityDays} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleViewPackage(pkg)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Package Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditPackage(pkg)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Package"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Test Groups ({filteredTestGroups.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analytes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTestGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        <div className="text-sm text-gray-500">Code: {group.code} • {group.turnaroundTime}</div>
                        <div className="text-xs text-gray-400 mt-1">{group.clinicalPurpose}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(group.category)}`}>
                        {group.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{group.analytes.length} analytes</div>
                      <div className="text-xs text-gray-500">
                        {group.analytes.slice(0, 2).map(analyteId => {
                          const analyte = analytes.find(a => a.id === analyteId);
                          return analyte?.name;
                        }).filter(Boolean).join(', ')}
                        {group.analytes.length > 2 && ` +${group.analytes.length - 2} more`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{group.price}</div>
                      {group.requiresFasting && (
                        <div className="text-xs text-orange-600">Fasting required</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {group.sampleType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewTestGroup(group)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Test Group Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditTestGroup(group)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        title="Edit Test Group"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Analytes ({filteredAnalytes.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analyte Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Critical Values
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnalytes.map((analyte) => (
                  <tr key={analyte.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{analyte.name}</div>
                        <div className="text-sm text-gray-500">ID: {analyte.id} • Unit: {analyte.unit}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(analyte.category)}`}>
                        {analyte.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{analyte.referenceRange}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {analyte.lowCritical && <div className="text-red-600">Low: {analyte.lowCritical}</div>}
                        {analyte.highCritical && <div className="text-red-600">High: {analyte.highCritical}</div>}
                        {!analyte.lowCritical && !analyte.highCritical && <span className="text-gray-400">None</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewAnalyte(analyte)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Analyte Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditAnalyte(analyte)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        title="Edit Analyte"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'legacy' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Legacy Tests ({filteredLegacyTests.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TAT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLegacyTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{test.name}</div>
                        <div className="text-sm text-gray-500">ID: {test.id} • {test.method}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(test.category)}`}>
                        {test.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.sampleType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{test.price}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.turnaroundTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewLegacyTest(test)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Test Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditLegacyTest(test)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        title="Edit Test"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popular Test Groups Section */}
      {activeTab === 'packages' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Popular Health Packages</h3>
            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              View All Packages →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.slice(0, 3).map((pkg) => {
              const includedGroups = testGroups.filter(group => pkg.testGroupIds.includes(group.id));
              const originalPrice = includedGroups.reduce((sum, group) => sum + group.price, 0);
              const savings = originalPrice - pkg.price;
              
              return (
                <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">₹{pkg.price}</div>
                      {savings > 0 && (
                        <div className="text-xs text-green-600">Save ₹{savings}</div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{pkg.testGroupIds.length} test groups included</span>
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">
                      {pkg.category}
                    </span>
                  </div>
                  {pkg.discountPercentage > 0 && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      {pkg.discountPercentage}% discount applied
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Popular Test Groups</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Groups →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testGroups.slice(0, 3).map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{group.name}</h4>
                  <span className="text-lg font-bold text-green-600">₹{group.price}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{group.clinicalPurpose}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{group.analytes.length} analytes included</span>
                  <span className={`px-2 py-1 rounded ${getCategoryColor(group.category)}`}>
                    {group.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Form Modal */}
      {showTestForm && (
        <TestForm
          onClose={handleCloseTestForm}
          onSubmit={editingTest ? handleUpdateTest : handleAddTest}
          test={editingTest}
        />
      )}

      {/* Analyte Form Modal */}
      {showAnalyteForm && (
        <AnalyteForm
          onClose={handleCloseAnalyteForm}
          onSubmit={editingAnalyte ? handleUpdateAnalyte : handleAddAnalyte}
          analyte={editingAnalyte}
        />
      )}

      {/* Test Group Form Modal */}
      {showTestGroupForm && (
        <TestGroupForm
          onClose={handleCloseTestGroupForm}
          onSubmit={editingTestGroup ? handleUpdateTestGroup : handleAddTestGroup}
          testGroup={editingTestGroup}
        />
      )}

      {/* Package Form Modal */}
      {showPackageForm && (
        <PackageForm
          onClose={handleClosePackageForm}
          onSubmit={editingPackage ? handleUpdatePackage : handleAddPackage}
          package={editingPackage}
        />
      )}

      {/* Detail Modals */}
      {showTestDetail && selectedTest && (
        <TestDetailModal
          test={selectedTest}
          onClose={() => setShowTestDetail(false)}
          onEdit={() => {
            setShowTestDetail(false);
            handleEditLegacyTest(selectedTest);
          }}
        />
      )}

      {showAnalyteDetail && selectedAnalyte && (
        <AnalyteDetailModal
          analyte={selectedAnalyte}
          onClose={() => setShowAnalyteDetail(false)}
          onEdit={() => {
            setShowAnalyteDetail(false);
            handleEditAnalyte(selectedAnalyte);
          }}
        />
      )}

      {showTestGroupDetail && selectedTestGroup && (
        <TestGroupDetailModal
          testGroup={selectedTestGroup}
          analytes={analytes}
          onClose={() => setShowTestGroupDetail(false)}
          onEdit={() => {
            setShowTestGroupDetail(false);
            handleEditTestGroup(selectedTestGroup);
          }}
        />
      )}

      {showPackageDetail && selectedPackage && (
        <PackageDetailModal
          package={selectedPackage}
          testGroups={testGroups}
          onClose={() => setShowPackageDetail(false)}
          onEdit={() => {
            setShowPackageDetail(false);
            handleEditPackage(selectedPackage);
          }}
        />
      )}
    </div>
  );
};

export default Tests;