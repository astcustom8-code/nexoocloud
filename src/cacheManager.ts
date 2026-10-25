import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface CacheEntry {
  key: string;
  data: Buffer;
  lastAccessed: number;
  size: number;
}

export class CacheManager {
  private cachePath: string;
  private maxCacheSize: number = 1024 * 1024 * 1024 * 5; // 5GB default
  private currentCacheSize: number = 0;
  private index: Map<string, number> = new Map();

  constructor(customPath?: string) {
    this.cachePath = customPath || path.join(app.getPath('userData'), 'local-ssd-buffer');
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
    this.rebuildIndex();
  }

  private rebuildIndex() {
    const files = fs.readdirSync(this.cachePath);
    files.forEach(file => {
      const stats = fs.statSync(path.join(this.cachePath, file));
      this.index.set(file, stats.atimeMs);
      this.currentCacheSize += stats.size;
    });
  }

  public async get(key: string): Promise<Buffer | null> {
    const safeKey = Buffer.from(key).toString('hex');
    const filePath = path.join(this.cachePath, safeKey);

    if (fs.existsSync(filePath)) {
      this.index.set(safeKey, Date.now());
      fs.utimesSync(filePath, new Date(), new Date());
      return fs.readFileSync(filePath);
    }
    return null;
  }

  public async set(key: string, data: Buffer) {
    const safeKey = Buffer.from(key).toString('hex');
    const filePath = path.join(this.cachePath, safeKey);

    while (this.currentCacheSize + data.length > this.maxCacheSize) {
      await this.evictOldest();
    }

    fs.writeFileSync(filePath, data);
    this.index.set(safeKey, Date.now());
    this.currentCacheSize += data.length;
  }

  private async evictOldest() {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, time] of this.index.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const filePath = path.join(this.cachePath, oldestKey);
      const stats = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      this.currentCacheSize -= stats.size;
      this.index.delete(oldestKey);
    }
  }

  public getStatus() {
    return {
      size: this.currentCacheSize,
      max: this.maxCacheSize,
      usage: (this.currentCacheSize / this.maxCacheSize) * 100
    };
  }
}
