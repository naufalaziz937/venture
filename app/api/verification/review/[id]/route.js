import mongoose from 'mongoose';
import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import RentalVerification from '@/models/rentalVerification';
import { verificationResponse, verificationSummary, verificationError } from '@/lib/rentalVerification';
export async function PATCH(request, { params }) {
    try {
        const { userId, response } = await requireSeller(request); if (response) return response;
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return verificationResponse({ success: false, message: 'Not found' }, 404);
        const { action, rejectionReason } = await request.json();
        if (!['approve','reject'].includes(action) || (action === 'reject' && (typeof rejectionReason !== 'string' || !rejectionReason.trim() || rejectionReason.length > 1000))) return verificationResponse({ success: false, message: 'A valid action and rejection reason are required' }, 400);
        await connectDB();
        const reviewer = await ensureMongoUser(userId);
        const now = new Date();
        const record = await RentalVerification.findOneAndUpdate({ _id: id, status: 'PENDING', userId: { $ne: reviewer._id } }, {
            $set: { status: action === 'approve' ? 'VERIFIED' : 'REJECTED', reviewedBy: reviewer._id, reviewedAt: now,
                ...(action === 'approve' ? { verifiedAt: now } : { rejectedAt: now, rejectionReason: rejectionReason.trim() }) },
            $unset: action === 'approve' ? { rejectionReason: '', rejectedAt: '' } : { verifiedAt: '' },
        }, { new: true, runValidators: true });
        if (!record) return verificationResponse({ success: false, message: 'Only another user’s pending submission can be reviewed' }, 409);
        return verificationResponse({ success: true, verification: verificationSummary(record) });
    } catch (error) { return verificationError(error); }
}

