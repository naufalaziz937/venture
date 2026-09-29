import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_IMAGE_BYTES, validateImageFiles } from '../lib/uploads.mjs';

const image = (type = 'image/png', size = 100) => ({ type, size });

test('image uploads enforce type, size, and count', () => {
    assert.equal(validateImageFiles([image()]), null);
    assert.match(validateImageFiles([image('application/pdf')]), /Only JPEG/);
    assert.match(validateImageFiles([image('image/png', MAX_IMAGE_BYTES + 1)]), /5 MB/);
    assert.match(validateImageFiles([image(), image()], { maxCount: 1 }), /maximum of 1/);
});
