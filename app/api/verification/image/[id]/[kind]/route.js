import mongoose from 'mongoose';
import RentalVerification from '@/models/rentalVerification';
import authSeller from '@/lib/authSeller';
import { verificationUser, verificationResponse, verificationError, privateHeaders } from '@/lib/rentalVerification';
import { identityDownloadUrl } from '@/lib/verificationStorage';
export async function GET(request, { params }) {
    try {
        const { user, clerkId, response } = await verificationUser(request); if (response) return response;
        const { id, kind } = await params;
        if (!mongoose.Types.ObjectId.isValid(id) || !['document','selfie'].includes(kind)) return verificationResponse({ success: false, message: 'Not found' }, 404);
        const record = await RentalVerification.findById(id).select('+documentImage +selfieImage');
        if (!record || (record.userId !== user._id && !(await authSeller(clerkId)))) return verificationResponse({ success: false, message: 'Not found' }, 404);
        const asset = kind === 'document' ? record.documentImage : record.selfieImage;
        if (!asset?.publicId) return verificationResponse({ success: false, message: 'Image no longer retained' }, 404);
        const upstream = await fetch(identityDownloadUrl(asset), { cache: 'no-store' });
        if (!upstream.ok) return verificationResponse({ success: false, message: 'Image unavailable' }, 502);
        return new Response(upstream.body, { headers: { ...privateHeaders, 'Content-Type': 'image/' + (asset.format === 'jpg' ? 'jpeg' : asset.format), 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline' } });
    } catch (error) { return verificationError(error); }
}

