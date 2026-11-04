---
name: agency-evaluate
description: Check, once and independently, anything that will reach the customer (deliverables and every email) before it goes. Returns pass or fail with a note. Use before closing any deliverable or comms task, and to re-check anything checked more than a week ago.
metadata:
  status: core
  version: 1.0.0
---

# Evaluate

Agents grade their own work too kindly, so the check is done by a separate agent that did not
build the work: a subagent, or, if this session can't start one, a fresh process from `$HOME`
(`/home/user`):

```
claude -p "<the brief below, with the file paths>" --allowedTools Read Grep Glob "Edit(work/checks/**)" "Bash(pdftotext:*)" "Bash(pdftoppm:*)" "Bash(python3 ~/.claude/skills/agency-store-reads/store_reads.py:*)" < /dev/null
```

Run it in the foreground and read its verdict from what it returns; never poll its note with sleep.
It writes its note with Edit (a `Write(...)` rule is ignored). For its re-read, continue the same
checker with `claude -c -p "<the changed lines>" …` and the same flags. If neither way works, the task
stays unchecked and does not go: log an `error` saying so, and say it at the close.

1. **Give the subagent** the files themselves, never your summary of them:
   - the file(s);
   - the task's `do` and "done when";
   - `work/agency/CUSTOMER.md` (rules and email standard) and `bot/user.md`; for an email, `~/.claude/skills/agency-email/SKILL.md`;
   - the sources the work cites (the raw reads, not your reading of them);
   - for an email: what `agency status` prints, freshly run, so it can see the rank-1 lane's open ask and any red goal.
   Write the brief at the top of the note `work/checks/<task>-<date>.md`: one file per check.
2. **It checks, and reports each finding with its line:**
   - every fact and figure against its source;
   - nothing invented: no date, price, spend or promise nobody gave;
   - nothing internal: no internal file names, agent names, drafts or internal people (khalid is
     never named in customer text, D67);
   - the customer's rules; **for an email, agency-email's checklist, item by item** (D68);
   - the "done when";
   - it reads well for a busy founder;
   - **the questions a demanding founder would ask after reading:** each is answered in the work or
     asked in the email; any left is a finding;
   - three figures spot-checked against the saved raw reads (re-parse with the skill's `--file`);
   - pages looked at as images (`pdftoppm`), not only as text;
   - a fix sheet: the screenshots counted per urgent fix row (D71); one without one is a finding;
   - an action resting on an inferred item says "after you confirm";
   - for an email: the rank-1 lane's open ask is in it, a red goal is said, and each question in
     their emails since our last has its answer line, or the note says why not.
3. **Fix** every finding, then have the same agent re-read only the changed lines.
4. **Write the note** below the brief in `work/checks/<task>-<date>.md`: findings, fixes, result.
5. **Result:**
   - `pass` only if nothing open remains, or each remaining low finding is named in the note as
     accepted, with why: then `agency task done <id> --check pass --why work/checks/…`.
     A done deliverable re-checked later gets the same command again.
   - `fail` otherwise: `agency task done <id> --check fail --why work/checks/…`; the task stays open.
   - **Any edit after a pass** is re-read by the same checker before it is sent (`send` refuses a
     file changed since its pass, D60).
6. **An email checks its files too:** a comms task passes only if each deliverable it carries has a
   pass (`send` refuses a file whose task failed its check).
