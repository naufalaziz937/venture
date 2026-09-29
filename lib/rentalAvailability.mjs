const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_RENTAL_DAYS = 365;

export function parseRentalDate(value) {
    if (typeof value !== 'string' || !DATE_ONLY.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function validateRentalPeriod(startValue, endValue, now = new Date()) {
    const start = parseRentalDate(startValue);
    const end = parseRentalDate(endValue);
    if (!start || !end) return { error: 'Rental start and end dates are required' };
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (start < today) return { error: 'Rental start date cannot be in the past' };
    if (end < start) return { error: 'Rental end date must be on or after the start date' };
    const durationDays = Math.round((end - start) / 86400000) + 1;
    if (durationDays > MAX_RENTAL_DAYS) return { error: `Rental period cannot exceed ${MAX_RENTAL_DAYS} days` };
    return { start, end, durationDays };
}

export function periodsOverlap(startA, endA, startB, endB) {
    return new Date(startA) <= new Date(endB) && new Date(endA) >= new Date(startB);
}

export function availableStock(product, start, end, now = new Date()) {
    const activeReservations = (product.reservations || [])
        .filter(reservation => reservation.status === 'confirmed'
            || (reservation.status === 'pending' && reservation.expiresAt && new Date(reservation.expiresAt) > now));
    let maximumReserved = 0;
    for (let day = new Date(start); day <= new Date(end); day = new Date(day.getTime() + 86400000)) {
        const reservedOnDay = activeReservations
            .filter(reservation => new Date(reservation.rentalStartDate) <= day && new Date(reservation.rentalEndDate) >= day)
            .reduce((total, reservation) => total + reservation.quantity, 0);
        maximumReserved = Math.max(maximumReserved, reservedOnDay);
    }
    return Math.max(0, Number(product.stock ?? 1) - maximumReserved);
}
