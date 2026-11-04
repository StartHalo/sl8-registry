#!/usr/bin/env python3
"""agency-hook: the Claude Code PreToolUse hook (TOOL.md section 10; contract A13).

Refuses a direct write to the record, which only `agency` writes: work/agency/log.jsonl, work/agency/now.md
and the customer's folder artifacts/<customer id>/. Write and Edit are matched by path under the root ($HOME);
shell commands by the paths they name (best effort: `agency check` catches what slips through). Reading them
is allowed, and so is writing every other file. Exit code 2 blocks the tool call and shows the message.
It acts only on an agency install, where bot/setup.md names <AGENCY>; elsewhere it lets everything through (D76).
"""
import json, os, re, sys

# the record, as a shell command names it: work/agency/log.jsonl or now.md, or anything under artifacts/
# (artifacts/attachments/ is the owner's uploads, written by the web app: the agent only reads it)
NAME = r'''['"]?(?:[^\s'"|;&<>]*/)?(?:work/agency/(?:now\.md|log\.jsonl)\b|artifacts/(?!attachments/)[^\s'"|;&<>]*)'''
# A shell write to the record: redirection, tee, sed -i, rm/mv/truncate naming it, dd of=, cp/install/ln into it,
# a git command that rewrites files, or a Python write.
WRITE_BASH = re.compile(
    r'(>>?|\btee\b(\s+-a)?)\s*' + NAME
    + r'|\b(sed|perl)\s+-\S*i\S*\s[^|;&]*' + NAME
    + r'|\b(rm|mv|truncate|sponge|unlink|rsync)\b[^|;&]*' + NAME + r'|\bdd\b[^|;&]*of=' + NAME
    + r'|\b(cp|install|ln)\b[^|;&]*\s' + NAME + r'/?\s*($|[|;&])'
    + r'|\bgit\s+(checkout|restore)\b[^|;&]*' + NAME + r'|\bgit\s+(reset\s+--hard|clean)\b'
    + r'''|open\(\s*\\?['"][^'"]*(work/agency/(now\.md|log\.jsonl)|artifacts/)[^'"]*\\?['"]\s*,\s*\\?['"][wax+]'''
    + r'|(write_text|write_bytes|os\.replace|os\.rename|shutil\.\w+)\([^)]*(work/agency/(now\.md|log\.jsonl)|artifacts/)')
MSG = 'is written only by agency (use `agency log`, `task`, `send`, `status`); reading it is fine.'


def protected(rel):
    return rel in ('work/agency/log.jsonl', 'work/agency/now.md') or (
        rel.startswith('artifacts/') and not rel.startswith('artifacts/attachments/'))


def main():
    try:
        call = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    tool, inp = call.get('tool_name', ''), call.get('tool_input') or {}
    root = os.path.realpath(os.environ.get('HOME') or '.')
    try:
        if '<AGENCY>' not in open(os.path.join(root, 'bot', 'setup.md'), encoding='utf-8').read():
            return 0
    except OSError:
        return 0
    if tool in ('Write', 'Edit', 'MultiEdit', 'NotebookEdit'):
        path = inp.get('file_path') or inp.get('notebook_path') or ''
        full = os.path.realpath(os.path.join(call.get('cwd') or root, os.path.expanduser(path)))
        rel = os.path.relpath(full, root).replace(os.sep, '/')
        if protected(rel):
            print(f'{path} {MSG}', file=sys.stderr)
            return 2
    if tool == 'Bash':
        m = WRITE_BASH.search(inp.get('command', ''))
        if m:
            print(f'`{m.group(0).strip()}` would change the record (work/agency/log.jsonl, now.md or artifacts/): it {MSG}',
                  file=sys.stderr)
            return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
