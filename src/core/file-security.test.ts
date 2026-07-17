import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  writePrivateFile,
} from "./file-security.js";

const createdPaths: string[] = [];

afterEach(() => {
  for (const path of createdPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("credential file security", () => {
  it("creates a private data directory", () => {
    const root = mkdtempSync(join(tmpdir(), "skool-cli-security-"));
    createdPaths.push(root);
    const dataDirectory = join(root, ".skool-cli");

    ensurePrivateDirectory(dataDirectory);

    if (process.platform !== "win32") {
      expect(statSync(dataDirectory).mode & 0o777).toBe(0o700);
    }
  });

  it("writes a private credential file", () => {
    const root = mkdtempSync(join(tmpdir(), "skool-cli-security-"));
    createdPaths.push(root);
    const credentialPath = join(root, ".skool-cli", "auth-state.json");

    writePrivateFile(credentialPath, '{"cookies":[]}');

    expect(readFileSync(credentialPath, "utf-8")).toBe('{"cookies":[]}');
    if (process.platform !== "win32") {
      expect(statSync(credentialPath).mode & 0o777).toBe(0o600);
    }
  });

  it("repairs permissive permissions from an older installation", () => {
    const root = mkdtempSync(join(tmpdir(), "skool-cli-security-"));
    createdPaths.push(root);
    const dataDirectory = join(root, ".skool-cli");
    const credentialPath = join(dataDirectory, "auth-state.json");

    mkdirSync(dataDirectory, { mode: 0o777 });
    writeFileSync(credentialPath, "old", { mode: 0o666 });
    if (process.platform !== "win32") {
      chmodSync(dataDirectory, 0o777);
      chmodSync(credentialPath, 0o666);
    }

    writePrivateFile(credentialPath, "new");

    expect(readFileSync(credentialPath, "utf-8")).toBe("new");
    if (process.platform !== "win32") {
      expect(statSync(dataDirectory).mode & 0o777).toBe(0o700);
      expect(statSync(credentialPath).mode & 0o777).toBe(0o600);
    }
  });

  it("repairs an existing credential file before it is read", () => {
    const root = mkdtempSync(join(tmpdir(), "skool-cli-security-"));
    createdPaths.push(root);
    const credentialPath = join(root, "auth-state.json");

    writeFileSync(credentialPath, "sensitive", { mode: 0o666 });
    if (process.platform !== "win32") {
      chmodSync(credentialPath, 0o666);
    }

    ensurePrivateFile(credentialPath);

    if (process.platform !== "win32") {
      expect(statSync(credentialPath).mode & 0o777).toBe(0o600);
    }
  });
});
