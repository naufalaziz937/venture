import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { matchesImageSignature } from './verificationRules.mjs';
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
export async function uploadIdentityImage(file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, file.type)) throw Object.assign(new Error('Invalid image content'), { status: 400 });
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
            resource_type: 'image', type: 'authenticated', public_id: 'rental-verifications/' + randomUUID(),
            allowed_formats: ['jpg', 'png', 'webp'], overwrite: false,
        }, (error, result) => error ? reject(error) : resolve({ publicId: result.public_id, format: result.format }));
        stream.end(buffer);
    });
}
export async function deleteIdentityImages(assets) {
    for (const asset of assets.filter(Boolean)) await cloudinary.uploader.destroy(asset.publicId, { type: 'authenticated', resource_type: 'image', invalidate: true });
}
export function identityDownloadUrl(asset) {
    return cloudinary.utils.private_download_url(asset.publicId, asset.format, { type: 'authenticated', resource_type: 'image', expires_at: Math.floor(Date.now()/1000) + 60, attachment: false });
}

// Call from an authorized retention job after the business retention period is agreed.
// Metadata and all rental/order relationships remain intact.
export async function purgeVerificationImages(record, model) {
    await deleteIdentityImages([record.documentImage, record.selfieImage]);
    await model.updateOne({ _id: record._id, updatedAt: record.updatedAt }, {
        $unset: { documentImage: '', selfieImage: '' },
    });
}
