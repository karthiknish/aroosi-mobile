import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useContact } from '../../hooks/useContact';
import { ContactFormData } from '../../types/contact';
import { Colors } from '../../constants';

/**
 * Test component to verify contact functionality
 * This component tests the contact form submission and validation
 */
export default function ContactTest() {
  const { isSubmitting, errors, submitContactForm, getInitialFormData, validateForm } = useContact();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testValidation = () => {
    const invalidData: ContactFormData = {
      name: '',
      email: 'invalid-email',
      subject: 'Hi',
      message: 'Short'
    };

    const errors = validateForm(invalidData);
    const errorCount = Object.keys(errors).length;
    
    if (errorCount === 4) {
      addTestResult('✅ Validation test passed - Found all 4 expected errors');
    } else {
      addTestResult(`❌ Validation test failed - Expected 4 errors, got ${errorCount}`);
    }
  };

  const testValidFormData = () => {
    const validData: ContactFormData = {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject for Contact Form',
      message: 'This is a test message that is long enough to pass validation requirements.'
    };

    const errors = validateForm(validData);
    const errorCount = Object.keys(errors).length;
    
    if (errorCount === 0) {
      addTestResult('✅ Valid form test passed - No validation errors');
    } else {
      addTestResult(`❌ Valid form test failed - Expected 0 errors, got ${errorCount}`);
    }
  };

  const testInitialData = () => {
    const initialData = getInitialFormData();
    
    if (typeof initialData.name === 'string' && 
        typeof initialData.email === 'string' && 
        initialData.subject === '' && 
        initialData.message === '') {
      addTestResult('✅ Initial data test passed - Correct structure');
    } else {
      addTestResult('❌ Initial data test failed - Incorrect structure');
    }
  };

  const testSubmission = async () => {
    const testData: ContactFormData = {
      name: 'Test User',
      email: 'test@aroosi.app',
      subject: 'Test Submission from Mobile App',
      message: 'This is a test message to verify the contact form submission functionality is working correctly.'
    };

    addTestResult('🔄 Testing form submission...');
    
    try {
      const result = await submitContactForm(testData);
      
      if (result.success) {
        addTestResult('✅ Form submission test passed - Successfully submitted');
      } else {
        addTestResult(`❌ Form submission test failed - ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Form submission test error - ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Form Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testValidation}>
          <Text style={styles.buttonText}>Test Validation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testValidFormData}>
          <Text style={styles.buttonText}>Test Valid Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testInitialData}>
          <Text style={styles.buttonText}>Test Initial Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.submitButton]} 
          onPress={testSubmission}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Testing...' : 'Test Submission'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No tests run yet</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultItem}>
              {result}
            </Text>
          ))
        )}
      </View>

      {Object.keys(errors).length > 0 && (
        <View style={styles.errorsContainer}>
          <Text style={styles.errorsTitle}>Current Errors:</Text>
          {Object.entries(errors).map(([field, error]) => (
            <Text key={field} style={styles.errorItem}>
              {field}: {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.primary[500],
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: Colors.success[500],
  },
  clearButton: {
    backgroundColor: Colors.neutral[400],
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: Colors.background.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  noResults: {
    color: Colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  resultItem: {
    color: Colors.text.secondary,
    fontSize: 12,
    paddingVertical: 2,
    fontFamily: 'monospace',
  },
  errorsContainer: {
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[200],
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error[700],
    marginBottom: 5,
  },
  errorItem: {
    color: Colors.error[600],
    fontSize: 12,
  },
});