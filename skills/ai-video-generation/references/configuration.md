# Configuration Guide

Complete guide to configuring the AI video generation CLI.

## Configuration File (.ai-kits.json)

The CLI uses a JSON configuration file (typically `.ai-kits.json`) for credentials and defaults.

### Location Precedence

The CLI searches for configuration in this order:

1. Path specified via `--config` flag
2. `.ai-kits.json` in current directory
3. `.ai-kits.json` in parent directories (searches up)
4. `.ai-kits.json` in home directory (`~/.ai-kits.json`)

### Complete Configuration Schema

```json
{
  "userId": "your-user-id",
  "providers": {
    "replicate": {
      "apiToken": "your-replicate-api-token"
    },
    "openai": {
      "apiKey": "your-openai-api-key"
    },
    "google": {
      "apiKey": "your-google-api-key"
    }
  },
  "billing": {
    "polar": {
      "accessToken": "your-polar-access-token",
      "organizationId": "your-polar-org-id",
      "server": "production"
    }
  },
  "storage": {
    "gcs": {
      "bucketName": "your-gcs-bucket",
      "projectId": "your-gcp-project-id",
      "credentialsPath": "/path/to/gcs-credentials.json"
    }
  },
  "defaults": {
    "video": {
      "duration": 10,
      "resolution": "1080p",
      "aspectRatio": "16:9",
      "fps": 30
    }
  },
  "logging": {
    "level": "info"
  }
}
```

## Required Fields

### Core Configuration

**userId** (required)
- Your unique user identifier in the Polar.sh billing system
- Used for credit validation and charging
- Format: UUID string (e.g., `"99689c9a-db25-47b7-824d-3e53dd7023df"`)

### Provider Configuration (at least one required)

The CLI needs API credentials for at least one provider. All current video models use Replicate:

