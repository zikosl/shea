import { createHash } from "node:crypto";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { isValidReleaseVersion, normalizeReleaseVersion } from "@/lib/pos-release-version";

const releaseRoot = process.env.POS_RELEASES_DIR || path.join(process.cwd(), "releases", "pos");
const maximumInstallerSize = 500 * 1024 * 1024;

async function requireAdmin() {
  const session = await getServerSession(options);
  return session?.accessToken ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await mkdir(releaseRoot, { recursive: true });
  const files = (await readdir(/* turbopackIgnore: true */ releaseRoot)).filter((name) => name.endsWith(".exe"));
  const releases = await Promise.all(files.map(async (name) => {
    const details = await stat(path.join(/* turbopackIgnore: true */ releaseRoot, name));
    return { name, size: details.size, modifiedAt: details.mtime.toISOString() };
  }));
  return NextResponse.json({ releases: releases.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)) });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const version = normalizeReleaseVersion(String(form.get("version") || ""));
  const file = form.get("installer");
  if (!isValidReleaseVersion(version))
    return NextResponse.json({ error: "Use a semantic version such as 1.2.0 or 1.2.0-beta.1." }, { status: 400 });
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".exe"))
    return NextResponse.json({ error: "Upload the signed Windows NSIS installer (.exe)." }, { status: 400 });
  if (file.size <= 0 || file.size > maximumInstallerSize)
    return NextResponse.json({ error: "Installer must be between 1 byte and 500 MB." }, { status: 400 });

  const safeName = `Shea-POS-${version}-x64.exe`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes[0] !== 0x4d || bytes[1] !== 0x5a)
    return NextResponse.json({ error: "This file is not a valid Windows executable." }, { status: 400 });

  const sha512 = createHash("sha512").update(bytes).digest("base64");
  await mkdir(releaseRoot, { recursive: true });
  const installerPath = path.join(releaseRoot, safeName);
  try {
    await writeFile(installerPath, bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return NextResponse.json({ error: `Version ${version} has already been published.` }, { status: 409 });
    throw error;
  }
  const latest = [
    `version: ${version}`,
    "files:",
    `  - url: ${safeName}`,
    `    sha512: ${sha512}`,
    `    size: ${bytes.length}`,
    `path: ${safeName}`,
    `sha512: ${sha512}`,
    `releaseDate: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  const manifestPath = path.join(releaseRoot, "latest.yml");
  const temporaryManifestPath = `${manifestPath}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporaryManifestPath, latest, "utf8");
    await rename(temporaryManifestPath, manifestPath);
  } catch (error) {
    await Promise.allSettled([unlink(temporaryManifestPath), unlink(installerPath)]);
    throw error;
  }
  return NextResponse.json({ version, name: safeName });
}
