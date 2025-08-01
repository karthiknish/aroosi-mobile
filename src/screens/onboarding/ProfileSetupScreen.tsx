import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useApiClient } from "@utils/api";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@contexts/AuthContext";
import {
  CreateProfileData,
  GENDER_OPTIONS,
  PREFERRED_GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  DIET_OPTIONS,
  SMOKING_DRINKING_OPTIONS,
  PHYSICAL_STATUS_OPTIONS,
  calculateAge,
  formatHeight,
  cmToFeetInches,
  feetInchesToCm,
  ProfileFor,
} from "../../../types/profile";
import { useToast } from "@providers/ToastContext";
import { COUNTRIES } from "@constants/countries";
import {
  validateCreateProfile,
  formatPhoneNumber,
  cleanPhoneNumber,
} from "@utils/profileValidation";
import { Colors, Layout } from "@constants";
import LocalImageUpload from "@components/profile/LocalImageUpload";
import ScreenContainer from "@components/common/ScreenContainer";
import SearchableSelect from "@components/SearchableSelect";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "../../../constants/languages";

interface ProfileSetupScreenProps {
  navigation: any;
}

const STEPS = [
  { id: 1, title: "Basic Info", subtitle: "Tell us about yourself" },
  { id: 2, title: "Location", subtitle: "Where are you based?" },
  { id: 3, title: "Physical Details", subtitle: "Your physical attributes" },
  { id: 4, title: "Professional", subtitle: "Your career & education" },
  { id: 5, title: "Cultural", subtitle: "Your cultural background" },
  { id: 6, title: "About Me", subtitle: "Describe yourself" },
  { id: 7, title: "Lifestyle", subtitle: "Your preferences" },
  { id: 8, title: "Photos", subtitle: "Add your profile photos" },
];

