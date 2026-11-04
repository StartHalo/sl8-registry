**Keep it simple (KISS).** Every line here is the least that makes the job good.

# The standard

What a good job looks like, from a request to done. The operator works to it; an independent agent
judges every run against it (D54); it improves after every verdict (last section).

## The principles (D56)

Everything here follows from these, in this order:

1. **Simplest:** KISS; remove before adding.
2. **Clarity:** exactly what is to be done: input, output, scope, acceptance (done when) and steps;
   achievable. A rule is repeated only where it adds value.
3. **One source of truth:** each fact in one place (the log). A derived view is printed when asked,
   or written only at a status check (`agency status` writes now.md).
4. **Auditable:** every action leaves a trace (an event, a check note, a run file) an independent
   agent can read to see if something is wrong; an audit can run any time.
5. **Communicate, don't wait:** what matters is said now; nothing checked is held.
6. **Complete:** a task given is carried from start to done, nothing missed.
7. **Quality:** the customer has no questions left.
8. **Speed,** from simplicity: no step twice.

## The ideal job

1. **The request** has a goal (from X to Y), a date, the customer's way of doing it, and a scope.
   What's missing is asked once.
2. **Discovery, then plan** (D51): the facts the goal needs are found first; then the plan sets the
   lanes and their first tasks.
3. **The tasks run** in pick order, each to its done when; anything for the customer is checked.
4. **Comms after every run** (D52): what the customer needs to hear is worked out from what
   happened, and sent.
5. **Shared in `artifacts/`** (D53, D64): every checked piece is there, copied at its pass.
   2026-10-30 · UC1 run 2026-10-30-uc1: `artifacts/` holds only what the customer may see; dropped or
   out-of-scope versions leave it when dropped.
6. **Closed:** the goal is met and the customer accepted it (or the engagement ends), the close is sent, nothing open is forgotten.

## The ideal lane

- A scope the customer could read: what it covers and what it doesn't.
- One gauge with a weekly target, a done rule and a pause rule you can test.
- A line in the plan's sums saying how it moves the goal.
- Tasks for the next move only; each seed skipped or merged has a why.
- 2026-10-30 · UC1 run 2026-10-30-uc1: the scope names the steps of the path, not the request's list
  of pages; a page touched only in passing is out unless the request names it.

## The ideal task

- A clear scope, achievable, one output in one place; a done when you can test (D62).
- Its skill named (or its kind's default), and the files it reads.
- For the customer: the quality bar of its skill, and a checker's pass with no founder question left.

## The ideal communication

The plan in a few lines once it's made; each deliverable in the next email; progress weekly on a
running lane; an answer to every question; the close. At most 2-3 emails we start a week, the rest aggregated unless urgent, each with every ask needed (D74). Short, sourced, no
internal words, signed "Slate Agency".

- 2026-10-30 · UC1 run 2026-10-30-uc1: the first customer email carries the plan and the first checked
  deliverable; questions ride along, never alone (since D74: 2-3 emails a week, aggregated).
- 2026-10-30 · UC1 run 2026-10-30-uc1: a new ask is answered in the next email: agreed
  and done inside the parameters, or told plainly as outside this engagement (D67 replaces "passed to
  khalid"); khalid's name never appears in what the customer reads.

## Skills

A **planning skill** (agency-plan, and any domain planning skill) has: when it fits · the facts it
needs from discovery · how it moves the goal (the sums) · the lanes it offers (scope, gauge, done,
pause, score guidance, seed tasks) · what good looks like (an example and benchmarks with sources) ·
the questions customers ask · Lessons (dated).

A **task skill** has: when to use it · inputs · steps · where the output goes · its quality bar (an
example of good and the checklist the checker uses) · how to verify · Lessons (dated).

Both: a description that says when to use it, first; under 200 lines; status draft until it passes a
verdict in a real run, then proven.

## The verdict on the overall job

Graded **met / partly / missed**, each with evidence (log lines, files):

- **Complete:** the request reached done. Discovery and plan came first, every task is done or
  dropped with why, the customer received the work in `artifacts/`, nothing waits unseen.
- **Quality:** the customer has no questions left. Every check passed, the work meets its skill's
  bar, the emails meet the communication standard, nothing invented.
  2026-10-30 · UC1 run 2026-10-30-uc1: a customer piece never refers to versions the customer did not
  receive.
- **Speed:** no redundant step. Steps against the use case's flow, repeats, waits, and scripts the
  operator had to write itself (each is a skill gap).

## How the standard improves

Every verdict that finds a miss this file didn't name adds one dated line to the section it belongs
to, citing the run. A line that catches nothing in five runs is removed.
