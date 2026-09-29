export function validateOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) return 'At least one order item is required';

    const seen = new Set();
    for (const item of items) {
        if (!item || typeof item.product !== 'string' || !item.product) return 'Every item must have a product ID';
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) return 'Quantity must be a positive integer';
        if (seen.has(item.product)) return 'Duplicate product IDs are not allowed';
        seen.add(item.product);
    }
    return null;
}

export function isVoucherUsable(voucher, now = new Date()) {
    if (!voucher) return false;
    if (voucher.expiresAt && new Date(voucher.expiresAt) <= now) return false;
    if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) return false;
    if (voucher.type === 'percent' && (voucher.amount <= 0 || voucher.amount > 100)) return false;
    return voucher.type === 'percent' || (voucher.type === 'fixed' && voucher.amount > 0);
}

export function calculateTotals(products, items, voucher = null, durationDays = 1) {
    if (!Number.isInteger(durationDays) || durationDays < 1) throw new Error('Rental duration must be a positive integer');
    const productById = new Map(products.map(product => [String(product._id), product]));
    let subtotal = 0;
    for (const item of items) {
        const product = productById.get(item.product);
        if (!product) throw new Error(`Product not found: ${item.product}`);
        subtotal += Number(product.offerPrice) * item.quantity * durationDays;
    }
    const tax = Math.floor(subtotal * 0.12);
    const rawDiscount = voucher
        ? (voucher.type === 'percent' ? Math.floor(subtotal * voucher.amount / 100) : voucher.amount)
        : 0;
    const discount = Math.min(rawDiscount, subtotal + tax);
    return { subtotal, tax, discount, total: subtotal + tax - discount };
}

export function calculateDeposit(products, items) {
    const productById = new Map(products.map(product => [String(product._id), product]));
    return items.reduce((total, item) => {
        const product = productById.get(item.product);
        if (!product) throw new Error(`Product not found: ${item.product}`);
        return total + Number(product.depositAmount || 0) * item.quantity;
    }, 0);
}
