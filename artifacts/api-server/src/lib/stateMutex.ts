// Simple in-process async mutex used to serialize read-modify-write sequences
// against the shared catalog.json state store. The file-based store has no
// transactional guarantees, so concurrent handlers can otherwise interleave
// readState() -> mutate -> writeState() and silently drop each other's writes
// (or defeat counters like OTP attempt limits). Wrapping a full
// read-modify-write in runExclusive() makes it atomic within this process.
//
// This is an MVP safeguard for the JSON store; the durable fix is to move these
// mutations onto the transactional Postgres database.

let chain: Promise<unknown> = Promise.resolve();

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  // Queue the task after whatever is currently running, regardless of whether
  // the previous task resolved or rejected.
  const run = chain.then(task, task);
  // Keep the chain progressing without leaking unhandled rejections.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
