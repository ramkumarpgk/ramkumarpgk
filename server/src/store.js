// Tiny JSON-file store. Good enough for one family; swap for Postgres/Firestore later.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(file) {
    this.file = file;
    this.data = { members: [], events: [] };
    if (file && existsSync(file)) {
      this.data = { ...this.data, ...JSON.parse(readFileSync(file, 'utf8')) };
    }
  }

  save() {
    if (!this.file) return; // in-memory (tests)
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file);
  }

  get members() { return this.data.members; }
  get events() { return this.data.events; }
}
