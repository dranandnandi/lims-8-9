import React, { useState } from 'react';
import { Camera, Upload, Brain, Zap, Eye, FileText, AlertTriangle, CheckCircle, TestTube } from 'lucide-react';
import PhotoAnalysis from '../components/AITools/PhotoAnalysis';
import PipetteValidation from '../components/AITools/PipetteValidation';
import OCRExtraction from '../components/AITools/OCRExtraction';
import { AITestConfigurator } from '../components/AITools/AITestConfigurator';
import { TestConfigurationResponse } from '../utils/geminiAI';

const AITools: React.FC = () => {
  const [activeTab, setActiveTab] = useState('photo');
  const [existingTests] = useState<string[]>([
    'Complete Blood Count', 'Basic Metabolic Panel', 'Lipid Panel', 
    'Thyroid Function', 'Liver Function Tests'
  ]);

  const handleConfigurationGenerated = (config: TestConfigurationResponse) => {
    console.log('Generated AI configuration:', config);
    // Here you would integrate with your test creation flow
    // For example: navigate to test form with pre-filled data
  };

  const tools = [
    {
      id: 'photo',
      name: 'Photo Recognition',
      description: 'Analyze test cards and strips using AI',
      icon: Camera,
      color: 'blue',
      features: ['Blood grouping cards', 'Lateral flow tests', 'COVID test strips', 'Malaria detection'],
    },
    {
      id: 'pipette',
      name: 'Pipette Validation',
      description: 'Validate pipetting accuracy with image analysis',
      icon: Zap,
      color: 'purple',
      features: ['Volume measurement', 'Accuracy validation', 'QC logging', 'Calibration tracking'],
    },
    {
      id: 'ocr',
      name: 'OCR Extraction',
      description: 'Extract results from instrument displays and reports',
      icon: FileText,
      color: 'green',
      features: ['Screen capture', 'PDF parsing', 'Auto data entry', 'Pattern recognition'],
    },
    {
      id: 'configurator',
      name: 'Test Configurator',
      description: 'AI-powered test group and analyte suggestions',
      icon: TestTube,
      color: 'indigo',
      features: ['Smart test suggestions', 'Analyte configuration', 'Reference ranges', 'Medical accuracy'],
    },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'photo':
        return <PhotoAnalysis />;
      case 'pipette':
        return <PipetteValidation />;
      case 'ocr':
        return <OCRExtraction />;
      case 'configurator':
        return (
          <div className="p-6">
            <AITestConfigurator
              onConfigurationGenerated={handleConfigurationGenerated}
              existingTests={existingTests}
              className="w-full"
            />
          </div>
        );
      default:
        return <PhotoAnalysis />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI-Enhanced Tools</h1>
          <p className="text-gray-600 mt-2">
            Leverage artificial intelligence to automate result interpretation and quality validation
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Brain className="h-4 w-4" />
          <span>Powered by Computer Vision</span>
        </div>
      </div>

      {/* Tool Selection Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`
                flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all
                ${activeTab === tool.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <tool.icon className="h-4 w-4 mr-2" />
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`
              bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition-all
              ${activeTab === tool.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
            onClick={() => setActiveTab(tool.id)}
          >
            <div className="flex items-center mb-4">
              <div className={`p-3 rounded-lg bg-${tool.color}-100`}>
                <tool.icon className={`h-6 w-6 text-${tool.color}-600`} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {tool.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active Tool Component */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {renderActiveComponent()}
      </div>

      {/* AI Features Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Advanced AI Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Computer Vision Models</h4>
                <p>Custom-trained neural networks for medical test interpretation with high accuracy rates.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">OCR Processing</h4>
                <p>Advanced optical character recognition optimized for laboratory instruments and reports.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Quality Assurance</h4>
                <p>AI-powered quality control to ensure accurate measurements and reduce human error.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Continuous Learning</h4>
                <p>Models improve over time with usage data and feedback from laboratory professionals.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITools;