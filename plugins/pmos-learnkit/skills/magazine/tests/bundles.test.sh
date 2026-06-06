#!/usr/bin/env bash
# Deterministic, no-network integrity tests for the shipped feed catalog + bundles.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SK="$(cd "$HERE/.." && pwd)"
DATA="$SK/data"
CAT="$DATA/catalog"
BUN="$DATA/bundles"
JS="$SK/scripts/bundles.js"

pass=0; fail=0
ok()  { printf '  ok   %s\n' "$1"; pass=$((pass+1)); }
no()  { printf '  FAIL %s\n' "$1"; fail=$((fail+1)); }
have_xmllint() { command -v xmllint >/dev/null 2>&1; }

echo "== magazine bundles tests =="

# 1. manifest parses, version 1, >=3 bundles per medium
ver=$(node "$JS" list --json >/dev/null 2>&1; echo $?)
[ "$ver" = "0" ] && ok "bundles.js list --json exits 0" || no "list --json exit ($ver)"
nlc=$(node "$JS" list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).filter(b=>b.medium==="newsletter").length))')
pcc=$(node "$JS" list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).filter(b=>b.medium==="podcast").length))')
[ "$nlc" -ge 3 ] && ok "newsletter bundles >=3 ($nlc)" || no "newsletter bundles <3 ($nlc)"
[ "$pcc" -ge 3 ] && ok "podcast bundles >=3 ($pcc)" || no "podcast bundles <3 ($pcc)"

# 2. every manifest file exists + well-formed XML
manfiles=$(node "$JS" list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(b=>console.log(b.file)))')
xmlbad=0
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  f="$BUN/$rel"
  if [ ! -f "$f" ]; then no "bundle file missing: $rel"; xmlbad=1; continue; fi
  if have_xmllint; then xmllint --noout "$f" 2>/dev/null || { no "malformed XML: $rel"; xmlbad=1; }; fi
done <<< "$manfiles"
[ "$xmlbad" = "0" ] && ok "all bundle files exist + well-formed" || true
if have_xmllint; then xmllint --noout "$CAT/feeds.opml" 2>/dev/null && ok "feeds.opml well-formed" || no "feeds.opml malformed"; else ok "feeds.opml (xmllint absent — skipped)"; fi

# 3 + 4 + 6 + validate-data (counts match, urls trace to catalog, ids unique)
node "$JS" validate-data && ok "validate-data (counts + catalog trace + unique ids)" || no "validate-data failed"

# 5. catalog TSV hygiene
for tsv in "$CAT/pm-newsletters.tsv" "$CAT/pm-podcasts.tsv"; do
  bad=$(awk -F'\t' 'NR>1 && NF!=9{print NR}' "$tsv")
  [ -z "$bad" ] && ok "9-col: $(basename "$tsv")" || no "$(basename "$tsv") bad rows: $bad"
  dup=$(awk -F'\t' 'NR>1{c[$1]++} END{for(n in c) if(c[n]>1) print n}' "$tsv")
  [ -z "$dup" ] && ok "no dup names: $(basename "$tsv")" || no "$(basename "$tsv") dups: $dup"
done

# 7. list --json valid JSON with ids
node "$JS" list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);if(a.every(b=>b.id&&b.medium&&b.file))process.exit(0);process.exit(1)})' \
  && ok "list --json well-formed, all entries have id/medium/file" || no "list --json malformed"

# 8. resolve returns count feeds, each typed
cnt=$(node "$JS" list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s).find(x=>x.id==="ai-for-pms"&&x.medium==="newsletter");console.log(b.count)})')
got=$(node "$JS" resolve ai-for-pms --medium newsletter | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);const allNl=a.every(f=>f.type==="newsletter");console.log(a.length+":"+allNl)})')
[ "$got" = "$cnt:true" ] && ok "resolve ai-for-pms == $cnt feeds, all type=newsletter" || no "resolve mismatch (got $got, want $cnt:true)"

# 9. unknown id -> 3 ; ambiguous id -> 4
node "$JS" resolve no-such-bundle >/dev/null 2>&1; [ "$?" = "3" ] && ok "unknown id exits 3" || no "unknown id wrong exit"
node "$JS" resolve essentials >/dev/null 2>&1; [ "$?" = "4" ] && ok "ambiguous id exits 4" || no "ambiguous id wrong exit"
node "$JS" resolve essentials --medium podcast >/dev/null 2>&1; [ "$?" = "0" ] && ok "ambiguous id + --medium exits 0" || no "disambiguated resolve wrong exit"

echo "== $pass passed, $fail failed =="
[ "$fail" = "0" ]
