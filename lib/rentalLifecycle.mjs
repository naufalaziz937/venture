export const ORDER_LIFECYCLE_STATUSES = Object.freeze(['placed', 'confirmed', 'completed', 'cancelled']);
export const RENTAL_STATUSES = Object.freeze(['reserved', 'active', 'return_pending', 'returned', 'completed', 'cancelled']);
export const DELIVERY_STATUSES = Object.freeze(['pending', 'outbound', 'delivered', 'pickup_ready', 'picked_up', 'return_in_transit', 'returned', 'cancelled']);

const transitions = {
    order: {
        placed: ['confirmed', 'cancelled'],
        confirmed: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
    },
    rental: {
        reserved: ['active', 'cancelled'],
        active: ['return_pending', 'returned'],
        return_pending: ['returned'],
        returned: ['completed'],
        completed: [],
        cancelled: [],
    },
    delivery: {
        pending: ['outbound', 'pickup_ready', 'cancelled'],
        outbound: ['delivered', 'cancelled'],
        delivered: ['return_in_transit', 'returned'],
        pickup_ready: ['picked_up', 'cancelled'],
        picked_up: ['return_in_transit', 'returned'],
        return_in_transit: ['returned'],
        returned: [],
        cancelled: [],
    },
};

export function canTransitionLifecycle(kind, current, next) {
    return current === next || Boolean(transitions[kind]?.[current]?.includes(next));
}

export function legacyStatusFor({ orderStatus, rentalStatus, deliveryStatus }) {
    if (orderStatus === 'cancelled' || rentalStatus === 'cancelled' || deliveryStatus === 'cancelled') return 'Dibatalkan';
    if (orderStatus === 'completed' || rentalStatus === 'completed') return 'Selesai';
    if (rentalStatus === 'returned' || deliveryStatus === 'returned') return 'Dikembalikan ke Venture';
    if (rentalStatus === 'active' || deliveryStatus === 'delivered' || deliveryStatus === 'picked_up') return 'Sampai di User';
    if (deliveryStatus === 'outbound' || deliveryStatus === 'return_in_transit') return 'Dalam Perjalanan ke Alamat User';
    if (orderStatus === 'placed') return 'Order Placed';
    return 'Pending';
}
