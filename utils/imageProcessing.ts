import * as ImageManipulator from "expo-image-manipulator";

export interface ProcessImageOptions {
  maxWidth?: number;          // default 1080
  maxHeight?: number;         // default 1080
  quality?: number;           // 0..1 default 0.8
  format?: "jpeg" | "png" | "webp";
  preserveAspectRatio?: boolean; // default true
}

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  type: string;     // mime type e.g., image/jpeg
  // sizeBytes is not guaranteed by ImageManipulator; compute later during upload if needed
}

/**
 * Default processing options used when not provided.
 */
export const DEFAULT_PROCESS_IMAGE_OPTIONS: Required<ProcessImageOptions> = {
  maxWidth: 1080,
  maxHeight: 1080,
  quality: 0.8,
  format: "jpeg",
  preserveAspectRatio: true,
};

/**
 * Utility to map string format to ImageManipulator enum and MIME type.
 */
function mapFormat(format: ProcessImageOptions["format"]) {
  // Some Expo SDKs may not expose WEBP; safely fallback to JPEG
  const Save = ImageManipulator.SaveFormat as any;
  switch (format) {
    case "png":
      return {
        manipulatorFormat: Save.PNG,
        mime: "image/png",
      };
    case "webp":
      return {
        manipulatorFormat: Save.WEBP ?? Save.JPEG,
        mime: Save.WEBP ? "image/webp" : "image/jpeg",
      };
    case "jpeg":
    default:
      return {
        manipulatorFormat: Save.JPEG,
        mime: "image/jpeg",
      };
  }
}

/**
 * Compute target resize while preserving aspect ratio when requested.
 */
function getTargetSize(
  inputWidth: number,
  inputHeight: number,
  maxWidth: number,
  maxHeight: number,
  preserveAspectRatio: boolean
) {
  if (!preserveAspectRatio) {
    // Hard clamp to provided bounds
    return { width: Math.min(inputWidth, maxWidth), height: Math.min(inputHeight, maxHeight) };
  }

  // If already within bounds, return input
  if (inputWidth <= maxWidth && inputHeight <= maxHeight) {
    return { width: inputWidth, height: inputHeight };
  }

  const aspect = inputWidth / inputHeight;

  // Scale down to fit within the bounding box
  let width = maxWidth;
  let height = Math.round(width / aspect);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspect);
  }

  return { width, height };
}

/**
 * Inspect image dimensions via a no-op manipulation. Returns width/height.
 */
async function probeDimensions(uri: string): Promise<{ width: number; height: number }> {
  const tmp = await ImageManipulator.manipulateAsync(uri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { width: tmp.width, height: tmp.height };
}

/**
 * Unified processImage that both PhotoService and ImageUploadManager can call.
 * Returns a consistent ProcessedImage structure.
 */
export async function processImage(
  uri: string,
  options?: ProcessImageOptions
): Promise<ProcessedImage> {
  const cfg = { ...DEFAULT_PROCESS_IMAGE_OPTIONS, ...(options || {}) };
  const { manipulatorFormat, mime } = mapFormat(cfg.format);

  // Probe current dimensions
  const { width: inW, height: inH } = await probeDimensions(uri);

  // Determine target
  const { width: outW, height: outH } = getTargetSize(
    inW,
    inH,
    cfg.maxWidth,
    cfg.maxHeight,
    cfg.preserveAspectRatio
  );

  // If no resizing or format/quality changes required, still run a no-op to normalize type/quality
  const actions: ImageManipulator.Action[] = [];
  if (outW !== inW || outH !== inH) {
    actions.push({ resize: { width: outW, height: outH } });
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: cfg.quality,
    format: manipulatorFormat,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    type: mime,
  };
}