/**
 * Vectorium Engine - Memory Management
 * Object pooling and buffer pooling for zero-allocation performance
 */

export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private inUse = 0;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 100) {
    this.factory = factory;
    this.reset = reset;
    
    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    this.inUse++;
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.inUse--;
    this.reset(obj);
    this.available.push(obj);
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse,
      total: this.available.length + this.inUse
    };
  }
}

type TypedArray = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | 
                  Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

type TypedArrayConstructor<T> = {
  new (length: number): T;
  name: string;
};

class TypedArrayPool {
  private available: TypedArray[] = [];
  private constructor_: TypedArrayConstructor<any>;

  constructor(constructor_: TypedArrayConstructor<any>, initialSize: number) {
    this.constructor_ = constructor_;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new constructor_(0));
    }
  }

  acquire(length: number): TypedArray {
    const index = this.available.findIndex(buf => buf.length === length);
    if (index !== -1) {
      const buffer = this.available[index];
      this.available.splice(index, 1);
      return buffer;
    }
    return new this.constructor_(length);
  }

  release(buffer: TypedArray): void {
    buffer.fill(0);
    this.available.push(buffer);
  }

  clear(): void {
    this.available = [];
  }
}

interface PoolDiagnostics {
  borrows: number;
  releases: number;
  peakActive: number;
  currentActive: number;
}

export class BufferPool {
  private pools = new Map<string, TypedArrayPool>();
  private diagnostics = new Map<string, PoolDiagnostics>();

  getPool<T extends TypedArray>(
    type: TypedArrayConstructor<T>,
    initialSize: number = 100
  ): TypedArrayPool {
    const key = type.name;
    if (!this.pools.has(key)) {
      this.pools.set(key, new TypedArrayPool(type, initialSize));
      this.diagnostics.set(key, {
        borrows: 0,
        releases: 0,
        peakActive: 0,
        currentActive: 0
      });
    }
    return this.pools.get(key)!;
  }

  borrow<T extends TypedArray>(type: TypedArrayConstructor<T>, length: number): T {
    const pool = this.getPool(type);
    const buffer = pool.acquire(length) as T;
    
    const diag = this.diagnostics.get(type.name)!;
    diag.borrows++;
    diag.currentActive++;
    diag.peakActive = Math.max(diag.peakActive, diag.currentActive);
    
    return buffer;
  }

  release<T extends TypedArray>(buffer: T): void {
    const type = buffer.constructor as TypedArrayConstructor<T>;
    const pool = this.getPool(type);
    pool.release(buffer);
    
    const diag = this.diagnostics.get(type.name)!;
    diag.releases++;
    diag.currentActive--;
  }

  getDiagnostics(): Map<string, PoolDiagnostics> {
    return new Map(this.diagnostics);
  }

  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
    this.diagnostics.clear();
  }
}

// Global buffer pool instance
export const bufferPool = new BufferPool();
