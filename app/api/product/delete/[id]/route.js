import connectDB from "@/config/db";
import Product from "@/models/product";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
    const { id } = params;

    try {
        await connectDB();

        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return NextResponse.json(
                { success: false, message: "Produk tidak ditemukan" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: "Produk berhasil dihapus", product: deletedProduct },
            { status: 200 }
        );
    } catch (err) {
        console.error("Gagal menghapus produk:", err);
        return NextResponse.json(
            { success: false, message: "Gagal menghapus produk" },
            { status: 500 }
        );
    }
}
