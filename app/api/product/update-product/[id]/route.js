// app/api/product/update/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/product";
import { requireSeller } from "@/lib/requireSeller";
import { validateImageFiles } from "@/lib/uploads.mjs";
import cloudinary from "cloudinary";

// Konfigurasi Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = "nodejs";  // Pastikan ini berjalan di Node

export async function PUT(req, { params }) {
    try {
        const { userId, response } = await requireSeller(req);
        if (response) return response;
        const { id } = await params;
        // 1) Koneksi DB
        await connectDB();

        // 2) Ambil Product awal
        const product = await Product.findById(id).select('+reservations +movements');
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
        const stock = Number(formData.get("stock"));
        const depositAmount = Number(formData.get('depositAmount'));
        const files = formData.getAll("images"); // array of File

        if (files.length > 0) {
            const fileError = validateImageFiles(files, { maxCount: Math.max(0, 4 - product.image.length) });
            if (fileError) return NextResponse.json({ success: false, message: fileError }, { status: 400 });
        }
        if ((formData.has('price') && (!Number.isFinite(price) || price <= 0)) || (formData.has('offerPrice') && (!Number.isFinite(offerPrice) || offerPrice <= 0))) {
            return NextResponse.json({ success: false, message: 'Invalid product price' }, { status: 400 });
        }
        if (formData.has('stock') && (!Number.isInteger(stock) || stock < 0)) {
            return NextResponse.json({ success: false, message: 'Stock must be a non-negative integer' }, { status: 400 });
        }
        if (formData.has('depositAmount') && (!Number.isFinite(depositAmount) || depositAmount < 0)) {
            return NextResponse.json({ success: false, message: 'Deposit must be a non-negative number' }, { status: 400 });
        }
        if (formData.has('stock')) {
            const now = new Date();
            const activeReservations = (product.reservations || []).filter(reservation =>
                reservation.rentalEndDate >= now
                && (reservation.status === 'confirmed' || (reservation.status === 'pending' && reservation.expiresAt > now))
            );
            const maximumReserved = activeReservations.reduce((maximum, reservation) => {
                const concurrent = activeReservations
                    .filter(other => other.rentalStartDate <= reservation.rentalStartDate && other.rentalEndDate >= reservation.rentalStartDate)
                    .reduce((total, other) => total + other.quantity, 0);
                return Math.max(maximum, concurrent);
            }, 0);
            if (stock < maximumReserved) {
                return NextResponse.json({ success: false, message: `Stock cannot be lower than ${maximumReserved} while reservations are active` }, { status: 409 });
            }
        }

        // 4) Upload file baru ke Cloudinary
        const uploadResults = await Promise.all(files.map(async file => {
            // file is a File/Blob with arrayBuffer()
            const buffer = Buffer.from(await file.arrayBuffer());
            return new Promise((resolve, reject) => {
                const stream = cloudinary.v2.uploader.upload_stream(
                    { resource_type: "image" },
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
        if (formData.has('stock') && stock !== product.stock) product.movements.push({ action: 'stock_adjusted', previousStock: product.stock, stock, quantity: stock - product.stock, actorId: userId, at: new Date() });
        product.stock = formData.has('stock') ? stock : (product.stock ?? 1);
        product.depositAmount = formData.has('depositAmount') ? depositAmount : (product.depositAmount || 0);
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
