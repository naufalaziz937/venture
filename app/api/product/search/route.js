import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/product";

export async function GET(request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.toLowerCase() || "";

        let products;

        if (query) {
            products = await Product.find({
                name: { $regex: query, $options: "i" }, // cari yang mengandung keyword
            });
        } else {
            products = await Product.find();
        }

        return NextResponse.json({ success: true, products });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ success: false, message: error.message });
    }
}
