/**
 * Secure Gemini AI Integration for LIMS System
 * Uses Supabase Edge Functions to keep API keys secure
 */

import { supabase } from './supabase';

export interface TestConfigurationRequest {
  testName: string;
  description?: string;
  labContext?: string;
  existingTests?: string[]; // For avoiding duplicates
}

export interface TestConfigurationResponse {
  testGroup: {
    name: string;
    clinicalPurpose: string;
    category: string;
    tat_hours: number;
    price: number;
    instructions?: string;
  };
  analytes: Array<{
    name: string;
    unit: string;
    method: string;
    reference_min?: number;
    reference_max?: number;
    critical_min?: number;
    critical_max?: number;
    description?: string;
  }>;
  confidence: number; // 0-1 score
  reasoning: string;
}

export interface DocumentAnalysisRequest {
  documentType: 'pdf' | 'image' | 'color_card';
  content: string; // Base64 or text content
  testContext?: {
    testId: string;
    analyteIds?: string[];
    expectedFormat?: string;
  };
  customPrompt?: string;
}

export interface DocumentAnalysisResponse {
  extractedData: Record<string, any>;
  confidence: number;
  processingType: string;
  suggestions?: string[];
  errors?: string[];
}

class SecureGeminiAIService {
  /**
   * Generate test configuration suggestions using secure Edge Function
   */
  async suggestTestConfiguration(request: TestConfigurationRequest): Promise<TestConfigurationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-test-configurator', {
        body: request
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from AI service');
      }

      return data.data as TestConfigurationResponse;
    } catch (error) {
      console.error('Error in suggestTestConfiguration:', error);
      throw new Error(`Failed to generate test configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze document content using secure Edge Function
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-document-processor', {
        body: request
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from AI service');
      }

      return data.data as DocumentAnalysisResponse;
    } catch (error) {
      console.error('Error in analyzeDocument:', error);
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if AI services are available
   */
  async checkAvailability(): Promise<{ available: boolean; message?: string }> {
    try {
      // Test with a simple request
      const testRequest = {
        testName: 'Test Connectivity',
        description: 'Connection test'
      };

      await this.suggestTestConfiguration(testRequest);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export the secure service instance
export const geminiAI = new SecureGeminiAIService();
export { SecureGeminiAIService as GeminiAIService };
