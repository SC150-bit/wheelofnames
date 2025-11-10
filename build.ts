// @ts-nocheck
import { emptyDir, ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.208.0/path/mod.ts";
import JavaScriptObfuscator from "npm:javascript-obfuscator";

const ROOT = dirname(fromFileUrl(import.meta.url));
const SRC_DIR = join(ROOT, "src");
const DIST_DIR = join(ROOT, "dist");

function obfuscateScript(source: string): string {
  const result = JavaScriptObfuscator.obfuscate(source, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.2,
    deadCodeInjection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    numbersToExpressions: false,
    simplify: true,
    sourceMap: false,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
  });
  return result.getObfuscatedCode();
}

function minifyHTML(html: string): string {
  // Remove comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Minify everything EXCEPT content inside <script> tags
  const scriptPattern = /(<script[\s\S]*?>)([\s\S]*?)(<\/script>)/gi;
  const scripts: string[] = [];

  // Extract scripts and replace with placeholders
  html = html.replace(scriptPattern, (match, open, content, close) => {
    scripts.push(match);
    return `___SCRIPT_${scripts.length - 1}___`;
  });

  // Minify HTML (now without scripts)
  html = html
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Restore scripts
  scripts.forEach((script, index) => {
    html = html.replace(`___SCRIPT_${index}___`, script);
  });

  return html;
}

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/;\}/g, "}")
    .trim();
}

export async function build(): Promise<void> {
  await ensureDir(DIST_DIR);
  await emptyDir(DIST_DIR);

  // Obfuscate script.js
  const scriptSource = await Deno.readTextFile(join(SRC_DIR, "script.js"));
  const obfuscatedScript = obfuscateScript(scriptSource);
  await Deno.writeTextFile(join(DIST_DIR, "script.js"), obfuscatedScript);

  // Minify and process index.html
  let indexHTML = await Deno.readTextFile(join(SRC_DIR, "index.html"));
  indexHTML = minifyHTML(indexHTML);
  await Deno.writeTextFile(join(DIST_DIR, "index.html"), indexHTML);

  // Minify style.css
  let styleCSS = await Deno.readTextFile(join(SRC_DIR, "style.css"));
  styleCSS = minifyCSS(styleCSS);
  await Deno.writeTextFile(join(DIST_DIR, "style.css"), styleCSS);

  // Minify and rename rig-popup.html to config.html
  let rigPopupHTML = await Deno.readTextFile(join(SRC_DIR, "rig-popup.html"));
  rigPopupHTML = minifyHTML(rigPopupHTML);

  // Extract and minify inline CSS
  rigPopupHTML = rigPopupHTML.replace(
    /<style>([\s\S]*?)<\/style>/,
    (match, css) => `<style>${minifyCSS(css)}</style>`
  );

  await Deno.writeTextFile(join(DIST_DIR, "config.html"), rigPopupHTML);

  console.log(`Built 4 assets into dist/ with obfuscation and minification.`);
}

if (import.meta.main) {
  await build();
}
