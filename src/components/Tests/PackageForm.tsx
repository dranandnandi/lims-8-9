import React, { useState } from 'react';
import { X, Package, DollarSign, Calendar, Settings, Layers } from 'lucide-react';
import { loadTestGroups } from '../../utils/localStorage';

interface PackageFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  package?: Package | null;
}

interface Package {
  id: string;
  name: string;
  description: string;
  testGroupIds: string[];
  price: number;
  discountPercentage?: number;
  isActive: boolean;
  createdDate: string;
  category: string;
  validityDays?: number;
}

const PackageForm: React.FC<PackageFormProps> = ({ onClose, onSubmit, package: pkg }) => {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    selectedTestGroups: pkg?.testGroupIds || [],
    price: pkg?.price?.toString() || '',
    discountPercentage: pkg?.discountPercentage?.toString() || '',
    category: pkg?.category || '',
    validityDays: pkg?.validityDays?.toString() || '',
    isActive: pkg?.isActive ?? true,
  });

  const [testGroups] = useState(() => loadTestGroups());

  const categories = [
    'Preventive Care',
    'Executive Care',
    'Cardiac Care',
    'Diabetes Care',
    'Women\'s Health',
    'Men\'s Health',
    'Senior Care',
    'Pediatric Care',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTestGroupDetails = testGroups.filter(group => 
      formData.selectedTestGroups.includes(group.id)
    );
    
    const originalPrice = selectedTestGroupDetails.reduce((sum, group) => sum + group.price, 0);
    const discountAmount = originalPrice * (parseFloat(formData.discountPercentage) || 0) / 100;
    const finalPrice = parseFloat(formData.price) || (originalPrice - discountAmount);
    
    const packageData = {
      name: formData.name,
      description: formData.description,
      testGroupIds: formData.selectedTestGroups,
      price: finalPrice,
      discountPercentage: parseFloat(formData.discountPercentage) || 0,
      category: formData.category,
      validityDays: parseInt(formData.validityDays) || 30,
      isActive: formData.isActive,
    };
    
    onSubmit(packageData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleTestGroupSelection = (testGroupId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTestGroups: prev.selectedTestGroups.includes(testGroupId)
        ? prev.selectedTestGroups.filter(id => id !== testGroupId)
        : [...prev.selectedTestGroups, testGroupId]
    }));
  };

  const selectedTestGroupDetails = testGroups.filter(group => 
    formData.selectedTestGroups.includes(group.id)
  );
  
  const originalPrice = selectedTestGroupDetails.reduce((sum, group) => sum + group.price, 0);
  const discountAmount = originalPrice * (parseFloat(formData.discountPercentage) || 0) / 100;
  const suggestedPrice = originalPrice - discountAmount;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-2 text-purple-600" />
            {pkg ? 'Edit Health Package' : 'Create Health Package'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-1 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Package Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Basic Health Checkup"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Description *
              </label>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the purpose and benefits of this health package"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Test Group Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Select Test Groups
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {testGroups.map((group) => (
                <label key={group.id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedTestGroups.includes(group.id)}
                    onChange={() => handleTestGroupSelection(group.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      <div className="text-sm font-bold text-green-600">₹{group.price}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{group.clinicalPurpose}</div>
                    <div className="text-xs text-gray-400">
                      {group.sampleType} • {group.turnaroundTime} • {group.analytes.length} analytes
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Selected Test Groups Summary */}
            {formData.selectedTestGroups.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Selected Test Groups ({formData.selectedTestGroups.length})</h4>
                <div className="space-y-2">
                  {selectedTestGroupDetails.map((group) => (
                    <div key={group.id} className="flex justify-between text-sm">
                      <span className="text-purple-800">{group.name}</span>
                      <span className="font-medium text-purple-900">₹{group.price}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-purple-300 mt-2 pt-2">
                  <div className="flex justify-between font-bold text-purple-900 text-sm">
                    <span>Original Total:</span>
                    <span>₹{originalPrice}</span>
                  </div>
                  {parseFloat(formData.discountPercentage) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-purple-700">
                        <span>Discount ({formData.discountPercentage}%):</span>
                        <span>-₹{discountAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-purple-900">
                        <span>Package Price:</span>
                        <span>₹{suggestedPrice.toFixed(0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Pricing & Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Suggested: ₹{suggestedPrice.toFixed(0)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Package Price (₹) *
                </label>
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder={suggestedPrice.toFixed(0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity (Days)
                </label>
                <input
                  type="number"
                  name="validityDays"
                  min="1"
                  max="365"
                  value={formData.validityDays}
                  onChange={handleChange}
                  placeholder="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Package Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Package Settings
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Package is active and available for booking</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formData.selectedTestGroups.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {pkg ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageForm;