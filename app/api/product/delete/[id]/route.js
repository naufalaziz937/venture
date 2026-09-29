import connectDB from "@/config/db";
import Product from "@/models/product";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
    try {
        const { response } = await requireSeller(req);
        if (response) return response;
        const { id } = await params;
        await connectDB();

        const product = await Product.findById(id).select('+reservations');

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Produk tidak ditemukan" },
                { status: 404 }
            );
        }
        const now = new Date();
        const hasActiveReservation = (product.reservations || []).some(reservation =>
            reservation.rentalEndDate >= now
            && (reservation.status === 'confirmed' || (reservation.status === 'pending' && reservation.expiresAt > now))
        );
        if (hasActiveReservation) {
            return NextResponse.json(
                { success: false, message: "Product cannot be deleted while it has active reservations" },
                { status: 409 }
            );
        }

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
