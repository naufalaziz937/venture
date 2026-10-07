import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import RentalVerification from '@/models/rentalVerification';
import { isVerified } from './verificationRules.mjs';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' };
export function verificationResponse(body, status = 200) { return NextResponse.json(body, { status, headers: privateHeaders }); }
export async function verificationUser(request) {
    const { userId } = getAuth(request);
    if (!userId) return { response: verificationResponse({ success: false, message: 'Unauthorized' }, 401) };
    await connectDB();
    return { user: await ensureMongoUser(userId), clerkId: userId };
}
export function verificationSummary(record) {
    if (!record) return { status: 'NOT_SUBMITTED' };
    return { _id: record._id, status: record.status, documentType: record.documentType, fullName: record.fullName, phone: record.phone,
        billingAddress: record.billingAddress, emergencyContact: record.emergencyContact, submittedAt: record.submittedAt,
        verifiedAt: record.verifiedAt, rejectionReason: record.rejectionReason, reviewedAt: record.reviewedAt };
}
export function verificationError(error) {
    if (error?.status === 413) return verificationResponse({ success: false, message: 'Upload too large' }, 413);
    if (error?.code === 11000) return verificationResponse({ success: false, message: 'Submission already exists; refresh and retry' }, 409);
    return verificationResponse({ success: false, message: error?.status === 400 ? 'Invalid image content' : 'Unable to process verification' }, error?.status === 400 ? 400 : 500);
}
export async function requireRentalVerification(userId) {
    const verification = await RentalVerification.findOne({ userId }).select('status documentType verifiedAt');
    if (!isVerified(verification)) return verificationResponse({ success: false, code: 'VERIFICATION_REQUIRED', message: 'Verify your identity before completing your rental.', verificationStatus: verification?.status || 'NOT_SUBMITTED' }, 403);
    return null;
}
