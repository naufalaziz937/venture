import Product from '@/models/product';

function activeReservations(now, excludeOrderId = null) {
    const conditions = [
        {
            $or: [
                { $eq: ['$$reservation.status', 'confirmed'] },
                {
                    $and: [
                        { $eq: ['$$reservation.status', 'pending'] },
                        { $gt: ['$$reservation.expiresAt', now] },
                    ],
                },
            ],
        },
    ];
    if (excludeOrderId) conditions.push({ $ne: ['$$reservation.orderId', String(excludeOrderId)] });
    return {
        $filter: {
            input: { $ifNull: ['$reservations', []] },
            as: 'reservation',
            cond: { $and: conditions },
        },
    };
}

function maximumReservedDuring(start, end, now, excludeOrderId = null) {
    return {
        $ifNull: [{
            $max: {
                $map: {
                    input: {
                        $range: [0, {
                            $add: [{ $dateDiff: { startDate: start, endDate: end, unit: 'day' } }, 1],
                        }],
                    },
                    as: 'dayOffset',
                    in: {
                        $sum: {
                            $map: {
                                input: activeReservations(now, excludeOrderId),
                                as: 'reservation',
                                in: {
                                    $cond: [{
                                        $and: [
                                            {
                                                $lte: [
                                                    '$$reservation.rentalStartDate',
                                                    { $dateAdd: { startDate: start, unit: 'day', amount: '$$dayOffset' } },
                                                ],
                                            },
                                            {
                                                $gte: [
                                                    '$$reservation.rentalEndDate',
                                                    { $dateAdd: { startDate: start, unit: 'day', amount: '$$dayOffset' } },
                                                ],
                                            },
                                        ],
                                    }, '$$reservation.quantity', 0],
                                },
                            },
                        },
                    },
                },
            },
        }, 0],
    };
}

export async function reserveOrderItems({ orderId, items, start, end, status, expiresAt = null, kind = 'rental', unitId = null, reason = '', actorId = 'system' }) {
    const reservedProductIds = [];
    const now = new Date();
    try {
        for (const item of items) {
            const product = await Product.findOneAndUpdate(
                {
                    _id: item.product,
                    $expr: {
                        $lte: [
                            {
                                $add: [
                                    item.quantity,
                                    maximumReservedDuring(start, end, now),
                                ],
                            },
                            { $ifNull: ['$stock', 1] },
                        ],
                    },
                },
                {
                    $push: {
                        movements: { action: kind === 'maintenance' ? 'maintenance_scheduled' : 'reserved', reference: String(orderId), quantity: item.quantity, start, end, unitId, reason, actorId, at: now },
                        reservations: {
                            kind, unitId, reason,
                            orderId: String(orderId),
                            rentalStartDate: start,
                            rentalEndDate: end,
                            quantity: item.quantity,
                            status,
                            expiresAt,
                        },
                    },
                },
                { new: true }
            );
            if (!product) {
                const error = new Error('One or more products are unavailable for the selected dates');
                error.code = 'INSUFFICIENT_AVAILABILITY';
                throw error;
            }
            reservedProductIds.push(item.product);
        }
    } catch (error) {
        if (reservedProductIds.length) {
            await Product.updateMany(
                { _id: { $in: reservedProductIds } },
                { $pull: { reservations: { orderId: String(orderId) } }, $push: { movements: { action: 'reservation_rolled_back', reference: String(orderId), actorId, at: new Date() } } }
            );
        }
        throw error;
    }
}

export async function confirmOrderReservations(orderId) {
    await Product.updateMany(
        { 'reservations.orderId': String(orderId) },
        { $set: { 'reservations.$[reservation].status': 'confirmed', 'reservations.$[reservation].expiresAt': null }, $push: { movements: { action: 'confirmed', reference: String(orderId), actorId: 'system', at: new Date() } } },
        { arrayFilters: [{ 'reservation.orderId': String(orderId) }] }
    );
}

export async function releaseOrderReservations(orderId) {
    await Product.updateMany(
        { 'reservations.orderId': String(orderId) },
        { $pull: { reservations: { orderId: String(orderId) } }, $push: { movements: { action: 'released', reference: String(orderId), at: new Date(), actorId: 'system' } } }
    );
}

export async function extendOrderReservations({ orderId, productIds, rentalStartDate, previousEndDate, newEndDate }) {
    const updatedProductIds = [];
    const now = new Date();
    try {
        for (const productId of productIds) {
            const product = await Product.findOneAndUpdate(
                {
                    _id: productId,
                    reservations: {
                        $elemMatch: {
                            orderId: String(orderId),
                            status: 'confirmed',
                            rentalEndDate: previousEndDate,
                        },
                    },
                    $expr: {
                        $lte: [
                            {
                                $add: [
                                    maximumReservedDuring(rentalStartDate, newEndDate, now, orderId),
                                    {
                                        $ifNull: [
                                            {
                                                $first: {
                                                    $map: {
                                                        input: {
                                                            $filter: {
                                                                input: { $ifNull: ['$reservations', []] },
                                                                as: 'ownReservation',
                                                                cond: { $eq: ['$$ownReservation.orderId', String(orderId)] },
                                                            },
                                                        },
                                                        as: 'ownReservation',
                                                        in: '$$ownReservation.quantity',
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                ],
                            },
                            { $ifNull: ['$stock', 1] },
                        ],
                    },
                },
                { $set: { 'reservations.$[reservation].rentalEndDate': newEndDate }, $push: { movements: { action: 'extended', reference: String(orderId), previousEndDate, newEndDate, at: now, actorId: 'system' } } },
                {
                    new: true,
                    arrayFilters: [{
                        'reservation.orderId': String(orderId),
                        'reservation.rentalEndDate': previousEndDate,
                    }],
                }
            );
            if (!product) {
                const error = new Error('The rental cannot be extended because one or more products are unavailable');
                error.code = 'EXTENSION_UNAVAILABLE';
                throw error;
            }
            updatedProductIds.push(productId);
        }
    } catch (error) {
        throw Object.assign(error, { updatedProductIds });
    }
}

export async function restoreOrderReservationEnd({ orderId, productIds, previousEndDate, attemptedEndDate }) {
    if (!productIds?.length) return;
    await Product.updateMany(
        { _id: { $in: productIds }, 'reservations.orderId': String(orderId) },
        { $set: { 'reservations.$[reservation].rentalEndDate': previousEndDate } },
        {
            arrayFilters: [{
                'reservation.orderId': String(orderId),
                'reservation.rentalEndDate': attemptedEndDate,
            }],
        }
    );
}
