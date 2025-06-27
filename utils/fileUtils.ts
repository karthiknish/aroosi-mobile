import * as FileSystem from "expo-file-system";

/**
 * Converts a local file URI to a Blob for uploading (e.g., to the aroosi API).
 * @param uri The local file URI (e.g., from useVoiceRecording)
 * @returns Promise<Blob>
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  // On React Native/Expo, fetch can read file:// URIs
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}
