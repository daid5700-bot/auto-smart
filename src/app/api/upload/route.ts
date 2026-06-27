import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Allowed file types: extension whitelist + MIME type whitelist
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Magic bytes signatures for server-side MIME verification (prevents extension spoofing)
const MAGIC_BYTES: { signature: number[]; mime: string }[] = [
  { signature: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { signature: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { signature: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" }, // RIFF (WebP)
  { signature: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },  // GIF8
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function detectMimeFromBuffer(buffer: Buffer): string | null {
  for (const { signature, mime } of MAGIC_BYTES) {
    if (signature.every((byte, i) => buffer[i] === byte)) {
      return mime;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không có file được gửi lên" }, { status: 400 });
    }

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File vượt quá giới hạn 5MB (kích thước hiện tại: ${(file.size / 1024 / 1024).toFixed(2)}MB)` }, { status: 400 });
    }

    // 2. Check declared MIME type from client
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF)" }, { status: 400 });
    }

    // 3. Check file extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Định dạng file không được phép" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Verify actual content using magic bytes (prevents extension/MIME spoofing)
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      return NextResponse.json({ error: "Nội dung file không khớp với định dạng ảnh hợp lệ" }, { status: 400 });
    }

    // 5. Generate safe filename (no user input in path)
    const safeExt = ext === ".jpg" ? ".jpg" : ext; // normalize .jpeg -> keep original
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public/uploads/vehicles");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      url: `/uploads/vehicles/${filename}` 
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Lỗi khi tải file lên máy chủ" }, { status: 500 });
  }
}
