#!/usr/bin/env ts-node

/**
 * Mermaid Auto-Contrast Text Color Fixer (TypeScript Version)
 * Scans Markdown files for ```mermaid blocks and ensures
 * that classDef lines have a contrasting text color.
 *
 * Usage:
 *    npx ts-node scripts/mermaid-contrast-fix.ts /path/to/docs
 */
import fs from "fs";
import path from "path";

function getBrightness(hex: string): number {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getContrastColor(hex: string): string {
    return getBrightness(hex) < 128 ? "#ffffff" : "#000000";
}

function processMermaidBlock(block: string): string {
    const lines = block.split("\n").map(line => {
        const classDefPattern = /^(\s*classDef\s+\w+.*fill:\s*(#[0-9A-Fa-f]{6}))/;
        const match = line.match(classDefPattern);
        if (match) {
            const fillColor = match[2];
            const correctTextColor = getContrastColor(fillColor);

            if (/color:\s*#[0-9A-Fa-f]{6}/.test(line)) {
                // Replace existing color if it's wrong
                return line.replace(/color:\s*#[0-9A-Fa-f]{6}/, `color:${correctTextColor}`);
            } else {
                // Append color
                return `${line},color:${correctTextColor}`;
            }
        }
        return line;
    });

    return lines.join("\n");
}

function processMarkdownFile(filePath: string): void {
    let content = fs.readFileSync(filePath, "utf8");

    // Match fenced mermaid blocks regardless of indentation or spaces
    const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/gi;

    let modified = false;
    content = content.replace(mermaidBlockRegex, (match, blockContent) => {
        const updatedBlock = processMermaidBlock(blockContent);
        if (updatedBlock !== blockContent) {
            modified = true;
            return "```mermaid\n" + updatedBlock + "\n```";
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`✅ Updated: ${filePath}`);
    } else {
        console.log(`➖ No changes: ${filePath}`);
    }
}

function walkDir(dir: string, callback: (filePath: string) => void): void {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, callback);
        } else if (fullPath.endsWith(".md")) {
            callback(fullPath);
        }
    });
}

// -------- CLI ENTRY POINT --------
if (process.argv.length < 3) {
    console.error("❌ Please provide a path to the directory containing Markdown files.");
    process.exit(1);
}

const targetDir = path.resolve(process.argv[2]);
if (!fs.existsSync(targetDir)) {
    console.error(`❌ Path does not exist: ${targetDir}`);
    process.exit(1);
}

console.log(`🔍 Scanning Markdown files in: ${targetDir}`);
walkDir(targetDir, processMarkdownFile);
console.log("✨ Mermaid diagram text contrast fix complete.");
