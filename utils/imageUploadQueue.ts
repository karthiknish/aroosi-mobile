import AsyncStorage from "@react-native-async-storage/async-storage";
import EventEmitter from "eventemitter3";
import * as FileSystem from "expo-file-system";
import { getAuthToken } from "../services/authToken";
import { API_BASE_URL } from "./api";

export type UploadStatus = "queued" | "uploading" | "saving" | "done" | "error";

export interface ImageUploadItem {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  localUri: string;
  fileName: string;
  contentType: string;
  width?: number;
  height?: number;
  progress: number; // 0..1
  status: UploadStatus;
  attempts: number;
  error?: string;
  createdAt: number;
}

export interface ImageUploadQueueState {
  items: ImageUploadItem[];
  isOnline: boolean;
}

const STORAGE_KEY = "image_upload_queue_v1";

export class ImageUploadQueue extends EventEmitter {
  private items: Map<string, ImageUploadItem> = new Map();
  private processing = false;
  private online = true;

  async initialize() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ImageUploadItem[] = JSON.parse(raw);
        parsed.forEach((it) => this.items.set(it.id, it));
      }
      this.emit("initialized", this.getState());
    } catch (e) {
      // ignore
    }
  }

  setOnlineStatus(online: boolean) {
    const was = this.online;
    this.online = online;
    this.emit("online", online);
    if (online && !was) this.process();
  }

  getState(): ImageUploadQueueState {
    return { items: Array.from(this.items.values()), isOnline: this.online };
    }

  private async persist() {
    const list = Array.from(this.items.values());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  async enqueue(item: Omit<ImageUploadItem, "id" | "progress" | "status" | "attempts" | "createdAt">) {
    const id = `iu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rec: ImageUploadItem = {
      id,
      progress: 0,
      status: "queued",
      attempts: 0,
      createdAt: Date.now(),
      ...item,
    };
    this.items.set(id, rec);
    await this.persist();
    this.emit("enqueued", rec);
    if (this.online) this.process();
    return id;
  }

  async retry(id: string) {
    const item = this.items.get(id);
    if (!item) return false;
    item.status = "queued";
    item.progress = 0;
    item.error = undefined;
    await this.persist();
    this.emit("retry", item);
    if (this.online) this.process();
    return true;
  }

  async remove(id: string) {
    const ok = this.items.delete(id);
    await this.persist();
    if (ok) this.emit("removed", id);
    return ok;
  }

  private async process() {
    if (this.processing || !this.online) return;
    this.processing = true;
    try {
      // FIFO by createdAt
      const list = Array.from(this.items.values())
        .filter((i) => i.status === "queued" || i.status === "error")
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const job of list) {
        if (!this.online) break;
        await this.processOne(job).catch(() => undefined);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processOne(job: ImageUploadItem) {
    job.attempts += 1;
    job.status = "uploading";
    job.progress = 0;
    this.emit("status", { id: job.id, status: job.status, progress: job.progress });

    // Upload multipart directly to /api/messages/upload-image
    const token = await getAuthToken().catch(() => undefined);

    const uploadUrl = `${API_BASE_URL}/api/messages/upload-image`;
    // Let native set the boundary; don't set Content-Type here
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Build multipart body from localUri via FileSystem UploadTask
    const multipartFields = [
      { name: "conversationId", value: job.conversationId },
      { name: "fromUserId", value: job.fromUserId },
      { name: "toUserId", value: job.toUserId },
      { name: "fileName", value: job.fileName },
      { name: "contentType", value: job.contentType },
      ...(job.width ? [{ name: "width", value: String(job.width) }] : []),
      ...(job.height ? [{ name: "height", value: String(job.height) }] : []),
    ];

    // Use any-typed options for broad SDK compatibility
    const uploadOptions: any = {
      fieldName: "image",
      httpMethod: "POST",
      uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 1,
      headers,
      parameters: Object.fromEntries(multipartFields.map((f) => [f.name, f.value])),
      sessionType: (FileSystem as any).FileSystemSessionType?.BACKGROUND ?? undefined,
    };

    const hasCreateUploadTask = typeof (FileSystem as any).createUploadTask === "function";
    const onProgress = ({ totalBytesSent, totalBytesExpectedToSend }: any) => {
      if (totalBytesExpectedToSend > 0) {
        job.progress = totalBytesSent / totalBytesExpectedToSend;
        this.emit("status", { id: job.id, status: job.status, progress: job.progress });
      }
    };

    try {
      let status = 0;
      let body: string | undefined;
      if (hasCreateUploadTask) {
        const task: any = (FileSystem as any).createUploadTask(
          uploadUrl,
          job.localUri,
          uploadOptions,
          onProgress
        );
        const result: any = await task.uploadAsync();
        status = result?.status ?? 0;
        body = result?.body;
      } else {
        const result: any = await (FileSystem as any).uploadAsync(
          uploadUrl,
          job.localUri,
          uploadOptions
        );
        status = result?.status ?? 0;
        body = result?.body;
      }
      if (status >= 200 && status < 300) {
        job.status = "done";
        job.progress = 1;
        job.error = undefined;
        this.emit("status", { id: job.id, status: job.status, progress: job.progress });
        this.emit("done", { id: job.id, conversationId: job.conversationId, responseBody: body });
        // Remove from queue after success
        await this.remove(job.id);
      } else {
        job.status = "error";
        job.error = `HTTP ${status}`;
        this.emit("status", { id: job.id, status: job.status, progress: job.progress, error: job.error });
        await this.persist();
      }
    } catch (e: any) {
      job.status = "error";
      job.error = e?.message || "Upload failed";
      this.emit("status", { id: job.id, status: job.status, progress: job.progress, error: job.error });
      this.emit("error", { id: job.id, error: job.error });
      await this.persist();
    }
  }
}

export const imageUploadQueue = new ImageUploadQueue();
