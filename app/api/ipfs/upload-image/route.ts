import { NextResponse } from "next/server";
import { fileFromBase64, uploadFileToPinata } from "@/lib/pinata";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_PREFIX = "image/";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (!f || !(f instanceof File)) {
        return NextResponse.json({ error: "Field 'file' is required (multipart/form-data)" }, { status: 400 });
      }
      file = f as File;
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const imageBase64 = body?.imageBase64 as string | undefined;
      const mimeType = (body?.mimeType as string | undefined) || "image/png";
      const name = (body?.name as string | undefined) || "image.png";
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return NextResponse.json(
          { error: "Body must include 'imageBase64' (application/json)" },
          { status: 400 }
        );
      }
      file = fileFromBase64({ imageBase64, mimeType, name });
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type. Use multipart/form-data or application/json" },
        { status: 415 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith(ALLOWED_PREFIX)) {
      return NextResponse.json({ error: "Only image MIME types are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (max ${MAX_BYTES} bytes)` }, { status: 413 });
    }

    const { cid, gatewayUrl } = await uploadFileToPinata(file);
    return NextResponse.json({ cid, gatewayUrl }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


