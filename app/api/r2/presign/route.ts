import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE_BYTES = 65 * 1024 * 1024;
const PRESIGNED_UPLOAD_TTL_SECONDS = 10 * 60;
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
]);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing_server_environment:${name}`);
  return value;
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function signingKey(secret: string, date: string): Buffer {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function timestamp(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function extensionFor(fileName: string, contentType: string): string {
  const fromName = fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  if (fromName && ["mp4", "webm", "mov", "mkv"].includes(fromName)) return fromName;
  return contentType === "video/webm" ? "webm" : contentType === "video/quicktime" ? "mov" : "mp4";
}

function presignPut({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  contentType,
}: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  contentType: string;
}): string {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${awsEncode(bucket)}/${key.split("/").map(awsEncode).join("/")}`;
  const { amzDate, dateStamp } = timestamp(new Date());
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const params = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(PRESIGNED_UPLOAD_TTL_SECONDS),
    "X-Amz-SignedHeaders": "content-type;host",
  };
  const canonicalQuery = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${awsEncode(name)}=${awsEncode(value)}`)
    .join("&");
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(secretAccessKey, dateStamp), stringToSign).toString("hex");

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      fileName?: unknown;
      contentType?: unknown;
      contentLength?: unknown;
    };
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
    const contentLength = typeof body.contentLength === "number" ? body.contentLength : Number.NaN;

    if (!fileName || !ALLOWED_VIDEO_TYPES.has(contentType)) {
      return NextResponse.json({ error: "unsupported_video_type" }, { status: 422 });
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json({ error: "video_too_large", maxBytes: MAX_VIDEO_SIZE_BYTES }, { status: 422 });
    }

    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
    const bucket = requiredEnv("R2_BUCKET");
    const publicBaseUrl = requiredEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
    const extension = extensionFor(fileName, contentType);
    const key = `autozoom/${user.id}/${randomUUID()}.${extension}`;
    const uploadUrl = presignPut({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      key,
      contentType,
    });
    const r2Url = `${publicBaseUrl}/${key.split("/").map(awsEncode).join("/")}`;

    return NextResponse.json({
      uploadUrl,
      r2Url,
      headers: { "Content-Type": contentType },
      expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Failed to presign R2 upload", error);
    return NextResponse.json({ error: "upload_configuration_unavailable" }, { status: 503 });
  }
}
