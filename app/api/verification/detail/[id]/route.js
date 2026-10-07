import mongoose from 'mongoose';
import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import RentalVerification from '@/models/rentalVerification';
import '@/models/user';
import { verificationResponse, verificationSummary, verificationError } from '@/lib/rentalVerification';
export async function GET(request, { params }) {
    try {
        const { response } = await requireSeller(request); if (response) return response;
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return verificationResponse({ success: false, message: 'Not found' }, 404);
        await connectDB();
        const record = await RentalVerification.findById(id).populate('userId', 'name email');
        if (!record) return verificationResponse({ success: false, message: 'Not found' }, 404);
        return verificationResponse({ success: true, verification: { ...verificationSummary(record), user: record.userId } });
    } catch (error) { return verificationError(error); }
}

