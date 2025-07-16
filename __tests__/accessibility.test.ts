import {
  createAccessibleButton,
  createAccessibleLink,
  createAccessibleHeading,
  createAccessibleImage,
  createAccessibleTextInput,
  createAccessibleCheckbox,
  createAccessibleSwitch,
  createAccessibleSlider,
  createAccessibleProgress,
  createAccessibleAlert,
  getFormFieldAccessibility,
  getTabAccessibility,
  getListItemAccessibility,
  getProfileCardAccessibility,
  getMessageAccessibility,
} from "../utils/accessibility";

describe("Accessibility Utils", () => {
  describe("createAccessibleButton", () => {
    it("should create accessible button props", () => {
      const props = createAccessibleButton(
        "Submit Form",
        "Submits the registration form"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("button");
      expect(props.accessibilityLabel).toBe("Submit Form");
      expect(props.accessibilityHint).toBe("Submits the registration form");
      expect(props.accessibilityState?.disabled).toBe(false);
    });

    it("should handle disabled state", () => {
      const props = createAccessibleButton("Disabled Button", undefined, true);

      expect(props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe("createAccessibleLink", () => {
    it("should create accessible link props", () => {
      const props = createAccessibleLink(
        "Privacy Policy",
        "Opens privacy policy page"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("link");
      expect(props.accessibilityLabel).toBe("Privacy Policy");
      expect(props.accessibilityHint).toBe("Opens privacy policy page");
    });
  });

  describe("createAccessibleHeading", () => {
    it("should create accessible heading props", () => {
      const props = createAccessibleHeading("Profile Settings", 2);

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("header");
      expect(props.accessibilityLabel).toBe("Profile Settings");
      expect(props.accessibilityValue?.text).toBe("Heading level 2");
    });

    it("should handle heading without level", () => {
      const props = createAccessibleHeading("Simple Heading");

      expect(props.accessibilityValue).toBeUndefined();
    });
  });

  describe("createAccessibleImage", () => {
    it("should create accessible image props", () => {
      const props = createAccessibleImage("Profile photo of John Doe");

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("image");
      expect(props.accessibilityLabel).toBe("Profile photo of John Doe");
    });

    it("should handle decorative images", () => {
      const props = createAccessibleImage("Decorative border", true);

      expect(props.accessible).toBe(false);
    });
  });

  describe("createAccessibleTextInput", () => {
    it("should create accessible text input props", () => {
      const props = createAccessibleTextInput(
        "Email Address",
        "Enter your email address",
        true
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toBe("Email Address, required");
      expect(props.accessibilityHint).toBe("Enter your email address");
    });

    it("should handle validation errors", () => {
      const props = createAccessibleTextInput(
        "Password",
        "Enter a secure password",
        true,
        "Password must be at least 8 characters"
      );

      expect(props.accessibilityHint).toBe(
        "Enter a secure password Password must be at least 8 characters"
      );
      expect(props.accessibilityState?.invalid).toBe(true);
    });
  });

  describe("createAccessibleCheckbox", () => {
    it("should create accessible checkbox props", () => {
      const props = createAccessibleCheckbox(
        "Agree to terms",
        true,
        "Check to agree to terms and conditions"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("checkbox");
      expect(props.accessibilityLabel).toBe("Agree to terms");
      expect(props.accessibilityHint).toBe(
        "Check to agree to terms and conditions"
      );
      expect(props.accessibilityState?.checked).toBe(true);
    });
  });

  describe("createAccessibleSwitch", () => {
    it("should create accessible switch props", () => {
      const props = createAccessibleSwitch(
        "Enable notifications",
        false,
        "Toggle to enable push notifications"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("switch");
      expect(props.accessibilityLabel).toBe("Enable notifications");
      expect(props.accessibilityHint).toBe(
        "Toggle to enable push notifications"
      );
      expect(props.accessibilityState?.checked).toBe(false);
    });
  });

  describe("createAccessibleSlider", () => {
    it("should create accessible slider props", () => {
      const props = createAccessibleSlider(
        "Age Range",
        25,
        18,
        65,
        "Adjust minimum age preference"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("slider");
      expect(props.accessibilityLabel).toBe("Age Range");
      expect(props.accessibilityHint).toBe("Adjust minimum age preference");
      expect(props.accessibilityValue).toEqual({ min: 18, max: 65, now: 25 });
    });
  });

  describe("createAccessibleProgress", () => {
    it("should create accessible progress props", () => {
      const props = createAccessibleProgress("Profile Completion", 75, 100);

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("progressbar");
      expect(props.accessibilityLabel).toBe("Profile Completion, 75% complete");
      expect(props.accessibilityValue).toEqual({ min: 0, max: 100, now: 75 });
    });
  });

  describe("createAccessibleAlert", () => {
    it("should create accessible alert props", () => {
      const props = createAccessibleAlert(
        "Profile saved successfully",
        "success"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("alert");
      expect(props.accessibilityLabel).toBe(
        "success: Profile saved successfully"
      );
      expect(props.accessibilityLiveRegion).toBe("polite");
    });

    it("should handle different alert types", () => {
      const errorProps = createAccessibleAlert(
        "Invalid email address",
        "error"
      );
      expect(errorProps.accessibilityLabel).toBe(
        "error: Invalid email address"
      );

      const warningProps = createAccessibleAlert(
        "Password strength is weak",
        "warning"
      );
      expect(warningProps.accessibilityLabel).toBe(
        "warning: Password strength is weak"
      );
    });
  });

  describe("getFormFieldAccessibility", () => {
    it("should create form field accessibility props", () => {
      const props = getFormFieldAccessibility(
        "Full Name",
        "John Doe",
        undefined,
        true
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toBe(
        "Full Name, required, current value: John Doe"
      );
      expect(props.accessibilityHint).toBe("Enter full name");
    });

    it("should handle field with error", () => {
      const props = getFormFieldAccessibility(
        "Email",
        "",
        "Email is required",
        true
      );

      expect(props.accessibilityLabel).toBe("Email, required");
      expect(props.accessibilityHint).toBe("Email is required");
      expect(props.accessibilityState?.invalid).toBe(true);
    });
  });

  describe("getTabAccessibility", () => {
    it("should create tab accessibility props", () => {
      const props = getTabAccessibility("Profile", true, 0, 4);

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("tab");
      expect(props.accessibilityLabel).toBe("Profile, tab 1 of 4");
      expect(props.accessibilityState?.selected).toBe(true);
    });

    it("should handle unselected tab", () => {
      const props = getTabAccessibility("Messages", false, 2, 4);

      expect(props.accessibilityLabel).toBe("Messages, tab 3 of 4");
      expect(props.accessibilityState?.selected).toBe(false);
    });
  });

  describe("getListItemAccessibility", () => {
    it("should create list item accessibility props", () => {
      const props = getListItemAccessibility(
        "John Doe",
        0,
        10,
        "Double tap to view profile"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("listitem");
      expect(props.accessibilityLabel).toBe("John Doe, 1 of 10");
      expect(props.accessibilityHint).toBe("Double tap to view profile");
    });
  });

  describe("getProfileCardAccessibility", () => {
    it("should create profile card accessibility props", () => {
      const props = getProfileCardAccessibility(
        "Sarah Johnson",
        28,
        "New York"
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe("button");
      expect(props.accessibilityLabel).toBe(
        "Sarah Johnson, 28 years old, from New York"
      );
      expect(props.accessibilityHint).toBe("Double tap to view profile");
    });

    it("should handle profile without age or location", () => {
      const props = getProfileCardAccessibility("Anonymous User");

      expect(props.accessibilityLabel).toBe("Anonymous User");
    });
  });

  describe("getMessageAccessibility", () => {
    it("should create message accessibility props for own message", () => {
      const props = getMessageAccessibility(
        "John",
        "Hello there!",
        "2 minutes ago",
        true
      );

      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toBe(
        "You said: Hello there!, sent 2 minutes ago"
      );
      expect(props.accessibilityRole).toBe("text");
    });

    it("should create message accessibility props for received message", () => {
      const props = getMessageAccessibility(
        "Sarah",
        "Hi! How are you?",
        "1 minute ago",
        false
      );

      expect(props.accessibilityLabel).toBe(
        "Sarah said: Hi! How are you?, sent 1 minute ago"
      );
    });
  });

  describe("Complex Accessibility Scenarios", () => {
    it("should handle nested interactive elements", () => {
      // Profile card with multiple interactive elements
      const cardProps = getProfileCardAccessibility(
        "Emma Wilson",
        26,
        "Boston"
      );
      const likeButtonProps = createAccessibleButton(
        "Like Profile",
        "Send interest to Emma Wilson"
      );
      const messageButtonProps = createAccessibleButton(
        "Send Message",
        "Start conversation with Emma Wilson"
      );

      expect(cardProps.accessibilityLabel).toContain("Emma Wilson");
      expect(likeButtonProps.accessibilityHint).toContain("Emma Wilson");
      expect(messageButtonProps.accessibilityHint).toContain("Emma Wilson");
    });

    it("should handle dynamic content updates", () => {
      // Notification count that changes
      const initialProps = createAccessibleButton("Messages", "View messages");
      const updatedProps = createAccessibleButton(
        "Messages (3)",
        "View messages, 3 unread"
      );

      expect(initialProps.accessibilityLabel).toBe("Messages");
      expect(updatedProps.accessibilityLabel).toBe("Messages (3)");
      expect(updatedProps.accessibilityHint).toContain("3 unread");
    });

    it("should handle loading states", () => {
      const loadingProps = createAccessibleButton(
        "Loading...",
        "Please wait while content loads",
        true
      );

      expect(loadingProps.accessibilityState?.disabled).toBe(true);
      expect(loadingProps.accessibilityHint).toContain("Please wait");
    });

    it("should handle error states", () => {
      const errorAlert = createAccessibleAlert(
        "Failed to load profile",
        "error"
      );
      const retryButton = createAccessibleButton(
        "Retry",
        "Tap to try loading the profile again"
      );

      expect(errorAlert.accessibilityLabel).toContain("error");
      expect(retryButton.accessibilityHint).toContain("try loading");
    });
  });

  describe("Screen Reader Compatibility", () => {
    it("should provide meaningful labels for complex UI elements", () => {
      // Match percentage indicator
      const matchProps = createAccessibleProgress(
        "Match Compatibility",
        85,
        100
      );
      expect(matchProps.accessibilityLabel).toBe(
        "Match Compatibility, 85% complete"
      );

      // Online status indicator
      const onlineProps = createAccessibleImage(
        "User is currently online",
        false
      );
      expect(onlineProps.accessibilityLabel).toBe("User is currently online");

      // Voice message duration
      const voiceProps = createAccessibleButton(
        "Play voice message",
        "Voice message, 30 seconds duration"
      );
      expect(voiceProps.accessibilityHint).toContain("30 seconds");
    });

    it("should handle cultural and language considerations", () => {
      // Names with special characters
      const profileProps = getProfileCardAccessibility(
        "José María",
        30,
        "México City"
      );
      expect(profileProps.accessibilityLabel).toContain("José María");

      // Different date formats
      const messageProps = getMessageAccessibility(
        "Ahmed",
        "مرحبا",
        "٥ دقائق مضت",
        false
      );
      expect(messageProps.accessibilityLabel).toContain("Ahmed");
    });
  });
});
