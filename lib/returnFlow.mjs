export const RETURN_CONDITIONS = Object.freeze(['normal', 'damaged', 'lost']);
export const LATE_FEE_RATE = 0.20;

export function calculateLateFeePerDay(products, items) {
    const productById = new Map(products.map(product => [String(product._id), product]));
    const dailySubtotal = items.reduce((total, item) => {
        const product = productById.get(String(item.product));
        if (!product) throw new Error(`Product not found: ${item.product}`);
        return total + Number(product.offerPrice) * item.quantity;
    }, 0);
    return Math.floor(dailySubtotal * LATE_FEE_RATE);
}

export function calculateLateDays(rentalEndDate, receivedAt = new Date()) {
    const due = new Date(rentalEndDate);
    const received = new Date(receivedAt);
    const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const receivedDay = Date.UTC(received.getUTCFullYear(), received.getUTCMonth(), received.getUTCDate());
    return Math.max(0, Math.floor((receivedDay - dueDay) / 86400000));
}

export function calculateReturnCharges({ rentalEndDate, receivedAt, lateFeePerDay, inspectedItems }) {
    const lateDays = calculateLateDays(rentalEndDate, receivedAt);
    const lateFee = lateDays * Number(lateFeePerDay || 0);
    const conditionCharges = inspectedItems.reduce((total, item) => total + Number(item.charge || 0), 0);
    return { lateDays, lateFee, conditionCharges, totalAdditionalCharge: lateFee + conditionCharges };
}
