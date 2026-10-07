import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import RentalVerification from '@/models/rentalVerification';
import '@/models/user';
import { verificationResponse, verificationError } from '@/lib/rentalVerification';
export async function GET(request) {
    try {
        const { response } = await requireSeller(request); if (response) return response;
        await connectDB();
        const params = new URL(request.url).searchParams;
        const status = params.get('status') || 'PENDING';
        if (!['All','PENDING','VERIFIED','REJECTED'].includes(status)) return verificationResponse({ success: false, message: 'Invalid status' }, 400);
        const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
        const filter = status === 'All' ? { status: { $ne: 'NOT_SUBMITTED' } } : { status };
        const records = await RentalVerification.find(filter).select('userId documentType submittedAt status reviewedAt')
            .populate('userId', 'name email').sort({ submittedAt: -1 }).skip((page-1)*50).limit(50).lean();
        return verificationResponse({ success: true, verifications: records, total: await RentalVerification.countDocuments(filter), page });
    } catch (error) { return verificationError(error); }
}

