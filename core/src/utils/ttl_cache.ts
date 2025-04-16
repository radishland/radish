import { assertGreater } from "@std/assert";

const defaultTTL = 200;

/**
 * Normalizes fs events to prevent duplication
 */
export class TtlCache<K, V> extends Map<K, V> {
  /**
   * Throttle timeout in ms
   */
  #ttl = defaultTTL;
  #timeouts = new Map<K, number>();

  /**
   * @param ttl The time-to-live in milliseconds. Must be greater than 0
   */
  constructor(ttl = defaultTTL) {
    super();
    assertGreater(ttl, 0);
    this.#ttl = ttl;
  }

  override set(key: K, value: V): this {
    clearTimeout(this.#timeouts.get(key));
    super.set(key, value);
    const timeout = setTimeout(() => this.delete(key), this.#ttl);
    this.#timeouts.set(key, timeout);
    return this;
  }

  override delete(key: K): boolean {
    clearTimeout(this.#timeouts.get(key));
    this.#timeouts.delete(key);
    return super.delete(key);
  }

  override clear(): void {
    for (const timeout of this.#timeouts.values()) {
      clearTimeout(timeout);
    }
    this.#timeouts.clear();
    super.clear();
  }

  [Symbol.dispose](): void {
    this.clear();
  }
}
