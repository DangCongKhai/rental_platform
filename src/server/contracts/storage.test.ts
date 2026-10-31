import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const { bucket, upload, sign, client } = vi.hoisted(() => ({
  bucket: vi.fn(),
  upload: vi.fn(),
  sign: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: client }));
import { uploadContract, signContractDownload } from "./storage";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-secret");
  bucket
    .mockReset()
    .mockResolvedValue({ data: { public: false }, error: null });
  upload.mockReset().mockResolvedValue({ error: null });
  sign
    .mockReset()
    .mockResolvedValue({
      data: { signedUrl: "https://signed.test" },
      error: null,
    });
  client
    .mockReset()
    .mockReturnValue({
      storage: {
        getBucket: bucket,
        from: vi.fn(() => ({ upload, createSignedUrl: sign })),
      },
    });
});
describe("private PDF storage", () => {
  it("computes digest and unpredictable owner-scoped path from bytes", async () => {
    const bytes = "%PDF-1.4 payload";
    const result = await uploadContract(
      new File([bytes], "../../client-path.pdf", { type: "application/pdf" }),
      "owner-id",
    );
    expect(result.sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(result.path).toMatch(/^owner-id\/[\da-f-]+\.pdf$/);
    expect(upload).toHaveBeenCalledWith(result.path, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: false,
    });
    expect(client).toHaveBeenCalledWith(
      "https://storage.test",
      "server-secret",
      expect.any(Object),
    );
  });
  it("rejects empty, oversized and disguised PDFs before upload", async () => {
    for (const file of [
      new File([], "empty.pdf", { type: "application/pdf" }),
      new File(["not a PDF"], "fake.pdf", { type: "application/pdf" }),
      new File(["%PDF-payload"], "fake.txt", { type: "text/plain" }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ])
      await expect(uploadContract(file, "owner")).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
  it("refuses a public bucket for upload and signing; signs privately for 60 seconds", async () => {
    bucket.mockResolvedValueOnce({ data: { public: true }, error: null });
    await expect(
      uploadContract(
        new File(["%PDF-test"], "test.pdf", { type: "application/pdf" }),
        "owner",
      ),
    ).rejects.toThrow("private contracts bucket");
    bucket.mockResolvedValueOnce({ data: { public: true }, error: null });
    await expect(signContractDownload("private.pdf")).rejects.toThrow(
      "private contracts bucket",
    );
    expect(sign).not.toHaveBeenCalled();
    expect(await signContractDownload("private.pdf")).toBe(
      "https://signed.test",
    );
    expect(sign).toHaveBeenCalledWith("private.pdf", 60);
  });
});
