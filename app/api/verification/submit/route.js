import { randomUUID } from 'node:crypto';
import RentalVerification from '@/models/rentalVerification';
import { verificationUser, verificationResponse, verificationSummary, verificationError } from '@/lib/rentalVerification';
import { validateVerification } from '@/lib/verificationRules.mjs';
import { uploadIdentityImage, deleteIdentityImages } from '@/lib/verificationStorage';
async function readSubmissionForm(request) {
    const limit = 11 * 1024 * 1024;
    if (!request.body) return request.formData();
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw Object.assign(new Error('Upload too large'), { status: 413 });
        }
        chunks.push(value);
    }
    return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
}
async function submit(request, resubmit) {
    let lock, userId;
    const uploaded = [];
    try {
        const { user, response } = await verificationUser(request);
        if (response) return response;
        userId = user._id;
        await RentalVerification.init();
        if (Number(request.headers.get('content-length')) > 11 * 1024 * 1024) return verificationResponse({ success: false, message: 'Upload too large' }, 413);
        const form = await readSubmissionForm(request);
        let data;
        try { data = JSON.parse(form.get('data')); } catch { return verificationResponse({ success: false, message: 'Invalid submission' }, 400); }
        const files = [form.get('documentImage'), form.get('selfieImage')];
        const validation = validateVerification(data, files);
        if (validation) return verificationResponse({ success: false, message: validation }, 400);
        await RentalVerification.updateOne({ userId }, { $setOnInsert: { userId, status: 'NOT_SUBMITTED' } }, { upsert: true });
        lock = randomUUID();
        const existing = await RentalVerification.findOneAndUpdate({
            userId, status: resubmit ? 'REJECTED' : 'NOT_SUBMITTED',
            $or: [{ submissionLock: { $exists: false } }, { lockExpiresAt: { $lt: new Date() } }],
        }, { $set: { submissionLock: lock, lockExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } }, { new: true }).select('+documentImage +selfieImage');
        if (!existing) return verificationResponse({ success: false, message: 'Submission cannot be changed in its current state' }, 409);
        for (const file of files) uploaded.push(await uploadIdentityImage(file));
        const record = await RentalVerification.findOneAndUpdate({ userId, submissionLock: lock }, {
            $set: { documentType: data.documentType, documentImage: uploaded[0], selfieImage: uploaded[1],
                fullName: data.fullName.trim(), phone: data.phone.trim(), billingAddress: data.billingAddress.trim(),
                emergencyContact: { name: data.emergencyContact.name.trim(), relationship: data.emergencyContact.relationship.trim(), phone: data.emergencyContact.phone.trim() },
                status: 'PENDING', submittedAt: new Date(), consentAt: new Date() },
            $unset: { rejectionReason: '', verifiedAt: '', rejectedAt: '', reviewedBy: '', reviewedAt: '', submissionLock: '', lockExpiresAt: '' },
        }, { new: true, runValidators: true });
        if (!record) throw new Error('Submission lock lost');
        uploaded.length = 0;
        await deleteIdentityImages([existing.documentImage, existing.selfieImage]).catch(() => {});
        return verificationResponse({ success: true, verification: verificationSummary(record), message: 'Verification submitted successfully.' }, 201);
    } catch (error) {
        await deleteIdentityImages(uploaded).catch(() => {});
        if (lock && userId) await RentalVerification.updateOne({ userId, submissionLock: lock }, { $unset: { submissionLock: '', lockExpiresAt: '' } }).catch(() => {});
        return verificationError(error);
    }
}
export async function POST(request) { return submit(request, false); }
export async function PUT(request) { return submit(request, true); }
