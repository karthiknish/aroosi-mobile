import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@utils/api";
import { validateImageUpload } from "../../utils/imageValidationWebParity";
import { getFriendlyImageValidationMessage } from "../../utils/imageToastMessages";
import { showErrorToast } from "@utils/toast";
import { useSubscription } from "./useSubscription";

export interface PickedMessageImage {
  uri: string;
  type: string; // mime
  size: number; // bytes
  name: string;
  width?: number;
  height?: number;
}

interface UploadResult {
  messageId: string;
  imageUrl: string;
}

export function useMessageImageUpload(conversationId: string) {
  const apiClient = useApiClient();
  const { subscription } = useSubscription();
  const [progress, setProgress] = useState(0);

  const uploadMutation = useMutation<UploadResult, Error, PickedMessageImage>({
    mutationFn: async (image: PickedMessageImage) => {
      if (!conversationId) throw new Error("Missing conversation id");
      setProgress(5);

      // Head bytes for signature
      let headBytes: Uint8Array | undefined;
      try {
        const r = await fetch(image.uri);
        const b = await r.blob();
        const slice = b.slice(0, 64);
        headBytes = new Uint8Array(await slice.arrayBuffer());
      } catch {}

      const plan = (subscription as any)?.plan || (subscription as any)?.tier || "free";
      const validation = await validateImageUpload({
        fileSize: image.size,
        providedMime: image.type,
        plan,
        headBytes,
      });
      if (!validation.ok) {
        throw new Error(
          getFriendlyImageValidationMessage(validation, plan) ||
            validation.message ||
            validation.errorCode ||
            "Invalid image"
        );
      }

      setProgress(15);
      const fileBlob = await(await fetch(image.uri)).blob();

      // Try multipart-first (web-aligned)
      const multi = await apiClient.uploadMessageImageMultipart({
        conversationId,
        fromUserId: "", // server infers from auth; kept for parity
        toUserId: "", // not strictly required for server logic
        file: fileBlob,
        fileName: image.name,
        contentType: image.type,
        width: image.width,
        height: image.height,
      });

      if (multi.success && multi.data) {
        setProgress(100);
        const messageId = (multi.data as any).messageId;
        const imageUrl = (multi.data as any).imageUrl;
        if (messageId && imageUrl) return { messageId, imageUrl };
        // If not provided, attempt to fetch image URL via messageId
        if (messageId) {
          const urlRes = await apiClient.getMessageImageUrl(messageId);
          if (urlRes.success && urlRes.data?.imageUrl) {
            return { messageId, imageUrl: urlRes.data.imageUrl } as any;
          }
        }
      }

      // Fallback to existing two-step flow if multipart not available
      setProgress(25);
      const urlResp = await apiClient.getMessageImageUploadUrl(conversationId);
      if (!urlResp.success || !urlResp.data?.uploadUrl) {
        throw new Error(urlResp.error?.message || "Failed to get upload URL");
      }
      const uploadUrl = (urlResp.data as any).uploadUrl as string;
      setProgress(40);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": image.type },
        body: fileBlob,
      });
      if (!putRes.ok) {
        throw new Error(`Storage upload failed (${putRes.status})`);
      }
      setProgress(75);

      const match = uploadUrl.match(/messages\/images\/([\w-]+)/);
      const storageId = match ? match[1] : undefined;
      if (!storageId) throw new Error("Unable to extract storageId");

      const metaResp = await apiClient.saveMessageImageMetadata({
        conversationId,
        storageId,
        fileName: image.name,
        contentType: image.type,
        fileSize: image.size,
        width: image.width,
        height: image.height,
      });

      if (!metaResp.success || !metaResp.data) {
        throw new Error(metaResp.error?.message || "Failed to save metadata");
      }
      setProgress(100);
      return metaResp.data;
    },
    onError: (e) => {
      showErrorToast(e.message || "Message image upload failed");
      setProgress(0);
    },
    onSuccess: () => {
      setProgress(0);
    },
  });

  return {
    uploadMessageImage: (img: PickedMessageImage) => uploadMutation.mutateAsync(img),
    isUploading: uploadMutation.isPending,
    progress,
    error: uploadMutation.error,
    reset: () => setProgress(0),
  };
}
