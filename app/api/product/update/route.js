import { inngest } from "@/config/inngest";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PUT(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { productId, updatedData } = body;

        if (!productId || !updatedData) {
            return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 });
        }

        // Kirim event ke Inngest
        await inngest.send({
            name: "product/updated",
            data: {
                productId,
                updatedData,
            },
        });

        return NextResponse.json({ success: true, message: "Product update event sent" });

    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
