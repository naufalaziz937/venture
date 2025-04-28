import connectDB from '@/config/db';
import Sanction from '@/models/sanction';
import { NextResponse } from 'next/server';

export async function DELETE(req, { params }) {
    try {
        await connectDB();
        const deleted = await Sanction.findByIdAndDelete(params.id);
        if (!deleted) {
            return NextResponse.json(
                { success: false, message: 'Not found' },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
