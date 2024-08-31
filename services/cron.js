import cron from 'node-cron';
import redisClient from './redis.js';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';

async function isRedisConnected() {
    try {
        await redisClient.ping();
        return true;
    } catch (error) {
        console.log('Redis is not connected:', error);
        return false;
    }
}

function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

async function cleanupSessions() {
    const redisConnected = await isRedisConnected();
    const mongoConnected = isMongoConnected();

    if (!redisConnected || !mongoConnected) {
        console.log('Skipping session cleanup: Redis or MongoDB not connected.');
        return;
    }
    
    try {
        const keys = await redisClient.keys('session:*');

        for (const key of keys) {
            const data = await redisClient.get(key);
            
            if (data) {
                const { customer, lastUpdated } = JSON.parse(data);
                
                const currentTime = Date.now();
                const expirationPeriod = 10 * 60 * 1000;  // TODO: 10 minutes

                if (currentTime - lastUpdated > expirationPeriod) {
                    await redisClient.del(key);

                    const customerDocument = await Customer.findById(customer._id);
                    if (customerDocument) {
                        customer.history = customerDocument.history;  // TODO: temp
                        customer.busy = false;
                        Object.assign(customerDocument, customer);
                        await customerDocument.save();
                    }

                    console.log(`Expired session for customer ${customer.name} has been cleaned up.`);
                }
            }
        }
    } catch (error) {
        console.error('Error during session cleanup:', error);
    }
}

cron.schedule('* * * * *', cleanupSessions);  // TODO