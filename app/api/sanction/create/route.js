import connectDB from '@/config/db';
import Sanction from '@/models/sanction';
import { requireSeller } from '@/lib/requireSeller';
import { NextResponse } from 'next/server';
import User from '@/models/user';

export async function POST(req) {
    try {
        const { response } = await requireSeller(req);
        if (response) return response;
        await connectDB();
        const { userId, reason, expiresAt } = await req.json();

        const cleanReason = String(reason || '').trim();
        const expiry = expiresAt ? new Date(expiresAt) : null;
        if (!userId || !cleanReason || cleanReason.length > 500 || (expiry && (Number.isNaN(expiry.getTime()) || expiry <= new Date()))) {
            return NextResponse.json(
                { success: false, message: 'userId and reason are required' },
                { status: 400 }
            );
        }
        if (!(await User.exists({ _id: userId }))) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

        const sanction = new Sanction({
            userId,
            reason: cleanReason,
            expiresAt: expiry || undefined,
        });
        await sanction.save();

        return NextResponse.json({ success: true, sanction });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
