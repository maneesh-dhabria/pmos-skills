# Platform Strings

Per-platform phrasing for closing offers, skill invocation references, and error prefixes. Consumers read by H2 platform name; each platform exposes the keys below as bulleted entries.

Lookup contract:
- The H2 heading text is the platform key (`claude-code`, `gemini`, `copilot`, `codex`).
- Within a platform section, each key is a bullet of the form `` - `<key>`: <value> ``.
- A consumer extracts a value with: `awk '$0=="## <platform>"{f=1;next} /^## /{f=0} f' platform-strings.md | grep '^- `<key>`:'`.

## claude-code
- `execute_invocation`: `/pmos-toolkit:execute`
- `skill_reference`: `/pmos-toolkit:<skill>`

## gemini
- `execute_invocation`: activate the execute skill
- `skill_reference`: activate the <skill> skill

## copilot
- `execute_invocation`: use the execute skill
- `skill_reference`: use the <skill> skill

## codex
- `execute_invocation`: run the execute skill
- `skill_reference`: run the <skill> skill
