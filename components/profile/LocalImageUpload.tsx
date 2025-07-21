import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalProfileSetupPhotos } from "../../hooks/useLocalPhotoManagement";
import { ImageType } from "../../types/image";
import { Colors, Layout } from "../../constants";

interface LocalImageUploadProps {
  title?: string;
  subtitle?: string;
  maxImages?: number;
  required?: boolean;
  onImagesChange?: (images: ImageType[]) => void;
}

const { width } = Dimensions.get("window");
const imageSize = (width - Layout.spacing.lg * 2 - Layout.spacing.md * 2) / 3;

export default function LocalImageUpload({
  title = "Profile Photos",
  subtitle = "Add photos to showcase your personality",
  maxImages = 5,
  required = false,
  onImagesChange,
}: LocalImageUploadProps) {
  const { images, uploading, addPhoto, deletePhoto, hasPhotos } =
    useLocalProfileSetupPhotos();

  // Notify parent component of image changes
  useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  const handleAddPhoto = async () => {
    try {
      await addPhoto();
    } catch (error) {
      console.error("Error adding photo:", error);
    }
  };

  const handleDeletePhoto = async (imageId: string) => {
    try {
      await deletePhoto(imageId);
    } catch (error) {
      console.error("Error deleting photo:", error);
    }
  };

  const renderImageItem = (image: ImageType, index: number) => (
    <View key={image.id} style={styles.imageContainer}>
      <Image source={{ uri: image.url }} style={styles.image} />

      {/* Main badge for first image */}
      {index === 0 && (
        <View style={styles.mainBadge}>
          <Text style={styles.mainBadgeText}>Main</Text>
        </View>
      )}

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePhoto(image.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>

      {/* Image index */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={handleAddPhoto}
      disabled={uploading || images.length >= maxImages}
    >
      {uploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary[500]} />
          <Text style={styles.uploadingText}>Adding...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Photo</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.count}>
          {images.length} of {maxImages} photos
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageList}
      >
        {/* Existing images */}
        {images.map((image, index) => renderImageItem(image, index))}

        {/* Add button if under limit */}
        {images.length < maxImages && renderAddButton()}
      </ScrollView>

      {/* Guidelines */}
      <View style={styles.guidelines}>
        <Text style={styles.guidelinesTitle}>Photo Guidelines:</Text>
        <Text style={styles.guidelinesText}>
          • First photo will be your main profile picture
        </Text>
        <Text style={styles.guidelinesText}>
          • Use clear, recent photos of yourself
        </Text>
        <Text style={styles.guidelinesText}>
          • Maximum file size: 5MB per image
        </Text>
        <Text style={styles.guidelinesText}>
          • Supported formats: JPEG, PNG, WebP
        </Text>
      </View>

      {required && !hasPhotos && (
        <Text style={styles.errorText}>At least one photo is required</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Layout.spacing.md,
  },
  header: {
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  required: {
    color: Colors.error[500],
  },
  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  count: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  imageList: {
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  imageContainer: {
    position: "relative",
    width: imageSize,
    height: imageSize,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
  },
  mainBadge: {
    position: "absolute",
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  mainBadgeText: {
    fontSize: Layout.typography.fontSize.xs,
    color: "white",
    fontWeight: "600",
  },
  deleteButton: {
    position: "absolute",
    top: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error[500],
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 16,
  },
  indexBadge: {
    position: "absolute",
    bottom: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    color: "white",
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: "600",
  },
  addButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.secondary,
  },
  addButtonIcon: {
    fontSize: 32,
    color: Colors.primary[500],
    marginBottom: Layout.spacing.xs,
  },
  addButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: "500",
  },
  uploadingContainer: {
    alignItems: "center",
  },
  uploadingText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.primary[500],
    marginTop: Layout.spacing.xs,
  },
  guidelines: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
  },
  guidelinesTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  guidelinesText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
});
