import { describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { AccessibilityHelper } from "../utils/accessibility";

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  TextInput: "TextInput",
  Image: "Image",
  ScrollView: "ScrollView",
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
}));

describe("Accessibility Tests", () => {
  let accessibilityHelper: AccessibilityHelper;

  beforeEach(() => {
    accessibilityHelper = new AccessibilityHelper();
  });

  describe("Screen Reader Support", () => {
    test("should provide proper accessibility labels for profile elements", () => {
      const profileData = {
        fullName: "John Doe",
        age: 28,
        city: "London",
        occupation: "Software Engineer",
      };

      const accessibilityLabel =
        accessibilityHelper.generateProfileLabel(profileData);

      expect(accessibilityLabel).toBe(
        "Profile of John Doe, 28 years old, from London, works as Software Engineer"
      );
    });

    test("should provide descriptive labels for interest buttons", () => {
      const userProfile = {
        fullName: "Jane Smith",
        city: "Manchester",
      };

      const sendInterestLabel = accessibilityHelper.generateInterestButtonLabel(
        userProfile,
        "send"
      );
      const removeInterestLabel =
        accessibilityHelper.generateInterestButtonLabel(userProfile, "remove");

      expect(sendInterestLabel).toBe(
        "Send interest to Jane Smith from Manchester"
      );
      expect(removeInterestLabel).toBe(
        "Remove interest from Jane Smith from Manchester"
      );
    });

    test("should provide proper labels for message elements", () => {
      const message = {
        text: "Hello, how are you?",
        fromUserId: "user-123",
        fromUserName: "John Doe",
        createdAt: Date.now(),
        type: "text",
      };

      const messageLabel = accessibilityHelper.generateMessageLabel(
        message,
        true
      );

      expect(messageLabel).toContain("Message from John Doe");
      expect(messageLabel).toContain("Hello, how are you?");
      expect(messageLabel).toContain("sent");
    });

    test("should provide proper labels for voice messages", () => {
      const voiceMessage = {
        type: "voice",
        duration: 30000, // 30 seconds
        fromUserName: "Jane Smith",
        createdAt: Date.now(),
      };

      const voiceLabel =
        accessibilityHelper.generateVoiceMessageLabel(voiceMessage);

      expect(voiceLabel).toContain("Voice message from Jane Smith");
      expect(voiceLabel).toContain("30 seconds long");
    });

    test("should announce important state changes", async () => {
      const mockAnnounce = jest.fn();
      accessibilityHelper.setAnnounceFunction(mockAnnounce);

      await accessibilityHelper.announceNewMatch("Jane Doe");
      await accessibilityHelper.announceNewMessage(
        "John Smith",
        "Hello there!"
      );
      await accessibilityHelper.announceInterestSent("Sarah Johnson");

      expect(mockAnnounce).toHaveBeenCalledWith("New match with Jane Doe");
      expect(mockAnnounce).toHaveBeenCalledWith(
        "New message from John Smith: Hello there!"
      );
      expect(mockAnnounce).toHaveBeenCalledWith(
        "Interest sent to Sarah Johnson"
      );
    });
  });

  describe("Navigation Accessibility", () => {
    test("should provide proper tab navigation order", () => {
      const navigationItems = [
        { name: "Home", accessibilityLabel: "Home tab" },
        { name: "Search", accessibilityLabel: "Search profiles tab" },
        { name: "Matches", accessibilityLabel: "Your matches tab" },
        { name: "Messages", accessibilityLabel: "Messages tab" },
        { name: "Profile", accessibilityLabel: "Your profile tab" },
      ];

      const tabOrder = accessibilityHelper.generateTabOrder(navigationItems);

      expect(tabOrder).toHaveLength(5);
      expect(tabOrder[0].accessibilityLabel).toBe("Home tab");
      expect(tabOrder[4].accessibilityLabel).toBe("Your profile tab");
    });

    test("should provide proper heading hierarchy", () => {
      const screenStructure = {
        title: "Profile Details",
        sections: [
          { title: "Basic Information", level: 2 },
          { title: "Contact Details", level: 2 },
          { title: "Preferences", level: 2 },
          { title: "Partner Preferences", level: 3 },
        ],
      };

      const headings =
        accessibilityHelper.generateHeadingStructure(screenStructure);

      expect(headings[0].accessibilityRole).toBe("header");
      expect(headings[0].accessibilityLevel).toBe(1);
      expect(headings[4].accessibilityLevel).toBe(3);
    });

    test("should provide proper focus management", async () => {
      const mockSetFocus = jest.fn();
      accessibilityHelper.setFocusFunction(mockSetFocus);

      await accessibilityHelper.focusOnElement("profile-name-input");
      await accessibilityHelper.focusOnFirstError(["email-error"]);
      await accessibilityHelper.focusOnModalContent("success-modal");

      expect(mockSetFocus).toHaveBeenCalledWith("profile-name-input");
      expect(mockSetFocus).toHaveBeenCalledWith("email-error");
      expect(mockSetFocus).toHaveBeenCalledWith("success-modal");
    });
  });

  describe("Form Accessibility", () => {
    test("should provide proper form field labels and hints", () => {
      const formFields = [
        {
          name: "fullName",
          label: "Full Name",
          required: true,
          hint: "Enter your first and last name",
        },
        {
          name: "email",
          label: "Email Address",
          required: true,
          hint: "We will use this to send you notifications",
        },
        {
          name: "aboutMe",
          label: "About Me",
          required: false,
          hint: "Tell others about yourself (optional)",
        },
      ];

      const accessibilityProps = formFields.map((field) =>
        accessibilityHelper.generateFormFieldProps(field)
      );

      expect(accessibilityProps[0].accessibilityLabel).toBe(
        "Full Name, required"
      );
      expect(accessibilityProps[0].accessibilityHint).toBe(
        "Enter your first and last name"
      );
      expect(accessibilityProps[2].accessibilityLabel).toBe(
        "About Me, optional"
      );
    });

    test("should provide proper error announcements", () => {
      const formErrors = {
        email: "Please enter a valid email address",
        password: "Password must be at least 8 characters",
        dateOfBirth: "You must be at least 18 years old",
      };

      const errorAnnouncement =
        accessibilityHelper.generateErrorAnnouncement(formErrors);

      expect(errorAnnouncement).toContain("Form has 3 errors");
      expect(errorAnnouncement).toContain(
        "Email: Please enter a valid email address"
      );
      expect(errorAnnouncement).toContain(
        "Password: Password must be at least 8 characters"
      );
    });

    test("should provide proper validation feedback", () => {
      const validationStates = [
        { field: "email", isValid: true, message: "Email is valid" },
        { field: "password", isValid: false, message: "Password is too short" },
        { field: "confirmPassword", isValid: true, message: "Passwords match" },
      ];

      const feedbackProps = validationStates.map((state) =>
        accessibilityHelper.generateValidationProps(state)
      );

      expect(feedbackProps[0].accessibilityState.invalid).toBe(false);
      expect(feedbackProps[1].accessibilityState.invalid).toBe(true);
      expect(feedbackProps[1].accessibilityLiveRegion).toBe("polite");
    });
  });

  describe("Image Accessibility", () => {
    test("should provide descriptive alt text for profile images", () => {
      const profileData = {
        fullName: "John Doe",
        profileImages: [
          { id: "img-1", isPrimary: true },
          { id: "img-2", isPrimary: false },
          { id: "img-3", isPrimary: false },
        ],
      };

      const imageLabels = profileData.profileImages.map((img, index) =>
        accessibilityHelper.generateImageLabel(
          profileData.fullName,
          index,
          img.isPrimary
        )
      );

      expect(imageLabels[0]).toBe("Primary profile photo of John Doe");
      expect(imageLabels[1]).toBe("Profile photo 2 of John Doe");
      expect(imageLabels[2]).toBe("Profile photo 3 of John Doe");
    });

    test("should handle missing or loading images", () => {
      const loadingLabel = accessibilityHelper.generateImageLabel(
        "Jane Smith",
        0,
        true,
        "loading"
      );
      const errorLabel = accessibilityHelper.generateImageLabel(
        "Jane Smith",
        0,
        true,
        "error"
      );

      expect(loadingLabel).toBe("Loading primary profile photo of Jane Smith");
      expect(errorLabel).toBe(
        "Failed to load primary profile photo of Jane Smith"
      );
    });

    test("should provide proper image gallery navigation", () => {
      const galleryData = {
        currentIndex: 1,
        totalImages: 5,
        userName: "Sarah Johnson",
      };

      const galleryLabel =
        accessibilityHelper.generateGalleryLabel(galleryData);

      expect(galleryLabel).toBe(
        "Image 2 of 5 in Sarah Johnson's profile gallery"
      );
    });
  });

  describe("Interactive Elements", () => {
    test("should provide proper button states and actions", () => {
      const buttons = [
        { type: "send-interest", isLoading: false, isDisabled: false },
        { type: "send-message", isLoading: true, isDisabled: false },
        { type: "block-user", isLoading: false, isDisabled: true },
      ];

      const buttonProps = buttons.map((button) =>
        accessibilityHelper.generateButtonProps(button)
      );

      expect(buttonProps[0].accessibilityLabel).toBe("Send interest");
      expect(buttonProps[0].accessibilityState.disabled).toBe(false);

      expect(buttonProps[1].accessibilityLabel).toBe("Sending message");
      expect(buttonProps[1].accessibilityState.busy).toBe(true);

      expect(buttonProps[2].accessibilityState.disabled).toBe(true);
    });

    test("should provide proper toggle states", () => {
      const toggles = [
        { name: "notifications", isEnabled: true, label: "Push notifications" },
        { name: "visibility", isEnabled: false, label: "Profile visibility" },
      ];

      const toggleProps = toggles.map((toggle) =>
        accessibilityHelper.generateToggleProps(toggle)
      );

      expect(toggleProps[0].accessibilityLabel).toBe("Push notifications");
      expect(toggleProps[0].accessibilityState.checked).toBe(true);
      expect(toggleProps[0].accessibilityRole).toBe("switch");

      expect(toggleProps[1].accessibilityState.checked).toBe(false);
    });

    test("should provide proper slider accessibility", () => {
      const ageSlider = {
        label: "Age range",
        minValue: 18,
        maxValue: 65,
        currentMin: 25,
        currentMax: 35,
      };

      const sliderProps = accessibilityHelper.generateSliderProps(ageSlider);

      expect(sliderProps.accessibilityLabel).toBe(
        "Age range from 25 to 35 years"
      );
      expect(sliderProps.accessibilityRole).toBe("adjustable");
      expect(sliderProps.accessibilityValue.min).toBe(18);
      expect(sliderProps.accessibilityValue.max).toBe(65);
    });
  });

  describe("List and Collection Accessibility", () => {
    test("should provide proper list item accessibility", () => {
      const profileList = [
        { id: "profile-1", fullName: "John Doe", city: "London" },
        { id: "profile-2", fullName: "Jane Smith", city: "Manchester" },
        { id: "profile-3", fullName: "Bob Johnson", city: "Birmingham" },
      ];

      const listProps = accessibilityHelper.generateListProps(
        profileList,
        "search results"
      );

      expect(listProps.accessibilityLabel).toBe(
        "Search results, 3 profiles found"
      );
      expect(listProps.accessibilityRole).toBe("list");

      const itemProps = profileList.map((profile, index) =>
        accessibilityHelper.generateListItemProps(
          profile,
          index,
          profileList.length
        )
      );

      expect(itemProps[0].accessibilityLabel).toBe(
        "Profile 1 of 3: John Doe from London"
      );
      expect(itemProps[0].accessibilityRole).toBe("button");
    });

    test("should provide proper conversation list accessibility", () => {
      const conversations = [
        {
          id: "conv-1",
          partnerName: "Alice Brown",
          lastMessage: "Hello there!",
          unreadCount: 2,
          lastMessageTime: Date.now() - 3600000, // 1 hour ago
        },
        {
          id: "conv-2",
          partnerName: "Charlie Davis",
          lastMessage: "How are you?",
          unreadCount: 0,
          lastMessageTime: Date.now() - 86400000, // 1 day ago
        },
      ];

      const conversationProps = conversations.map((conv) =>
        accessibilityHelper.generateConversationProps(conv)
      );

      expect(conversationProps[0].accessibilityLabel).toContain(
        "Conversation with Alice Brown"
      );
      expect(conversationProps[0].accessibilityLabel).toContain(
        "2 unread messages"
      );
      expect(conversationProps[0].accessibilityLabel).toContain(
        "Last message: Hello there!"
      );

      expect(conversationProps[1].accessibilityLabel).toContain(
        "No unread messages"
      );
    });
  });

  describe("Modal and Dialog Accessibility", () => {
    test("should provide proper modal accessibility", () => {
      const modalData = {
        title: "Confirm Action",
        message: "Are you sure you want to block this user?",
        type: "confirmation",
      };

      const modalProps = accessibilityHelper.generateModalProps(modalData);

      expect(modalProps.accessibilityRole).toBe("dialog");
      expect(modalProps.accessibilityLabel).toBe("Confirm Action dialog");
      expect(modalProps.accessibilityModal).toBe(true);
    });

    test("should provide proper alert accessibility", () => {
      const alertData = {
        type: "success",
        title: "Profile Updated",
        message: "Your profile has been successfully updated",
      };

      const alertProps = accessibilityHelper.generateAlertProps(alertData);

      expect(alertProps.accessibilityRole).toBe("alert");
      expect(alertProps.accessibilityLiveRegion).toBe("assertive");
      expect(alertProps.accessibilityLabel).toBe(
        "Success: Profile Updated. Your profile has been successfully updated"
      );
    });
  });

  describe("Dynamic Content Accessibility", () => {
    test("should handle loading states properly", () => {
      const loadingStates = [
        { content: "profiles", isLoading: true },
        { content: "messages", isLoading: false },
        { content: "matches", isLoading: true },
      ];

      const loadingProps = loadingStates.map((state) =>
        accessibilityHelper.generateLoadingProps(state)
      );

      expect(loadingProps[0].accessibilityLabel).toBe("Loading profiles");
      expect(loadingProps[0].accessibilityState.busy).toBe(true);

      expect(loadingProps[1].accessibilityState.busy).toBe(false);
    });

    test("should handle empty states properly", () => {
      const emptyStates = [
        { type: "no-matches", message: "No matches found" },
        { type: "no-messages", message: "No messages yet" },
        {
          type: "no-search-results",
          message: "No profiles match your criteria",
        },
      ];

      const emptyProps = emptyStates.map((state) =>
        accessibilityHelper.generateEmptyStateProps(state)
      );

      expect(emptyProps[0].accessibilityLabel).toBe("No matches found");
      expect(emptyProps[0].accessibilityRole).toBe("text");
      expect(emptyProps[2].accessibilityHint).toBe(
        "Try adjusting your search filters"
      );
    });

    test("should handle real-time updates properly", () => {
      const updates = [
        { type: "new-message", from: "John Doe", urgent: true },
        { type: "new-match", with: "Jane Smith", urgent: false },
        { type: "profile-view", by: "Bob Johnson", urgent: false },
      ];

      const updateProps = updates.map((update) =>
        accessibilityHelper.generateUpdateProps(update)
      );

      expect(updateProps[0].accessibilityLiveRegion).toBe("assertive");
      expect(updateProps[0].accessibilityLabel).toBe(
        "New message from John Doe"
      );

      expect(updateProps[1].accessibilityLiveRegion).toBe("polite");
      expect(updateProps[1].accessibilityLabel).toBe(
        "New match with Jane Smith"
      );
    });
  });

  describe("Accessibility Testing Utilities", () => {
    test("should validate accessibility compliance", () => {
      const componentProps = {
        accessibilityLabel: "Send message button",
        accessibilityRole: "button",
        accessibilityHint: "Double tap to send a message",
      };

      const validation =
        accessibilityHelper.validateAccessibility(componentProps);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect accessibility issues", () => {
      const problematicProps = {
        // Missing accessibility label
        accessibilityRole: "button",
        // Missing hint for complex action
      };

      const validation =
        accessibilityHelper.validateAccessibility(problematicProps);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Missing accessibilityLabel");
    });

    test("should provide accessibility improvement suggestions", () => {
      const componentData = {
        type: "image",
        hasLabel: false,
        isDecorative: false,
        isInteractive: true,
      };

      const suggestions = accessibilityHelper.getSuggestions(componentData);

      expect(suggestions).toContain(
        "Add descriptive accessibilityLabel for image"
      );
      expect(suggestions).toContain(
        "Consider adding accessibilityHint for interactive elements"
      );
    });
  });
});
