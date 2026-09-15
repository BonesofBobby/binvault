import { AsyncLocalStorage } from "node:async_hooks";

/** In-process gate; callers must enter at the outermost database/media mutation. */
export class MaintenanceGate {
  private activeMutations = 0;
  private captureActive = false;
  private queuedCaptures = 0;
  private waiters: (() => void)[] = [];
  private readonly context = new AsyncLocalStorage<{ active: boolean }>();
  private readonly captureContext = new AsyncLocalStorage<{ active: boolean }>();

  private wait() { return new Promise<void>((resolve) => this.waiters.push(resolve)); }
  private notify() { for (const resolve of this.waiters.splice(0)) resolve(); }

  async mutation<T>(work: () => Promise<T>): Promise<T> {
    if (this.captureContext.getStore()?.active) throw new Error("Cannot mutate during backup capture.");
    if (this.context.getStore()?.active) return work();
    while (this.captureActive || this.queuedCaptures) await this.wait();
    this.activeMutations++;
    const scope = { active: true };
    try { return await this.context.run(scope, work); }
    finally { scope.active = false; this.activeMutations--; this.notify(); }
  }

  async capture<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active || this.captureContext.getStore()?.active) {
      throw new Error("Cannot capture backup during a mutation or capture.");
    }
    this.queuedCaptures++;
    while (this.captureActive || this.activeMutations) await this.wait();
    this.queuedCaptures--;
    this.captureActive = true;
    const scope = { active: true };
    try { return await this.captureContext.run(scope, work); }
    finally { scope.active = false; this.captureActive = false; this.notify(); }
  }
}

const processState = globalThis as typeof globalThis & { binvaultMaintenanceGate?: MaintenanceGate };
export const maintenanceGate = processState.binvaultMaintenanceGate ??= new MaintenanceGate();
