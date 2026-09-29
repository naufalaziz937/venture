import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/product";
import { serverErrorResponse } from "@/lib/apiError";

export async function GET(request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.trim() || "";

        let products;

        if (query) {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            products = await Product.find({
                name: { $regex: escapedQuery, $options: "i" },
            });
        } else {
            products = await Product.find();
        }

        return NextResponse.json({ success: true, products });
    } catch (error) {
        return serverErrorResponse('GET /api/product/search', error, 'Failed to search products');
    }
}
