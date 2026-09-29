import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import Order from '@/models/order';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { response } = await requireSeller(request);
    if (response) return response;

    try {
        await connectDB();
        const dailyRevenue = await Order.aggregate([
            { $match: { isPaid: true, status: { $ne: 'Dibatalkan' } } },
            { $addFields: { orderDate: { $toDate: '$date' } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate', timezone: 'Asia/Jakarta' } }, revenue: { $sum: '$amount' } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', revenue: 1 } },
        ]);
        return NextResponse.json({ success: true, dailyRevenue });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
