import connectDB from '@/config/db';
import Sanction from '@/models/sanction';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        await connectDB();
        const { userId, reason, expiresAt } = await req.json();

        if (!userId || !reason) {
            return NextResponse.json(
                { success: false, message: 'userId and reason are required' },
                { status: 400 }
            );
        }

        const sanction = new Sanction({
            userId,
            reason,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
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
