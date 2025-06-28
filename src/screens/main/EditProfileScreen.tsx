import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useApiClient } from "../../../utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import {
  Profile,
  UpdateProfileData,
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
} from "../../../types/profile";
import {
  validateUpdateProfile,
  formatPhoneNumber,
  cleanPhoneNumber,
} from "../../../utils/profileValidation";
import { Colors, Layout } from "../../../constants";
import ImageUpload from "../../../components/profile/ImageUpload";

interface EditProfileScreenProps {
  navigation: any;
}

const GLOBAL_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Glasgow",
  "Sheffield",
  "Bradford",
  "Liverpool",
  "Edinburgh",
  "Bristol",
  "Cardiff",
  "Leicester",
  "Wakefield",
  "Coventry",
  "Nottingham",
  "Newcastle",
  "Brighton",
  "Hull",
  "Plymouth",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Derby",
  "Swansea",
  "Southampton", // UK cities
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "San Francisco",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Washington",
  "Boston", // US cities
  "Toronto",
  "Montreal",
  "Vancouver",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Quebec City", // Canadian cities
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Gold Coast",
  "Newcastle",
  "Canberra", // Australian cities
  "Kabul",
  "Kandahar",
  "Herat",
  "Mazar-i-Sharif",
  "Jalalabad",
  "Kunduz",
  "Ghazni",
  "Balkh", // Afghan cities
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Al Ain",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah", // UAE cities
  "Doha",
  "Al Rayyan",
  "Al Wakrah",
  "Al Khor",
  "Umm Salal", // Qatar cities
  "Other",
];
const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Afghanistan",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Germany",
  "France",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Italy",
  "Spain",
  "Portugal",
  "Ireland",
  "Other",
];

