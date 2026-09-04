import { createHash } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { options } from "@/app/api/auth/[...nextauth]/options";

const releaseRoot = process.env.POS_RELEASES_DIR || path.join(process.cwd(), "releases", "pos");
const versionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

async function requireAdmin() {
  const session = await getServerSession(options);
  return session?.accessToken ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await mkdir(releaseRoot, { recursive: true });
  const files = (await readdir(releaseRoot)).filter((name) => name.endsWith(".exe"));
  const releases = await Promise.all(files.map(async (name) => {
    const details = await stat(path.join(releaseRoot, name));
    return { name, size: details.size, modifiedAt: details.mtime.toISOString() };
  }));
  return NextResponse.json({ releases: releases.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)) });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const version = String(form.get("version") || "").trim();
  const file = form.get("installer");
  if (!versionPattern.test(version)) return NextResponse.json({ error: "Use a valid semantic version such as 0.2.0." }, { status: 400 });
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".exe"))
    return NextResponse.json({ error: "Upload the signed Windows NSIS installer (.exe)." }, { status: 400 });
  if (file.size <= 0 || file.size > 500 * 1024 * 1024)
    return NextResponse.json({ error: "Installer must be between 1 byte and 500 MB." }, { status: 400 });

  const safeName = `Shea-POS-${version}-x64.exe`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha512 = createHash("sha512").update(bytes).digest("base64");
  await mkdir(releaseRoot, { recursive: true });
  await writeFile(path.join(releaseRoot, safeName), bytes, { flag: "wx" });
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
  await writeFile(path.join(releaseRoot, "latest.yml"), latest, "utf8");
  return NextResponse.json({ version, name: safeName });
}
