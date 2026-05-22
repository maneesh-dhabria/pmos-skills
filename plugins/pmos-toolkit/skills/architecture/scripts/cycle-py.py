#!/usr/bin/env python3
import ast
import json
import os
import sys


def main():
    if len(sys.argv) < 2:
        print("usage: cycle-py.py <scan_root>", file=sys.stderr)
        sys.exit(64)
    scan_root = sys.argv[1]

    files = []
    for dirpath, dirnames, filenames in os.walk(scan_root):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for n in filenames:
            if n.endswith(".py"):
                files.append(os.path.relpath(os.path.join(dirpath, n), scan_root).replace("\\", "/"))

    def rel_to_module(rel):
        parts = rel.split("/")
        if parts[-1] == "__init__.py":
            parts = parts[:-1]
        else:
            parts[-1] = parts[-1][:-3]
        return ".".join(parts)

    def rel_to_package(rel):
        parts = rel.split("/")
        if parts[-1] == "__init__.py":
            parts = parts[:-1]
        else:
            parts = parts[:-1]
        return ".".join(parts)

    mod_to_file = {}
    for rel in files:
        mod_to_file[rel_to_module(rel)] = rel
    known_modules = set(mod_to_file.keys())

    adj = {m: set() for m in known_modules}

    for rel in files:
        abs_path = os.path.join(scan_root, rel)
        try:
            with open(abs_path, encoding="utf-8") as fh:
                src = fh.read()
            tree = ast.parse(src, filename=abs_path)
        except (SyntaxError, ValueError, OSError):
            continue

        this_mod = rel_to_module(rel)
        this_pkg = rel_to_package(rel)

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.name
                    if name in known_modules:
                        adj[this_mod].add(name)
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                level = node.level or 0
                if level > 0:
                    pkg_parts = this_pkg.split(".") if this_pkg else []
                    if level - 1 > len(pkg_parts):
                        continue
                    base = pkg_parts[: len(pkg_parts) - (level - 1)]
                    target_parts = base + ([mod] if mod else [])
                    target = ".".join(p for p in target_parts if p)
                else:
                    target = mod
                if not target:
                    continue
                if target in known_modules:
                    adj[this_mod].add(target)
                for alias in node.names:
                    sub = f"{target}.{alias.name}" if target else alias.name
                    if sub in known_modules:
                        adj[this_mod].add(sub)

    nodes = sorted(adj.keys())
    index_of = {}
    lowlink = {}
    on_stack = set()
    stack = []
    sccs = []
    idx_counter = [0]

    work = []
    for start in nodes:
        if start in index_of:
            continue
        work.append((start, iter(sorted(adj[start])), False))
        while work:
            v, it, returned = work[-1]
            if not returned:
                index_of[v] = idx_counter[0]
                lowlink[v] = idx_counter[0]
                idx_counter[0] += 1
                stack.append(v)
                on_stack.add(v)
                work[-1] = (v, it, True)
            advanced = False
            for w in it:
                if w not in index_of:
                    work.append((w, iter(sorted(adj[w])), False))
                    advanced = True
                    break
                elif w in on_stack:
                    lowlink[v] = min(lowlink[v], index_of[w])
            if advanced:
                continue
            if lowlink[v] == index_of[v]:
                comp = []
                while True:
                    w = stack.pop()
                    on_stack.discard(w)
                    comp.append(w)
                    if w == v:
                        break
                if len(comp) >= 2:
                    sccs.append(comp)
            work.pop()
            if work:
                parent_v = work[-1][0]
                lowlink[parent_v] = min(lowlink[parent_v], lowlink[v])

    cycles = []
    for comp in sccs:
        members = sorted(mod_to_file[m] for m in comp)
        cycles.append({"members": members, "cycle_length": len(members)})

    cycles.sort(key=lambda c: c["members"][0])
    print(json.dumps(cycles))


if __name__ == "__main__":
    main()
