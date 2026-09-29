import mongoose from "mongoose";

mongoose.set('bufferCommands', false);

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const uri = process.env.MONGODB_URI?.trim();
        if (!uri) {
            const error = new Error('MONGODB_URI is not configured');
            error.code = 'DATABASE_CONFIG_ERROR';
            throw error;
        }
        const opts = {
            dbName: process.env.MONGODB_DB || 'venture',
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        };
        cached.promise = mongoose.connect(uri, opts);
    }
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
}

export default connectDB;