export default function ProfileSetupScreen({
  navigation,
}: ProfileSetupScreenProps) {
  const { userId } = useAuth();
  const apiClient = useApiClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateProfileData>>({
    country: "UK",
    profileFor: "self",
  });
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(6);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Create profile mutation
  const toast = useToast();

  const createProfileMutation = useMutation({
    mutationFn: async (profileData: CreateProfileData) => {
      const profileDataWithImages = {
        ...profileData,
        profileImageIds: formData.localImageIds || [],
      };
      return apiClient.createProfile(profileDataWithImages);
    },
    onSuccess: () => {
      if (formData.localImageIds && formData.localImageIds.length > 0) {
        console.log(
          "Profile created with local images, will upload after authentication"
        );
      }
      toast.show("Your profile has been created successfully.", "success");
      navigation.navigate("Main");
    },
    onError: () => {
      toast.show("Failed to create profile. Please try again.", "error");
    },
  });

  // Update height when sliders change
  useEffect(() => {
    const heightCm = feetInchesToCm(heightFeet, heightInches);
    setFormData((prev) => ({ ...prev, height: heightCm.toString() }));
  }, [heightFeet, heightInches]);

  const handleInputChange = (field: keyof CreateProfileData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      handleInputChange("dateOfBirth", dateString);
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepValidations = {
      1: ["fullName", "dateOfBirth", "gender", "preferredGender"],
      2: ["country", "city"],
      3: ["height", "maritalStatus"],
      4: ["education", "occupation", "annualIncome"],
      5: [], // Cultural fields are optional
      6: ["aboutMe", "phoneNumber"],
      7: [], // Lifestyle fields are optional
    };

    const fieldsToValidate =
      stepValidations[currentStep as keyof typeof stepValidations] || [];
    const stepErrors: Record<string, string> = {};

    const fullValidation = validateCreateProfile(formData);
    fieldsToValidate.forEach((field) => {
      if (fullValidation[field]) {
        stepErrors[field] = fullValidation[field];
      }
    });

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Final validation
    const validationErrors = validateCreateProfile(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.show("Please complete all required fields.", "error");
      return;
    }

    // Clean phone number for storage
    const profileData = { ...formData } as CreateProfileData;
    if (profileData.phoneNumber) {
      profileData.phoneNumber = cleanPhoneNumber(profileData.phoneNumber);
    }

    createProfileMutation.mutate(profileData);
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / STEPS.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep} of {STEPS.length}
      </Text>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderLocationStep();
      case 3:
        return renderPhysicalDetailsStep();
      case 4:
        return renderProfessionalStep();
      case 5:
        return renderCulturalStep();
      case 6:
        return renderAboutMeStep();
      case 7:
        return renderLifestyleStep();
      case 8:
        return renderPhotosStep();
      default:
        return null;
    }
  };

  const renderBasicInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Let's start with the basics</Text>

      <View style={styles.formGroup}>
        <SearchableSelect
          label="Religion"
          options={RELIGION_OPTIONS}
          selectedValue={formData.religion || ""}
          placeholder="Select religion"
          onValueChange={(v) => handleInputChange("religion", v)}
        />
      </View>

      <View style={styles.formGroup}>
        <SearchableSelect
          label="Mother Tongue"
          options={MOTHER_TONGUE_OPTIONS}
          selectedValue={formData.motherTongue || ""}
          placeholder="Select mother tongue"
          onValueChange={(v) => handleInputChange("motherTongue", v)}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ethnicity</Text>
        <TextInput
          style={styles.input}
          value={formData.ethnicity || ""}
          onChangeText={(text) => handleInputChange("ethnicity", text)}
          placeholder="e.g., British Asian, Indian, Pakistani, etc."
          maxLength={50}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date of Birth *</Text>
        <TouchableOpacity
          style={[styles.input, styles.dateInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text
            style={
              formData.dateOfBirth ? styles.dateText : styles.placeholderText
            }
          >
            {formData.dateOfBirth
              ? `${formData.dateOfBirth} (Age: ${calculateAge(
                  formData.dateOfBirth
                )})`
              : "Select date of birth"}
          </Text>
        </TouchableOpacity>
        {errors.dateOfBirth && (
          <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Gender *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.gender}
            onValueChange={(value) => handleInputChange("gender", value)}
            style={styles.picker}
          >
            <Picker.Item label="Select gender" value="" />
            {GENDER_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Looking For *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.preferredGender}
            onValueChange={(value) =>
              handleInputChange("preferredGender", value)
            }
            style={styles.picker}
          >
            <Picker.Item label="Select preference" value="" />
            {PREFERRED_GENDER_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
        {errors.preferredGender && (
          <Text style={styles.errorText}>{errors.preferredGender}</Text>
        )}
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Location</Text>
      <Text style={styles.stepSubtitle}>Where are you based?</Text>

      <View style={styles.formGroup}>
        <SearchableSelect
          label="Country *"
          options={COUNTRIES}
          selectedValue={formData.country || ""}
          placeholder="Select country"
          onValueChange={(value) => handleInputChange("country", value)}
        />
        {errors.country && (
          <Text style={[styles.errorText, { marginTop: Layout.spacing.xs }]}>
            {errors.country}
          </Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={[styles.input, errors.city && styles.inputError]}
          value={formData.city || ""}
          onChangeText={(text) => handleInputChange("city", text)}
          placeholder="Enter city"
        />
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>
    </View>
  );

  const renderPhysicalDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Physical Details</Text>
      <Text style={styles.stepSubtitle}>
        Tell us about your physical attributes
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Height * - {formatHeight(feetInchesToCm(heightFeet, heightInches))}
        </Text>
        <View style={styles.heightSliders}>
          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>Feet</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={heightFeet}
                onValueChange={setHeightFeet}
                style={styles.picker}
              >
                {[4, 5, 6].map((feet) => (
                  <Picker.Item key={feet} label={`${feet} ft`} value={feet} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>Inches</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={heightInches}
                onValueChange={setHeightInches}
                style={styles.picker}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <Picker.Item key={i} label={`${i} in`} value={i} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
        {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Marital Status *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.maritalStatus}
            onValueChange={(value) => handleInputChange("maritalStatus", value)}
            style={styles.picker}
          >
            <Picker.Item label="Select status" value="" />
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
        {errors.maritalStatus && (
          <Text style={styles.errorText}>{errors.maritalStatus}</Text>
        )}
      </View>
    </View>
  );

  const renderProfessionalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Details</Text>
      <Text style={styles.stepSubtitle}>
        Your career and education background
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Education *</Text>
        <TextInput
          style={[styles.input, errors.education && styles.inputError]}
          value={formData.education || ""}
          onChangeText={(text) => handleInputChange("education", text)}
          placeholder="e.g., Bachelor's in Computer Science"
          maxLength={100}
        />
        {errors.education && (
          <Text style={styles.errorText}>{errors.education}</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Occupation *</Text>
        <TextInput
          style={[styles.input, errors.occupation && styles.inputError]}
          value={formData.occupation || ""}
          onChangeText={(text) => handleInputChange("occupation", text)}
          placeholder="e.g., Software Engineer"
          maxLength={100}
        />
        {errors.occupation && (
          <Text style={styles.errorText}>{errors.occupation}</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Annual Income (£) *</Text>
        <TextInput
          style={[styles.input, errors.annualIncome && styles.inputError]}
          value={formData.annualIncome?.toString() || ""}
          onChangeText={(text) =>
            handleInputChange("annualIncome", parseInt(text) || undefined)
          }
          placeholder="e.g., 50000"
          keyboardType="numeric"
        />
        {errors.annualIncome && (
          <Text style={styles.errorText}>{errors.annualIncome}</Text>
        )}
      </View>
    </View>
  );

  const renderCulturalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Cultural Background</Text>
      <Text style={styles.stepSubtitle}>
        Share your cultural identity (optional)
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cultural Background</Text>

        <SearchableSelect
          label="Mother Tongue"
          options={MOTHER_TONGUE_OPTIONS}
          selectedValue={formData.motherTongue || ""}
          placeholder="Select mother tongue"
          onValueChange={(v) => handleInputChange("motherTongue", v)}
        />

        <SearchableSelect
          label="Ethnicity"
          options={ETHNICITY_OPTIONS}
          selectedValue={formData.ethnicity || ""}
          placeholder="Select ethnicity"
          onValueChange={(v) => handleInputChange("ethnicity", v)}
        />

        {/* Additional language field removed to align with CreateProfileData */}
      </View>

      <View style={styles.formGroup}>
        <SearchableSelect
          label="Religion"
          options={RELIGION_OPTIONS}
          selectedValue={formData.religion || ""}
          placeholder="Select religion"
          onValueChange={(v) => handleInputChange("religion", v)}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Profile For</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.profileFor || "self"}
            onValueChange={(value) => handleInputChange("profileFor", value)}
            style={styles.picker}
          >
            <Picker.Item label="Self" value="self" />
            <Picker.Item label="Friend" value="friend" />
            <Picker.Item label="Family Member" value="family" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderAboutMeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>About Me</Text>
      <Text style={styles.stepSubtitle}>
        Tell potential matches about yourself
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          About Me * ({(formData.aboutMe || "").length}/2000)
        </Text>
        <TextInput
          style={[styles.textArea, errors.aboutMe && styles.inputError]}
          value={formData.aboutMe || ""}
          onChangeText={(text) => handleInputChange("aboutMe", text)}
          placeholder="Tell us about yourself, your values, interests, and what you're looking for in a partner..."
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        {errors.aboutMe && (
          <Text style={styles.errorText}>{errors.aboutMe}</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, errors.phoneNumber && styles.inputError]}
          value={
            formData.phoneNumber ? formatPhoneNumber(formData.phoneNumber) : ""
          }
          onChangeText={(text) => handleInputChange("phoneNumber", text)}
          placeholder="e.g., 07123 456 789"
          keyboardType="phone-pad"
          maxLength={20}
        />
        {errors.phoneNumber && (
          <Text style={styles.errorText}>{errors.phoneNumber}</Text>
        )}
      </View>
    </View>
  );

  const renderLifestyleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lifestyle Preferences</Text>
      <Text style={styles.stepSubtitle}>
        Share your lifestyle choices (optional)
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Diet</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.diet}
            onValueChange={(value) => handleInputChange("diet", value)}
            style={styles.picker}
          >
            <Picker.Item label="Select diet" value="" />
            {DIET_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Smoking</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.smoking}
            onValueChange={(value) => handleInputChange("smoking", value)}
            style={styles.picker}
          >
            <Picker.Item label="Select option" value="" />
            {SMOKING_DRINKING_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Drinking</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.drinking}
            onValueChange={(value) => handleInputChange("drinking", value)}
            style={styles.picker}
          >
            <Picker.Item label="Select option" value="" />
            {SMOKING_DRINKING_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Physical Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.physicalStatus}
            onValueChange={(value) =>
              handleInputChange("physicalStatus", value)
            }
            style={styles.picker}
          >
            <Picker.Item label="Select status" value="" />
            {PHYSICAL_STATUS_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.partnerPreferences}>
        <Text style={styles.sectionTitle}>
          Partner Age Preferences (Optional)
        </Text>
        <View style={styles.ageRange}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Min Age</Text>
            <TextInput
              style={styles.input}
              value={formData.partnerPreferenceAgeMin?.toString() || ""}
              onChangeText={(text) =>
                handleInputChange(
                  "partnerPreferenceAgeMin",
                  parseInt(text) || undefined
                )
              }
              placeholder="18"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Max Age</Text>
            <TextInput
              style={styles.input}
              value={formData.partnerPreferenceAgeMax?.toString() || ""}
              onChangeText={(text) =>
                handleInputChange(
                  "partnerPreferenceAgeMax",
                  parseInt(text) || undefined
                )
              }
              placeholder="120"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderPhotosStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Profile Photos</Text>
      <Text style={styles.stepSubtitle}>
        Add photos to showcase your personality
      </Text>

      <LocalImageUpload
        title="Upload Photos"
        subtitle="Your first photo will be your main profile picture"
        maxImages={5}
        required={false}
        onImagesChange={(images) => {
          // Store local image IDs for later upload after authentication
          const imageIds = images.map((img) => img.id);
          setLocalImages(imageIds);
          setFormData((prev) => ({ ...prev, localImageIds: imageIds }));
        }}
      />

      <View style={styles.photoGuidelines}>
        <Text style={styles.photoGuidelinesText}>
          Photos help others get to know you better. You can always add or
          change photos later in your profile settings.
        </Text>
      </View>
    </View>
  );

  const currentStepData = STEPS[currentStep - 1];

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Profile</Text>
          <Text style={styles.headerSubtitle}>{currentStepData.subtitle}</Text>
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 1 && styles.nextButtonFull,
            ]}
            onPress={handleNext}
            disabled={createProfileMutation.isPending}
          >
            {createProfileMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.nextButtonText}>
                {currentStep === STEPS.length ? "Create Profile" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={
              formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()
            }
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000)} // 18 years ago
            minimumDate={new Date(Date.now() - 120 * 365 * 24 * 60 * 60 * 1000)} // 120 years ago
          />
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentStyle: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  headerTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Layout.spacing.xs,
  },
  progressContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.background.secondary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
  },
  progressText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Layout.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  stepContainer: {
    paddingBottom: Layout.spacing.xl,
  },
  stepTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  stepSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  formGroup: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  inputError: {
    borderColor: Colors.error[500],
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    height: 120,
  },
  dateInput: {
    justifyContent: "center",
  },
  dateText: {
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
  },
  picker: {
    height: 50,
  },
  heightSliders: {
    flexDirection: "row",
    gap: Layout.spacing.md,
  },
  sliderGroup: {
    flex: 1,
  },
  sliderLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  partnerPreferences: {
    marginTop: Layout.spacing.lg,
  },
  ageRange: {
    flexDirection: "row",
  },
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    gap: Layout.spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.primary[500],
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: "white",
    fontWeight: "600",
  },
  photoGuidelines: {
    marginTop: Layout.spacing.lg,
    padding: Layout.spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
  },
  photoGuidelinesText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
});
