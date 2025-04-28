// app/api/voucher/delete/[id]/route.js
import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
    const { id } = params;

    // Validasi ID voucher
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
            { success: false, message: "ID voucher tidak valid atau tidak disediakan" },
            { status: 400 }
        );
    }

    try {
        // Sambungkan ke database
        await connectDB();

        // Cek keberadaan voucher sebelum dihapus
        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return NextResponse.json(
                { success: false, message: `Voucher dengan ID "${id}" tidak ditemukan` },
                { status: 404 }
            );
        }

        // Hapus voucher
        const deletedVoucher = await Voucher.findByIdAndDelete(id);

        return NextResponse.json(
            {
                success: true,
                message: `Voucher "${deletedVoucher.code}" berhasil dihapus`,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Error DELETE /api/voucher/delete/[id]:", err);
        return NextResponse.json(
            { success: false, message: "Gagal menghapus voucher" },
            { status: 500 }
        );
    }
}
