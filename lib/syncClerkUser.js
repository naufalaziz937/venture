import { clerkClient } from '@clerk/nextjs/server';
import User from '@/models/user';

function firstNonEmpty(...values) {
    return values.find(value => typeof value === 'string' && value.trim())?.trim();
}

export function mapClerkUser(clerkUser) {
    const id = clerkUser.id;
    const emailAddresses = clerkUser.emailAddresses || clerkUser.email_addresses || [];
    const primaryEmailId = clerkUser.primaryEmailAddressId || clerkUser.primary_email_address_id;
    const primaryEmail = emailAddresses.find(email => (email.id || email.email_address_id) === primaryEmailId);
    const email = firstNonEmpty(
        primaryEmail?.emailAddress,
        primaryEmail?.email_address,
        emailAddresses[0]?.emailAddress,
        emailAddresses[0]?.email_address
    );
    const firstName = firstNonEmpty(clerkUser.firstName, clerkUser.first_name) || '';
    const lastName = firstNonEmpty(clerkUser.lastName, clerkUser.last_name) || '';

    if (!id || !email) {
        const error = new Error('Clerk user ID and email are required for synchronization');
        error.code = 'INVALID_CLERK_USER';
        throw error;
    }

    return {
        _id: id,
        clerkId: id,
        email,
        name: [firstName, lastName].filter(Boolean).join(' ') || email,
        imageUrl: firstNonEmpty(clerkUser.imageUrl, clerkUser.image_url) || '',
        emailVerified: primaryEmail?.verification?.status === 'verified',
    };
}

export async function upsertClerkUser(clerkUser) {
    const userData = mapClerkUser(clerkUser);
    const profile = {
        clerkId: userData.clerkId,
        email: userData.email,
        name: userData.name,
        imageUrl: userData.imageUrl,
    };

    const directUser = await User.findOne({
        $or: [{ clerkId: userData.clerkId }, { _id: userData._id }],
    });
    if (directUser) {
        return User.findByIdAndUpdate(directUser._id, { $set: profile }, { new: true, runValidators: true });
    }

    if (userData.emailVerified) {
        const emailMatches = await User.find({ email: userData.email })
            .collation({ locale: 'en', strength: 2 })
            .limit(2);

        if (emailMatches.length > 1) {
            const error = new Error('Multiple legacy users match the verified Clerk email');
            error.code = 'AMBIGUOUS_LEGACY_USER';
            throw error;
        }

        if (emailMatches.length === 1) {
            const legacyUser = emailMatches[0];
            if (legacyUser.clerkId && legacyUser.clerkId !== userData.clerkId) {
                const error = new Error('The verified email is already linked to another Clerk user');
                error.code = 'USER_IDENTITY_CONFLICT';
                throw error;
            }
            const linkedUser = await User.findOneAndUpdate(
                { _id: legacyUser._id, $or: [{ clerkId: { $exists: false } }, { clerkId: userData.clerkId }] },
                { $set: profile },
                { new: true, runValidators: true }
            );
            if (linkedUser) return linkedUser;

            const error = new Error('The legacy user was linked concurrently');
            error.code = 'USER_IDENTITY_CONFLICT';
            throw error;
        }
    }

    return User.findByIdAndUpdate(
        userData._id,
        { $set: profile, $setOnInsert: { cartItems: {} } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
}

export async function ensureMongoUser(userId) {
    const existingUser = await User.findOne({ $or: [{ clerkId: userId }, { _id: userId }] });
    if (existingUser) return existingUser;

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    return upsertClerkUser(clerkUser);
}
