import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { usePhotoManagement } from "@/hooks/usePhotoManagement";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Test component to verify photo management functionality
 * This component tests the core image management features:
 * - Upload photos
 * - Delete photos
 * - Reorder photos
 * - Set main photo
 */
export default function PhotoManagementTest() {
  const { theme } = useTheme();
  const {
    images,
    uploading,
    deleting,
    addPhoto,
    deletePhoto,
    reorderPhotos,
    setMainPhoto,
    batchDeletePhotos,
    loadImages,
  } = usePhotoManagement();

  const handleTestUpload = async () => {
    try {
      const success = await addPhoto();
      Alert.alert(
        "Test Upload",
        success ? "Upload initiated successfully" : "Upload failed",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Upload Error", "Failed to start upload process");
    }
  };

  const handleTestDelete = () => {
    if (images.length === 0) {
      Alert.alert("No Images", "No images to delete");
      return;
    }

    const firstImage = images[0];
    Alert.alert("Test Delete", `Delete image ${firstImage._id}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePhoto(firstImage._id),
      },
    ]);
  };

  const handleTestReorder = () => {
    if (images.length < 2) {
      Alert.alert("Need More Images", "Need at least 2 images to test reorder");
      return;
    }

    // Reverse the order as a test
    const reversedImages = [...images].reverse();
    reorderPhotos(reversedImages);
    Alert.alert("Test Reorder", "Images reordered (reversed)");
  };

  const handleTestSetMain = () => {
    if (images.length === 0) {
      Alert.alert("No Images", "No images to set as main");
      return;
    }

    const lastImage = images[images.length - 1];
    setMainPhoto(lastImage._id);
    Alert.alert("Test Set Main", `Set ${lastImage._id} as main photo`);
  };

  const handleTestBatchDelete = () => {
    if (images.length < 2) {
      Alert.alert(
        "Need More Images",
        "Need at least 2 images to test batch delete"
      );
      return;
    }

    const firstTwoIds = images.slice(0, 2).map((img) => img._id);
    Alert.alert("Test Batch Delete", `Delete ${firstTwoIds.length} images?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => batchDeletePhotos(firstTwoIds),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Photo Management Test
      </Text>

      <View
        style={[
          styles.statusContainer,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <Text
          style={[styles.statusText, { color: theme.colors.text.secondary }]}
        >
          Images: {images.length} | Uploading: {uploading ? "Yes" : "No"} |
          Deleting: {deleting || "None"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={handleTestUpload}
          disabled={uploading}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Upload
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.error[500] }]}
          onPress={handleTestDelete}
          disabled={!!deleting || images.length === 0}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Delete
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.warning[500] },
          ]}
          onPress={handleTestReorder}
          disabled={images.length < 2}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Reorder
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.success[500] },
          ]}
          onPress={handleTestSetMain}
          disabled={images.length === 0}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Set Main
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.error[600] }]}
          onPress={handleTestBatchDelete}
          disabled={images.length < 2}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Test Batch Delete
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.neutral[500] },
          ]}
          onPress={loadImages}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.background.primary },
            ]}
          >
            Refresh Images
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imagesList}>
        <Text
          style={[styles.imagesTitle, { color: theme.colors.text.primary }]}
        >
          Current Images:
        </Text>
        {images.length === 0 ? (
          <Text
            style={[
              styles.noImagesText,
              { color: theme.colors.text.secondary },
            ]}
          >
            No images loaded
          </Text>
        ) : (
          images.map((image, index) => (
            <Text
              key={image._id}
              style={[
                styles.imageItem,
                {
                  color: theme.colors.text.secondary,
                  backgroundColor: theme.colors.background.secondary,
                },
              ]}
            >
              {index + 1}. {image._id} {image.isMain ? "(Main)" : ""}
            </Text>
          ))
        )}
      </View>
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
  statusContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    textAlign: "center",
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
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  imagesList: {
    flex: 1,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  noImagesText: {
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  imageItem: {
    fontSize: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 4,
  },
});