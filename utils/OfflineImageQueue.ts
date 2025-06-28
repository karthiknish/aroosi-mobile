import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkManager } from './NetworkManager';

export interface QueuedImageUpload {
  id: string;
  uri: string;
  fileName: string;
  userId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface ProcessedPhoto {
  uri: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
  compressed: boolean;
}

export interface PhotoUploadResult {
  success: boolean;
  imageId?: string;
  error?: string;
}

class OfflineImageQueue {
  private readonly QUEUE_KEY = '@aroosi_image_upload_queue';
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;
  private processImageFn?: (uri: string) => Promise<ProcessedPhoto | null>;
  private uploadPhotoFn?: (photo: ProcessedPhoto, userId: string) => Promise<PhotoUploadResult>;

  /**
   * Add an image upload to the offline queue
   */
  async addToQueue(upload: Omit<QueuedImageUpload, 'id' | 'retryCount' | 'maxRetries'>): Promise<void> {
    try {
      const queueItem: QueuedImageUpload = {
        ...upload,
        id: Date.now().toString(),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
      };

      const queue = await this.getQueue();
      queue.push(queueItem);
      await this.saveQueue(queue);

      console.log('Added to offline queue:', queueItem.id);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  /**
   * Process the offline queue when network is available
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !networkManager.isOnline()) {
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      const failedUploads: QueuedImageUpload[] = [];

      for (const upload of queue) {
        try {
          // Attempt to upload the queued image
          const result = await this.retryUpload(upload);
          
          if (!result.success) {
            upload.retryCount++;
            if (upload.retryCount < upload.maxRetries) {
              failedUploads.push(upload);
            } else {
              console.log('Max retries reached for upload:', upload.id);
              // Optionally notify user about failed upload
            }
          } else {
            console.log('Successfully uploaded queued image:', upload.id);
          }
        } catch (error) {
          console.error('Error processing queued upload:', error);
          upload.retryCount++;
          if (upload.retryCount < upload.maxRetries) {
            failedUploads.push(upload);
          }
        }
      }

      // Save only the failed uploads back to the queue
      await this.saveQueue(failedUploads);
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry uploading a queued image
   */
  private async retryUpload(upload: QueuedImageUpload): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if file still exists
      const fileExists = await this.checkFileExists(upload.uri);
      if (!fileExists) {
        return { success: false, error: 'File no longer exists' };
      }

      // Process and upload the image
      const processedPhoto = await photoService.processImage(upload.uri);
      if (!processedPhoto) {
        return { success: false, error: 'Failed to process image' };
      }

      const result = await photoService.uploadPhoto(processedPhoto, upload.userId);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Check if a file exists at the given URI
   */
  private async checkFileExists(uri: string): Promise<boolean> {
    try {
      const response = await fetch(uri);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the current queue from storage
   */
  private async getQueue(): Promise<QueuedImageUpload[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting queue from storage:', error);
      return [];
    }
  }

  /**
   * Save the queue to storage
   */
  private async saveQueue(queue: QueuedImageUpload[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
    }
  }

  /**
   * Get the current queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('Offline queue cleared');
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }

  /**
   * Remove a specific item from the queue
   */
  async removeFromQueue(uploadId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== uploadId);
      await this.saveQueue(filteredQueue);
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  }

  /**
   * Initialize queue processing when network becomes available
   */
  initializeNetworkListener(): void {
    // Listen for network state changes
    networkManager.subscribe((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        // Process queue when network becomes available
        setTimeout(() => this.processQueue(), 1000);
      }
    });
  }
}

export const offlineImageQueue = new OfflineImageQueue();