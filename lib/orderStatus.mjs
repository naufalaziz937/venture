export const ORDER_STATUSES = Object.freeze([
    'Order Placed',
    'Pending',
    'Dalam Perjalanan ke Alamat User',
    'Sampai di User',
    'Dikembalikan ke Venture',
    'Selesai',
    'Dibatalkan',
]);

const transitions = Object.freeze({
    'Order Placed': ['Pending', 'Dalam Perjalanan ke Alamat User', 'Dibatalkan'],
    Pending: ['Dalam Perjalanan ke Alamat User', 'Dibatalkan'],
    'Dalam Perjalanan ke Alamat User': ['Sampai di User', 'Dibatalkan'],
    'Sampai di User': ['Dikembalikan ke Venture', 'Dibatalkan'],
    'Dikembalikan ke Venture': ['Selesai'],
    Selesai: [],
    Dibatalkan: [],
});

export function canTransitionOrderStatus(current, next) {
    return current === next || Boolean(transitions[current]?.includes(next));
}
