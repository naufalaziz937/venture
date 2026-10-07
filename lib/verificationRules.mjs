import { validateImageFiles } from './uploads.mjs';
export function validateVerification(data, files) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Invalid submission';
    if (!['KTP', 'SIM'].includes(data.documentType)) return 'Choose KTP or SIM';
    for (const [key, max] of [['fullName', 150], ['phone', 30], ['billingAddress', 1000]]) {
        if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > max) return 'Invalid contact information';
    }
    for (const key of ['name', 'relationship', 'phone']) {
        if (typeof data.emergencyContact?.[key] !== 'string' || !data.emergencyContact[key].trim() || data.emergencyContact[key].length > 150) return 'Invalid emergency contact';
    }
    for (const phone of [data.phone, data.emergencyContact.phone]) {
        if (!/^\+?[0-9 ()-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return 'Invalid phone number';
    }
    if (data.consent !== true) return 'Consent is required';
    return validateImageFiles(files, { maxCount: 2 }) || (files.length !== 2 ? 'Document and selfie are required' : null);
}
export function canReview(status, ownSubmission) { return status === 'PENDING' && !ownSubmission; }
export function canSubmit(status) { return ['NOT_SUBMITTED', 'REJECTED'].includes(status); }
export function isVerified(verification) { return verification?.status === 'VERIFIED'; }
export function matchesImageSignature(bytes, mime) {
    if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
    return mime === 'image/webp' && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
}
