// app/api/product/update/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/product";
import cloudinary from "cloudinary";

// Konfigurasi Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = "nodejs";  // Pastikan ini berjalan di Node

export async function PUT(req, { params }) {
    const { id } = params;

    try {
        // 1) Koneksi DB
        await connectDB();

        // 2) Ambil Product awal
        const product = await Product.findById(id);
        if (!product) {
            return NextResponse.json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
        }

        // 3) Parse form-data
        const formData = await req.formData();
        const name = formData.get("name");
        const description = formData.get("description");
        const category = formData.get("category");
        const price = Number(formData.get("price"));
        const offerPrice = Number(formData.get("offerPrice"));
        const files = formData.getAll("images"); // array of File

        // 4) Upload file baru ke Cloudinary
        const uploadResults = await Promise.all(files.map(async file => {
            // file is a File/Blob with arrayBuffer()
            const buffer = Buffer.from(await file.arrayBuffer());
            return new Promise((resolve, reject) => {
                const stream = cloudinary.v2.uploader.upload_stream(
                    { resource_type: "auto" },
                    (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            });
        }));

        const newUrls = uploadResults.map(r => r.secure_url);

        // 5) Merge gambar lama + baru (maksimal 4)
        const finalImages = [
            ...product.image,  // image dari DB (array URL)
            ...newUrls
        ].slice(0, 4);

        // 6) Update field
        product.name = name ?? product.name;
        product.description = description ?? product.description;
        product.category = category ?? product.category;
        product.price = isNaN(price) ? product.price : price;
        product.offerPrice = isNaN(offerPrice) ? product.offerPrice : offerPrice;
        product.image = finalImages;

        await product.save();

        // 7) Kirim response
        return NextResponse.json({
            success: true,
            message: "Produk berhasil diperbarui",
            product,
        });
    } catch (err) {
        console.error("Error update product:", err);
        return NextResponse.json(
            { success: false, message: err.message || "Gagal update produk" },
            { status: 500 }
        );
    }
}
