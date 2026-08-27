---
name: hermes-tweet
description: Use Hermes Tweet from Hermes Agent for X/Twitter search, social listening, launch monitoring, publishing, monitors, webhooks, media, draws, and trends through Xquik.
license: MIT
metadata:
  author: Xquik
  version: 1.0.0
  category: social-media
  tags: hermes-agent, xquik, twitter, x, social-listening, automation
  inputs:
    - name: request
      type: text
      required: true
      description: The X/Twitter task, endpoint discovery request, read query, or approved action the user wants to perform.
    - name: hermes-runtime
      type: environment
      required: true
      description: Hermes Agent runtime with the `hermes-tweet` plugin installed and `XQUIK_API_KEY` configured for authenticated reads.
  outputs:
    - name: endpoint-plan
      type: markdown
      description: The selected `tweet_explore`, `tweet_read`, or approved `tweet_action` path with concise reasoning.
    - name: result-summary
      type: markdown
      description: A concise summary of X/Twitter data, monitoring setup, or approved action result.
---

# Hermes Tweet

Use Hermes Tweet when a Hermes Agent workflow needs X/Twitter context or
controlled account actions through Xquik.

Hermes Tweet is a native Hermes Agent plugin published as the `hermes-tweet`
Python package. It exposes three tools:

- `tweet_explore` searches the bundled Xquik endpoint catalog without network
  credentials.
- `tweet_read` calls catalog-listed read-only endpoints after `XQUIK_API_KEY`
  is configured in the Hermes runtime.
- `tweet_action` handles writes, private reads, monitors, webhooks, extraction
  jobs, media, and giveaway draws only when `HERMES_TWEET_ENABLE_ACTIONS=true`.

## Setup

Install and enable the plugin in the Hermes runtime:

```bash
hermes plugins install Xquik-dev/hermes-tweet --enable
```

If Hermes already installed the package without enabling it, run:

```bash
hermes plugins enable hermes-tweet
```

Set `XQUIK_API_KEY` in the Hermes runtime environment or `~/.hermes/.env`.
Never paste API keys into chat, prompts, logs, issue bodies, or tool inputs.

Keep account-changing actions disabled unless the session needs an approved
action:

```bash
export HERMES_TWEET_ENABLE_ACTIONS=false
```

Set `HERMES_TWEET_ENABLE_ACTIONS=true` only for workflows with explicit user
approval for the exact action.

## Workflow

1. Use `tweet_explore` to find the catalog endpoint.
2. Use `tweet_read` for public read-only endpoints.
3. Use `tweet_action` only after the user approves the exact write, private
   read, monitor, webhook, extraction job, media action, or giveaway draw.

## When to Use

- Social listening and launch monitoring.
- Creator, brand, and community research.
- Support triage from public mentions or profiles.
- Giveaway and follower evidence checks.
- Drafting or publishing X posts through an explicit approval step.
- Hermes Desktop, TUI, CLI, remote gateway, or cron sessions that need the same
  enabled `hermes-tweet` toolset.

## Safety Rules

- Never ask for or reveal API keys, passwords, cookies, signing keys, or TOTP
  secrets.
- Never pass credentials in tool arguments.
- Do not guess endpoint paths. Use `tweet_explore`.
- Do not use dashboard-admin, billing, credit top-up, API-key, account
  re-authentication, or support-ticket endpoints.
- Keep `tweet_action` disabled for unattended or read-only workflows.
- For remote gateway profiles, install and configure Hermes Tweet on the remote
  Hermes host where plugin tools execute.

## Checks

After setup, verify:

```bash
hermes plugins list
hermes tools list
```

Confirm `hermes-tweet` is enabled, `tweet_explore` appears without
`XQUIK_API_KEY`, `tweet_read` appears after the key is configured, and
`tweet_action` appears only when actions are enabled.
