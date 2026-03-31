# Core-to-Tool Path Mapping (TOOL-01)

This table maps core bundle component categories to Claude Code destinations under `~/.claude/`, with Cursor/Codex mapping notes for spec parity.

| Core Component | Manifest Anchor | Claude Code Destination (`~/.claude/`) | Cursor Mapping | Codex Mapping |
|---|---|---|---|---|
| Skills | `payload_path` skill files | `~/.claude/skills/` | TBD + link to official docs | TBD + link to official docs |
| Hooks | `payload_path` hook scripts | `~/.claude/hooks/` | TBD + link to official docs | TBD + link to official docs |
| Commands | `payload_path` command definitions | `~/.claude/commands/` | TBD + link to official docs | TBD + link to official docs |
| Templates | `payload_path` template assets | `~/.claude/templates/` | TBD + link to official docs | TBD + link to official docs |
| Bundle manifest | `manifest_path` | `~/.claude/bundles/<bundle_id>/bundle.json` | TBD + link to official docs | TBD + link to official docs |

## Notes

- `manifest_path` and `payload_path` are defined in `docs/spec/bundle-json.md`.
- Cursor/Codex columns are intentionally spec placeholders in Phase 1; this satisfies TOOL-01 mapping coverage without claiming unsupported paths.
