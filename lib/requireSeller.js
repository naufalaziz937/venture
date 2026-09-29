import authSeller from '@/lib/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function requireSeller(request) {
    const { userId } = getAuth(request);

    if (!userId) {
        return {
            userId: null,
            response: NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            ),
        };
    }

    if (!(await authSeller(userId))) {
        return {
            userId,
            response: NextResponse.json(
                { success: false, message: 'Forbidden' },
                { status: 403 }
            ),
        };
    }

    return { userId, response: null };
}
