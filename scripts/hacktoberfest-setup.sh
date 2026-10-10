#!/usr/bin/env bash
# Review this script, then run it from the repo root.
# It will: set repo homepage/topics, create labels, open the 8 drafted issues,
# and delete ISSUES_DRAFT.md after a successful run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO="${REPO:-nilamadhab47/roastmypr}"
DRAFT="${ROOT}/ISSUES_DRAFT.md"

if [[ ! -f "$DRAFT" ]]; then
  echo "Missing $DRAFT — aborting." >&2
  exit 1
fi

if ! command -v gh >/dev/null; then
  echo "gh CLI is required." >&2
  exit 1
fi

gh repo edit "$REPO" \
  --homepage "https://www.roastmypr.xyz" \
  --description "AI that roasts your pull requests. Claude writes it, Jev checks it against the real diff." \
  --add-topic hacktoberfest \
  --add-topic chrome-extension \
  --add-topic code-review \
  --add-topic llm \
  --add-topic ai

create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" 2>/dev/null || true
}

create_label "hacktoberfest" "FF6B35" "Hacktoberfest"
create_label "hacktoberfest-accepted" "0E8A16" "Counts for Hacktoberfest"
create_label "difficulty: easy" "C2E0C6" "Good if you just cloned the repo"
create_label "difficulty: medium" "FBCA04" "A bit of wiring, still one PR"
create_label "difficulty: hard" "B60205" "Bring snacks"

TMPDIR_ISSUES="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ISSUES"' EXIT

python3 - <<'PY' "$DRAFT" "$TMPDIR_ISSUES"
import pathlib, re, sys
draft = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path(sys.argv[2])
chunks = re.split(r"\n---\n", draft)
n = 0
for chunk in chunks:
    if not chunk.strip().startswith("TITLE:"):
        continue
    title_m = re.search(r"^TITLE:\s*(.+)$", chunk, re.M)
    labels_m = re.search(r"^LABELS:\s*(.+)$", chunk, re.M)
    body_m = re.search(r"^BODY:[ \t]*\n(.*)$", chunk, re.S | re.M)
    if not (title_m and labels_m and body_m):
        raise SystemExit(f"Could not parse chunk:\n{chunk[:200]}")
    n += 1
    (out / f"{n:02d}.title").write_text(title_m.group(1).strip() + "\n")
    (out / f"{n:02d}.labels").write_text(labels_m.group(1).strip() + "\n")
    (out / f"{n:02d}.body").write_text(body_m.group(1).strip() + "\n")
print(f"parsed {n} issues")
PY

shopt -s nullglob
for title_file in "$TMPDIR_ISSUES"/*.title; do
  stem="${title_file%.title}"
  title="$(tr -d '\n' < "$title_file")"
  labels="$(tr -d '\n' < "${stem}.labels")"
  echo "Creating: $title"
  gh issue create --repo "$REPO" --title "$title" --body-file "${stem}.body" --label "$labels"
done

rm -f "$DRAFT"
echo "Issues opened. Deleted ISSUES_DRAFT.md."
