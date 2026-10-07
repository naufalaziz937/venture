import { verificationUser, verificationResponse, verificationSummary, verificationError } from '@/lib/rentalVerification';
import RentalVerification from '@/models/rentalVerification';
export async function GET(request) {
    try {
        const { user, response } = await verificationUser(request);
        if (response) return response;
        return verificationResponse({ success: true, verification: verificationSummary(await RentalVerification.findOne({ userId: user._id })) });
    } catch (error) { return verificationError(error); }
}

