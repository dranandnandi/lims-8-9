// Flag calculation utilities for lab results
export interface ResultValue {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  flag?: string;
}

// Function to calculate flag based on value and reference range
export const calculateFlag = (value: string, referenceRange: string, patientGender?: string): string => {
  if (!value || !referenceRange) return '';
  
  // Parse the numeric value
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  if (isNaN(numericValue)) return '';
  
  // Parse reference range (e.g., "10-40", "<200", ">50", "M: >40, F: >50")
  const range = referenceRange.toLowerCase().trim();
  
  // Handle gender-specific ranges like "M: >40, F: >50"
  if (range.includes('m:') && range.includes('f:')) {
    const parts = range.split(',');
    let targetRange = '';
    
    if (patientGender?.toUpperCase() === 'M') {
      // Use male range
      const maleRange = parts.find(p => p.includes('m:'));
      if (maleRange) {
        targetRange = maleRange.replace('m:', '').trim();
      }
    } else if (patientGender?.toUpperCase() === 'F') {
      // Use female range
      const femaleRange = parts.find(p => p.includes('f:'));
      if (femaleRange) {
        targetRange = femaleRange.replace('f:', '').trim();
      }
    } else {
      // Default to male range if gender not specified
      const maleRange = parts[0].replace('m:', '').trim();
      targetRange = maleRange;
    }
    
    return calculateFlagForRange(numericValue, targetRange);
  }
  
  return calculateFlagForRange(numericValue, range);
};

const calculateFlagForRange = (value: number, range: string): string => {
  // Handle ranges like "<200"
  if (range.startsWith('<')) {
    const maxValue = parseFloat(range.substring(1));
    return value >= maxValue ? 'H' : '';
  }
  
  // Handle ranges like ">50"
  if (range.startsWith('>')) {
    const minValue = parseFloat(range.substring(1));
    return value <= minValue ? 'L' : '';
  }
  
  // Handle ranges like "10-40"
  if (range.includes('-')) {
    const parts = range.split('-');
    if (parts.length === 2) {
      const minValue = parseFloat(parts[0]);
      const maxValue = parseFloat(parts[1]);
      
      if (!isNaN(minValue) && !isNaN(maxValue)) {
        if (value < minValue) return 'L';
        if (value > maxValue) return 'H';
        return ''; // Normal range
      }
    }
  }
  
  // Handle ranges like "10 - 40" (with spaces)
  const dashMatch = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (dashMatch) {
    const minValue = parseFloat(dashMatch[1]);
    const maxValue = parseFloat(dashMatch[2]);
    
    if (value < minValue) return 'L';
    if (value > maxValue) return 'H';
    return ''; // Normal range
  }
  
  return ''; // Cannot determine flag
};

// Function to automatically calculate flags for all result values
export const calculateFlagsForResults = (values: ResultValue[], patientGender?: string): ResultValue[] => {
  return values.map(value => ({
    ...value,
    flag: value.flag || calculateFlag(value.value, value.reference_range, patientGender)
  }));
};

// Function to check if any values have abnormal flags
export const hasAbnormalFlags = (values: ResultValue[]): boolean => {
  return values.some(value => {
    const flag = value.flag || calculateFlag(value.value, value.reference_range);
    return flag === 'H' || flag === 'L' || flag === 'C';
  });
};

// Function to get flag description
export const getFlagDescription = (flag: string): string => {
  switch (flag) {
    case 'H': return 'High';
    case 'L': return 'Low';
    case 'C': return 'Critical';
    default: return 'Normal';
  }
};

// Function to get flag color class for UI
export const getFlagColor = (flag?: string): string => {
  switch (flag) {
    case 'H': return 'text-red-600 bg-red-100';
    case 'L': return 'text-blue-600 bg-blue-100';
    case 'C': return 'text-yellow-600 bg-yellow-100';
    default: return '';
  }
};
