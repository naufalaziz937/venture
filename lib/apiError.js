import { NextResponse } from 'next/server';

const DATABASE_ERROR_CODES = new Set([
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'MongoServerSelectionError',
]);

export function isDatabaseUnavailable(error) {
    return DATABASE_ERROR_CODES.has(error?.code)
        || DATABASE_ERROR_CODES.has(error?.name)
        || error?.name === 'MongooseServerSelectionError';
}

export function logServerError(context, error) {
    console.error(`[${context}]`, {
        name: error?.name,
        code: error?.code,
        syscall: error?.syscall,
        hostname: error?.hostname,
        message: error?.message,
    });
}

export function serverErrorResponse(context, error, fallbackMessage) {
    logServerError(context, error);
    if (isDatabaseUnavailable(error)) {
        return NextResponse.json(
            { success: false, code: 'DATABASE_UNAVAILABLE', message: 'Database service is unavailable' },
            { status: 503 }
        );
    }
    return NextResponse.json(
        { success: false, code: 'INTERNAL_ERROR', message: fallbackMessage },
        { status: 500 }
    );
}
