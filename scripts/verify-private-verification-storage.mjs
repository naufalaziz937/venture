import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const { v2: cloudinary } = require('cloudinary');
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
let asset;
try {
    const { randomUUID } = await import('node:crypto');
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1cAAAAASUVORK5CYII=', 'base64');
    asset = await new Promise((resolve,reject) => {
        const stream = cloudinary.uploader.upload_stream({ type: 'authenticated', resource_type: 'image', public_id: 'rental-verifications-test/' + randomUUID(), overwrite: false }, (err,result) => err ? reject(err) : resolve(result));
        stream.end(pixel);
    });
    const publicResult = await fetch(cloudinary.url(asset.public_id, { secure: true, type: 'authenticated', resource_type: 'image', format: asset.format, sign_url: false }));
    const ordinaryProductResult = await fetch(cloudinary.url(asset.public_id, { secure: true, type: 'upload', resource_type: 'image', format: asset.format, sign_url: false }));
    const signedResult = await fetch(cloudinary.utils.private_download_url(asset.public_id, asset.format, { type: 'authenticated', resource_type: 'image', expires_at: Math.floor(Date.now()/1000)+60, attachment: false }));
    console.log(JSON.stringify({ publicAccessDenied: !publicResult.ok, ordinaryProductAccessDenied: !ordinaryProductResult.ok, privateDownloadWorks: signedResult.ok }));
    if (publicResult.ok || ordinaryProductResult.ok || !signedResult.ok) process.exitCode = 1;
} catch (error) {
    console.error(JSON.stringify({ storageTestPassed: false, errorName: error?.name || 'CloudinaryError', httpCode: error?.http_code || null }));
    process.exitCode = 1;
} finally {
    if (asset) {
        const result = await cloudinary.uploader.destroy(asset.public_id, { type: 'authenticated', resource_type: 'image', invalidate: true });
        console.log(JSON.stringify({ syntheticAssetRemoved: result.result === 'ok' }));
    }
}
