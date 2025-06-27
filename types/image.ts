// Image type definitions matching web version

export interface ImageType {
  id: string;
  url: string;
  _id?: string;
  name?: string;
  size?: number;
  storageId?: string;
  fileName?: string;
  uploadedAt?: number;
}

export interface ProfileImage {
  _id: string;
  storageId: string;
  url: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
  uploadedAt: number;
  userId: string;
  id?: string;
  order?: number;
  isMain?: boolean;
}

export interface ImageUploadResponse {
  uploadUrl: string;
}

export interface ImageUploadMetadata {
  userId: string;
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface ImageValidationConstants {
  ALLOWED_TYPES: string[];
  MAX_SIZE_BYTES: number;
  MAX_IMAGES_PER_USER: number;
}

export const IMAGE_VALIDATION: ImageValidationConstants = {
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_IMAGES_PER_USER: 5,
};

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
  size: number;
}

export interface ImageUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
