---
name: agency-task
description: Do one task end to end by its kind and skill, or refine a task that can't be done as written. Use for each task the runner picks, and for work-kind tasks with no other skill.
metadata:
  status: core
  version: 1.0.0
---

# Do one task

1. **Executable?** A clear scope, achievable, a clear `do`, its refs or `follows`, its skill, a
   "done when" you can test (D62), and an output place.
   - If something is missing, refine it first: `agency log task_refined '{"task":{"id":…,…}}'`.
   - If only the customer can supply it, add the customer task or comms question, and move
     on.
2. **Start:** `agency task start <id>`. It prints what to read; read it all, after the Taste and the
   references that `bot/setup.md`'s `<AGENCY>` names.
3. **Do it** with the named skill. If none fits, work it out yourself and keep notes in `work/`;
   then add a dated line to `work/lessons.md`, tagged `[core]` or `[<agency>]`, so the next release
   makes it easy (A15).
4. **Long work:** if it won't finish this session, write where you stopped in a `work/` file, name it
   in the task's notes, and leave it `running`: the next session resumes it first.
   **Blocked** on another task: `agency task wait <id> --on <task id>`.
5. **Verify** against "done when". For a deliverable or a comms task, run the agency-evaluate skill. Only a
   pass lets it be done.
6. **Close:** `agency task done <id> --out <path> [--check pass] [--why "<evaluator note path>"]`. A
   customer task is closed when they tell you it's done, or when you see it done in a read. A pass
   copies the checked output into `artifacts/<customer id>/` (D64).
