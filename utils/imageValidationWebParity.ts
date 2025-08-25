// Web parity image validation logic adapted for React Native environment.
// Provides MIME allowlist, plan-based size limits, optional signature sniffing.

export type SubscriptionPlan = "free" | "premium" | "premiumPlus" | (string & {});

const DEFAULT_SIZE_LIMITS: Record<string, number> = {
  free: 2 * 1024 * 1024, // 2MB
  premium: 5 * 1024 * 1024, // 5MB
  premiumPlus: 10 * 1024 * 1024, // 10MB
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export interface ValidateImageUploadInput {
  fileSize: number; // bytes
  providedMime: string; // reported/selected mime
  plan?: SubscriptionPlan | null; // subscription tier
  headBytes?: Uint8Array; // optional initial bytes for signature detection
}

export interface ValidateImageUploadResult {
  ok: boolean;
  errorCode?:
    | "EMPTY_FILE"
    | "SIZE_EXCEEDED"
    | "MIME_DISALLOWED"
    | "SIGNATURE_MISMATCH";
  message?: string;
  detectedMime?: string;
  limitBytes: number;
  plan: SubscriptionPlan | "unknown";
  allowedMimes: string[];
  width?: number; // reserved for future dimension extraction
  height?: number; // reserved for future dimension extraction
}

function getPlanMaxImageSize(plan: SubscriptionPlan | undefined | null): number {
  const key = (plan || "free").toString();
  return DEFAULT_SIZE_LIMITS[key] || DEFAULT_SIZE_LIMITS.free;
}

interface SignatureSpec { mime: string; test: (bytes: Uint8Array) => boolean }

const SIGNATURE_SPECS: SignatureSpec[] = [
  {
    mime: "image/jpeg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9,
  },
  {
    mime: "image/png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    test: (b) =>
      b.length > 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x39 || b[4] === 0x37) &&
      b[5] === 0x61,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.length > 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  { mime: "image/heic", test: (b) => hasFtypBox(b, ["heic", "heix", "hevc", "hevx"]) },
  { mime: "image/heif", test: (b) => hasFtypBox(b, ["heif", "mif1"]) },
];

function hasFtypBox(b: Uint8Array, brands: string[]): boolean {
  if (b.length < 32) return false;
  // 'ftyp' starts at offset 4
  if (!(b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)) return false;
  const major = String.fromCharCode(b[8], b[9], b[10], b[11]);
  return brands.includes(major);
}

export async function validateImageUpload(
  input: ValidateImageUploadInput
): Promise<ValidateImageUploadResult> {
  const { fileSize, providedMime, plan, headBytes } = input;
  const normalizedMime = (providedMime || "").toLowerCase();
  const limit = getPlanMaxImageSize(plan || "free");

  if (fileSize === 0) {
    return {
      ok: false,
      errorCode: "EMPTY_FILE",
      message: "Image file is empty",
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }
  if (fileSize > limit) {
    return {
      ok: false,
      errorCode: "SIZE_EXCEEDED",
      message: `Image exceeds maximum size of ${Math.round(limit / 1024 / 1024)}MB for your plan`,
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime)) {
    return {
      ok: false,
      errorCode: "MIME_DISALLOWED",
      message: "Unsupported image type",
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }

  if (headBytes && headBytes.length >= 12) {
    const matched = SIGNATURE_SPECS.find((s) => s.test(headBytes));
    if (matched && matched.mime !== normalizedMime) {
      return {
        ok: false,
        errorCode: "SIGNATURE_MISMATCH",
        message: `File content does not match reported type (reported ${normalizedMime}, detected ${matched.mime})`,
        limitBytes: limit,
        plan: (plan || "unknown") as any,
        allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
        detectedMime: matched.mime,
      };
    }
  }

  return { ok: true, limitBytes: limit, plan: (plan || "unknown") as any, allowedMimes: ALLOWED_IMAGE_MIME_TYPES };
}

export function sanitizeFileName(name: string): string {
  if (!name) return "image";
  let base = name.replace(/\\/g, "/").split("/").pop() || "image";
  base = base.replace(/\0/g, "");
  base = base.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (base.length > 80) base = base.slice(0, 80);
  return base;
}
