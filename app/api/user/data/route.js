import connectDB from "@/config/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/apiError";
import { ensureMongoUser } from "@/lib/syncClerkUser";


export async function GET(request) {
    try {
        
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        await connectDB()
        const user = await ensureMongoUser(userId)
        return NextResponse.json({success: true, user})
    } catch (error) {
        if (error?.code === 'INVALID_CLERK_USER') {
            return NextResponse.json({ success: false, code: error.code, message: 'Authenticated user data is incomplete' }, { status: 422 });
        }
        if (error?.code === 'AMBIGUOUS_LEGACY_USER' || error?.code === 'USER_IDENTITY_CONFLICT') {
            return NextResponse.json({ success: false, code: error.code, message: 'User account requires manual linking' }, { status: 409 });
        }
        if (error?.code === 11000) {
            return NextResponse.json({ success: false, code: 'USER_IDENTITY_CONFLICT', message: 'User account requires manual linking' }, { status: 409 });
        }
        return serverErrorResponse('GET /api/user/data', error, 'Failed to fetch user');
        
    }
}
