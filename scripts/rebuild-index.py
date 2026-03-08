#!/usr/bin/env python3
"""
pinky-memory: rebuild index for a {slug}.brain repo

Scans all per-file notes and generates a summary index at the brain repo root.
Can be run inside any .brain repo to regenerate its local index.

Usage:
    python3 rebuild-index.py [brain_root]

    brain_root defaults to the current directory.
"""

import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


# Language directories to scan for per-file notes
LANGUAGE_DIRS = {
    "typescript", "javascript", "python", "ruby", "go", "rust",
    "java", "kotlin", "swift", "c", "cpp", "csharp", "php",
    "markdown", "misc",
}


def extract_field(content: str, field: str) -> str:
    """Extract a value from a '## Field\\nvalue' markdown section."""
    pattern = rf"##\s+{re.escape(field)}\s*\n(.*?)(?=\n##|\Z)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def first_sentence(text: str) -> str:
    """Return the first sentence (or first line) of a block of text."""
    for sep in (".", "\n"):
        idx = text.find(sep)
        if idx != -1:
            return text[: idx + (1 if sep == "." else 0)].strip()
    return text.strip()


def rebuild_index(brain_root: Path) -> None:
    meta_path = brain_root / "meta.md"
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    lines = [
        "# Brain Index\n",
        f"_Last rebuilt: {now}_\n",
        "",
    ]

    # Include project info from meta.md
    if meta_path.is_file():
        content = meta_path.read_text(encoding="utf-8")
        purpose = extract_field(content, "Purpose")
        source = extract_field(content, "Source Repository")
        if purpose:
            lines.append(f"**Purpose**: {first_sentence(purpose)}")
        if source:
            lines.append(f"**Source**: {source}")
        lines.append("")

    # Scan language directories for per-file notes
    file_count = 0
    for lang_dir in sorted(brain_root.iterdir()):
        if not lang_dir.is_dir():
            continue
        if lang_dir.name.startswith("."):
            continue
        if lang_dir.name not in LANGUAGE_DIRS:
            continue

        note_files = sorted(lang_dir.rglob("*.md"))
        if not note_files:
            continue

        lines.append(f"## {lang_dir.name}")
        for note_file in note_files:
            rel = note_file.relative_to(brain_root)
            # Strip the .md suffix to get the original file path
            original = str(rel.parent / note_file.stem) if note_file.stem != note_file.name else str(rel)
            content = note_file.read_text(encoding="utf-8")
            purpose = extract_field(content, "Purpose")
            summary = first_sentence(purpose) if purpose else "—"
            lines.append(f"- **{original}**: {summary}")
            file_count += 1
        lines.append("")

    if file_count == 0:
        lines.append("_No per-file notes yet._\n")

    index_path = brain_root / "index.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[pinky] rebuilt index.md ({file_count} file note(s))")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        root = Path(sys.argv[1]).resolve()
    else:
        root = Path.cwd()

    rebuild_index(root)
