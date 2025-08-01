import * as ImagePicker from "expo-image-picker";

export interface PickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number; // 0..1
  allowsMultipleSelection?: boolean;
  selectionLimit?: number; // iOS only; Android ignores
}

export interface PickedAsset {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
  type?: string; // mime or inferred
}

export interface PickerResult {
  canceled: boolean;
  assets?: PickedAsset[];
  error?: string;
}

/**
 * Request camera + media library permissions.
 * Returns true if both are granted.
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return camera.status === "granted" && media.status === "granted";
  } catch (e) {
    console.error("imagePicker.requestPermissions error:", e);
    return false;
  }
}

function mapAssets(assets?: ImagePicker.ImagePickerAsset[] | null): PickedAsset[] | undefined {
  if (!assets || assets.length === 0) return undefined;
  return assets.map((a) => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
    fileName: (a as any).fileName,
    fileSize: (a as any).fileSize,
    type: (a as any).mimeType || (a as any).type,
  }));
}

export async function pickFromCamera(options?: PickerOptions): Promise<PickerResult> {
  try {
    const granted = await requestPermissions();
    if (!granted) {
      return { canceled: true, error: "Permissions not granted" };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 1,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, assets: mapAssets(result.assets) };
  } catch (e) {
    console.error("imagePicker.pickFromCamera error:", e);
    return { canceled: true, error: "Failed to capture image" };
  }
}

export async function pickFromLibrary(options?: PickerOptions): Promise<PickerResult> {
  try {
    const granted = await requestPermissions();
    if (!granted) {
      return { canceled: true, error: "Permissions not granted" };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 1,
      allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
      selectionLimit: options?.selectionLimit,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, assets: mapAssets(result.assets) };
  } catch (e) {
    console.error("imagePicker.pickFromLibrary error:", e);
    return { canceled: true, error: "Failed to select image" };
  }
}

export async function pickMultiple(maxCount = 6, options?: PickerOptions): Promise<PickerResult> {
  try {
    const granted = await requestPermissions();
    if (!granted) {
      return { canceled: true, error: "Permissions not granted" };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: options?.quality ?? 1,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, assets: mapAssets(result.assets) };
  } catch (e) {
    console.error("imagePicker.pickMultiple error:", e);
    return { canceled: true, error: "Failed to select images" };
  }
}