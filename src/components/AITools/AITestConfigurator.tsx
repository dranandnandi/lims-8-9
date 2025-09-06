import React, { useState } from 'react';
import { Loader2, Sparkles, Check, Edit3 } from 'lucide-react';
import { geminiAI, TestConfigurationResponse } from '../../utils/geminiAI';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../utils/supabase';

interface AITestConfiguratorProps {
  onConfigurationGenerated?: (config: TestConfigurationResponse) => void;
  existingTests?: string[];
  className?: string;
}

export const AITestConfigurator: React.FC<AITestConfiguratorProps> = ({
  onConfigurationGenerated,
  existingTests = [],
  className = ''
}) => {
  const { user } = useAuth();
  const [testName, setTestName] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<TestConfigurationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerateConfig = async () => {
    if (!testName.trim()) {
      setError('Please enter a test name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const config = await geminiAI.suggestTestConfiguration({
        testName: testName.trim(),
        description: description.trim() || undefined,
        existingTests,
        labContext: `User: ${user?.email || 'Unknown'}. Use Indian market defaults: Price ₹500, Sample Type "Serum", Clinical Purpose "Clinical assessment and diagnosis", Turnaround Time "2-4 hours".`
      });

      setGeneratedConfig(config);
      onConfigurationGenerated?.(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate configuration');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = () => {
    setGeneratedConfig(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleAcceptConfiguration = async () => {
    if (!generatedConfig || !user) {
      setError('No configuration to accept or user not authenticated');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get current user's lab ID (can be null for global configurations)
      let labId = await database.getCurrentUserLabId();
      
      console.log('Current user lab ID:', labId); // Debug log
      console.log('Current user:', user); // Debug log
      
      // If no lab_id from the function, try to get it from user context
      if (!labId && user?.user_metadata?.lab_id) {
        labId = user.user_metadata.lab_id;
        console.log('Using lab_id from user metadata:', labId);
      }
      
      if (!labId) {
        console.warn('No lab associated with current user. Creating global test group and analytes.');
        // Continue with global creation instead of throwing error
      }

      // Step 1: Create analytes if they don't exist
      const createdAnalytes: any[] = [];
      
      // Get all existing analytes once to avoid repeated database calls
      const { data: existingAnalytes } = await database.analytes.getAll();
      
      for (const analyte of generatedConfig.analytes) {
        try {
          // Check if an analyte with this name already exists (safe string comparison)
          const existingAnalyte = existingAnalytes?.find((a: any) => 
            (a.name || '').toLowerCase() === (analyte.name || '').toLowerCase()
          );
          
          if (existingAnalyte) {
            console.log(`Using existing analyte: ${analyte.name}`);
            createdAnalytes.push(existingAnalyte);
          } else {
            // Format reference range from min/max values or use provided range
            let referenceRange: string;
            if (analyte.reference_min !== undefined && analyte.reference_max !== undefined) {
              referenceRange = `${analyte.reference_min} - ${analyte.reference_max}`;
            } else {
              referenceRange = 'See lab standards'; // Default fallback
            }

            // Format critical values
            let lowCritical: string | undefined;
            let highCritical: string | undefined;
            if (analyte.critical_min !== undefined) {
              lowCritical = analyte.critical_min.toString();
            }
            if (analyte.critical_max !== undefined) {
              highCritical = analyte.critical_max.toString();
            }

            // Create new analyte
            const { data: createdAnalyte, error: analyteError } = await database.analytes.create({
              name: analyte.name,
              unit: analyte.unit,
              reference_range: referenceRange,
              low_critical: lowCritical,
              high_critical: highCritical,
              interpretation_low: 'Below normal range',
              interpretation_normal: 'Within normal range',
              interpretation_high: 'Above normal range',
              category: generatedConfig.testGroup.category || 'General', // Use testGroup.category
              is_global: !labId, // Make global if no lab_id
              is_active: true,
              ai_processing_type: 'ocr_report'
            });

            if (analyteError) {
              console.error('Error creating analyte:', analyteError);
              throw new Error(`Failed to create analyte: ${analyte.name} - ${analyteError.message}`);
            } else {
              console.log(`Created new analyte: ${analyte.name}`);
              createdAnalytes.push(createdAnalyte);
            }
          }
        } catch (err) {
          console.error('Error processing analyte:', err);
          // Continue with other analytes even if one fails
        }
      }

      // Step 2: Create the test group
      const testGroupData = {
        name: generatedConfig.testGroup?.name || 'Unnamed Test Group',
        code: (generatedConfig.testGroup?.name || 'UNNAMED').toUpperCase().replace(/\s+/g, '_'), // Generate code from name
        category: generatedConfig.testGroup?.category || 'Laboratory', // Use testGroup.category
        clinicalPurpose: generatedConfig.testGroup?.clinicalPurpose || 'Clinical assessment and diagnosis', // Required field in camelCase
        price: generatedConfig.testGroup?.price || 500, // Default price in Indian Rupees
        turnaroundTime: `${generatedConfig.testGroup?.tat_hours || 4} hours`, // Convert tat_hours to string format
        sampleType: 'Serum', // Default sample type since it's not in the interface
        requiresFasting: false, // Default since it's not in the interface
        isActive: true,
        lab_id: labId, // Will be null for global test groups
        to_be_copied: !labId, // Make it copyable if global
        analytes: createdAnalytes.map(a => a.id)
      };

      const { error: testGroupError } = await database.testGroups.create(testGroupData);

      if (testGroupError) {
        const errorMessage = typeof testGroupError === 'string' ? testGroupError : 
                           (testGroupError as any).message || 'Unknown error';
        throw new Error(`Failed to create test group: ${errorMessage}`);
      }

      setSuccessMessage(`Successfully created ${labId ? 'lab-specific' : 'global'} test group "${generatedConfig.testGroup?.name || 'Unnamed Test Group'}" with ${createdAnalytes.length} analytes!`);
      setGeneratedConfig(null);
      
      // Call the callback if provided
      if (onConfigurationGenerated) {
        onConfigurationGenerated(generatedConfig);
      }

    } catch (err: any) {
      console.error('Error accepting configuration:', err);
      setError(err.message || 'Failed to create test configuration');
    } finally {
      setIsCreating(false);
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI Test Configuration Assistant</h3>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Enter a test name and let AI suggest the complete test group configuration with analytes
        </p>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-4">
        {!generatedConfig ? (
          // Input form
          <>
            <div className="space-y-2">
              <label htmlFor="testName" className="block text-sm font-medium text-gray-700">
                Test Name *
              </label>
              <input
                id="testName"
                type="text"
                placeholder="e.g., Complete Blood Count, Lipid Panel, HbA1c..."
                value={testName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Additional Context (Optional)
              </label>
              <textarea
                id="description"
                placeholder="Any specific requirements, patient population, or lab preferences..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              />
            </div>

            {existingTests.length > 0 && (
              <div className="text-sm text-gray-600">
                <strong>Existing tests to avoid duplicating:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {existingTests.slice(0, 5).map((test, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border">
                      {test}
                    </span>
                  ))}
                  {existingTests.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border">
                      +{existingTests.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                {successMessage}
              </div>
            )}

            <button 
              onClick={handleGenerateConfig}
              disabled={isGenerating || !testName.trim()}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Configuration...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Test Configuration
                </>
              )}
            </button>
          </>
        ) : (
          // Generated configuration display
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${confidenceColor(generatedConfig.confidence)}`}>
                {Math.round(generatedConfig.confidence * 100)}% Confidence
              </span>
              <button 
                onClick={handleEdit}
                className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Edit Input
              </button>
            </div>

            {/* Test Group Details */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-lg mb-2">Test Group</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><strong>Name:</strong> {generatedConfig.testGroup.name}</div>
                <div><strong>Category:</strong> {generatedConfig.testGroup.category}</div>
                <div><strong>TAT:</strong> {generatedConfig.testGroup.tat_hours} hours</div>
                <div><strong>Price:</strong> ${generatedConfig.testGroup.price}</div>
              </div>
              {generatedConfig.testGroup.clinicalPurpose && (
                <div className="mt-2">
                  <strong>Clinical Purpose:</strong> {generatedConfig.testGroup.clinicalPurpose}
                </div>
              )}
              {generatedConfig.testGroup.instructions && (
                <div className="mt-2">
                  <strong>Instructions:</strong> {generatedConfig.testGroup.instructions}
                </div>
              )}
            </div>

            {/* Analytes */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Analytes ({generatedConfig.analytes.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedConfig.analytes.map((analyte, idx) => (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{analyte.name}</span>
                      <span className="text-sm text-gray-600">{analyte.unit}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Method:</strong> {analyte.method}</div>
                      {(analyte.reference_min !== undefined && analyte.reference_max !== undefined) && (
                        <div>
                          <strong>Reference:</strong> {analyte.reference_min} - {analyte.reference_max} {analyte.unit}
                        </div>
                      )}
                      {(analyte.critical_min !== undefined || analyte.critical_max !== undefined) && (
                        <div>
                          <strong>Critical:</strong> 
                          {analyte.critical_min !== undefined && ` <${analyte.critical_min}`}
                          {analyte.critical_max !== undefined && ` >${analyte.critical_max}`} {analyte.unit}
                        </div>
                      )}
                      {analyte.description && (
                        <div className="text-xs">{analyte.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-medium mb-1">AI Reasoning</h4>
              <p className="text-sm text-gray-700">{generatedConfig.reasoning}</p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleAcceptConfiguration}
                disabled={isCreating}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Accept Configuration
                  </>
                )}
              </button>
              <button 
                onClick={handleEdit}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Modify & Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
