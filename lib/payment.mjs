export function validateCheckoutKey(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value);
}
