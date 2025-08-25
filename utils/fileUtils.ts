import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

/**
 * Converts a URI to a Blob for web uploads
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    return response.blob();
  }

  // For native platforms, read the file and create a blob-like object
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error("File does not exist");
  }

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob
  return new Blob([bytes], { type: "audio/m4a" });
}

/**
 * Gets file size from URI
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    // Ensure fileInfo.size is optional in FileInfo type
    return typeof (fileInfo as { size?: number }).size === "number"
      ? (fileInfo as { size?: number }).size!
      : 0;
  } catch (error) {
    console.error("Failed to get file size:", error);
    return 0;
  }
}

/**
 * Gets file MIME type from extension
 */
export function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "m4a":
      return "audio/m4a";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "aac":
      return "audio/aac";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Validates if file is an audio file
 */
export function isAudioFile(uri: string): boolean {
  const mimeType = getMimeTypeFromUri(uri);
  return mimeType.startsWith("audio/");
}

/**
 * Validates if file is an image file
 */
export function isImageFile(uri: string): boolean {
  const mimeType = getMimeTypeFromUri(uri);
  return mimeType.startsWith("image/");
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generates a unique filename with timestamp
 */
export function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}.${extension}`;
}
