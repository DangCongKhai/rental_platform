import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_PHOTO_SIZE_BYTES, validatePhotoBytes } from "./media-validation";

describe("validatePhotoBytes", () => {
  it("accepts a decodable image and returns its content type and dimensions", async () => {
    const png = await sharp({ create: { width: 3, height: 2, channels: 3, background: "red" } })
      .png()
      .toBuffer();

    await expect(validatePhotoBytes(png, "image/png")).resolves.toMatchObject({
      ok: true,
      mimeType: "image/png",
      width: 3,
      height: 2,
    });
  });

  it("rejects text disguised as a JPEG", async () => {
    await expect(validatePhotoBytes(Buffer.from("not an image"), "image/jpeg")).resolves.toMatchObject({
      ok: false,
    });
  });

  it("rejects a claimed MIME type that does not match the decoded image", async () => {
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "blue" } })
      .png()
      .toBuffer();

    await expect(validatePhotoBytes(png, "image/jpeg")).resolves.toMatchObject({
      ok: false,
      error: "Định dạng ảnh không khớp với nội dung tệp.",
    });
  });

  it("rejects an image over the configured byte limit before decoding", async () => {
    await expect(validatePhotoBytes(Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 1))).resolves.toMatchObject({
      ok: false,
      error: "Mỗi ảnh phải có dung lượng tối đa 10 MB.",
    });
  });
});
