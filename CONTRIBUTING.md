# Contributing to SL8 Skills Registry

Thank you for contributing! This guide explains how to add, update, and maintain skills in this registry.

## Table of Contents

1. [Skill Requirements](#skill-requirements)
2. [Creating a New Skill](#creating-a-new-skill)
3. [Updating a Skill](#updating-a-skill)
4. [Versioning Guidelines](#versioning-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Checklist](#code-review-checklist)

---

## Skill Requirements

Every skill MUST have:

1. **Directory structure:**
   ```
   skills/<skill-name>/
   └── SKILL.md          # Required
   ```

2. **SKILL.md with valid frontmatter:**
   ```yaml
   ---
   name: skill-name              # Must match directory name
   description: Brief desc...    # One-line description
   ---
   ```

3. **Clear documentation** explaining:
   - What the skill does
   - How to use it (Quick Start)
   - Common examples
   - Troubleshooting tips

### Optional but Recommended

- `assets/` - Static files, icons, templates
- `references/` - Detailed documentation
- `scripts/` - Helper scripts (if applicable)

---

## Creating a New Skill

### Step 1: Create Directory Structure

```bash
mkdir -p skills/my-skill/{assets,references}
```

### Step 2: Create SKILL.md

```bash
cat > skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: One-line description of what this skill enables
---

# My Skill

## Overview

Brief explanation of what this skill does and when to use it.

## Quick Start

```bash
# Minimal example to get started
my-command --option value
```

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage Examples

### Basic Usage

```bash
# Example 1
```

### Advanced Usage

```bash
# Example 2
```

## Troubleshooting

### Common Issue 1

**Problem:** Description
**Solution:** Steps to fix

### Common Issue 2

**Problem:** Description  
**Solution:** Steps to fix

## Reference

For detailed documentation, see `references/` directory.
EOF
```

### Step 3: Create Pull Request

```bash
git checkout -b feat/add-my-skill
git add skills/my-skill/
git commit -m "feat(my-skill): add initial skill"
git push origin feat/add-my-skill
```

Then create a PR on GitHub.

### Step 4: After Merge - Create Version Tag

**Important:** Only maintainers should create version tags after PR is merged.

```bash
git checkout main
git pull origin main
git tag my-skill/v1.0.0
git push origin my-skill/v1.0.0
```

---

## Updating a Skill

### Step 1: Make Changes

```bash
git checkout -b feat/update-skill-name
vim skills/skill-name/SKILL.md
```

### Step 2: Commit with Conventional Format

```bash
# For bug fixes
git commit -m "fix(skill-name): fix typo in example"

# For new features
git commit -m "feat(skill-name): add new command examples"

# For breaking changes
git commit -m "feat(skill-name)!: rename command from X to Y

BREAKING CHANGE: The command has been renamed."
```

### Step 3: Create Pull Request

```bash
git push origin feat/update-skill-name
```

### Step 4: After Merge - Create New Version Tag

```bash
git checkout main
git pull origin main

# Patch for bug fixes
git tag skill-name/v1.0.1

# Minor for new features
git tag skill-name/v1.1.0

# Major for breaking changes
git tag skill-name/v2.0.0

git push origin skill-name/vX.Y.Z
```

---

## Versioning Guidelines

We follow [Semantic Versioning](https://semver.org/):

```
<skill-name>/v<MAJOR>.<MINOR>.<PATCH>
```

### When to Increment

| Version | When to Use | Examples |
|---------|-------------|----------|
| **PATCH** (1.0.X) | Bug fixes, typos, clarifications | Fix typo, improve wording |
| **MINOR** (1.X.0) | New features, backward-compatible | Add new examples, new section |
| **MAJOR** (X.0.0) | Breaking changes | Rename commands, restructure content |

### Version Examples

```bash
# Initial release
git tag my-skill/v1.0.0

# Bug fix (typo)
git tag my-skill/v1.0.1

# New feature (added examples)
git tag my-skill/v1.1.0

# Breaking change (renamed command)
git tag my-skill/v2.0.0
```

---

## Pull Request Process

1. **Create feature branch:**
   ```bash
   git checkout -b feat/description
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "type(skill): description"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feat/description
   ```

4. **PR Review:**
   - Wait for review from maintainers
   - Address feedback
   - Get approval

5. **After Merge:**
   - Maintainer creates version tag
   - Skill becomes available via `skills add`

---

## Code Review Checklist

### For New Skills

- [ ] Directory name matches `name` in frontmatter
- [ ] SKILL.md has valid YAML frontmatter
- [ ] Description is clear and concise (< 100 chars)
- [ ] Quick Start section with working example
- [ ] No sensitive information (API keys, secrets)
- [ ] Proper formatting (code blocks, headers)

### For Updates

- [ ] Changes are clearly described in commit message
- [ ] Version bump is appropriate (patch/minor/major)
- [ ] Backward compatibility considered
- [ ] Breaking changes documented

---

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<skill-name>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure |
| `chore` | Maintenance |

### Examples

```bash
# New skill
feat(pdf): add initial PDF generation skill

# Bug fix
fix(ai-image): correct model name in example

# Documentation
docs(canvas): add troubleshooting section

# Breaking change
feat(docx)!: rename generate to create command

BREAKING CHANGE: The `generate` command is now `create`.
```

---

## Questions?

Open an issue on [GitHub Issues](https://github.com/StartHalo/sl8-registry/issues).
