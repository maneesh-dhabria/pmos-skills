# Migration: monorepo → separate git repos per plugin

## Current state

```
agent-skills/           ← one .git, 3 remotes (origin=GitLab, github, github-work, all=all three)
  plugins/
    pmos-toolkit/       ← no .git, tracked by root repo
```

GitHub repos (`maneesh-dhabria/pmos-toolkit`, `maneesh-dh/pmos-toolkit`) contain the full
monorepo. Root `all` remote pushes everything everywhere.

## Target state

```
agent-skills/           ← thin .git, GitLab only — tracks marketplace manifest + pre-push hook
  plugins/
    pmos-toolkit/       ← own .git → github + github-work
    pmos-learnkit/      ← own .git → github-learnkit + github-work-learnkit
```

Each plugin is an independent git repo. Root repo is a thin registry.

---

## Part 1 — pmos-toolkit: standalone repo

```bash
cd /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-toolkit

git init
git add .
git commit -m "init: pmos-toolkit as standalone repo"

git remote add origin git@github.com:maneesh-dhabria/pmos-toolkit.git
git remote add github-work git@github.com-work:maneesh-dh/pmos-toolkit.git

# Force-push: replaces full-monorepo content with just the plugin
git push origin main --force
git push github-work main --force
```

Install the pre-push hook (version-bump enforcement) into this repo:

```bash
cp /Users/maneeshdhabria/Desktop/Projects/agent-skills/.githooks/pre-push \
   /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-toolkit/.git/hooks/pre-push
chmod +x /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-toolkit/.git/hooks/pre-push
```

---

## Part 2 — Clean up root repo

Stop tracking the plugin directory and strip GitHub from root remotes.

```bash
cd /Users/maneeshdhabria/Desktop/Projects/agent-skills

# Stop tracking pmos-toolkit files (keeps files on disk)
git rm -r --cached plugins/pmos-toolkit/

# Add to .gitignore so it never reappears as untracked
echo "plugins/pmos-toolkit/" >> .gitignore

# Commit
git add .gitignore
git commit -m "chore: pmos-toolkit is now a standalone git repo"
```

Remove GitHub from root remotes — root only pushes to GitLab now:

```bash
# Remove GitHub push URLs from the "all" remote
git remote set-url --delete --push all git@github.com:maneesh-dhabria/pmos-toolkit.git
git remote set-url --delete --push all git@github.com-work:maneesh-dh/pmos-toolkit.git

# Remove the standalone github / github-work remotes (they pointed at the plugin)
git remote remove github
git remote remove github-work
```

Verify — root should only show GitLab:

```bash
git remote -v
# origin    git@gitlab.com:agent-skills/agent-skills.git (fetch)
# origin    git@gitlab.com:agent-skills/agent-skills.git (push)
# all       git@gitlab.com:agent-skills/agent-skills.git (fetch)
# all       git@gitlab.com:agent-skills/agent-skills.git (push)
```

Push the cleanup commit:

```bash
git push origin main
```

---

## Part 3 — pmos-learnkit: new plugin

### 3a. Create GitHub repos

Manually create two GitHub repos before running the commands below:
- Personal: `github.com/maneesh-dhabria/pmos-learnkit`
- Work: `github.com-work:maneesh-dh/pmos-learnkit`

### 3b. Scaffold the plugin

```bash
cd /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins

mkdir -p pmos-learnkit/.claude-plugin
mkdir -p pmos-learnkit/.codex-plugin
mkdir -p pmos-learnkit/skills

# .claude-plugin/plugin.json
cat > pmos-learnkit/.claude-plugin/plugin.json << 'EOF'
{
  "name": "pmos-learnkit",
  "version": "0.1.0",
  "description": "...",
  "author": {
    "name": "Maneesh Dhabria"
  },
  "homepage": "https://github.com/maneesh-dhabria/pmos-learnkit",
  "repository": "https://github.com/maneesh-dhabria/pmos-learnkit",
  "license": "MIT",
  "skills": "./skills/"
}
EOF

# .codex-plugin/plugin.json (must stay in sync with .claude-plugin version)
cat > pmos-learnkit/.codex-plugin/plugin.json << 'EOF'
{
  "name": "pmos-learnkit",
  "version": "0.1.0",
  "description": "...",
  "skills": "./skills/",
  "interface": {
    "displayName": "PMOS Learnkit",
    "shortDescription": "...",
    "category": "Productivity"
  }
}
EOF
```

### 3c. Init git and push

```bash
cd /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-learnkit

git init
git add .
git commit -m "init: pmos-learnkit plugin"

git remote add origin git@github.com:maneesh-dhabria/pmos-learnkit.git
git remote add github-work git@github.com-work:maneesh-dh/pmos-learnkit.git

git push origin main
git push github-work main
```

Install the pre-push hook:

```bash
cp /Users/maneeshdhabria/Desktop/Projects/agent-skills/.githooks/pre-push \
   /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-learnkit/.git/hooks/pre-push
chmod +x /Users/maneeshdhabria/Desktop/Projects/agent-skills/plugins/pmos-learnkit/.git/hooks/pre-push
```

### 3d. Register in marketplace manifest

Add pmos-learnkit to `/Users/maneeshdhabria/Desktop/Projects/agent-skills/.claude-plugin/marketplace.json`:

```json
{
  "name": "pmos-learnkit",
  "description": "...",
  "source": "./plugins/pmos-learnkit",
  "version": "0.1.0",
  "category": "productivity",
  "homepage": "https://github.com/maneesh-dhabria/pmos-learnkit"
}
```

Add `plugins/pmos-learnkit/` to root `.gitignore`, then commit:

```bash
cd /Users/maneeshdhabria/Desktop/Projects/agent-skills
echo "plugins/pmos-learnkit/" >> .gitignore
git add .claude-plugin/marketplace.json .gitignore
git commit -m "chore: register pmos-learnkit in marketplace"
git push origin main
```

---

## Day-to-day workflow after migration

| Task | Where to run |
|------|-------------|
| Work on pmos-toolkit skills | `cd plugins/pmos-toolkit` → `git push origin main && git push github-work main` |
| Work on pmos-learnkit skills | `cd plugins/pmos-learnkit` → `git push origin main && git push github-work main` |
| Update marketplace manifest or pre-push hook | `cd agent-skills` → `git push origin main` |

Tags follow the same pattern — push from inside the plugin directory:

```bash
git tag v2.50.0
git push origin v2.50.0
git push github-work v2.50.0
```

## Adding a third plugin later

Repeat Part 3 exactly, substituting the new plugin name. One extra step: add the new plugin to
`agent-skills/.claude-plugin/marketplace.json` and push from root.
