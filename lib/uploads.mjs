export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageFiles(files, { maxCount = 4 } = {}) {
    if (!Array.isArray(files) || files.length === 0) return 'At least one image is required';
    if (files.length > maxCount) return `A maximum of ${maxCount} images is allowed`;
    for (const file of files) {
        if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) return 'Only JPEG, PNG, and WebP images are allowed';
        if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return 'Each image must be between 1 byte and 5 MB';
    }
    return null;
}
