#!/usr/bin/env ts-node
/**
 * Mermaid Auto-Contrast Fixer (TypeScript)
 * - Fixes `classDef ... fill:#xxxxxx` and `style ... fill:#xxxxxx` inside fenced ```mermaid blocks
 * - Adds or replaces `color:#ffffff` / `color:#000000` according to brightness threshold
 *
 * Usage:
 *   npx ts-node scripts/mermaid-contrast-fix.ts /path/to/docs/diagrams [--dry-run] [--verbose] [--threshold=128]
 *
 * Example:
 *   npx ts-node scripts/mermaid-contrast-fix.ts /Users/geoandr/dev/mastro/docs/diagrams --verbose
 */

import fs from "fs";
import path from "path";

type Options = {
  targetDir: string;
  dryRun: boolean;
  verbose: boolean;
  threshold: number;
};

function parseArgs(): Options {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("Usage: mermaid-contrast-fix <path> [--dry-run] [--verbose] [--threshold=128]");
    process.exit(1);
  }
  const opts: Options = {
    targetDir: "",
    dryRun: false,
    verbose: false,
    threshold: 128,
  };

  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") opts.dryRun = true;
    else if (arg === "--verbose" || arg === "-v") opts.verbose = true;
    else if (arg.startsWith("--threshold=")) {
      const v = Number(arg.split("=")[1]);
      if (!Number.isNaN(v)) opts.threshold = v;
    } else if (!opts.targetDir) {
      opts.targetDir = path.resolve(arg);
    } else {
      console.warn(`Ignoring extra argument: ${arg}`);
    }
  }

  if (!opts.targetDir) {
    console.error("❌ Please provide a path to the directory containing Markdown files.");
    process.exit(1);
  }

  return opts;
}

function getBrightness(hex: string): number {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getContrastColor(hex: string, threshold = 128): string {
  return getBrightness(hex) < threshold ? "#ffffff" : "#000000";
}

/**
 * Given a line that contains `fill:#xxxxxx`, returns the updated line
 * with color:#xxxxxx appended or replaced as needed.
 */
function updateLineForFill(line: string, threshold: number): { changed: boolean; newLine: string } {
  const fillRegex = /fill\s*:\s*(#[0-9A-Fa-f]{6})/i;
  const colorRegex = /color\s*:\s*(#[0-9A-Fa-f]{6})/i;

  const fillMatch = line.match(fillRegex);
  if (!fillMatch) return { changed: false, newLine: line };

  const fillHex = fillMatch[1];
  const desiredColor = getContrastColor(fillHex, threshold);

  if (colorRegex.test(line)) {
    const currentColor = (line.match(colorRegex) || [])[1] || "";
    if ((currentColor || "").toLowerCase() === desiredColor.toLowerCase()) {
      return { changed: false, newLine: line }; // already correct
    }
    // Replace existing color:
    const newLine = line.replace(colorRegex, `color:${desiredColor}`);
    return { changed: true, newLine };
  }

  // No existing color -> append it in a compatible way
  const trimmed = line.replace(/\s*$/, "");
  let newLine: string;
  if (trimmed.endsWith(";")) {
    // place before final semicolon
    newLine = trimmed.slice(0, -1) + `,color:${desiredColor};`;
  } else if (trimmed.includes(",")) {
    // existing commas -> append with comma
    newLine = trimmed + `,color:${desiredColor}`;
  } else {
    // space-separated or single-attr -> append with space
    newLine = trimmed + ` color:${desiredColor}`;
  }

  // keep the same trailing whitespace as original
  const trailingWhitespaceMatch = line.match(/(\s*)$/);
  const trailing = trailingWhitespaceMatch ? trailingWhitespaceMatch[1] : "";
  return { changed: true, newLine: newLine + trailing };
}

/**
 * Processes a single mermaid block text and returns [updated, changedLines]
 */
function processMermaidBlock(block: string, threshold: number): { updatedBlock: string; changes: { lineIndex: number; oldLine: string; newLine: string }[] } {
  const lines = block.split("\n");
  const changes: { lineIndex: number; oldLine: string; newLine: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // We handle `classDef` and `style` lines that include a fill:#
    // Use case-insensitive checks and allow flexible spacing/punctuation
    const isClassDefWithFill = /(^\s*classDef\b).*fill\s*:/i.test(line);
    const isStyleWithFill = /(^\s*style\b).*fill\s*:/i.test(line);

    if (isClassDefWithFill || isStyleWithFill) {
      const { changed, newLine } = updateLineForFill(line, threshold);
      if (changed) {
        changes.push({ lineIndex: i, oldLine: line, newLine });
        lines[i] = newLine;
      }
    }
  }

  return { updatedBlock: lines.join("\n"), changes };
}

function processMarkdownFile(filePath: string, opts: Options): void {
  const raw = fs.readFileSync(filePath, "utf8");

  // Match fenced mermaid blocks. Allow optional spaces between backticks and 'mermaid'.
  // The block content captured in group 1.
  const mermaidBlockRegex = /```(?:\s*mermaid\b)([\s\S]*?)```/gi;

  let modified = false;
  const fileChanges: { blockIndex: number; changedLines: { lineIndex: number; oldLine: string; newLine: string }[] }[] = [];
  let blockCounter = 0;

  const newContent = raw.replace(mermaidBlockRegex, (fullMatch, innerBlock) => {
    const result = processMermaidBlock(innerBlock, opts.threshold);
    if (result.changes.length > 0) {
      modified = true;
      fileChanges.push({ blockIndex: blockCounter, changedLines: result.changes });
      blockCounter++;
      // re-insert with normalized code fence header (keep '```mermaid' without extra trailing spaces)
      return "```mermaid\n" + result.updatedBlock + "\n```";
    }
    blockCounter++;
    return fullMatch;
  });

  if (modified) {
    if (!opts.dryRun) {
      fs.writeFileSync(filePath, newContent, "utf8");
    }

    console.log(`✅ ${opts.dryRun ? "Would update" : "Updated"}: ${filePath}`);
    if (opts.verbose) {
      for (const c of fileChanges) {
        console.log(`  └─ Mermaid block #${c.blockIndex}:`);
        for (const lineChange of c.changedLines) {
          const li = lineChange.lineIndex + 1;
          console.log(`     - Line ${li}:`);
          console.log(`         - OLD: ${lineChange.oldLine}`);
          console.log(`         - NEW: ${lineChange.newLine}`);
        }
      }
    } else {
      // brief summary
      const totalChanges = fileChanges.reduce((sum, b) => sum + b.changedLines.length, 0);
      console.log(`   → ${totalChanges} line(s) adjusted.`);
    }
  } else {
    console.log(`➖ No changes: ${filePath}`);
  }
}

function walkDir(dir: string, cb: (f: string) => void) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(full, cb);
    } else if (ent.isFile() && full.toLowerCase().endsWith(".md")) {
      cb(full);
    }
  }
}

// -------- CLI ENTRY POINT --------
(function main() {
  const opts = parseArgs();

  if (!fs.existsSync(opts.targetDir)) {
    console.error(`❌ Path does not exist: ${opts.targetDir}`);
    process.exit(1);
  }

  console.log(`🔍 Scanning Markdown files in: ${opts.targetDir}`);
  walkDir(opts.targetDir, (filePath) => processMarkdownFile(filePath, opts));
  console.log("✨ Mermaid diagram text contrast fix complete.");
})();
