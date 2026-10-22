/**
 * Patrón Cloud / Resiliencia: Bulkhead (Mamparo) y Limitador de Concurrencia.
 * Protege el servidor y el proceso Chromium contra agotamiento de memoria (OOM)
 * ante ráfagas de solicitudes de renderizado concurrentes.
 */
export class BulkheadSemaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number = 2,
    private readonly maxQueue: number = 10,
    private readonly timeoutMs: number = 30000,
  ) {}

  async acquire(): Promise<() => void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return () => this.release();
    }

    if (this.queue.length >= this.maxQueue) {
      throw new Error(
        `Servicio temporalmente saturado (Bulkhead): cola llena (${this.queue.length}/${this.maxQueue}). Reintente en unos instantes.`,
      );
    }

    return new Promise<() => void>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const enter = () => {
        if (timer) clearTimeout(timer);
        this.active++;
        resolve(() => this.release());
      };

      timer = setTimeout(() => {
        const idx = this.queue.indexOf(enter);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new Error("Tiempo de espera agotado en la cola de generación de documentos."));
        }
      }, this.timeoutMs);

      this.queue.push(enter);
    });
  }

  private release(): void {
    this.active--;
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  get stats() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
    };
  }
}

/** Instancia singleton para renderizado PDF en el servidor. */
export const pdfRenderBulkhead = new BulkheadSemaphore(
  Number(process.env.MAX_CONCURRENT_PDF || 2),
  Number(process.env.MAX_QUEUE_PDF || 10),
  45000,
);
