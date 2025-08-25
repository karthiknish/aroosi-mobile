import { ValidateImageUploadResult } from "./imageValidationWebParity";

const HIGHEST_PLAN = "premiumPlus";

export function getFriendlyImageValidationMessage(
  result: ValidateImageUploadResult,
  plan?: string | null
): string {
  if (result.ok) return "";
  const currentPlan = (plan || result.plan || "free").toString();
  const limitMB = Math.round(result.limitBytes / 1024 / 1024);

  switch (result.errorCode) {
    case "EMPTY_FILE":
      return "Selected image file is empty. Please choose a different photo.";
    case "SIZE_EXCEEDED": {
      const base = `Image is larger than the ${limitMB}MB limit for your plan.`;
      const upgrade = currentPlan !== HIGHEST_PLAN ? " Upgrade to a higher plan to upload larger images." : "";
      return base + upgrade;
    }
    case "MIME_DISALLOWED": {
      const formats = "JPEG, PNG, WebP, GIF, HEIC/HEIF";
      return `Unsupported image type. Allowed formats: ${formats}.`;
    }
    case "SIGNATURE_MISMATCH": {
      if (result.detectedMime) {
        return `File content doesn't match its reported type (detected ${result.detectedMime}). Please re-export or pick a different image.`;
      }
      return "The file content does not match its reported type. Please re-export the image and try again.";
    }
    default:
      return result.message || "Invalid image";
  }
}

export function extractImageValidationError(
  result: ValidateImageUploadResult,
  plan?: string | null
): string | null {
  if (result.ok) return null;
  return getFriendlyImageValidationMessage(result, plan);
}
