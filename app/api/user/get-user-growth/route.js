import connectDB from "@/config/db";
import User from "@/models/user";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";
import { subMonths, format } from 'date-fns';

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        await connectDB();

        // Get user growth for last 6 months
        const months = 6;
        const currentDate = new Date();
        const growthData = [];

        for (let i = months - 1; i >= 0; i--) {
            const startDate = subMonths(currentDate, i + 1);
            const endDate = subMonths(currentDate, i);
            
            // Format month name (e.g., "Jan 2023")
            const monthName = format(endDate, 'MMM yyyy');

            // Count users created in this period
            const userCount = await User.countDocuments({
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            });

            growthData.push({
                month: monthName,
                count: userCount
            });
        }

        return NextResponse.json({
            success: true,
            growthData
        });

    } catch (error) {
        console.error("Error fetching user growth data:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch user growth data" },
            { status: 500 }
        );
    }
}
