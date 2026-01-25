# SL8 Skills Registry

Official skills registry for the `@starthalo/skills-cli`. This repository contains reusable skills that can be installed into AI coding agents like Claude Code, Cursor, and others.

## Available Skills

| Skill | Version | Description |
|-------|---------|-------------|
| [ai-image-generation](skills/ai-image-generation/) | v1.0.0 | AI-powered image generation using DALL-E, Stable Diffusion, Imagen, Flux |
| [ai-video-generation](skills/ai-video-generation/) | v1.0.0 | AI-powered video generation using Veo, Runway, Kling |
| [pdf](skills/pdf/) | v1.0.0 | PDF document creation and manipulation |
| [canvas](skills/canvas/) | v1.0.0 | HTML5 Canvas-based visualization and graphics |
| [docx](skills/docx/) | v1.0.0 | Microsoft Word document generation |
| [xlsx](skills/xlsx/) | v1.0.0 | Excel spreadsheet generation |
| [pptx](skills/pptx/) | v1.0.0 | PowerPoint presentation generation |

---

## Quick Start

### 1. Install the Skills CLI

```bash
npm install -g @starthalo/skills-cli
```

### 2. Authenticate (Required)

```bash
# Option A: Environment variable
export GITHUB_TOKEN="your-github-token"

# Option B: Interactive login
skills login
```

### 3. Install Skills

```bash
# Install latest version
skills add ai-image-generation

# Install specific version
skills add ai-image-generation@1.0.0

# Install with semver range
skills add ai-image-generation@^1.0.0
```

### 4. Manage Skills

```bash
# List installed skills
skills list

# Update a skill
skills update ai-image-generation

# Remove a skill
skills remove ai-image-generation
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  This Repository (StartHalo/sl8-registry)                       │
│                                                                 │
│  skills/                                                        │
│  ├── ai-image-generation/     ← Skill directory                 │
│  │   ├── SKILL.md             ← Main skill file (required)      │
│  │   ├── assets/              ← Static assets (optional)        │
│  │   └── references/          ← Additional docs (optional)      │
│  └── ...                                                        │
│                                                                 │
│  Git Tags:                                                      │
│  - ai-image-generation/v1.0.0  ← Version identifier             │
│  - ai-image-generation/v1.1.0                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ `skills add ai-image-generation`
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  skills-cli:                                                    │
│  1. Lists tags matching `ai-image-generation/v*`                │
│  2. Selects latest (or specified) version                       │
│  3. Downloads repository tarball at that tag                    │
│  4. Extracts skill to ~/.claude/skills/ai-image-generation/     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skill Structure

Each skill must follow this structure:

```
skills/<skill-name>/
├── SKILL.md              # REQUIRED - Main skill definition
├── assets/               # OPTIONAL - Images, icons, static files
└── references/           # OPTIONAL - Additional documentation
    ├── models.md
    └── examples.md
```

### SKILL.md Format

The `SKILL.md` file must have YAML frontmatter:

```yaml
---
name: skill-name              # REQUIRED - Must match directory name
description: Brief desc...    # REQUIRED - Used for skill discovery
---

# Skill Title

Your skill content in Markdown...
```

**Example:**

```yaml
---
name: ai-image-generation
description: Generate AI images using the @starthalo/ai-image CLI. Supports DALL-E, Stable Diffusion, Imagen, and Flux models.
---

# AI Image Generation

## Overview
Enable AI-powered image generation...

