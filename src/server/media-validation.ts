import sharp from "sharp";

export const PROPERTY_MEDIA_BUCKET = "property-media";
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_PROPERTY = 40;
export const MAX_PHOTO_PIXELS = 20_000_000;

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type PhotoValidation =
  | { ok: true; mimeType: string; width: number; height: number }
  | { ok: false; error: string };

export async function validatePhotoBytes(
  bytes: Uint8Array,
  claimedMimeType?: string,
): Promise<PhotoValidation> {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Chọn một tệp ảnh trước khi tải lên." };
  }
  if (bytes.byteLength > MAX_PHOTO_SIZE_BYTES) {
    return { ok: false, error: "Mỗi ảnh phải có dung lượng tối đa 10 MB." };
  }

  try {
    const image = sharp(bytes, {
      failOn: "error",
      limitInputPixels: MAX_PHOTO_PIXELS,
    });
    const metadata = await image.metadata();
    const mimeType = metadata.format ? MIME_BY_FORMAT[metadata.format] : undefined;
    if (!mimeType || !metadata.width || !metadata.height) {
      return { ok: false, error: "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ." };
    }
    if (claimedMimeType && claimedMimeType !== mimeType) {
      return { ok: false, error: "Định dạng ảnh không khớp với nội dung tệp." };
    }
    if (metadata.pages && metadata.pages > 1) {
      return { ok: false, error: "Ảnh động nhiều khung hình chưa được hỗ trợ." };
    }
    if (metadata.width * metadata.height > MAX_PHOTO_PIXELS) {
      return { ok: false, error: "Kích thước ảnh vượt quá giới hạn cho phép." };
    }

    // Metadata alone can be read from a truncated image. Decode pixels so a
    // file with a forged header cannot produce a broken gallery record.
    await image.stats();

    return {
      ok: true,
      mimeType,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return { ok: false, error: "Tệp không phải là ảnh hợp lệ hoặc không thể đọc được." };
  }
}
