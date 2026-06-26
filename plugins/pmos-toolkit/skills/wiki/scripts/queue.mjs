// queue.mjs — resumable smallest-first checkpointed enrichment queue (Story 260624-1e5, AC2 / D9).
// Smallest-first ordering, checkpoint after each item, idempotent resume (no dupes), and a clean
// RateLimitHalt exit that leaves a resumable snapshot. Pure (no file IO — the caller persists the
// snapshot wherever the substrate's .ingest-state lives). Pure Node stdlib.

/** Throw this from a processFn to halt the queue cleanly (e.g. on a rate-limit / usage cap). */
export class RateLimitHalt extends Error {
  constructor(message = 'rate limit halt') {
    super(message);
    this.name = 'RateLimitHalt';
    this.halt = true;
  }
}

export class IngestQueue {
  /**
   * @param {Array<{id:string,size:number}>} items
   * @param {{state?:{completed?:string[]}}} [opts]  resume from a prior snapshot
   */
  constructor(items, opts = {}) {
    if (!Array.isArray(items)) throw new TypeError('IngestQueue: items must be an array');
    this.items = items.map((it) => ({ id: String(it.id), size: Number(it.size) || 0 }));
    const completed = (opts.state && Array.isArray(opts.state.completed)) ? opts.state.completed : [];
    this.completed = new Set(completed.map(String));
  }

  /** All item ids in smallest-first order (size asc, ties by id asc for determinism). */
  order() {
    return this.items
      .slice()
      .sort((a, b) => (a.size - b.size) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((it) => it.id);
  }

  /** Ordered ids not yet completed. */
  pending() {
    return this.order().filter((id) => !this.completed.has(id));
  }

  /** Current resumable snapshot. */
  snapshot() {
    return { completed: [...this.completed] };
  }

  /**
   * Process pending items smallest-first. Checkpoints after each. A processFn that throws a
   * RateLimitHalt (or any error with `.halt === true`) stops cleanly, leaving a resumable snapshot.
   * Other errors propagate (a real failure, not a planned halt).
   * @param {(item:{id:string,size:number}) => any|Promise<any>} processFn
   * @param {{onCheckpoint?:(snapshot:{completed:string[]}) => void}} [opts]
   * @returns {Promise<{done:boolean, halted:boolean, snapshot:{completed:string[]}}>}
   */
  async run(processFn, opts = {}) {
    const onCheckpoint = typeof opts.onCheckpoint === 'function' ? opts.onCheckpoint : null;
    const byId = new Map(this.items.map((it) => [it.id, it]));
    for (const id of this.pending()) {
      try {
        await processFn(byId.get(id));
      } catch (e) {
        if (e && e.halt === true) {
          return { done: false, halted: true, snapshot: this.snapshot() };
        }
        throw e;
      }
      this.completed.add(id); // mark done only after success → no dupes, no lost work
      if (onCheckpoint) onCheckpoint(this.snapshot());
    }
    return { done: true, halted: false, snapshot: this.snapshot() };
  }
}

export default { IngestQueue, RateLimitHalt };