**providers.replicate.apiToken** (required for all models)
- Required for: All video models (bytedance/*, google/*, minimax/*)
- Obtain from: https://replicate.com/account/api-tokens
- Format: String starting with `r8_`

**providers.openai.apiKey** (optional)
- Currently no video models use OpenAI directly
- Include if you also use the ai-image CLI with OpenAI models
- Format: String starting with `sk-`

**providers.google.apiKey** (optional)
- For direct Google API access (not via Replicate)
- Include if you plan to use direct Google Vertex AI integration
- Format: String starting with `AIzaSy`

### Billing Configuration (required)

**billing.polar.accessToken** (required)
- Your Polar.sh API access token
- Used for credit balance checks and charging
- Obtain from: Polar.sh dashboard
- Format: String starting with `polar_oat_`

**billing.polar.organizationId** (required)
- Your organization ID in Polar.sh
- Format: UUID string

**billing.polar.server** (optional)
- Server environment: `"production"` or `"sandbox"`
- Default: `"production"`
- Use `"sandbox"` for testing

### Storage Configuration (required)

**storage.gcs.bucketName** (required)
- Google Cloud Storage bucket name for media uploads
- Format: Bucket name (e.g., `"my-ai-media-bucket"`)

**storage.gcs.projectId** (required)
- Google Cloud Platform project ID
- Format: GCP project ID string

**storage.gcs.credentialsPath** (optional)
- Path to GCS service account JSON credentials
- If not provided, uses GOOGLE_APPLICATION_CREDENTIALS environment variable
- Format: Absolute or relative path to JSON file

## Optional Fields

### Default Settings

Configure default values for generation parameters:

**defaults.video.duration**
- Default video duration in seconds
- Range: 1-30
- Default: 10

**defaults.video.resolution**
- Default video resolution
- Options: `"480p"`, `"720p"`, `"1080p"`, `"1440p"`, `"2160p"`
- Default: `"1080p"`

**defaults.video.aspectRatio**
- Default aspect ratio
- Options: `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`, `"3:4"`
- Default: `"16:9"`

**defaults.video.fps**
- Default frames per second
- Typical values: 24, 30, 60
- Default: Model-specific (usually 30)

### Logging Configuration

**logging.level**
- Log verbosity level
- Options: `"error"`, `"warn"`, `"info"`, `"debug"`
- Default: `"info"`

## Environment Variables

As an alternative to the configuration file, you can set these environment variables:

```bash
# Core
export USER_ID="your-user-id"

# Providers
export REPLICATE_API_TOKEN="your-replicate-token"
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_API_KEY="your-google-key"

# Billing
export POLAR_ACCESS_TOKEN="your-polar-token"
export POLAR_ORGANIZATION_ID="your-polar-org-id"
export POLAR_SERVER="production"

# Storage
export GCS_BUCKET_NAME="your-bucket"
export GCS_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"

# Logging
export LOG_LEVEL="info"
```

**Precedence**: Command-line arguments > Environment variables > Config file values

## Quick Setup

### Minimal Configuration

For quick testing with Replicate (works with all video models):

```json
{
  "userId": "YOUR_USER_ID",
  "providers": {
    "replicate": {
      "apiToken": "YOUR_REPLICATE_TOKEN"
    }
  },
  "billing": {
    "polar": {
      "accessToken": "YOUR_POLAR_TOKEN",
      "organizationId": "YOUR_ORG_ID",
      "server": "sandbox"
    }
  },
  "storage": {
    "gcs": {
      "bucketName": "YOUR_BUCKET",
      "projectId": "YOUR_PROJECT"
    }
  }
}
```

### Production Configuration

For production use with custom defaults:

```json
{
  "userId": "YOUR_USER_ID",
  "providers": {
    "replicate": {
      "apiToken": "YOUR_REPLICATE_TOKEN"
    }
  },
  "billing": {
    "polar": {
      "accessToken": "YOUR_POLAR_TOKEN",
      "organizationId": "YOUR_ORG_ID",
      "server": "production"
    }
  },
  "storage": {
    "gcs": {
      "bucketName": "YOUR_BUCKET",
      "projectId": "YOUR_PROJECT",
      "credentialsPath": "./.gcs-key.json"
    }
  },
  "defaults": {
    "video": {
      "duration": 10,
      "resolution": "1080p",
      "aspectRatio": "16:9",
      "fps": 30
    }
  },
  "logging": {
    "level": "info"
  }
}
```

## Security Best Practices

1. **Never commit** `.ai-kits.json` to version control
   - Add to `.gitignore`

2. **Use restrictive permissions**:
   ```bash
   chmod 600 .ai-kits.json
   ```

3. **Rotate credentials regularly**
   - Especially after sharing config templates

4. **Use sandbox environment** for testing:
   ```json
   {
     "billing": {
       "polar": {
         "server": "sandbox"
       }
     }
   }
   ```

5. **Protect GCS credentials**:
   ```bash
   chmod 600 .gcs-key.json
   ```

## Troubleshooting

### Configuration Not Found

**Error**: "Configuration file not found"

**Solution**:
- Specify config path: `--config /path/to/.ai-kits.json`
- Or place `.ai-kits.json` in current directory
- Or use environment variables

### Invalid Credentials

**Error**: "Authentication failed" or "Invalid API token"

**Solution**:
- Verify API tokens are correct and active
- Check for extra whitespace in config file
- Ensure tokens haven't expired
- For video models, ensure Replicate token is configured

### Provider Not Configured

**Error**: "Provider replicate is not configured"

**Solution**:
- All video models require Replicate
- Add `providers.replicate.apiToken` to configuration
- Or set `REPLICATE_API_TOKEN` environment variable

### Storage Upload Failed

**Error**: "Failed to upload to GCS"

**Solution**:
- Verify GCS credentials file exists and is valid
- Check bucket name and project ID are correct
- Ensure service account has write permissions to bucket
- Verify bucket is in the correct project

### Insufficient Credits

**Error**: "Insufficient credits for generation"

**Solution**:
```bash
# Check balance
ai-video balance

# Estimate cost first
ai-video estimate --model "..." --duration X

# Use a cheaper model or shorter duration
ai-video generate --prompt "..." --model "bytedance/seedance-1-pro-fast" --duration 5
```

## Model-Provider Mapping

All currently supported video models use **Replicate** as the provider:

| Model | Provider Required |
|-------|------------------|
| bytedance/seedance-1-pro-fast | Replicate |
| bytedance/seedance-1-pro | Replicate |
| google/veo-3-1 | Replicate |
| google/veo-3.1 | Replicate |
| google/veo-3.1-fast | Replicate |
| minimax/hailuo-2.3 | Replicate |

**Important**: Even though models are named with provider prefixes (google/, bytedance/), they all access through the Replicate API. You only need a Replicate token, not tokens for each individual provider.
