import connectDB from '@/config/db';
import Sanction from '@/models/sanction';
import { requireSeller } from '@/lib/requireSeller';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
    try {
        const { response } = await requireSeller(req);
        if (response) return response;
        await connectDB();
        const { userId, reason, status, expiresAt } = await req.json();
        const update = {}; // <--- di sini hapus ': any'

        if (userId) update.userId = userId;
        if (reason) update.reason = reason;
        if (status) update.status = status;
        if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

        const { id } = await params;
        const updated = await Sanction.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        if (!updated) {
            return NextResponse.json(
                { success: false, message: 'Not found' },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true, sanction: updated });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
