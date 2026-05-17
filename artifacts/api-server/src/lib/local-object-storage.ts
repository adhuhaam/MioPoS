import fs from "fs/promises";
import path from "path";

/** Use filesystem uploads when GCS is not configured (typical local dev). */
export function isLocalObjectStorageEnabled(): boolean {
  if (process.env.PRIVATE_OBJECT_DIR?.trim()) return false;
  if (process.env.FORCE_OBJECT_STORAGE === "1") return false;
  return process.env.NODE_ENV === "development" || process.env.LOCAL_OBJECT_STORAGE === "1";
}

export function getLocalUploadRoot(): string {
  const custom = process.env.LOCAL_UPLOAD_DIR?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return path.join(process.cwd(), "data", "local-uploads");
}

export function localObjectPath(uploadId: string): string {
  return `/objects/uploads/${uploadId}`;
}

export function resolveLocalFilePath(objectPath: string): string | null {
  const match = objectPath.match(/^\/objects\/uploads\/([^/]+)$/);
  if (!match) return null;
  return path.join(getLocalUploadRoot(), match[1]);
}

export async function writeLocalUpload(uploadId: string, data: Buffer): Promise<string> {
  const root = getLocalUploadRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, uploadId), data);
  return localObjectPath(uploadId);
}

export async function readLocalObject(
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const filePath = resolveLocalFilePath(objectPath);
  if (!filePath) return null;
  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, contentType: guessContentType(filePath) };
  } catch {
    return null;
  }
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  return "image/jpeg";
}
