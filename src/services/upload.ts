// Image and gif uploads used by the Settings profile photo and the White Label
// logo, favicon and carousel pickers. Returns a public URL.
import api from "./api/api";
import { LOCAL_UPLOAD_MAX_BYTES } from "@/lib/plan";
import type {
  LocalUploadResult,
  uploadGifResponse,
  uploadLocalImageResponse,
} from "@/types/shared";

/** Human-readable form of the multipart (image/audio/gif) ceiling. */
export const LOCAL_UPLOAD_MAX_LABEL = `${Math.round(
  LOCAL_UPLOAD_MAX_BYTES / (1024 * 1024),
)} MB`;

export class LocalUploadTooLargeError extends Error {
  constructor() {
    super(
      `Files uploaded from your device must be ${LOCAL_UPLOAD_MAX_LABEL} or smaller. Import larger files from a public URL instead.`,
    );
    this.name = "LocalUploadTooLargeError";
  }
}

/** Throws before any network call when the picked file breaks the cap. */
export function assertWithinLocalUploadLimit(file: File) {
  if (file.size > LOCAL_UPLOAD_MAX_BYTES) {
    throw new LocalUploadTooLargeError();
  }
}

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

async function postFile<T>(
  endpoint: string,
  fieldName: string,
  file: File,
): Promise<T> {
  assertWithinLocalUploadLimit(file);

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await api.post<T>(endpoint, formData, MULTIPART);
  return response.data;
}

const UploadService = {
  /** Static images (png/jpg/webp…). Use `uploadGif` for animated gifs. */
  uploadImage: async (file: File): Promise<LocalUploadResult> => {
    const data = await postFile<uploadLocalImageResponse>(
      "/upload-loacal-image", // sic — this is the real backend route
      "image",
      file,
    );
    return { status: data.status, url: data.url, message: data.message };
  },

  uploadGif: async (file: File): Promise<LocalUploadResult> => {
    const data = await postFile<uploadGifResponse>(
      "/upload-gif",
      "gif_file",
      file,
    );
    return { status: data.status, url: data.filePath, message: data.message };
  },
};

export default UploadService;
