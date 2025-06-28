import { 
  Gender, 
  PreferredGender, 
  MaritalStatus, 
  Diet, 
  SmokingDrinking, 
  PhysicalStatus,
  Profile 
} from '../types/profile';

/**
 * Type validation utilities to ensure API responses conform to expected union types
 * This helps handle cases where the API might return string values that need to be validated
 */

export function validateGender(value: any): Gender {
  const validGenders: Gender[] = ['male', 'female', 'other'];
  return validGenders.includes(value) ? value : 'other';
}

export function validatePreferredGender(value: any): PreferredGender {
  const validPreferredGenders: PreferredGender[] = ['male', 'female', 'other', 'any', ''];
  return validPreferredGenders.includes(value) ? value : 'any';
}

export function validateMaritalStatus(value: any): MaritalStatus {
  const validStatuses: MaritalStatus[] = ['single', 'divorced', 'widowed', 'annulled'];
  return validStatuses.includes(value) ? value : 'single';
}

export function validateDiet(value: any): Diet {
  const validDiets: Diet[] = ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian', 'other', ''];
  return validDiets.includes(value) ? value : '';
}

export function validateSmokingDrinking(value: any): SmokingDrinking {
  const validOptions: SmokingDrinking[] = ['no', 'occasionally', 'yes', ''];
  return validOptions.includes(value) ? value : '';
}

export function validatePhysicalStatus(value: any): PhysicalStatus {
  const validStatuses: PhysicalStatus[] = ['normal', 'differently-abled', 'other', ''];
  return validStatuses.includes(value) ? value : '';
}

/**
 * Validates and sanitizes a profile object from API response
 * Ensures all union type fields have valid values
 */
export function validateProfileData(data: any): Partial<Profile> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const validated: any = { ...data };

  // Validate union type fields
  if (data.gender !== undefined) {
    validated.gender = validateGender(data.gender);
  }

  if (data.preferredGender !== undefined) {
    validated.preferredGender = validatePreferredGender(data.preferredGender);
  }

  if (data.maritalStatus !== undefined) {
    validated.maritalStatus = validateMaritalStatus(data.maritalStatus);
  }

  if (data.diet !== undefined) {
    validated.diet = validateDiet(data.diet);
  }

  if (data.smoking !== undefined) {
    validated.smoking = validateSmokingDrinking(data.smoking);
  }

  if (data.drinking !== undefined) {
    validated.drinking = validateSmokingDrinking(data.drinking);
  }

  if (data.physicalStatus !== undefined) {
    validated.physicalStatus = validatePhysicalStatus(data.physicalStatus);
  }

  // Ensure numeric fields are properly typed
  if (data.annualIncome !== undefined) {
    validated.annualIncome = typeof data.annualIncome === 'string' 
      ? parseFloat(data.annualIncome) || 0 
      : data.annualIncome;
  }

  if (data.partnerPreferenceAgeMin !== undefined) {
    validated.partnerPreferenceAgeMin = typeof data.partnerPreferenceAgeMin === 'string'
      ? parseInt(data.partnerPreferenceAgeMin, 10) || 18
      : data.partnerPreferenceAgeMin;
  }

  if (data.partnerPreferenceAgeMax !== undefined) {
    validated.partnerPreferenceAgeMax = typeof data.partnerPreferenceAgeMax === 'string'
      ? parseInt(data.partnerPreferenceAgeMax, 10) || 65
      : data.partnerPreferenceAgeMax;
  }

  // Ensure boolean fields are properly typed
  if (data.isProfileComplete !== undefined) {
    validated.isProfileComplete = Boolean(data.isProfileComplete);
  }

  if (data.isOnboardingComplete !== undefined) {
    validated.isOnboardingComplete = Boolean(data.isOnboardingComplete);
  }

  if (data.banned !== undefined) {
    validated.banned = Boolean(data.banned);
  }

  if (data.hideFromFreeUsers !== undefined) {
    validated.hideFromFreeUsers = Boolean(data.hideFromFreeUsers);
  }

  if (data.hasSpotlightBadge !== undefined) {
    validated.hasSpotlightBadge = Boolean(data.hasSpotlightBadge);
  }

  return validated;
}

/**
 * Validates form data before sending to API
 * Ensures all required fields are present and properly typed
 */
export function validateFormData(formData: any): { isValid: boolean; errors: string[]; data?: any } {
  const errors: string[] = [];
  
  if (!formData || typeof formData !== 'object') {
    return { isValid: false, errors: ['Invalid form data'] };
  }

  // Required field validation
  const requiredFields = ['fullName', 'gender', 'dateOfBirth', 'city'];
  
  for (const field of requiredFields) {
    if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  // Age validation
  if (formData.dateOfBirth) {
    const age = calculateAge(formData.dateOfBirth);
    if (age < 18) {
      errors.push('Must be at least 18 years old');
    }
    if (age > 100) {
      errors.push('Invalid date of birth');
    }
  }

  // Partner preference validation
  if (formData.partnerPreferenceAgeMin && formData.partnerPreferenceAgeMax) {
    const minAge = parseInt(formData.partnerPreferenceAgeMin, 10);
    const maxAge = parseInt(formData.partnerPreferenceAgeMax, 10);
    
    if (minAge >= maxAge) {
      errors.push('Minimum age preference must be less than maximum age preference');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Return validated data
  return {
    isValid: true,
    errors: [],
    data: validateProfileData(formData)
  };
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}