## Quick Start
```bash
ai-image generate --prompt "..." --model "stability-ai/sdxl"
```
```

---

## Versioning

Skills are versioned using **Git tags** in semver format:

```
<skill-name>/v<major>.<minor>.<patch>
```

### Version Examples

| Tag | Meaning |
|-----|---------|
| `ai-image-generation/v1.0.0` | Initial release |
| `ai-image-generation/v1.0.1` | Patch: bug fix |
| `ai-image-generation/v1.1.0` | Minor: new feature |
| `ai-image-generation/v2.0.0` | Major: breaking change |

### When to Bump Versions

| Change Type | Version Bump | Examples |
|-------------|--------------|----------|
| Bug fixes, typos | Patch (1.0.0 → 1.0.1) | Fix typo in SKILL.md |
| New features (backward compatible) | Minor (1.0.0 → 1.1.0) | Add new command examples |
| Breaking changes | Major (1.0.0 → 2.0.0) | Rename commands, restructure |

---

## Contributing

### Adding a New Skill

1. **Create skill directory:**
   ```bash
   mkdir -p skills/my-new-skill/{assets,references}
   ```

2. **Create SKILL.md with frontmatter:**
   ```bash
   cat > skills/my-new-skill/SKILL.md << 'EOF'
   ---
   name: my-new-skill
   description: Brief description of what this skill does
   ---

   # My New Skill

   ## Overview
   Explain what this skill enables...

   ## Quick Start
   ```bash
   # Example command
   ```
   EOF
   ```

3. **Commit and push:**
   ```bash
   git add skills/my-new-skill/
   git commit -m "feat(my-new-skill): initial release"
   git push origin main
   ```

4. **Create version tag:**
   ```bash
   git tag my-new-skill/v1.0.0
   git push origin my-new-skill/v1.0.0
   ```

### Updating an Existing Skill

1. **Make changes:**
   ```bash
   vim skills/existing-skill/SKILL.md
   ```

2. **Commit:**
   ```bash
   git add skills/existing-skill/
   git commit -m "feat(existing-skill): add new feature"
   git push origin main
   ```

3. **Create new version tag:**
   ```bash
   # Determine version bump (patch/minor/major)
   git tag existing-skill/v1.1.0
   git push origin existing-skill/v1.1.0
   ```

### Deprecating a Skill

1. **Update SKILL.md with deprecation notice:**
   ```yaml
   ---
   name: old-skill
   description: "[DEPRECATED] Use new-skill instead"
   ---

   # DEPRECATED

   This skill is deprecated. Please use `new-skill` instead.
   ```

2. **Tag final version:**
   ```bash
   git tag old-skill/v1.0.1
   git push origin old-skill/v1.0.1
   ```

---

## Maintenance Commands

### List All Version Tags

```bash
# All tags
git tag --list

# Tags for specific skill
git tag --list "ai-image-generation/*"
```

### Check Tags on GitHub

```bash
gh api repos/StartHalo/sl8-registry/tags | jq '.[].name'
```

### Delete a Tag (if needed)

```bash
# Local
git tag -d skill-name/v1.0.0

# Remote
git push origin --delete skill-name/v1.0.0
```

---

## Skills CLI Reference

```bash
# Authentication
skills login                    # Interactive GitHub OAuth
export GITHUB_TOKEN="..."       # Environment variable

# Installation
skills add <skill>              # Install latest version
skills add <skill>@1.0.0        # Install exact version
skills add <skill>@^1.0.0       # Install compatible version (1.x.x)
skills add <skill>@~1.0.0       # Install approximate version (1.0.x)

# Management
skills list                     # Show installed skills
skills update <skill>           # Update to latest
skills update                   # Update all skills
skills remove <skill>           # Uninstall skill

# Information
skills --version                # CLI version
skills --help                   # Help
```

---

## Configuration

The skills-cli uses this repository as its default registry:

```json
{
  "registry": {
    "owner": "StartHalo",
    "repo": "sl8-registry",
    "path": "skills"
  }
}
```

Users can override in `~/.config/skills-cli/config.json`.

---

## License

MIT

---

## Links

- **Skills CLI Package:** [@starthalo/skills-cli](https://github.com/StartHalo/sl8-training/tree/main/packages-nodejs/skills-cli)
- **Issues:** [GitHub Issues](https://github.com/StartHalo/sl8-registry/issues)
