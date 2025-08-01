import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { launchImageLibrary, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import { useImageUpload, validateImage } from '../../hooks/useImageUpload';
import { ProfileImage, IMAGE_VALIDATION } from '../../types/image';
import { Colors, Layout } from '../../constants';
import { useToast } from '../../providers/ToastContext';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface ImageUploadProps {
  title?: string;
  subtitle?: string;
  maxImages?: number;
  required?: boolean;
  onImagesChange?: (images: ProfileImage[]) => void;
}

const { width } = Dimensions.get('window');
const imageSize = (width - Layout.spacing.lg * 2 - Layout.spacing.md * 2) / 3;

export default function ImageUpload({
  title = 'Profile Photos',
  subtitle = 'Add photos to showcase your personality',
  maxImages = IMAGE_VALIDATION.MAX_IMAGES_PER_USER,
  required = false,
  onImagesChange,
}: ImageUploadProps) {
  const {
    images,
    isLoading,
    isUploading,
    uploadProgress,
    uploadImage,
    deleteImage,
    reorderImages,
  } = useImageUpload();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const toast = useToast();

  // Notify parent component of image changes
  React.useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  const handleImagePicker = () => {
    if (images.length >= maxImages) {
      toast.show(`You can only upload up to ${maxImages} images.`, 'info');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as any,
      maxWidth: 1080,
      maxHeight: 1080,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      const asset = response.assets?.[0];
      if (!asset) return;

      const imageResult = {
        uri: asset.uri!,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
      };

      // Validate image
      const validationError = validateImage(imageResult);
      if (validationError) {
        toast.show(validationError, 'error');
        return;
      }

      // Upload image
      uploadImage(imageResult).catch((error) => {
        // Error handling is done in the hook
      });
    });
  };

  const handleDeleteImage = (imageId: string) => {
    setPendingDeleteId(imageId);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteImage(pendingDeleteId);
      toast.show('Image deleted.', 'success');
    } catch (e) {
      // Hook handles error toast/alerts if any
    } finally {
      setConfirmVisible(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmVisible(false);
    setPendingDeleteId(null);
  };

  const renderImageItem = (image: ProfileImage, index: number) => (
    <View key={image._id} style={styles.imageContainer}>
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
        onPress={() => handleDeleteImage(image.storageId)}
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
      onPress={handleImagePicker}
      disabled={isUploading || images.length >= maxImages}
    >
      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary[500]} />
          <Text style={styles.uploadingText}>{uploadProgress}%</Text>
        </View>
      ) : (
        <>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Photo</Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      </View>
    );
  }

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

      {required && images.length === 0 && (
        <Text style={styles.errorText}>
          At least one photo is required
        </Text>
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
    fontWeight: '600',
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  loadingText: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  imageList: {
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  imageContainer: {
    position: 'relative',
    width: imageSize,
    height: imageSize,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
  },
  mainBadge: {
    position: 'absolute',
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  mainBadgeText: {
    fontSize: Layout.typography.fontSize.xs,
    color: 'white',
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: Layout.typography.fontSize.base,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  indexBadge: {
    position: 'absolute',
    bottom: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: 'white',
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: '600',
  },
  addButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  addButtonIcon: {
    fontSize: Layout.typography.fontSize["2xl"],
    color: Colors.primary[500],
    marginBottom: Layout.spacing.xs,
  },
  addButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  uploadingContainer: {
    alignItems: 'center',
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
    fontWeight: '600',
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