export default function EditProfileScreen({
  navigation,
}: EditProfileScreenProps) {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<UpdateProfileData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(6);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get current profile
  const { data: profile, isLoading } = useQuery<Profile | null, Error>({
    queryKey: ["currentProfile"],
    queryFn: async (): Promise<Profile | null> => {
      const response = await apiClient.getProfile();
      return response.success ? (response.data as Profile) : null;
    },
    enabled: !!userId,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UpdateProfileData>) => {
      return apiClient.updateProfile(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
      Alert.alert("Success", "Your profile has been updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || undefined,
        preferredGender: profile.preferredGender || undefined,
        city: profile.city || "",
        country: profile.country || "UK",
        height: profile.height || "",
        maritalStatus: profile.maritalStatus || undefined,
        education: profile.education || "",
        occupation: profile.occupation || "",
        annualIncome: profile.annualIncome || undefined,
        aboutMe: profile.aboutMe || "",
        phoneNumber: profile.phoneNumber || "",
        religion: profile.religion || "",
        motherTongue: profile.motherTongue || "",
        ethnicity: profile.ethnicity || "",
        diet: profile.diet || undefined,
        smoking: profile.smoking || undefined,
        drinking: profile.drinking || undefined,
        physicalStatus: profile.physicalStatus || undefined,
        partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin || undefined,
        partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax || undefined,
        partnerPreferenceCity: profile.partnerPreferenceCity || undefined,
        profileFor: profile.profileFor || "self",
      });

      // Set height sliders if height exists
      if (profile.height) {
        const heightCm = parseInt(profile.height);
        if (!isNaN(heightCm)) {
          const { feet, inches } = cmToFeetInches(heightCm);
          setHeightFeet(feet);
          setHeightInches(inches);
        }
      }
    }
  }, [profile]);

  // Update height when sliders change
  useEffect(() => {
    const heightCm = feetInchesToCm(heightFeet, heightInches);
    setFormData((prev) => ({ ...prev, height: heightCm.toString() }));
  }, [heightFeet, heightInches]);

  const handleInputChange = (field: keyof UpdateProfileData, value: any) => {
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

  const handleSave = () => {
    // Validate form data
    const validationErrors = validateUpdateProfile(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      Alert.alert("Validation Error", "Please fix the errors in the form.");
      return;
    }

    // Clean phone number for storage
    const updates = { ...formData };
    if (updates.phoneNumber) {
      updates.phoneNumber = cleanPhoneNumber(updates.phoneNumber);
    }

    updateProfileMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={formData.fullName || ""}
              onChangeText={(text) => handleInputChange("fullName", text)}
              placeholder="Enter your full name"
              maxLength={100}
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          {formData.religion !== undefined && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Religion</Text>
              <TextInput
                style={styles.input}
                value={formData.religion || ""}
                onChangeText={(text) => handleInputChange("religion", text)}
                placeholder="e.g., Hindu, Muslim, Christian, etc."
                maxLength={50}
              />
            </View>
          )}

          {formData.motherTongue !== undefined && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mother Tongue</Text>
              <TextInput
                style={styles.input}
                value={formData.motherTongue || ""}
                onChangeText={(text) => handleInputChange("motherTongue", text)}
                placeholder="e.g., English, Hindi, Urdu, etc."
                maxLength={50}
              />
            </View>
          )}

          {formData.ethnicity !== undefined && (
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
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={
                  formData.dateOfBirth
                    ? styles.dateText
                    : styles.placeholderText
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
                  <Picker.Item label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            {errors.gender && (
              <Text style={styles.errorText}>{errors.gender}</Text>
            )}
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
                  <Picker.Item label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            {errors.preferredGender && (
              <Text style={styles.errorText}>{errors.preferredGender}</Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.city}
                onValueChange={(value) => handleInputChange("city", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select city" value="" />
                {GLOBAL_CITIES.map((city) => (
                  <Picker.Item label={city} value={city} />
                ))}
              </Picker>
            </View>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Country *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.country}
                onValueChange={(value) => handleInputChange("country", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select country" value="" />
                {COUNTRIES.map((country) => (
                  <Picker.Item label={country} value={country} />
                ))}
              </Picker>
            </View>
            {errors.country && (
              <Text style={styles.errorText}>{errors.country}</Text>
            )}
          </View>
        </View>

        {/* Physical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Height * -{" "}
              {formatHeight(feetInchesToCm(heightFeet, heightInches))}
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
                      <Picker.Item label={`${feet} ft`} value={feet} />
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
                      <Picker.Item label={`${i} in`} value={i} />
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
            <Text style={styles.label}>Marital Status *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.maritalStatus}
                onValueChange={(value) =>
                  handleInputChange("maritalStatus", value)
                }
                style={styles.picker}
              >
                <Picker.Item label="Select status" value="" />
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <Picker.Item label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            {errors.maritalStatus && (
              <Text style={styles.errorText}>{errors.maritalStatus}</Text>
            )}
          </View>
        </View>

        {/* Professional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>

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

        {/* Contact Information */}
        {formData.phoneNumber !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                value={
                  formData.phoneNumber
                    ? formatPhoneNumber(formData.phoneNumber)
                    : ""
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
        )}

        {/* Cultural Background */}
        {(formData.religion !== undefined ||
          formData.profileFor !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cultural Background</Text>

            {formData.religion !== undefined && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Religion</Text>
                <TextInput
                  style={styles.input}
                  value={formData.religion || ""}
                  onChangeText={(text) => handleInputChange("religion", text)}
                  placeholder="e.g., Hindu, Muslim, Christian, etc."
                  maxLength={50}
                />
              </View>
            )}

            {formData.profileFor !== undefined && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Profile For</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.profileFor || "self"}
                    onValueChange={(value) =>
                      handleInputChange("profileFor", value)
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Self" value="self" />
                    <Picker.Item label="Friend" value="friend" />
                    <Picker.Item label="Family Member" value="family" />
                  </Picker>
                </View>
              </View>
            )}
          </View>
        )}

        {/* About Me */}
        {formData.aboutMe !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                About Me * ({(formData.aboutMe || "").length}/2000)
              </Text>
              <TextInput
                style={[styles.textArea, errors.aboutMe && styles.inputError]}
                value={formData.aboutMe || ""}
                onChangeText={(text) => handleInputChange("aboutMe", text)}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={6}
                maxLength={2000}
                textAlignVertical="top"
              />
              {errors.aboutMe && (
                <Text style={styles.errorText}>{errors.aboutMe}</Text>
              )}
            </View>
          </View>
        )}

        {/* Lifestyle */}
        {(formData.diet !== undefined ||
          formData.smoking !== undefined ||
          formData.drinking !== undefined ||
          formData.physicalStatus !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle</Text>

            {formData.diet !== undefined && (
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
                      <Picker.Item label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {formData.smoking !== undefined && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Smoking</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.smoking}
                    onValueChange={(value) =>
                      handleInputChange("smoking", value)
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select option" value="" />
                    {SMOKING_DRINKING_OPTIONS.map((option) => (
                      <Picker.Item label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {formData.drinking !== undefined && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Drinking</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.drinking}
                    onValueChange={(value) =>
                      handleInputChange("drinking", value)
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select option" value="" />
                    {SMOKING_DRINKING_OPTIONS.map((option) => (
                      <Picker.Item label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {formData.physicalStatus !== undefined && (
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
                      <Picker.Item label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Partner Preferences */}
        {(formData.partnerPreferenceAgeMin !== undefined ||
          formData.partnerPreferenceAgeMax !== undefined ||
          formData.partnerPreferenceCity !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partner Preferences</Text>

            {(formData.partnerPreferenceAgeMin !== undefined ||
              formData.partnerPreferenceAgeMax !== undefined) && (
              <View style={styles.formRow}>
                {formData.partnerPreferenceAgeMin !== undefined && (
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Min Age</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.partnerPreferenceAgeMin && styles.inputError,
                      ]}
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
                    {errors.partnerPreferenceAgeMin && (
                      <Text style={styles.errorText}>
                        {errors.partnerPreferenceAgeMin}
                      </Text>
                    )}
                  </View>
                )}

                {formData.partnerPreferenceAgeMax !== undefined && (
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Max Age</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.partnerPreferenceAgeMax && styles.inputError,
                      ]}
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
                    {errors.partnerPreferenceAgeMax && (
                      <Text style={styles.errorText}>
                        {errors.partnerPreferenceAgeMax}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {formData.partnerPreferenceCity !== undefined && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Preferred Cities (comma separated)
                </Text>
                <TextInput
                  style={styles.input}
                  value={
                    Array.isArray(formData.partnerPreferenceCity)
                      ? formData.partnerPreferenceCity.join(", ")
                      : formData.partnerPreferenceCity || ""
                  }
                  onChangeText={(text) => {
                    const cities = text
                      .split(",")
                      .map((city) => city.trim())
                      .filter((city) => city);
                    handleInputChange("partnerPreferenceCity", cities);
                  }}
                  placeholder="e.g., London, Manchester, Birmingham"
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}
          </View>
        )}

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photos</Text>

          <ImageUpload
            title="Manage Photos"
            subtitle="Add, remove, or reorder your profile photos"
            maxImages={5}
            required={false}
          />
        </View>

        {/* Privacy Settings */}
        {formData.hideFromFreeUsers !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Settings</Text>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                handleInputChange(
                  "hideFromFreeUsers",
                  !formData.hideFromFreeUsers
                )
              }
            >
              <View
                style={[
                  styles.checkbox,
                  formData.hideFromFreeUsers && styles.checkboxChecked,
                ]}
              >
                {formData.hideFromFreeUsers && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Hide my profile from free users
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  cancelButton: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  saveButton: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.primary[500],
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  section: {
    marginTop: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  formGroup: {
    marginBottom: Layout.spacing.md,
  },
  formRow: {
    flexDirection: "row",
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
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.sm,
    marginRight: Layout.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  checkmark: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },
});
