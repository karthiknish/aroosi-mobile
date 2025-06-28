import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { usePhotoManagement } from '../../hooks/usePhotoManagement';
import { Colors } from '../../constants';

/**
 * Test component to verify photo management functionality
 * This component tests the core image management features:
 * - Upload photos
 * - Delete photos  
 * - Reorder photos
 * - Set main photo
 */
export default function PhotoManagementTest() {
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
        'Test Upload',
        success ? 'Upload initiated successfully' : 'Upload failed',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to start upload process');
    }
  };

  const handleTestDelete = () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'No images to delete');
      return;
    }
    
    const firstImage = images[0];
    Alert.alert(
      'Test Delete',
      `Delete image ${firstImage._id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePhoto(firstImage._id)
        }
      ]
    );
  };

  const handleTestReorder = () => {
    if (images.length < 2) {
      Alert.alert('Need More Images', 'Need at least 2 images to test reorder');
      return;
    }

    // Reverse the order as a test
    const reversedImages = [...images].reverse();
    reorderPhotos(reversedImages);
    Alert.alert('Test Reorder', 'Images reordered (reversed)');
  };

  const handleTestSetMain = () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'No images to set as main');
      return;
    }

    const lastImage = images[images.length - 1];
    setMainPhoto(lastImage._id);
    Alert.alert('Test Set Main', `Set ${lastImage._id} as main photo`);
  };

  const handleTestBatchDelete = () => {
    if (images.length < 2) {
      Alert.alert('Need More Images', 'Need at least 2 images to test batch delete');
      return;
    }

    const firstTwoIds = images.slice(0, 2).map(img => img._id);
    Alert.alert(
      'Test Batch Delete',
      `Delete ${firstTwoIds.length} images?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => batchDeletePhotos(firstTwoIds)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Management Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Images: {images.length} | Uploading: {uploading ? 'Yes' : 'No'} | Deleting: {deleting || 'None'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.uploadButton]} 
          onPress={handleTestUpload}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>Test Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]} 
          onPress={handleTestDelete}
          disabled={!!deleting || images.length === 0}
        >
          <Text style={styles.buttonText}>Test Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.reorderButton]} 
          onPress={handleTestReorder}
          disabled={images.length < 2}
        >
          <Text style={styles.buttonText}>Test Reorder</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.mainButton]} 
          onPress={handleTestSetMain}
          disabled={images.length === 0}
        >
          <Text style={styles.buttonText}>Test Set Main</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.batchButton]} 
          onPress={handleTestBatchDelete}
          disabled={images.length < 2}
        >
          <Text style={styles.buttonText}>Test Batch Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.refreshButton]} 
          onPress={loadImages}
        >
          <Text style={styles.buttonText}>Refresh Images</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imagesList}>
        <Text style={styles.imagesTitle}>Current Images:</Text>
        {images.length === 0 ? (
          <Text style={styles.noImagesText}>No images loaded</Text>
        ) : (
          images.map((image, index) => (
            <Text key={image._id} style={styles.imageItem}>
              {index + 1}. {image._id} {image.isMain ? '(Main)' : ''}
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
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: Colors.background.secondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: Colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: Colors.primary[500],
  },
  deleteButton: {
    backgroundColor: Colors.error[500],
  },
  reorderButton: {
    backgroundColor: Colors.warning[500],
  },
  mainButton: {
    backgroundColor: Colors.success[500],
  },
  batchButton: {
    backgroundColor: Colors.error[600],
  },
  refreshButton: {
    backgroundColor: Colors.neutral[500],
  },
  buttonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  imagesList: {
    flex: 1,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  noImagesText: {
    color: Colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  imageItem: {
    color: Colors.text.secondary,
    fontSize: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.background.secondary,
    marginBottom: 5,
    borderRadius: 4,
  },
});