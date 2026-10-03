/**
 * Interval Tree Data Structure for High-Performance Timeline & Keyframe Querying
 * Reduces timeline element overlapping queries from O(N) to O(log N + K).
 */

export interface IntervalItem<T> {
  start: number;
  end: number;
  data: T;
}

class IntervalTreeNode<T> {
  start: number;
  end: number;
  maxEnd: number;
  items: IntervalItem<T>[];
  left: IntervalTreeNode<T> | null = null;
  right: IntervalTreeNode<T> | null = null;
  height: number = 1;

  constructor(item: IntervalItem<T>) {
    this.start = item.start;
    this.end = item.end;
    this.maxEnd = item.end;
    this.items = [item];
  }
}

export class IntervalTree<T> {
  private root: IntervalTreeNode<T> | null = null;
  private size: number = 0;

  constructor(items?: IntervalItem<T>[]) {
    if (items && items.length > 0) {
      this.buildFromItems(items);
    }
  }

  public get count(): number {
    return this.size;
  }

  public clear(): void {
    this.root = null;
    this.size = 0;
  }

  public insert(start: number, end: number, data: T): void {
    const item: IntervalItem<T> = { start, end: Math.max(start, end), data };
    this.root = this.insertNode(this.root, item);
    this.size++;
  }

  public buildFromItems(items: IntervalItem<T>[]): void {
    this.clear();
    const sorted = [...items].sort((a, b) => a.start - b.start);
    this.root = this.buildBalancedTree(sorted, 0, sorted.length - 1);
    this.size = items.length;
  }

  private buildBalancedTree(items: IntervalItem<T>[], start: number, end: number): IntervalTreeNode<T> | null {
    if (start > end) return null;
    const mid = Math.floor((start + end) / 2);
    const node = new IntervalTreeNode(items[mid]);

    node.left = this.buildBalancedTree(items, start, mid - 1);
    node.right = this.buildBalancedTree(items, mid + 1, end);

    this.updateNode(node);
    return node;
  }

  /**
   * Queries all items overlapping a specific timestamp t (start <= t <= end)
   * Time Complexity: O(log N + K) where K is number of overlapping items
   */
  public queryPoint(time: number): T[] {
    const results: T[] = [];
    this.queryPointNode(this.root, time, results);
    return results;
  }

  /**
   * Queries all items overlapping an interval [rangeStart, rangeEnd]
   * Time Complexity: O(log N + K)
   */
  public queryRange(rangeStart: number, rangeEnd: number): T[] {
    const results: T[] = [];
    this.queryRangeNode(this.root, rangeStart, rangeEnd, results);
    return results;
  }

  private queryPointNode(node: IntervalTreeNode<T> | null, time: number, results: T[]): void {
    if (!node) return;

    if (time > node.maxEnd) return;

    if (node.left && node.left.maxEnd >= time) {
      this.queryPointNode(node.left, time, results);
    }

    if (time >= node.start && time <= node.end) {
      for (let i = 0; i < node.items.length; i++) {
        results.push(node.items[i].data);
      }
    }

    if (time >= node.start && node.right) {
      this.queryPointNode(node.right, time, results);
    }
  }

  private queryRangeNode(node: IntervalTreeNode<T> | null, rangeStart: number, rangeEnd: number, results: T[]): void {
    if (!node) return;

    if (rangeStart > node.maxEnd) return;

    if (node.left && node.left.maxEnd >= rangeStart) {
      this.queryRangeNode(node.left, rangeStart, rangeEnd, results);
    }

    if (node.start <= rangeEnd && node.end >= rangeStart) {
      for (let i = 0; i < node.items.length; i++) {
        results.push(node.items[i].data);
      }
    }

    if (rangeEnd >= node.start && node.right) {
      this.queryRangeNode(node.right, rangeStart, rangeEnd, results);
    }
  }

  private getHeight(node: IntervalTreeNode<T> | null): number {
    return node ? node.height : 0;
  }

  private updateNode(node: IntervalTreeNode<T>): void {
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    let max = node.end;
    if (node.left) max = Math.max(max, node.left.maxEnd);
    if (node.right) max = Math.max(max, node.right.maxEnd);
    node.maxEnd = max;
  }

  private getBalance(node: IntervalTreeNode<T> | null): number {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  private rotateRight(y: IntervalTreeNode<T>): IntervalTreeNode<T> {
    const x = y.left!;
    const t2 = x.right;

    x.right = y;
    y.left = t2;

    this.updateNode(y);
    this.updateNode(x);

    return x;
  }

  private rotateLeft(x: IntervalTreeNode<T>): IntervalTreeNode<T> {
    const y = x.right!;
    const t2 = y.left;

    y.left = x;
    x.right = t2;

    this.updateNode(x);
    this.updateNode(y);

    return y;
  }

  private insertNode(node: IntervalTreeNode<T> | null, item: IntervalItem<T>): IntervalTreeNode<T> {
    if (!node) return new IntervalTreeNode(item);

    if (item.start === node.start && item.end === node.end) {
      node.items.push(item);
      return node;
    }

    if (item.start < node.start) {
      node.left = this.insertNode(node.left, item);
    } else {
      node.right = this.insertNode(node.right, item);
    }

    this.updateNode(node);

    const balance = this.getBalance(node);

    // Left-Left
    if (balance > 1 && item.start < (node.left?.start ?? 0)) {
      return this.rotateRight(node);
    }

    // Right-Right
    if (balance < -1 && item.start >= (node.right?.start ?? 0)) {
      return this.rotateLeft(node);
    }

    // Left-Right
    if (balance > 1 && item.start >= (node.left?.start ?? 0)) {
      node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }

    // Right-Left
    if (balance < -1 && item.start < (node.right?.start ?? 0)) {
      node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }

    return node;
  }
}
