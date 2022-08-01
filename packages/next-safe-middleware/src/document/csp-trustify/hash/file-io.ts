import { mergeDeepWithKey, uniq } from "ramda";
import { CSP_LOCATION_BUILD, CSP_MANIFEST_FILENAME } from "../../../constants";
import type { CspManifest } from "../../../types";

export const writeManifestToFile = (
  filepath: string,
  manifest: CspManifest,
  fs: any,
  read: boolean
) => {
  const manifestFromFile: CspManifest = read
    ? JSON.parse(fs.readFileSync(filepath, "utf8"))
    : {};
  const merger = (k, l, r) => {
    if (Array.isArray(l) && Array.isArray(r)) {
      return uniq([...l, ...r]);
    }
    return r;
  };
  const mergedManifest = mergeDeepWithKey(merger, manifestFromFile, manifest);
  fs.writeFileSync(filepath, JSON.stringify(mergedManifest), "utf-8");
};

export const dotNextFolder = () => `${process.cwd()}/.next`;
export const staticCspFolder = () => `${process.cwd()}/${CSP_LOCATION_BUILD}`;

export const getFs = () => {
  try {
    return require("fs");
  } catch {
    return undefined;
  }
};

export const writeManifestToFileWithLock = (manifest: CspManifest) => {
  const fs = getFs();
  if (!fs) {
    return;
  }
  const dir = staticCspFolder();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    return;
  }

  const filepath = `${dir}/${CSP_MANIFEST_FILENAME}`;
  const lockfilepath = `${filepath}.lock`;
  const { lock, unlock } = require("lockfile");
  lock(lockfilepath, { wait: 10000 }, (err) => {
    if (err) {
      throw err;
    }
    try {
      writeManifestToFile(filepath, manifest, fs, fs.existsSync(filepath));
    } finally {
      unlock(lockfilepath, (err) => {
        if (err) {
          throw err;
        }
      });
    }
  });
};

const dotNextcontentCache: Record<string, string> = {};
export const readURIFromDotNextFolder = (
  URI: string,
  basePath?: string
): string => {
  const filePath = decodeURI(URI).replace(
    `${basePath || ""}/_next`,
    dotNextFolder()
  );
  let content = dotNextcontentCache[filePath];
  if (content) {
    return content;
  }
  const fs = getFs();
  const assert = fs && fs.existsSync(filePath);
  console.assert(assert, "readURIFromDotNextFolder: file does not exist", {
    filePath,
  });

  if (!assert) {
    return "";
  }

  content = fs.readFileSync(filePath, "utf8");
  dotNextcontentCache[filePath] = content;
  return content;
};
