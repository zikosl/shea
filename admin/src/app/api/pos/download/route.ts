import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const releaseRoot = process.env.POS_RELEASES_DIR || path.join(process.cwd(), "releases", "pos");

export async function GET() {
  try {
    const manifest = await readFile(/* turbopackIgnore: true */ path.join(releaseRoot, "latest.yml"), "utf8");
    const match = manifest.match(/^path:\s*(.+)$/m);
    const fileName = match?.[1]?.trim();
    if (!fileName || path.basename(fileName) !== fileName || !fileName.toLowerCase().endsWith(".exe"))
      return NextResponse.json({ error: "No valid Windows release is published" }, { status: 404 });

    const installer = await readFile(path.join(/* turbopackIgnore: true */ releaseRoot, fileName));
    return new NextResponse(installer, {
      headers: {
        "content-type": "application/vnd.microsoft.portable-executable",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "No Windows release is published yet" }, { status: 404 });
  }
}
