import redisClient from './../services/redis.js';
import mongoose from 'mongoose';

export async function isRedisConnected() {
    try {
        await redisClient.ping();
        return true;
    } catch (error) {
        console.log('Redis is not connected:', error);
        return false;
    }
}

export function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}