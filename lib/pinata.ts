const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function toGatewayUrl(cid: string, configuredGateway?: string | null) {
  if (configuredGateway && configuredGateway.trim().length > 0) {
    const host = configuredGateway.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}/ipfs/${cid}`;
  }
  return `ipfs://${cid}`;
}

export async function uploadFileToPinata(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("network", "public");

  const resp = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("PINATA_JWT")}`,
    },
    body: form,
  });

  const data: Record<string, unknown> = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      "Pinata upload failed";
    throw new Error(message);
  }

  let payload: Record<string, unknown> | undefined;
  if (data && typeof data === "object") {
    const nested = data.data;
    if (nested && typeof nested === "object") {
      payload = nested as Record<string, unknown>;
    } else {
      payload = data as Record<string, unknown>;
    }
  }
  const cid =
    (payload?.cid as string | undefined) ??
    ((payload?.data as { cid?: string } | undefined)?.cid);
  if (!cid) {
    throw new Error("Pinata response missing cid");
  }

  const gatewayUrl = toGatewayUrl(cid, process.env.PINATA_GATEWAY || null);
  return { cid, gatewayUrl };
}

export function fileFromBase64(params: {
  imageBase64: string;
  mimeType?: string;
  name?: string;
}) {
  const { imageBase64, mimeType = "image/png", name = "image.png" } = params;
  const clean = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(clean, "base64");
  return new File([bytes], name, { type: mimeType });
}

