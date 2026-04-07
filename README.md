# Claude Code Bundles

> ⚠️ **This project is currently in active development and should not be used in production.** Expect breaking changes, unstable APIs, and incomplete features.

## Overview

Claude Code Bundles is a comprehensive system for packaging, managing, and distributing **Claude Code skills and tools**. It provides a modular, version-controlled approach to creating reusable bundles that can be shared across Claude Code environments.

This project is an **Nx monorepo** containing:
- **CLI** (`ccb` command) — Command-line interface for bundle operations (create, pack, upload, import, pull)
- **Core Library** — Bundle validation, schema management, and lineage tracking
- **Web API** — Backend services for bundle metadata, storage, and remote operations

## What is a Bundle?

A **bundle** is a packaged collection of:
- **Skills** — Automation workflows and domain-specific tools
- **Metadata** — Version info, dependencies, visibility settings
- **Manifest** — Structured definition following the `bundle.json` schema
- **Payload** — Compressed archive containing all bundle assets

Bundles can be:
- **Local** — Created and managed on your machine
- **Private** — Backed up and restored from secure storage
- **Public** — Published and shared across the Claude Code community

## Who Should Use This?

This project is designed for:

### 👨‍💻 Claude Code Plugin/Skill Developers
- Create custom skills and tools for Claude Code
- Package them into distributable bundles
- Manage versions and dependencies
- Share skills with teams or publicly

### 🏢 Organizations
- Build internal skill libraries
- Distribute standardized tools across teams
- Maintain private bundles in secure storage
- Track bundle lineage and usage

### 🛠️ Claude Code Maintainers
- Manage the official bundle ecosystem
- Handle bundle validation and publishing
- Maintain schema specifications
- Support backup/restore workflows

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd claude-code-bundles

# Install dependencies
npm install

# Build all packages
npm run build
```

### Basic Commands

```bash
# Using the CLI
npm run dev -- <command> [options]

# Available commands:
ccb create      # Create a new bundle
ccb pack        # Pack bundle into distributable format
ccb import      # Import bundle from file/URL
ccb pull        # Sync remote bundles
ccb upload      # Upload bundle to remote storage
ccb list        # List local bundles
ccb validate    # Validate bundle structure
```

See [docs/spec/](./docs/spec/) for detailed specification documents.

## Project Structure

```
├── packages/
│   ├── cli/              # Command-line tool (ccb)
│   ├── core/             # Bundle validation & core logic
│   └── workspace/        # Test utilities
├── apps/
│   ├── web/              # Web API and dashboard
│   └── backup/           # Remote backup service
├── docs/
│   ├── spec/            # Formal specifications
│   │   ├── bundle-json.md
│   │   ├── lineage-policy.md
│   │   └── tool-path-mapping.md
│   └── guides/          # User guides (coming soon)
├── schemas/             # JSON Schema definitions
└── scripts/             # Build, test, and deployment scripts
```

## Development

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:cli
npm run build:core
npm run build:web
```

### Testing

```bash
# Run all tests
npm run test:all

# Run tests with watch
npm run test

# Run end-to-end tests (local)
npm run test:e2e

# Run end-to-end tests (with backup/restore)
npm run test:e2e:remote
```

### Local Development

```bash
# Start CLI in dev mode
npm run dev -- <command>

# Start web server
npm run dev:web
```

## Current Phase Status

This project is organized in phases:

- **Phase 1** ✅ — Local bundle MVP and schema specification
- **Phase 2** ✅ — Backend infrastructure for private backup/restore
- **Phase 3** ✅ — UI components and web dashboard
- **Phase 4-7** — (In progress/completed)
- **Phase 8** ✅ — Phase execution and verification framework

See [.planning/](./.planning/) directory for detailed phase documentation.

## Key Features (In Development)

- ✅ Bundle creation and validation
- ✅ Versioning and schema management
- ✅ Local bundle management (list, inspect, delete)
- 🔄 Remote bundle import/export
- 🔄 Private backup and restore workflow
- 🔄 Web UI for bundle management
- ⏳ Public bundle registry
- ⏳ Dependency resolution
- ⏳ Automated bundle publishing

## Specification Documents

- [bundle.json Specification](./docs/spec/bundle-json.md) — Bundle manifest format and versioning
- [Lineage Policy](./docs/spec/lineage-policy.md) — Import lineage tracking and compatibility
- [Tool Path Mapping](./docs/spec/tool-path-mapping.md) — Path resolution for bundled tools

## Contributing

This is an active development project. If you find issues or have suggestions:

1. Check existing issues in the project
2. Review phase documentation in [.planning/](./.planning/)
3. Open an issue or discussion

## ⚠️ Development Notice

**DO NOT USE IN PRODUCTION**

- APIs and formats may change without notice
- Data structures are not finalized
- No backward compatibility guarantees
- Test coverage is incomplete
- Security review has not been completed

This codebase is suitable only for:
- Development and testing
- Internal evaluation
- Contributing to the project

## License

[Add license information here]

## Questions?

- 📖 See [docs/spec/](./docs/spec/) for technical details
- 📋 Check [.planning/](./planning/) for project roadmap
- 🐛 Report issues or ask questions through project tracking
