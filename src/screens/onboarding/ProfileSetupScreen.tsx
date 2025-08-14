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
import { useApiClient } from "../../../utils/api";

// Validated UI components (web-parity)
import { ValidatedInput } from "../../components/ui/ValidatedInput";
import { ValidatedSelect } from "../../components/ui/ValidatedSelect";
import { ErrorSummary } from "../../components/ui/ErrorSummary";
import { useMutation } from "@tanstack/react-query";
import { useClerkAuth } from "../contexts/ClerkAuthContext"
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
import { useToast } from "../../../providers/ToastContext";
import { COUNTRIES } from "@constants/countries";
import {
  validateCreateProfile,
  formatPhoneNumber,
  cleanPhoneNumber,
} from "../../../utils/profileValidation";
import { Colors, Layout } from "../../../constants";
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

// Helper: map { value,label }[] to string[] of labels for ValidatedSelect
const toLabelArray = (arr: Array<{ label: string }>): string[] =>
  arr.map((o) => o.label);

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
  const { } = useClerkAuth();
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
      refreshProfile?.();
      navigation.navigate("Main");
    },
    onError: () => {
      toast.show("Failed to create profile. Please try again.", "error");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<CreateProfileData>) => {
      return apiClient.updateProfile(updates);
    },
    onSuccess: () => {
      toast.show("Your profile has been updated.", "success");
      refreshProfile?.();
      navigation.navigate("Main");
    },
    onError: () => {
      toast.show("Failed to update profile. Please try again.", "error");
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

    if (existingProfile) {
      updateProfileMutation.mutate(profileData);
    } else {
      createProfileMutation.mutate(profileData);
    }
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

  const renderBasicInfoStep = () => {
    // Map option objects to label arrays for ValidatedSelect
    const religionOptions = toLabelArray(RELIGION_OPTIONS as any);
    const motherTongueOptions = toLabelArray(MOTHER_TONGUE_OPTIONS as any);
    const genderOptions = (GENDER_OPTIONS as any[]).map((o) => o.label);
    const preferredGenderOptions = (PREFERRED_GENDER_OPTIONS as any[]).map(
      (o) => o.label
    );

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepSubtitle}>Let's start with the basics</Text>

        <ErrorSummary errors={errors} />

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Religion"
            field="religion"
            options={religionOptions}
            value={formData.religion || ""}
            onValueChange={(v) => handleInputChange("religion", v)}
            placeholder="Select religion"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Mother Tongue"
            field="motherTongue"
            options={motherTongueOptions}
            value={formData.motherTongue || ""}
            onValueChange={(v) => handleInputChange("motherTongue", v)}
            placeholder="Select mother tongue"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedInput
            label="Ethnicity"
            field="ethnicity"
            value={formData.ethnicity || ""}
            onValueChange={(text) => handleInputChange("ethnicity", text)}
            placeholder="e.g., British Asian, Indian, Pakistani, etc."
            maxLength={50}
            error={errors.ethnicity}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity
            style={[
              styles.input,
              styles.dateInput,
              errors.dateOfBirth ? styles.inputError : null,
            ]}
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
          <ValidatedSelect
            label="Gender"
            field="gender"
            required
            options={genderOptions}
            value={formData.gender || ""}
            onValueChange={(label) => {
              // map back from label to value using GENDER_OPTIONS
              const found = (GENDER_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("gender", found ? found.value : "");
            }}
            placeholder="Select gender"
            error={errors.gender}
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Looking For"
            field="preferredGender"
            required
            options={preferredGenderOptions}
            value={formData.preferredGender || ""}
            onValueChange={(label) => {
              const found = (PREFERRED_GENDER_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("preferredGender", found ? found.value : "");
            }}
            placeholder="Select preference"
            error={errors.preferredGender}
          />
        </View>
      </View>
    );
  };

  const renderLocationStep = () => {
    const countryOptions = (COUNTRIES as any[]).map((c) => c.name ?? c); // support string or {name}

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Location</Text>
        <Text style={styles.stepSubtitle}>Where are you based?</Text>

        <ErrorSummary errors={errors} />

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Country"
            field="country"
            required
            options={countryOptions}
            value={formData.country || ""}
            onValueChange={(label) => {
              // try to map back to code/name object; otherwise store label
              const found = (COUNTRIES as any[]).find(
                (c) => (c.name ?? c) === label
              );
              handleInputChange("country", found?.name ?? label);
            }}
            placeholder="Select country"
            error={errors.country}
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedInput
            label="City"
            field="city"
            required
            value={formData.city || ""}
            onValueChange={(text) => handleInputChange("city", text)}
            placeholder="Enter city"
            error={errors.city}
          />
        </View>
      </View>
    );
  };

  const renderPhysicalDetailsStep = () => {
    const maritalStatusOptions = (MARITAL_STATUS_OPTIONS as any[]).map(
      (o) => o.label
    );

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Physical Details</Text>
        <Text style={styles.stepSubtitle}>
          Tell us about your physical attributes
        </Text>

        <ErrorSummary errors={errors} />

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
          {errors.height && (
            <Text style={styles.errorText}>{errors.height}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Marital Status"
            field="maritalStatus"
            required
            options={maritalStatusOptions}
            value={
              // map stored value back to label for display
              (MARITAL_STATUS_OPTIONS as any[]).find(
                (o) => o.value === formData.maritalStatus
              )?.label || ""
            }
            onValueChange={(label) => {
              const found = (MARITAL_STATUS_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("maritalStatus", found ? found.value : "");
            }}
            placeholder="Select status"
            error={errors.maritalStatus}
          />
        </View>
      </View>
    );
  };

  const renderProfessionalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Details</Text>
      <Text style={styles.stepSubtitle}>
        Your career and education background
      </Text>

      <ErrorSummary errors={errors} />

      <View style={styles.formGroup}>
        <ValidatedInput
          label="Education"
          field="education"
          required
          value={formData.education || ""}
          onValueChange={(text) => handleInputChange("education", text)}
          placeholder="e.g., Bachelor's in Computer Science"
          maxLength={100}
          error={errors.education}
        />
      </View>

      <View style={styles.formGroup}>
        <ValidatedInput
          label="Occupation"
          field="occupation"
          required
          value={formData.occupation || ""}
          onValueChange={(text) => handleInputChange("occupation", text)}
          placeholder="e.g., Software Engineer"
          maxLength={100}
          error={errors.occupation}
        />
      </View>

      <View style={styles.formGroup}>
        <ValidatedInput
          label="Annual Income (£)"
          field="annualIncome"
          required
          value={formData.annualIncome?.toString() || ""}
          onValueChange={(text) =>
            handleInputChange("annualIncome", parseInt(text) || undefined)
          }
          placeholder="e.g., 50000"
          keyboardType="numeric"
          error={errors.annualIncome}
        />
      </View>
    </View>
  );

  const renderCulturalStep = () => {
    const motherTongueOptions = toLabelArray(MOTHER_TONGUE_OPTIONS as any);
    const ethnicityOptions = toLabelArray(ETHNICITY_OPTIONS as any);
    const religionOptions = toLabelArray(RELIGION_OPTIONS as any);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Cultural Background</Text>
        <Text style={styles.stepSubtitle}>
          Share your cultural identity (optional)
        </Text>

        <ErrorSummary errors={errors} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cultural Background</Text>

          <ValidatedSelect
            label="Mother Tongue"
            field="motherTongue"
            options={motherTongueOptions}
            value={
              (MOTHER_TONGUE_OPTIONS as any[]).find(
                (o) => o.value === formData.motherTongue
              )?.label ||
              formData.motherTongue ||
              ""
            }
            onValueChange={(label) => {
              const found = (MOTHER_TONGUE_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("motherTongue", found ? found.value : label);
            }}
            placeholder="Select mother tongue"
          />

          <ValidatedSelect
            label="Ethnicity"
            field="ethnicity"
            options={ethnicityOptions}
            value={formData.ethnicity || ""}
            onValueChange={(label) => handleInputChange("ethnicity", label)}
            placeholder="Select ethnicity"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Religion"
            field="religion"
            options={religionOptions}
            value={
              (RELIGION_OPTIONS as any[]).find(
                (o) => o.value === formData.religion
              )?.label ||
              formData.religion ||
              ""
            }
            onValueChange={(label) => {
              const found = (RELIGION_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("religion", found ? found.value : label);
            }}
            placeholder="Select religion"
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
  };

  const renderAboutMeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>About Me</Text>
      <Text style={styles.stepSubtitle}>
        Tell potential matches about yourself
      </Text>

      <ErrorSummary errors={errors} />

      <View style={styles.formGroup}>
        <ValidatedInput
          label={`About Me (${(formData.aboutMe || "").length}/2000)`}
          field="aboutMe"
          required
          value={formData.aboutMe || ""}
          onValueChange={(text) => handleInputChange("aboutMe", text)}
          placeholder="Tell us about yourself, your values, interests, and what you're looking for in a partner..."
          multiline
          numberOfLines={6}
          maxLength={2000}
          error={errors.aboutMe}
        />
      </View>

      <View style={styles.formGroup}>
        <ValidatedInput
          label="Phone Number"
          field="phoneNumber"
          required
          value={
            formData.phoneNumber ? formatPhoneNumber(formData.phoneNumber) : ""
          }
          onValueChange={(text) => handleInputChange("phoneNumber", text)}
          placeholder="e.g., 07123 456 789"
          keyboardType="phone-pad"
          maxLength={20}
          error={errors.phoneNumber}
        />
      </View>
    </View>
  );

  const renderLifestyleStep = () => {
    const dietOptions = (DIET_OPTIONS as any[]).map((o) => o.label);
    const smokingOptions = (SMOKING_DRINKING_OPTIONS as any[]).map(
      (o) => o.label
    );
    const drinkingOptions = (SMOKING_DRINKING_OPTIONS as any[]).map(
      (o) => o.label
    );
    const physicalStatusOptions = (PHYSICAL_STATUS_OPTIONS as any[]).map(
      (o) => o.label
    );

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Lifestyle Preferences</Text>
        <Text style={styles.stepSubtitle}>
          Share your lifestyle choices (optional)
        </Text>

        <ErrorSummary errors={errors} />

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Diet"
            field="diet"
            options={dietOptions}
            value={
              (DIET_OPTIONS as any[]).find((o) => o.value === formData.diet)
                ?.label ||
              formData.diet ||
              ""
            }
            onValueChange={(label) => {
              const found = (DIET_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("diet", found ? found.value : label);
            }}
            placeholder="Select diet"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Smoking"
            field="smoking"
            options={smokingOptions}
            value={
              (SMOKING_DRINKING_OPTIONS as any[]).find(
                (o) => o.value === formData.smoking
              )?.label ||
              formData.smoking ||
              ""
            }
            onValueChange={(label) => {
              const found = (SMOKING_DRINKING_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("smoking", found ? found.value : label);
            }}
            placeholder="Select option"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Drinking"
            field="drinking"
            options={drinkingOptions}
            value={
              (SMOKING_DRINKING_OPTIONS as any[]).find(
                (o) => o.value === formData.drinking
              )?.label ||
              formData.drinking ||
              ""
            }
            onValueChange={(label) => {
              const found = (SMOKING_DRINKING_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("drinking", found ? found.value : label);
            }}
            placeholder="Select option"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Physical Status"
            field="physicalStatus"
            options={physicalStatusOptions}
            value={
              (PHYSICAL_STATUS_OPTIONS as any[]).find(
                (o) => o.value === formData.physicalStatus
              )?.label ||
              formData.physicalStatus ||
              ""
            }
            onValueChange={(label) => {
              const found = (PHYSICAL_STATUS_OPTIONS as any[]).find(
                (o) => o.label === label
              );
              handleInputChange("physicalStatus", found ? found.value : label);
            }}
            placeholder="Select status"
          />
        </View>

        <View style={styles.partnerPreferences}>
          <Text style={styles.sectionTitle}>
            Partner Age Preferences (Optional)
          </Text>
          <View style={styles.ageRange}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <ValidatedInput
                label="Min Age"
                field="partnerPreferenceAgeMin"
                value={formData.partnerPreferenceAgeMin?.toString() || ""}
                onValueChange={(text) =>
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
              <ValidatedInput
                label="Max Age"
                field="partnerPreferenceAgeMax"
                value={formData.partnerPreferenceAgeMax?.toString() || ""}
                onValueChange={(text) =>
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
  };

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
