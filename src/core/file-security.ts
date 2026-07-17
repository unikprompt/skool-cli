import {
  chmodSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

/**
 * Ensure a directory exists and is accessible only by its owner on POSIX.
 *
 * Windows does not implement POSIX mode bits, so chmod is intentionally
 * skipped there. The operating system's ACLs continue to apply.
 */
export function ensurePrivateDirectory(directoryPath: string): void {
  mkdirSync(directoryPath, {
    recursive: true,
    mode: PRIVATE_DIRECTORY_MODE,
  });

  if (process.platform !== "win32") {
    chmodSync(directoryPath, PRIVATE_DIRECTORY_MODE);
  }
}

/** Restrict an existing sensitive file to its owner on POSIX. */
export function ensurePrivateFile(filePath: string): void {
  if (process.platform !== "win32" && existsSync(filePath)) {
    chmodSync(filePath, PRIVATE_FILE_MODE);
  }
}

/**
 * Write sensitive data so only the current user can read or modify it on
 * POSIX. Existing files are tightened before they are overwritten, which
 * also repairs permissions created by older skool-cli versions.
 */
export function writePrivateFile(filePath: string, contents: string): void {
  ensurePrivateDirectory(dirname(filePath));

  ensurePrivateFile(filePath);

  writeFileSync(filePath, contents, {
    encoding: "utf-8",
    mode: PRIVATE_FILE_MODE,
  });

  ensurePrivateFile(filePath);
}
