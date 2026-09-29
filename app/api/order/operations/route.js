import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import Order from '@/models/order';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { response } = await requireSeller(request);
    if (response) return response;
    await connectDB();
    const orders = await Order.find({ rentalStatus: { $in: ['active', 'return_pending'] } })
        .populate('address items.product items.equipmentUnits').sort({ rentalEndDate: 1 }).lean();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const enriched = orders.map(order => ({
        ...order,
        overdueDays: Math.max(0, Math.floor((today - new Date(order.rentalEndDate).setUTCHours(0, 0, 0, 0)) / 86400000)),
    }));
    return NextResponse.json({
        success: true,
        orders: enriched,
        summary: {
            active: enriched.filter(order => order.rentalStatus === 'active').length,
            returnPending: enriched.filter(order => order.rentalStatus === 'return_pending').length,
            overdue: enriched.filter(order => order.overdueDays > 0).length,
            outstandingAmount: enriched.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0),
        },
    });
}
