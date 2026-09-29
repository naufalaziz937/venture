import connectDB from "@/config/db";
import User from "@/models/user"; // Tambahkan import model User
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureMongoUser } from "@/lib/syncClerkUser";
import { serverErrorResponse } from "@/lib/apiError";
import { validateRentalPeriod } from '@/lib/rentalAvailability.mjs';

export async function POST(request) { // ✅ Ubah 'Post' jadi 'POST'
    try {
        const { userId } = getAuth(request); // ✅ Ambil userId dengan benar
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const { cartData, rentalStartDate, rentalEndDate } = await request.json(); // ✅ Pastikan data diambil dengan benar
        if (!cartData || typeof cartData !== 'object' || Array.isArray(cartData) || Object.values(cartData).some(quantity => !Number.isInteger(quantity) || quantity < 0)) {
            return NextResponse.json({ success: false, message: 'Invalid cart data' }, { status: 400 });
        }
        let period = null;
        if (rentalStartDate !== undefined || rentalEndDate !== undefined) {
            period = validateRentalPeriod(rentalStartDate, rentalEndDate);
            if (period.error) return NextResponse.json({ success: false, message: period.error }, { status: 400 });
        }
        
        await connectDB(); // ✅ Koneksi ke database

        const user = await ensureMongoUser(userId);
        await User.findByIdAndUpdate(user._id, {
            $set: {
                cartItems: cartData,
                ...(period && {
                    cartRentalPeriod: {
                        rentalStartDate: period.start,
                        rentalEndDate: period.end,
                    },
                }),
            },
        }, { runValidators: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return serverErrorResponse('POST /api/cart/update', error, 'Failed to update cart');
    }
}
