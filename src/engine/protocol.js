import { EventEmitter } from 'node:events';

export class ProtocolParser extends EventEmitter {
  constructor(readableStream) {
    super();
    this._buffer = '';

    readableStream.on('data', (chunk) => {
      this._buffer += chunk.toString('utf-8');
      this._processBuffer();
    });

    readableStream.on('end', () => {
      // Process any remaining data in buffer
      if (this._buffer.trim()) {
        this._parseLine(this._buffer.trim());
      }
      this.emit('end');
    });
  }

  _processBuffer() {
    const lines = this._buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this._buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this._parseLine(trimmed);
      }
    }
  }

  _parseLine(line) {
    try {
      const msg = JSON.parse(line);
      this.emit('message', msg);
    } catch {
      this.emit('message', { type: 'parse_error', raw: line });
    }
  }
}

export function encode(obj) {
  return JSON.stringify(obj) + '\n';
}

export function decode(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}
