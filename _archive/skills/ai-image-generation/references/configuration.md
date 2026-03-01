# Configuration Guide

Complete guide to configuring the AI image generation CLI.

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
    },
    "fal": {
      "apiKey": "your-fal-api-key"
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
    "image": {
      "width": 1024,
      "height": 1024,
      "quality": "standard",
      "numImages": 1
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

The CLI needs API credentials for at least one provider. Configure the providers for models you want to use:

**providers.replicate.apiToken**
- Required for: stability-ai/*, replicate/*, and some google/* models
- Obtain from: https://replicate.com/account/api-tokens
- Format: String starting with `r8_`

**providers.openai.apiKey**
- Required for: openai/dall-e-* models
- Obtain from: https://platform.openai.com/api-keys
- Format: String starting with `sk-`

**providers.google.apiKey**
- Required for: google/imagen-* models (direct API)
- Obtain from: Google Cloud Console
- Format: String starting with `AIzaSy`

**providers.fal.apiKey**
- Required for: fal-ai/* models
- Obtain from: https://fal.ai/dashboard
- Format: FAL API key string

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

**defaults.image.width**
- Default image width in pixels
- Default: 1024

**defaults.image.height**
- Default image height in pixels
- Default: 1024

**defaults.image.quality**
- Default quality setting: `"standard"` or `"hd"`
- Default: `"standard"`
- Note: Only applies to models that support quality settings (e.g., DALL-E 3)

**defaults.image.numImages**
- Default number of images to generate
- Default: 1

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
export FAL_API_KEY="your-fal-key"

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

For quick testing with Replicate:

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

### Multi-Provider Configuration

For using all providers:

```json
{
  "userId": "YOUR_USER_ID",
  "providers": {
    "replicate": {
      "apiToken": "YOUR_REPLICATE_TOKEN"
    },
    "openai": {
      "apiKey": "YOUR_OPENAI_KEY"
    },
    "google": {
      "apiKey": "YOUR_GOOGLE_KEY"
    },
    "fal": {
      "apiKey": "YOUR_FAL_KEY"
    }
  },
  "billing": {
    "polar": {
      "accessToken": "YOUR_POLAR_TOKEN",
      "organizationId": "YOUR_ORG_ID"
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
    "image": {
      "width": 1280,
      "height": 720,
      "quality": "hd",
      "numImages": 1
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

### Provider Not Configured

**Error**: "Provider X is not configured"

**Solution**:
- Add the provider configuration to `.ai-kits.json`
- Or set the corresponding environment variable

### Storage Upload Failed

**Error**: "Failed to upload to GCS"

**Solution**:
- Verify GCS credentials file exists and is valid
- Check bucket name and project ID are correct
- Ensure service account has write permissions to bucket
