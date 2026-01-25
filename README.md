# SL8 Skills Registry

Official skills registry for the `@starthalo/skills-cli`.

## Available Skills

| Skill | Latest Version | Description |
|-------|----------------|-------------|
| ai-image-generation | v1.0.0 | AI-powered image generation using DALL-E, Stable Diffusion, Imagen, Flux |
| ai-video-generation | v1.0.0 | AI-powered video generation using Veo, Runway, Kling |
| pdf | v1.0.0 | PDF document creation and manipulation |
| canvas | v1.0.0 | HTML5 Canvas-based visualization and graphics |
| docx | v1.0.0 | Microsoft Word document generation |
| xlsx | v1.0.0 | Excel spreadsheet generation |
| pptx | v1.0.0 | PowerPoint presentation generation |

## Installation

```bash
# Install the skills CLI
npm install -g @starthalo/skills-cli

# Login (for private registries)
skills login

# Or set environment variable
export GITHUB_TOKEN="your-token"

# Install a skill
skills add ai-image-generation

# Install specific version
skills add ai-image-generation@1.0.0

# List installed skills
skills list

# Remove a skill
skills remove ai-image-generation
```

## Versioning

Skills are versioned using Git tags in the format: `<skill-name>/v<semver>`

Examples:
- `ai-image-generation/v1.0.0`
- `ai-image-generation/v1.1.0`
- `pdf/v2.0.0`

## Contributing

To add a new skill:

1. Create a directory under `skills/<skill-name>/`
2. Add a `SKILL.md` file with YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Brief description of the skill
   ---
   ```
3. Create a PR
4. After merge, tag with `<skill-name>/v1.0.0`

## License

MIT
