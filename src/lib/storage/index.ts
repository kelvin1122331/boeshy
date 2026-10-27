import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/lib/errors";
export function storage() {
  if (
    !process.env.S3_BUCKET ||
    !process.env.S3_ACCESS_KEY_ID ||
    !process.env.S3_SECRET_ACCESS_KEY
  )
    throw new AppError(
      503,
      "Requires Configuration: hubungkan penyimpanan S3 privat.",
    );
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}
export async function putFile(key: string, body: Buffer, mime: string) {
  await storage().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: mime,
      ServerSideEncryption: process.env.S3_ENDPOINT ? undefined : "AES256",
    }),
  );
}
export async function getFile(key: string) {
  const r = await storage().send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
  if (!r.Body) throw new AppError(404, "File tidak ditemukan.");
  return Buffer.from(await r.Body.transformToByteArray());
}
export async function signedDownload(
  key: string,
  name?: string,
  expiresIn = 60,
) {
  return getSignedUrl(
    storage(),
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: name
        ? `attachment; filename*=UTF-8''${encodeURIComponent(name)}`
        : undefined,
    }),
    { expiresIn },
  );
}
export async function removeFile(key: string) {
  await storage().send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
}
