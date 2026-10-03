/**
 * Asynchronous Bounded Producer-Consumer Frame Pipeline
 * Overlaps decoder seeking, canvas rendering, and video encoding with backpressure.
 */

export class AsyncFramePipeline {
  private queue: Array<() => Promise<void>> = [];
  private concurrency: number;
  private activeCount: number = 0;
  private isFlushing: boolean = false;
  private error: Error | null = null;

  constructor(maxConcurrency: number = 2) {
    this.concurrency = maxConcurrency;
  }

  /**
   * Pushes a frame processing task with backpressure.
   * If the queue is at capacity, pauses the producer until a slot frees up.
   */
  public async push(task: () => Promise<void>): Promise<void> {
    if (this.error) {
      throw this.error;
    }

    // Backpressure: wait if active tasks reach concurrency limit
    while (this.activeCount >= this.concurrency) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      if (this.error) throw this.error;
    }

    this.activeCount++;
    task()
      .catch((err) => {
        this.error = err instanceof Error ? err : new Error(String(err));
      })
      .finally(() => {
        this.activeCount--;
      });
  }

  /**
   * Flushes and awaits all remaining tasks in the pipeline.
   */
  public async drain(): Promise<void> {
    while (this.activeCount > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2));
      if (this.error) throw this.error;
    }
  }

  public reset(): void {
    this.queue = [];
    this.activeCount = 0;
    this.isFlushing = false;
    this.error = null;
  }
}
