// @ts-nocheck
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.208.0/path/mod.ts";
import { build } from "./build.ts";

const ROOT = dirname(fromFileUrl(import.meta.url));
const DIST_DIR = join(ROOT, "dist");
const SRC_DIR = join(ROOT, "src");

const PORT = Number(Deno.env.get("PORT") ?? "8000");

let building = false;
let buildQueued = false;

async function runBuild() {
  if (building) {
    buildQueued = true;
    return;
  }
  building = true;
  try {
    await build();
    console.log(`[build] dist/ ready at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error("[build] failed", error);
  } finally {
    building = false;
    if (buildQueued) {
      buildQueued = false;
      runBuild();
    }
  }
}

async function watchSource() {
  const watcher = Deno.watchFs(SRC_DIR);
  console.log(`[watch] Monitoring ${SRC_DIR}`);
  for await (const event of watcher) {
    if (event.kind === "access") {
      continue;
    }
    console.log(`[watch] Detected ${event.kind}, rebuilding...`);
    runBuild();
  }
}

await runBuild();
watchSource();

console.log(`[serve] Listening on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, (request) =>
  serveDir(request, {
    fsRoot: DIST_DIR,
    quiet: true,
  })
);
