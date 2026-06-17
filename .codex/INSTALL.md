# Installing pmos-skills for Codex

Enable pmos-skills plugins in Codex via native skill discovery. Clone the
repository once, then symlink the skills of each plugin you want.

## Prerequisites

- Git

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/maneesh-dhabria/pmos-skills.git ~/.codex/pmos-skills
   ```

2. **Create the skills directory:**
   ```bash
   mkdir -p ~/.agents/skills
   ```

3. **Symlink each plugin you want.** Repeat the line per plugin
   (`pmos-toolkit`, `pmos-learnkit`, `pmos-utilities`, `pmos-managerkit`,
   `pmos-gamekit`):
   ```bash
   ln -s ~/.codex/pmos-skills/plugins/pmos-toolkit/skills    ~/.agents/skills/pmos-toolkit
   ln -s ~/.codex/pmos-skills/plugins/pmos-learnkit/skills   ~/.agents/skills/pmos-learnkit
   ln -s ~/.codex/pmos-skills/plugins/pmos-utilities/skills  ~/.agents/skills/pmos-utilities
   ln -s ~/.codex/pmos-skills/plugins/pmos-managerkit/skills ~/.agents/skills/pmos-managerkit
   ln -s ~/.codex/pmos-skills/plugins/pmos-gamekit/skills    ~/.agents/skills/pmos-gamekit
   ```

4. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Verify

```bash
ls -la ~/.agents/skills/
```

You should see a symlink per plugin pointing into your `pmos-skills` clone.

## Updating

```bash
cd ~/.codex/pmos-skills && git pull
```

Skills update instantly through the symlinks.

## Uninstalling

```bash
# remove the symlink(s) you no longer want, e.g.:
rm ~/.agents/skills/pmos-toolkit
```

Optionally delete the clone: `rm -rf ~/.codex/pmos-skills`
