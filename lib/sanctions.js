import Sanction from '@/models/sanction';

export async function getActiveSanction(userId, at = new Date()) {
    return Sanction.findOne({
        userId,
        status: 'Active',
        $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: at } }],
    }).sort({ createdAt: -1 });
}
