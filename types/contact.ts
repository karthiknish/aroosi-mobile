export interface Contact {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  error?: string;
  data?: Contact;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  general?: string;
}

export const CONTACT_SUBJECTS = [
  'General Inquiry',
  'Technical Support',
  'Account Issues',
  'Subscription & Billing',
  'Profile & Matching',
  'Safety & Security',
  'Feature Request',
  'Bug Report',
  'Other'
] as const;

export type ContactSubject = typeof CONTACT_SUBJECTS[number];