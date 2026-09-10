export const MAX_IMAGE_DIMENSION = 2400;
export const MAX_COMPRESSED_MEGABYTES = 3.7;

export function imageCompressionOptions(fileType: string) {
  return {
    maxSizeMB: MAX_COMPRESSED_MEGABYTES,
    maxWidthOrHeight: MAX_IMAGE_DIMENSION,
    useWebWorker: true,
    preserveExif: false,
    fileType: fileType === "image/png" ? "image/png" : "image/jpeg",
  } as const;
}
