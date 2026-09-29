import connectDB from "@/config/db";
import { requireSeller } from "@/lib/requireSeller";
import Product from "@/models/product";
import { NextResponse } from "next/server";


export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        await connectDB()
        const product = await Product.find({})
        return NextResponse.json({success: true, product})
    } catch (error) {
        return NextResponse.json({success: false, message: error.message});
        
    }
}
