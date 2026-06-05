#!/usr/bin/env bash
set -euo pipefail

echo "=== timestamp ==="
date
echo

echo "=== battery ==="
pmset -g batt || true
echo

echo "=== sleep assertions ==="
pmset -g assertions || true
echo

echo "=== top cpu snapshot ==="
top -l 1 -o cpu -n 20 | sed -n '1,80p' || true
echo

echo "=== top cpu processes ==="
ps -Ao pid,ppid,%cpu,%mem,rss,vsz,state,etime,command | sort -k3 -nr | head -n 25 || true
echo

echo "=== top memory processes ==="
ps -Ao pid,ppid,%mem,%cpu,rss,vsz,state,etime,command | sort -k3 -nr | head -n 25 || true
echo

echo "=== virtual memory ==="
vm_stat || true
echo

echo "=== process counts by category ==="
ps -Ao command= | awk '
/Chrome Helper \(Renderer\)/    {chr++}
/Chrome.app.*\/Google Chrome$/  {chm++}
/Helper \(Renderer\)/           {ren++}
/Helper \(Plugin\)/             {plg++}
/node /                         {node++}
/python/                        {py++}
/docker/                        {dock++}
END {
  printf("chrome_renderers=%d chrome_main=%d other_renderers=%d plugins=%d node=%d python=%d docker=%d\n",
    chr,chm,ren,plg,node,py,dock)
}' || true
echo

echo "=== orphaned processes (ppid=1, sorted by cpu) ==="
ps -eo ppid=,pid=,%cpu=,%mem=,etime=,command= | awk '$1==1' | sort -k3 -nr | head -20 || true
echo

echo "=== managed chrome profiles ==="
python3 - <<'PY' || true
import json, os, sys

base = os.path.expanduser('~/Library/Application Support/Google/Chrome')
state_path = os.path.join(base, 'Local State')
try:
    with open(state_path) as f:
        state = json.load(f)
except Exception:
    print("no chrome local state found")
    sys.exit(0)

profiles = state.get('profile', {}).get('info_cache', {})
found = False
for name, info in profiles.items():
    if info.get('is_managed', False):
        print(f"[{name}] {info.get('name', '?')} — managed by {info.get('hosted_domain', '?')}")
        found = True
if not found:
    print("none")
PY
