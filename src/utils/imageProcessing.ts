/**
 * Client-side image compression and resizing utility.
 * Resizes image so longest side is at most 1024px, and compresses as JPEG ~0.8 quality.
 * Keeps memory footprint minimal and ensures payload stays well under the 4MB backend limit.
 */

export interface ProcessedImage {
  dataUrl: string;
  base64: string;
  mediaFormat: 'jpeg';
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export function processAndResizeImage(file: File, maxDimension = 1024, quality = 0.8): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for resizing.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas context.'));
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';

        // Approximate size of base64
        const compressedSize = Math.round((base64.length * 3) / 4);

        resolve({
          dataUrl,
          base64,
          mediaFormat: 'jpeg',
          originalSize: file.size,
          compressedSize,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
