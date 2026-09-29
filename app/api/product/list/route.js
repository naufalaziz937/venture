import connectDB from "@/config/db";
import Product from "@/models/product";
import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/apiError";


export async function GET(request) {
    try {

        await connectDB()
        const product = await Product.find({})
        return NextResponse.json({success: true, product})
    } catch (error) {
        return serverErrorResponse('GET /api/product/list', error, 'Failed to fetch products');
        
    }
}
