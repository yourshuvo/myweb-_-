/**
 * Reads image pixel dimensions from file headers.
 *
 * The upload route only needs width and height, so parsing the header avoids the
 * `sharp` native binding entirely — its libvips binary is a recurring deploy
 * failure on serverless platforms (see lovell/sharp#4567: ERR_DLOPEN_FAILED
 * under Next.js 16 on Vercel).
 *
 * Supports the formats the media manager accepts: JPEG, PNG, and WebP.
 */
export type ImageDimensions = { width: number; height: number };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  // Multiplication keeps the result unsigned beyond 2^31.
  return bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function hasPngSignature(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function hasWebpSignature(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

function parsePng(bytes: Uint8Array): ImageDimensions | null {
  // 8-byte signature, 4-byte chunk length, "IHDR", then width and height.
  if (bytes.length < 24) return null;
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) return null;
  return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
}

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2; // Skip the SOI marker.
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    let marker = bytes[offset + 1];
    // Markers may be padded with extra 0xff bytes.
    while (marker === 0xff && offset + 2 < bytes.length) {
      offset += 1;
      marker = bytes[offset + 1];
    }
    // Standalone markers that carry no length payload.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) return null; // Reached scan data without a frame header.

    const segmentLength = readUint16BE(bytes, offset + 2);
    if (segmentLength < 2) return null;

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      // Segment: 2-byte marker, 2-byte length, 1-byte precision, height, width.
      return { width: readUint16BE(bytes, offset + 7), height: readUint16BE(bytes, offset + 5) };
    }

    offset += 2 + segmentLength;
  }
  return null;
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 25) return null;
  const fourcc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (fourcc === "VP8 ") {
    // Lossy: 3-byte frame tag, 3-byte start code, then 14-bit dimensions.
    if (bytes.length < 30) return null;
    return { width: readUint16LE(bytes, 26) & 0x3fff, height: readUint16LE(bytes, 28) & 0x3fff };
  }

  if (fourcc === "VP8L") {
    // Lossless: 0x2f signature, then 14-bit (dimension - 1) pairs.
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }

  if (fourcc === "VP8X") {
    // Extended: 1-byte flags, 3 reserved bytes, then 24-bit (dimension - 1) pairs.
    if (bytes.length < 30) return null;
    return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1 };
  }

  return null;
}

export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 16) return null;

  let dimensions: ImageDimensions | null = null;
  if (hasPngSignature(bytes)) dimensions = parsePng(bytes);
  else if (bytes[0] === 0xff && bytes[1] === 0xd8) dimensions = parseJpeg(bytes);
  else if (hasWebpSignature(bytes)) dimensions = parseWebp(bytes);

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return null;
  return dimensions;
}
