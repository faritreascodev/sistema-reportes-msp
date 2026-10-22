import fs from "node:fs/promises";
import path from "node:path";

export const STORAGE_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_DIR ?? "./storage");

/** Ruta absoluta dentro de STORAGE_DIR; rechaza rutas que escapen del directorio. */
export function storagePath(relative: string): string {
  const full = path.resolve(/*turbopackIgnore: true*/ STORAGE_DIR, relative);
  if (!full.startsWith(STORAGE_DIR + path.sep)) throw new Error("Ruta fuera del almacenamiento");
  return full;
}

export async function writeStorage(relative: string, data: Buffer): Promise<string> {
  const full = storagePath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return relative.replace(/\\/g, "/");
}

export function readStorage(relative: string): Promise<Buffer> {
  return fs.readFile(storagePath(relative));
}

export async function deleteStorage(relative: string): Promise<boolean> {
  try {
    const full = storagePath(relative);
    await fs.unlink(full);
    return true;
  } catch {
    return false;
  }
}

export async function deleteStorageDir(relative: string): Promise<boolean> {
  try {
    const full = storagePath(relative);
    await fs.rm(full, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export const ROOT_DIR = process.cwd();

