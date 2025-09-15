import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useContact } from "@/hooks/useContact";
import { ContactFormData } from '../../types/contact';
import { useTheme } from "@contexts/ThemeContext";

/**
 * Test component to verify contact functionality
 * This component tests the contact form submission and validation
 */
export default function ContactTest() {
  const { theme } = useTheme();
  const {
    isSubmitting,
    errors,
    submitContactForm,
    getInitialFormData,
    validateForm,
  } = useContact();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  };

  const testValidation = () => {
    const invalidData: ContactFormData = {
      name: "",
      email: "invalid-email",
      subject: "Hi",
      message: "Short",
    };

    const errors = validateForm(invalidData);
    const errorCount = Object.keys(errors).length;

    if (errorCount === 4) {
      addTestResult("✅ Validation test passed - Found all 4 expected errors");
    } else {
      addTestResult(
        `❌ Validation test failed - Expected 4 errors, got ${errorCount}`
      );
    }
  };

  const testValidFormData = () => {
    const validData: ContactFormData = {
      name: "Test User",
      email: "test@example.com",
      subject: "Test Subject for Contact Form",
      message:
        "This is a test message that is long enough to pass validation requirements.",
    };

    const errors = validateForm(validData);
    const errorCount = Object.keys(errors).length;

    if (errorCount === 0) {
      addTestResult("✅ Valid form test passed - No validation errors");
    } else {
      addTestResult(
        `❌ Valid form test failed - Expected 0 errors, got ${errorCount}`
      );
    }
  };

  const testInitialData = () => {
    const initialData = getInitialFormData();

    if (
      typeof initialData.name === "string" &&
      typeof initialData.email === "string" &&
      initialData.subject === "" &&
      initialData.message === ""
    ) {
      addTestResult("✅ Initial data test passed - Correct structure");
    } else {
      addTestResult("❌ Initial data test failed - Incorrect structure");
    }
  };

  const testSubmission = async () => {
    const testData: ContactFormData = {
      name: "Test User",
      email: "test@aroosi.app",
      subject: "Test Submission from Mobile App",
      message:
        "This is a test message to verify the contact form submission functionality is working correctly.",
    };

    addTestResult("🔄 Testing form submission...");

    try {
      const result = await submitContactForm(testData);

      if (result.success) {
        addTestResult(
          "✅ Form submission test passed - Successfully submitted"
        );
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
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Contact Form Test
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={testValidation}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Validation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={testValidFormData}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Valid Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={testInitialData}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Initial Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.success[500] },
          ]}
          onPress={testSubmission}
          disabled={isSubmitting}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            {isSubmitting ? "Testing..." : "Test Submission"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.clearButton,
            { backgroundColor: theme.colors.neutral[400] },
          ]}
          onPress={clearResults}
        >
          <Text
            style={[
              styles.clearButtonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Clear Results
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.resultsContainer,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <Text
          style={[styles.resultsTitle, { color: theme.colors.text.primary }]}
        >
          Test Results:
        </Text>
        {testResults.length === 0 ? (
          <Text
            style={[styles.noResults, { color: theme.colors.text.secondary }]}
          >
            No tests run yet
          </Text>
        ) : (
          testResults.map((result, index) => (
            <Text
              key={index}
              style={[
                styles.resultItem,
                { color: theme.colors.text.secondary },
              ]}
            >
              {result}
            </Text>
          ))
        )}
      </View>

      {Object.keys(errors).length > 0 && (
        <View
          style={[
            styles.errorsContainer,
            {
              backgroundColor: theme.colors.error[50],
              borderColor: theme.colors.error[200],
            },
          ]}
        >
          <Text
            style={[styles.errorsTitle, { color: theme.colors.error[700] }]}
          >
            Current Errors:
          </Text>
          {Object.entries(errors).map(([field, error]) => (
            <Text
              key={field}
              style={[styles.errorItem, { color: theme.colors.error[600] }]}
            >
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultsContainer: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  noResults: {
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  resultItem: {
    fontSize: 12,
    paddingVertical: 2,
    fontFamily: "monospace",
  },
  errorsContainer: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  errorItem: {
    fontSize: 12,
  },
});