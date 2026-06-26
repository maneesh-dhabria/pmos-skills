// stitch.mjs — byte-exact overflow stitch (Story 260624-1e5, AC2 / D9).
// A large document fetched in overflow parts is reassembled by PURE byte concatenation
// (the saved-file mechanism), so a multi-byte codepoint split across parts is corruption-proof.
// Pure Node stdlib.
//
//   splitBytes(buf, chunkSize) -> Buffer[]   (split at fixed byte offsets; for tests + the saver)
//   stitch(parts)              -> Buffer     (Buffer.concat of parts; strings -> utf8 bytes)

function toBuffer(p) {
  if (Buffer.isBuffer(p)) return p;
  if (p instanceof Uint8Array) return Buffer.from(p);
  if (typeof p === 'string') return Buffer.from(p, 'utf8');
  if (p == null) return Buffer.alloc(0);
  throw new TypeError(`stitch: unsupported part type ${typeof p}`);
}

/**
 * Split a buffer into fixed-size byte chunks. Boundaries are byte offsets — they may fall
 * mid-codepoint; stitch() restores the exact bytes regardless.
 * @param {Buffer|Uint8Array|string} input
 * @param {number} chunkSize bytes per part (must be > 0)
 * @returns {Buffer[]}
 */
export function splitBytes(input, chunkSize) {
  const buf = toBuffer(input);
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError('stitch.splitBytes: chunkSize must be a positive integer');
  }
  const parts = [];
  for (let i = 0; i < buf.length; i += chunkSize) {
    // subarray() is a view; copy so callers can treat parts as independent saved files.
    parts.push(Buffer.from(buf.subarray(i, Math.min(i + chunkSize, buf.length))));
  }
  return parts.length ? parts : [Buffer.alloc(0)];
}

/**
 * Reassemble overflow parts byte-exactly.
 * @param {Array<Buffer|Uint8Array|string>} parts
 * @returns {Buffer}
 */
export function stitch(parts) {
  if (!Array.isArray(parts)) throw new TypeError('stitch: parts must be an array');
  return Buffer.concat(parts.map(toBuffer));
}

export default { splitBytes, stitch };
