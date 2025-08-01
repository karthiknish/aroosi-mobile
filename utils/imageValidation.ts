import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

export type ValidationRule =
  | "exists"
  | "allowedFormat"
  | "maxFileSize"
  | "minDimensions";

export interface ImageValidationOptions {
  maxFileSizeBytes?: number; // e.g., 5 * 1024 * 1024
  minWidth?: number;         // e.g., 200
  minHeight?: number;        // e.g., 200
  allowedFormats?: string[]; // e.g., ["jpg","jpeg","png","webp"]
  rules?: ValidationRule[];  // subset of rules to apply (defaults to all)
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    exists?: boolean;
    extension?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    type?: string;
  };
}

/**
 * Default constraints used if options are not supplied.
 */
export const DEFAULT_VALIDATION_OPTIONS: Required<ImageValidationOptions> = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  minWidth: 200,
  minHeight: 200,
  allowedFormats: ["jpg", "jpeg", "png", "webp"],
  rules: ["exists", "allowedFormat", "maxFileSize", "minDimensions"],
};

/**
 * Extract file extension from a URI/path.
 */
function getExtension(uri: string): string | undefined {
  const parts = uri.split(".");
  if (parts.length < 2) return undefined;
  return parts.pop()?.toLowerCase();
}

/**
 * Safely fetch basic file info with expo-file-system
 */
async function safeGetFileInfo(uri: string): Promise<FileSystem.FileInfo | null> {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch {
    return null;
  }
}

/**
 * Best effort to fetch image width/height by a no-op manipulate.
 * Note: expo-image-manipulator returns the new image URI and dimensions.
 */
async function getImageDimensions(uri: string): Promise<{ width?: number; height?: number }> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { width: result.width, height: result.height };
  } catch {
    return {};
  }
}

/**
 * Unified validator that can be used by services/hooks/components.
 * Returns structured result with errors/warnings and basic info.
 */
export async function validateImageUri(
  uri: string,
  opts?: ImageValidationOptions
): Promise<ImageValidationResult> {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...(opts || {}) };
  const result: ImageValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: {},
  };

  const rules = (config.rules && config.rules.length > 0) ? config.rules : DEFAULT_VALIDATION_OPTIONS.rules;

  // exists
  if (rules.includes("exists")) {
    const fileInfo = await safeGetFileInfo(uri);
    const exists = !!fileInfo?.exists;
    result.info.exists = exists;
    if (!exists) {
      result.isValid = false;
      result.errors.push("Image file does not exist");
      // If it doesn't exist, we can short-circuit other checks
      return result;
    }
    // record size when available
    if (typeof fileInfo?.size === "number") {
      result.info.sizeBytes = fileInfo.size;
    }
  }

  // allowedFormat
  if (rules.includes("allowedFormat")) {
    const ext = getExtension(uri);
    result.info.extension = ext;
    if (!ext || !config.allowedFormats.includes(ext)) {
      result.isValid = false;
      result.errors.push(
        `Unsupported image format${ext ? ` (.${ext})` : ""}. Allowed formats: ${config.allowedFormats.join(", ")}`
      );
    }
  }

  // maxFileSize
  if (rules.includes("maxFileSize")) {
    if (typeof result.info.sizeBytes !== "number") {
      // If size isn't known from FileSystem, try to approximate via fetch (may not always be supported)
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        result.info.sizeBytes = blob.size;
      } catch {
        // If we cannot determine size, do not fail; just warn
        result.warnings.push("Unable to determine file size; max file size check skipped");
      }
    }
    if (
      typeof result.info.sizeBytes === "number" &&
      result.info.sizeBytes > config.maxFileSizeBytes
    ) {
      result.isValid = false;
      const mb = (result.info.sizeBytes / (1024 * 1024)).toFixed(1);
      const maxMb = (config.maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      result.errors.push(`Image size (${mb}MB) exceeds maximum allowed size (${maxMb}MB)`);
    }
  }

  // minDimensions
  if (rules.includes("minDimensions")) {
    const { width, height } = await getImageDimensions(uri);
    result.info.width = width;
    result.info.height = height;
    if (
      typeof width === "number" &&
      typeof height === "number" &&
      (width < config.minWidth || height < config.minHeight)
    ) {
      result.isValid = false;
      result.errors.push(
        `Image dimensions too small (${width}x${height}). Minimum required is ${config.minWidth}x${config.minHeight}`
      );
    } else if (width === undefined || height === undefined) {
      result.warnings.push("Unable to determine image dimensions; min dimension check skipped");
    }
  }

  return result;
}

/**
 * Convenience helper for validating a picked image payload
 */
export interface PickedImageLike {
  uri: string;
  type?: string;     // e.g., "image/jpeg"
  size?: number;     // in bytes
  name?: string;
}

/**
 * Validate when you already have basic metadata (type/size).
 */
export async function validatePickedImage(
  image: PickedImageLike,
  opts?: ImageValidationOptions
): Promise<ImageValidationResult> {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...(opts || {}) };

  // Start with URI validation; skip size rule to avoid double work, then merge known metadata
  const base = await validateImageUri(image.uri, {
    ...config,
    rules: (config.rules || DEFAULT_VALIDATION_OPTIONS.rules).filter(r => r !== "maxFileSize"),
  });

  // Merge known metadata-based checks for size/type
  if (typeof image.size === "number") {
    base.info.sizeBytes = image.size;
    if (image.size > config.maxFileSizeBytes) {
      base.isValid = false;
      const mb = (image.size / (1024 * 1024)).toFixed(1);
      const maxMb = (config.maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      base.errors.push(`Image size (${mb}MB) exceeds maximum allowed size (${maxMb}MB)`);
    }
  } else {
    // If size missing, we already attempted to fetch in validateImageUri
  }

  // Type/extension cross-check (best effort)
  if (image.type && typeof image.type === "string") {
    const lower = image.type.toLowerCase();
    // simple mapping check against allowed formats presence
    const matchesAllowed = config.allowedFormats.some(fmt => lower.includes(fmt));
    if (!matchesAllowed) {
      base.isValid = false;
      base.errors.push(
        `Unsupported image type (${image.type}). Allowed formats: ${config.allowedFormats.join(", ")}`
      );
    }
  }

  return base;
}