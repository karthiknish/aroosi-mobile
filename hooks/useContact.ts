import { useState } from 'react';
import { useEnhancedApiClient } from '../utils/enhancedApiClient';
import { Contact, ContactFormData, ContactFormErrors, ContactSubmissionResult } from '../types/contact';
import { useClerkAuth } from "../contexts/ClerkAuthContext"

export function useContact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const apiClient = useEnhancedApiClient();
  const { user } = useClerkAuth();

  const validateForm = (data: ContactFormData): ContactFormErrors => {
    const newErrors: ContactFormErrors = {};

    // Name validation
    if (!data.name.trim()) {
      newErrors.name = "Name is required";
    } else if (data.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (data.name.trim().length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(data.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    // Subject validation
    if (!data.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (data.subject.trim().length < 5) {
      newErrors.subject = "Subject must be at least 5 characters";
    } else if (data.subject.trim().length > 100) {
      newErrors.subject = "Subject must be less than 100 characters";
    }

    // Message validation
    if (!data.message.trim()) {
      newErrors.message = "Message is required";
    } else if (data.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    } else if (data.message.trim().length > 1000) {
      newErrors.message = "Message must be less than 1000 characters";
    }

    return newErrors;
  };

  const submitContactForm = async (
    data: ContactFormData
  ): Promise<ContactSubmissionResult> => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate form data
      const validationErrors = validateForm(data);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return { success: false, error: "Please fix the form errors" };
      }

      // Prepare form data
      const formData = {
        name: data.name.trim(),
        email: data.email.trim(),
        subject: data.subject.trim(),
        message: data.message.trim(),
      };

      // Submit to API
      const response = await apiClient.submitContactForm(formData);

      if (response.success) {
        return {
          success: true,
          data: response.data as Contact,
        };
      } else {
        const errorMessage =
          typeof response.error === "string"
            ? response.error
            : "Failed to submit contact form";
        setErrors({ general: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error("Contact form submission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrors({ general: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearErrors = () => {
    setErrors({});
  };

  const getInitialFormData = (): ContactFormData => {
    return {
      name: user?.profile?.fullName || "",
      email: user?.email || "",
      subject: "",
      message: "",
    };
  };

  return {
    isSubmitting,
    errors,
    submitContactForm,
    clearErrors,
    getInitialFormData,
    validateForm,
  };
}