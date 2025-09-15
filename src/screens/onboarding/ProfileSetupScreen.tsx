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
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useApiClient } from "@/utils/api";

// Validated UI components (web-parity)
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@contexts/AuthProvider";
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
} from "@/types/profile";
import {
  STEP_VALIDATION_REQUIREMENTS,
  ONBOARDING_STEPS,
  normalizePreferredGender,
  normalizeMaritalStatus,
} from "@/constants/onboarding";
import { useToast } from "@/providers/ToastContext";
import { COUNTRIES } from "@constants/countries";
import { formatPhoneNumber, cleanPhoneNumber } from "@/utils/profileValidation";
import {
  zodValidateCreateProfile,
  StepValidationSchemas,
  normalizeForSchema,
} from "@/validation/onboardingSchemas";
import { Layout } from "@constants"; // Using theme instead of legacy Colors in this file
import { useTheme } from "@contexts/ThemeContext";
import ImageUpload from "@components/profile/ImageUpload";
import ScreenContainer from "@components/common/ScreenContainer";
import SearchableSelect from "@components/SearchableSelect";
import type { ProfileImage } from "@/types/image";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "../../../constants/languages";
import { VerificationBanner } from "@/components/ui";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import * as Haptics from "expo-haptics";

// Local component for Step 9: Create Account (signup embedded)
function CreateAccountStep({
  missing,
  onBackToStart,
  navigation,
  verification,
  onVerificationStarted,
}: {
  missing: string[];
  onBackToStart: () => void;
  navigation: any;
  verification: {
    awaiting: boolean;
    secondsLeft: number;
    resendLoading: boolean;
    verifying: boolean;
    onResend: () => void;
    onIHaveVerified: () => void;
  };
  onVerificationStarted: (email: string) => void;
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password strength evaluation (simple heuristic)
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const long = pw.length >= 12;
    score += hasLower ? 1 : 0;
    score += hasUpper ? 1 : 0;
    score += hasDigit ? 1 : 0;
    score += hasSymbol ? 1 : 0;
    score += long ? 1 : 0;
    const clamped = Math.max(0, Math.min(5, score));
    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
    const colors = [
      theme.colors.error[500],
      theme.colors.error[400],
      theme.colors.warning[500] || theme.colors.primary[300],
      theme.colors.primary[400],
      theme.colors.primary[500],
      theme.colors.primary[600] || theme.colors.primary[500],
    ];
    return { score: clamped, label: labels[clamped], color: colors[clamped] };
  };
  const strength = getPasswordStrength(password);

  const {
    signUp,
    verifyEmailCode,
    resendEmailVerification,
    startEmailVerificationPolling,
  } = useAuth();
  const toastCtx = useToast();

  const {
    awaiting,
    secondsLeft,
    resendLoading,
    verifying,
    onResend,
    onIHaveVerified,
  } = verification;

  const onCreateAccount = async () => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (!normalizedEmail) errs.emailAddress = "Email is required";
    else if (!emailRegex.test(normalizedEmail))
      errs.emailAddress = "Please enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 12)
      errs.password =
        "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
    else {
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);
      if (!(hasLower && hasUpper && hasDigit && hasSymbol))
        errs.password =
          "Password must include uppercase, lowercase, number, and symbol.";
    }
    if (!confirmPassword) errs.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const labels: Record<string, string> = {
        emailAddress: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
      };
      const summary = `Please fix: ${Object.keys(errs)
        .map((k) => labels[k] || k)
        .join(", ")}.`;
      toastCtx.show(summary, "error");
      return;
    }

    setLoading(true);
    try {
      const fullName = normalizedEmail.split("@")[0];
      const result = await signUp(normalizedEmail, password, fullName);
      if (result.success) {
        if (result.emailVerified) {
          toastCtx.show(
            "Account created! Finalizing your profile...",
            "success"
          );
        } else {
          toastCtx.show(
            "Verification email sent. Please check your inbox.",
            "info"
          );
          onVerificationStarted(normalizedEmail);
          startEmailVerificationPolling?.();
        }
      } else {
        toastCtx.show(result.error || "Sign up failed", "error");
      }
    } catch (e) {
      toastCtx.show("An unexpected error occurred during sign up", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Finish and create your account</Text>

      {/* Social sign-in options */}
      <View style={{ marginBottom: Layout.spacing.lg }}>
        <SocialAuthButtons />
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.dividerLine} />
        </View>
      </View>

      {missing.length > 0 ? (
        <View
          style={{
            backgroundColor: theme.colors.error[50],
            borderColor: theme.colors.error[200],
            borderWidth: 1,
            borderRadius: 8,
            padding: Layout.spacing.md,
            marginBottom: Layout.spacing.lg,
          }}
        >
          <Text
            style={{
              color: theme.colors.error[600],
              fontWeight: "600",
              marginBottom: 4,
            }}
          >
            Cannot create account - Profile incomplete
          </Text>
          <Text style={{ color: theme.colors.error[500], marginBottom: 8 }}>
            You must complete all profile sections before creating an account.
          </Text>
          <Text
            style={{
              color: theme.colors.error[300],
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            Missing: {missing.slice(0, 5).join(", ")}
            {missing.length > 5 ? ` and ${missing.length - 5} more fields` : ""}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBackToStart}>
            <Text style={styles.backButtonText}>
              Go back to complete profile
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.helperText}>
              We'll send a verification link.
            </Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.emailAddress && styles.inputError,
              ]}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.text.secondary}
              value={emailAddress}
              onChangeText={(t) => {
                setEmailAddress(t);
                if (fieldErrors.emailAddress)
                  setFieldErrors((e) => ({ ...e, emailAddress: "" }));
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            {!!fieldErrors.emailAddress && (
              <Text style={styles.errorText}>{fieldErrors.emailAddress}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <Text style={styles.helperText}>
              At least 12 characters, including upper, lower, number, and
              symbol.
            </Text>
            {/* Examples / tips */}
            <Text style={styles.helperText}>
              Tip: Use a memorable phrase with numbers and symbols (e.g.,
              "BlueSky!2024").
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={[
                  styles.input,
                  { paddingRight: Layout.spacing.xl * 2 },
                  fieldErrors.password && styles.inputError,
                ]}
                placeholder="Create a strong password"
                placeholderTextColor={theme.colors.text.secondary}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (fieldErrors.password)
                    setFieldErrors((e) => ({ ...e, password: "" }));
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={{
                  position: "absolute",
                  right: Layout.spacing.md,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
                onPress={() => setShowPassword((s) => !s)}
              >
                <Text style={{ color: theme.colors.text.secondary }}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Strength meter */}
            <View style={{ marginTop: Layout.spacing.xs }}>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
                accessibilityRole="progressbar"
                accessibilityLabel={`Password strength: ${strength.label}`}
              >
                <View
                  style={{
                    width: `${(strength.score / 5) * 100}%`,
                    height: "100%",
                    backgroundColor: strength.color,
                  }}
                />
              </View>
              <Text
                style={{
                  marginTop: Layout.spacing.xs,
                  color: theme.colors.text.secondary,
                  fontSize: Layout.typography.fontSize.sm,
                }}
              >
                {strength.label}
              </Text>
              {/* Live requirement checklist */}
              <View style={{ marginTop: Layout.spacing.xs }}>
                {[
                  { ok: password.length >= 12, label: "12+ characters" },
                  { ok: /[a-z]/.test(password), label: "Lowercase letter" },
                  { ok: /[A-Z]/.test(password), label: "Uppercase letter" },
                  { ok: /\d/.test(password), label: "Number" },
                  { ok: /[^A-Za-z0-9]/.test(password), label: "Symbol" },
                ].map((req) => (
                  <Text
                    key={req.label}
                    style={{
                      color: req.ok
                        ? theme.colors.success?.[600] ||
                          theme.colors.primary[500]
                        : theme.colors.text.tertiary,
                      fontSize: Layout.typography.fontSize.xs,
                    }}
                    accessibilityLabel={`${req.label} ${
                      req.ok ? "met" : "not met"
                    }`}
                  >
                    {req.ok ? "✓" : "•"} {req.label}
                  </Text>
                ))}
              </View>
            </View>
            {!!fieldErrors.password && (
              <Text style={styles.errorText}>{fieldErrors.password}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <Text style={styles.helperText}>Must match your password.</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={[
                  styles.input,
                  { paddingRight: Layout.spacing.xl * 2 },
                  fieldErrors.confirmPassword && styles.inputError,
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.colors.text.secondary}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((e) => ({ ...e, confirmPassword: "" }));
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={{
                  position: "absolute",
                  right: Layout.spacing.md,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
                onPress={() => setShowConfirmPassword((s) => !s)}
              >
                <Text style={{ color: theme.colors.text.secondary }}>
                  {showConfirmPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {!!fieldErrors.confirmPassword && (
              <Text style={styles.errorText}>
                {fieldErrors.confirmPassword}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, loading && { opacity: 0.7 }]}
            onPress={onCreateAccount}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: Layout.spacing.md, alignItems: "center" }}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={{ color: theme.colors.primary[500] }}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ProfileSetupScreenProps {
  navigation: any;
  route?: { params?: { step?: number } };
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
  {
    id: 9,
    title: "Create Account",
    subtitle: "Finish and create your account",
  },
];

export default function ProfileSetupScreen({
  navigation,
  route,
}: ProfileSetupScreenProps) {
  const { theme } = useTheme();
  // Dynamic themed styles
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { user, refreshUser, resendEmailVerification, verifyEmailCode } =
    useAuth();
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
  // Email verification banner state (lifted to screen level)
  const [awaitingEmailVerification, setAwaitingEmailVerification] =
    useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Helpers for display vs stored values (capitalize labels while storing lowercase)
  const toTitleCase = (s: string) =>
    s.replace(/([\wÀ-ÿ][^\s-]*)/g, (w) => w[0]?.toUpperCase() + w.slice(1));
  const mapOptionsToTitle = (opts: string[]) => opts.map((o) => toTitleCase(o));
  const normalizeStored = (label: string) => label.toLowerCase();

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
      refreshUser?.();
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
      refreshUser?.();
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
    // Persist snapshot for continuity across auth
    persistSnapshot({ ...formData, [field]: value }, currentStep).catch(
      () => {}
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      // Enforce 18+ at selection time for clearer UX
      try {
        const age = calculateAge(dateString);
        if (age < 18) {
          toast.show("You must be at least 18 years old.", "error");
          return;
        }
      } catch {}
      handleInputChange("dateOfBirth", dateString);
    }
  };

  // Banner countdown timer
  useEffect(() => {
    if (!awaitingEmailVerification || secondsLeft <= 0) return;
    const timer = setInterval(
      () => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [awaitingEmailVerification, secondsLeft]);

  const handleBannerResend = async () => {
    if (!awaitingEmailVerification || secondsLeft > 0) return;
    setResendLoading(true);
    try {
      const resp = await resendEmailVerification?.();
      if (!resp?.success) {
        toast.show(resp?.error || "Unable to resend email", "error");
        return;
      }
      toast.show("Verification email sent again", "info");
      setSecondsLeft(60);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBannerIHaveVerified = async () => {
    setVerifying(true);
    try {
      const res = await verifyEmailCode?.();
      if (res?.success) {
        toast.show("Email verified! Finalizing your profile...", "success");
      } else {
        toast.show(
          res?.error || "Still not verified. Try again shortly.",
          "error"
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const schema = (StepValidationSchemas as any)[currentStep];
    if (!schema) return true;
    const partialData = normalizeForSchema(formData as any);
    const result = schema.safeParse(partialData);
    if (result.success) {
      setErrors({});
      return true;
    }
    const stepErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !stepErrors[key])
        stepErrors[key] = issue.message;
    }
    setErrors(stepErrors);
    return false;
  };

  // Determine if current step is optional (allow Skip)
  // Skipping steps disabled

  // Live validity for enabling/disabling Next
  const isCurrentStepValid = React.useMemo(() => {
    const schema = (StepValidationSchemas as any)[currentStep];
    if (!schema) return true;
    const partialData = normalizeForSchema(formData as any);
    return schema.safeParse(partialData).success;
  }, [currentStep, formData]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      Haptics.selectionAsync().catch(() => {});
      if (currentStep < STEPS.length) {
        // Soft guidance for Photos step: recommend at least 3 photos
        if (currentStep === 8 && (formData.localImageIds?.length ?? 0) < 3) {
          toast.show(
            "We recommend adding at least 3 photos for better matches. You can add more later.",
            "info"
          );
        }
        setCurrentStep(currentStep + 1);
      } else {
        // At final step we don't submit here; Create Account step controls flow
        // This branch should not be reached as we hide Next button at step 9
      }
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Final validation
    const { errors: validationErrors, parsed } = zodValidateCreateProfile(
      formData as any
    );
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0 || !parsed) {
      toast.show("Please complete all required fields.", "error");
      return;
    }

    // Clean phone number for storage
    const profileData = { ...formData } as CreateProfileData;
    if (profileData.preferredGender) {
      profileData.preferredGender = normalizePreferredGender(
        profileData.preferredGender
      ) as any;
    }
    if (profileData.maritalStatus) {
      profileData.maritalStatus = normalizeMaritalStatus(
        profileData.maritalStatus
      ) as any;
    }
    if (profileData.phoneNumber) {
      profileData.phoneNumber = cleanPhoneNumber(profileData.phoneNumber);
    }

    if (user?.profile) {
      updateProfileMutation.mutate(profileData);
    } else {
      createProfileMutation.mutate(profileData);
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepperScroll}
      >
        {STEPS.map((s) => {
          const status =
            s.id === currentStep
              ? "active"
              : s.id < currentStep
              ? "done"
              : "upcoming";
          return (
            <View key={s.id} style={styles.stepperItem}>
              <View
                style={[
                  styles.stepCircle,
                  status === "active" && styles.stepCircleActive,
                  status === "done" && styles.stepCircleDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepCircleText,
                    (status === "active" || status === "done") && {
                      color: theme.colors.text.inverse,
                    },
                  ]}
                >
                  {s.id}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.stepperLabel,
                  status === "active" && styles.stepperLabelActive,
                ]}
              >
                {s.title}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View
        style={styles.progressBar}
        accessible
        accessibilityLabel={`Progress: Step ${currentStep} of ${STEPS.length}`}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round((currentStep / STEPS.length) * 100)}%` },
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
      case 9: {
        const requiredFields: (keyof CreateProfileData)[] = [
          "fullName",
          "dateOfBirth",
          "gender",
          "city",
          "aboutMe",
          "occupation",
          "education",
          "height",
          "maritalStatus",
          "phoneNumber",
        ];
        const missing = requiredFields.filter((f) => {
          const v = (formData as any)[f];
          return !v || (typeof v === "string" && v.trim() === "");
        });
        return (
          <CreateAccountStep
            missing={missing}
            onBackToStart={() => setCurrentStep(1)}
            navigation={navigation}
            verification={{
              awaiting: awaitingEmailVerification,
              secondsLeft,
              resendLoading,
              verifying,
              onResend: handleBannerResend,
              onIHaveVerified: handleBannerIHaveVerified,
            }}
            onVerificationStarted={(email) => {
              setVerificationEmail(email);
              setAwaitingEmailVerification(true);
              setSecondsLeft(60);
            }}
          />
        );
      }
      default:
        return null;
    }
  };

  const renderBasicInfoStep = () => {
    // Use capitalized labels for display, store normalized lowercase
    const religionOptions = mapOptionsToTitle(RELIGION_OPTIONS as any);
    const motherTongueOptions = mapOptionsToTitle(MOTHER_TONGUE_OPTIONS as any);
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
          <ValidatedInput
            label="Full Name"
            field="fullName"
            required
            value={formData.fullName || ""}
            onValueChange={(text) => handleInputChange("fullName", text)}
            placeholder="Enter your full name"
            maxLength={100}
            error={errors.fullName}
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Religion"
            field="religion"
            options={religionOptions}
            value={formData.religion ? toTitleCase(formData.religion) : ""}
            onValueChange={(v) =>
              handleInputChange("religion", normalizeStored(v))
            }
            placeholder="Select religion"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Mother Tongue"
            field="motherTongue"
            options={motherTongueOptions}
            value={
              formData.motherTongue ? toTitleCase(formData.motherTongue) : ""
            }
            onValueChange={(v) =>
              handleInputChange("motherTongue", normalizeStored(v))
            }
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
            value={
              (GENDER_OPTIONS as any[]).find((o) => o.value === formData.gender)
                ?.label || ""
            }
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
            value={
              (PREFERRED_GENDER_OPTIONS as any[]).find(
                (o) => o.value === formData.preferredGender
              )?.label || ""
            }
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
    const motherTongueOptions = mapOptionsToTitle(MOTHER_TONGUE_OPTIONS as any);
    const ethnicityOptions = mapOptionsToTitle(ETHNICITY_OPTIONS as any);
    const religionOptions = mapOptionsToTitle(RELIGION_OPTIONS as any);

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
              formData.motherTongue ? toTitleCase(formData.motherTongue) : ""
            }
            onValueChange={(label) =>
              handleInputChange("motherTongue", normalizeStored(label))
            }
            placeholder="Select mother tongue"
          />

          <ValidatedSelect
            label="Ethnicity"
            field="ethnicity"
            options={ethnicityOptions}
            value={formData.ethnicity ? toTitleCase(formData.ethnicity) : ""}
            onValueChange={(label) =>
              handleInputChange("ethnicity", normalizeStored(label))
            }
            placeholder="Select ethnicity"
          />
        </View>

        <View style={styles.formGroup}>
          <ValidatedSelect
            label="Religion"
            field="religion"
            options={religionOptions}
            value={formData.religion ? toTitleCase(formData.religion) : ""}
            onValueChange={(label) =>
              handleInputChange("religion", normalizeStored(label))
            }
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
              <Picker.Item key="pf-self" label="Self" value="self" />
              <Picker.Item key="pf-friend" label="Friend" value="friend" />
              <Picker.Item
                key="pf-family"
                label="Family Member"
                value="family"
              />
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
      {/* Recommended photos badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: Layout.spacing.sm,
          gap: Layout.spacing.sm,
        }}
        accessible
        accessibilityLabel="Recommendation: Add at least 3 photos"
      >
        <View
          style={{
            paddingHorizontal: Layout.spacing.sm,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor:
              (formData.localImageIds?.length ?? 0) >= 3
                ? theme.colors.success?.[100] || theme.colors.primary[100]
                : theme.colors.warning?.[100] ||
                  theme.colors.background.secondary,
            borderWidth: 1,
            borderColor:
              (formData.localImageIds?.length ?? 0) >= 3
                ? theme.colors.success?.[300] || theme.colors.primary[300]
                : theme.colors.warning?.[300] || theme.colors.border.primary,
          }}
        >
          <Text
            style={{
              color:
                (formData.localImageIds?.length ?? 0) >= 3
                  ? theme.colors.success?.[700] || theme.colors.primary[600]
                  : theme.colors.warning?.[700] || theme.colors.text.secondary,
              fontSize: Layout.typography.fontSize.sm,
              fontWeight: "600",
            }}
          >
            {(formData.localImageIds?.length ?? 0) >= 3
              ? "Great! 3+ photos added"
              : "Recommended: Add at least 3 photos"}
          </Text>
        </View>
      </View>
      <Text style={styles.helperText}>
        Tip: Long-press a photo to drag and reorder. Your first photo will be
        your main picture.
      </Text>

      <ImageUpload
        mode="local"
        title="Upload Photos"
        subtitle="Your first photo will be your main profile picture"
        maxImages={5}
        required={false}
        onImagesChange={(images: ProfileImage[]) => {
          // Prefer id -> _id -> storageId, then filter to valid strings
          const imageIds = images
            .map(
              (img) =>
                (img.id as string) ||
                ((img as any)._id as string) ||
                ((img as any).storageId as string)
            )
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0
            );
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

  // Persist and restore wizard snapshot to survive auth navigation
  const STORAGE_KEY = "PROFILE_CREATION_MOBILE";

  const persistSnapshot = async (
    data: Partial<CreateProfileData>,
    step: number
  ) => {
    try {
      const snapshot = { step, data };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.data && typeof parsed === "object") {
            setFormData((prev) => ({ ...prev, ...(parsed.data as any) }));
          }
          if (
            Number.isFinite(parsed?.step) &&
            parsed.step >= 1 &&
            parsed.step <= STEPS.length
          ) {
            setCurrentStep(parsed.step);
          }
        }

        // If a step was provided via route params, override snapshot step on first mount
        if (
          route?.params?.step &&
          route.params.step >= 1 &&
          route.params.step <= STEPS.length
        ) {
          setCurrentStep(route.params.step);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persistSnapshot(formData, currentStep).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // After successful auth at final step, auto-submit profile like web
  useEffect(() => {
    if (user && currentStep === 9 && !createProfileMutation.isPending) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentStep]);

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
      showsVerticalScrollIndicator={false}
      useScrollView={false}
      footer={
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint={`Return to step ${currentStep - 1}`}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < STEPS.length && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                currentStep === 1 && styles.nextButtonFull,
                !isCurrentStepValid && { opacity: 0.6 },
              ]}
              onPress={handleNext}
              disabled={createProfileMutation.isPending || !isCurrentStepValid}
              accessibilityRole="button"
              accessibilityLabel="Next"
              accessibilityHint={`Go to step ${currentStep + 1}`}
            >
              {createProfileMutation.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.text.inverse}
                />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          )}
          {currentStep === STEPS.length && <View style={{ flex: 2 }} />}

          {/* Save & Exit button */}
          <TouchableOpacity
            style={styles.saveExitButton}
            accessibilityRole="button"
            accessibilityLabel="Save and exit"
            accessibilityHint="Save your progress and go back"
            onPress={() => {
              persistSnapshot(formData as any, currentStep).finally(() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                ).catch(() => {});
                if (navigation?.goBack) navigation.goBack();
              });
            }}
          >
            <Text style={styles.saveExitText}>Save & Exit</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {currentStep === 8 ? (
        <View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Profile</Text>
            <Text style={styles.headerSubtitle}>
              {currentStepData.subtitle}
            </Text>
          </View>

          {/* Verification Banner */}
          {awaitingEmailVerification && !!verificationEmail && (
            <VerificationBanner
              email={verificationEmail}
              secondsLeft={secondsLeft}
              resendLoading={resendLoading}
              verifying={verifying}
              onResend={handleBannerResend}
              onIHaveVerified={handleBannerIHaveVerified}
              onClose={() => setAwaitingEmailVerification(false)}
            />
          )}

          {/* Stepper */}
          {renderStepper()}

          {/* Content (no outer ScrollView to avoid nesting FlatList) */}
          <View style={styles.content}>{renderStepContent()}</View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contentStyle}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create Profile</Text>
              <Text style={styles.headerSubtitle}>
                {currentStepData.subtitle}
              </Text>
            </View>

            {/* Verification Banner */}
            {awaitingEmailVerification && !!verificationEmail && (
              <VerificationBanner
                email={verificationEmail}
                secondsLeft={secondsLeft}
                resendLoading={resendLoading}
                verifying={verifying}
                onResend={handleBannerResend}
                onIHaveVerified={handleBannerIHaveVerified}
                onClose={() => setAwaitingEmailVerification(false)}
              />
            )}

            {/* Stepper */}
            {renderStepper()}

            {/* Content */}
            <View style={styles.content}>{renderStepContent()}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

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
    </ScreenContainer>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    contentStyle: {
      flexGrow: 1,
      paddingBottom: Layout.spacing.xl * 3,
    },
    header: {
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    headerTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: Layout.typography.fontSize.xl,
      color: theme.colors.text.primary,
      textAlign: "center",
    },
    headerSubtitle: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: Layout.spacing.xs,
    },
    progressContainer: {
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
    },
    stepperContainer: {
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
    },
    stepperScroll: {
      alignItems: "center",
      gap: Layout.spacing.md,
      paddingVertical: Layout.spacing.xs,
    },
    stepperItem: {
      alignItems: "center",
      width: 80,
    },
    stepCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.border.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background.secondary,
    },
    stepCircleActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    stepCircleDone: {
      backgroundColor: theme.colors.primary[400],
      borderColor: theme.colors.primary[400],
    },
    stepCircleText: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      fontWeight: "600",
    },
    stepperLabel: {
      marginTop: 4,
      fontSize: 11,
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
    stepperLabelActive: {
      color: theme.colors.text.primary,
      fontWeight: "600",
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary[500],
      borderRadius: 2,
    },
    progressText: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: Layout.spacing.xs,
    },
    content: {
      paddingHorizontal: Layout.spacing.lg,
    },
    stepContainer: {
      paddingBottom: Layout.spacing.xl,
    },
    stepTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: Layout.typography.fontSize.lg,
      color: theme.colors.text.primary,
      marginBottom: Layout.spacing.xs,
    },
    stepSubtitle: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginBottom: Layout.spacing.lg,
    },
    sectionTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.primary,
      marginBottom: Layout.spacing.md,
    },
    formGroup: {
      marginBottom: Layout.spacing.md,
    },
    label: {
      fontSize: Layout.typography.fontSize.base,
      fontWeight: "500",
      color: theme.colors.text.primary,
      marginBottom: Layout.spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.secondary,
    },
    inputError: {
      borderColor: theme.colors.error[500],
    },
    textArea: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.secondary,
      height: 120,
    },
    dateInput: {
      justifyContent: "center",
    },
    dateText: {
      color: theme.colors.text.primary,
    },
    placeholderText: {
      color: theme.colors.text.tertiary,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: Layout.radius.md,
      backgroundColor: theme.colors.background.secondary,
    },
    picker: {
      height: 50,
      color: theme.colors.text.primary,
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
      color: theme.colors.text.secondary,
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
      color: theme.colors.error[500],
      marginTop: Layout.spacing.xs,
    },
    navigationContainer: {
      flexDirection: "row",
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
      gap: Layout.spacing.md,
    },
    backButton: {
      flex: 1,
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      alignItems: "center",
    },
    backButtonText: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.secondary,
      fontWeight: "500",
    },
    nextButton: {
      flex: 2,
      backgroundColor: theme.colors.primary[500],
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.radius.md,
      alignItems: "center",
    },
    nextButtonFull: {
      flex: 1,
    },
    nextButtonText: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.inverse,
      fontWeight: "600",
    },
    photoGuidelines: {
      marginTop: Layout.spacing.lg,
      padding: Layout.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: Layout.radius.md,
    },
    photoGuidelinesText: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    section: {
      marginBottom: Layout.spacing.lg,
    },
    helperText: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: Layout.spacing.xs,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border.primary,
    },
    dividerText: {
      color: theme.colors.text.secondary,
      fontSize: Layout.typography.fontSize.sm,
    },
    saveExitButton: {
      flex: 1,
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      alignItems: "center",
      backgroundColor: theme.colors.background.secondary,
    },
    saveExitText: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: "600",
    },
  });
}
