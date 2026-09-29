import connectDB from "@/config/db";
import mongoose from "mongoose"; // ✅ Tambahkan ini
import { requireSeller } from "@/lib/requireSeller";
import Product from "@/models/product";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { validateImageFiles } from "@/lib/uploads.mjs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request) {
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        await connectDB();

        const formData = await request.formData();
        console.log("Form Data Received:", formData);
        
        const name = formData.get('name');
        const description = formData.get('description');
        const category = formData.get('category');
        const price = formData.get('price');
        const offerPrice = formData.get('offerPrice');
        const stock = Number(formData.get('stock'));
        const depositAmount = Number(formData.get('depositAmount'));
        const files = formData.getAll('images');

        const fileError = validateImageFiles(files);
        if (fileError) return NextResponse.json({ success: false, message: fileError }, { status: 400 });
        if (!name || !description || !category || !Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isFinite(Number(offerPrice)) || Number(offerPrice) <= 0 || !Number.isInteger(stock) || stock < 0 || !Number.isFinite(depositAmount) || depositAmount < 0) {
            return NextResponse.json({ success: false, message: 'Invalid product fields' }, { status: 400 });
        }

        // Upload ke Cloudinary
        const result = await Promise.all(
            files.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'image' },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );
                    stream.end(buffer);
                });
            })
        );

        const images = result.map(res => res.secure_url);

        const newProduct = await Product.create({
            userId,
            name,
            description,
            category,
            price: Number(price),
            offerPrice: Number(offerPrice),
            stock,
            depositAmount,
            image: images,
            date: Date.now()
        });
        

        return NextResponse.json({ success: true, message: 'Upload successful', newProduct }, { status: 201 });

    } catch (error) {
        console.error("Error adding product:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
