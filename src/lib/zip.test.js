import { describe, it, expect } from 'vitest';
import { crc32, createZip } from './zip.js';

describe('zip', () => {
  it('computes standard crc32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes a well-formed archive', async () => {
    const blob = createZip([
      { name: 'a.svg', content: '<svg/>' },
      { name: 'b.svg', content: '<svg></svg>' },
    ]);
    const buffer = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(blob);
    });
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(2);
  });
});
