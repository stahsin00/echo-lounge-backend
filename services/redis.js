import { createClient } from 'redis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = createClient({
    url: `rediss://${redisHost}:${redisPort}`,
    socket: {
        tls: true,
        connectTimeout: 5000
    }
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('ready', () => {
    console.log('Redis is ready');
});

redisClient.on('reconnecting', () => {
    console.log('Reconnecting to Redis...');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

export async function scanKeys(pattern) {
    let cursor = '0';
    const keys = [];
    do {
        const reply = await redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 100
        });
        cursor = reply.cursor;
        keys.push(...reply.keys);
    } while (cursor !== '0');
    
    return keys;
}

export default redisClient;