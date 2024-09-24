import redisClient, { scanKeys } from "./redis.js";
import { isRedisConnected, isMongoConnected } from '../utils/connectivityUtils.js';
import Customer from '../models/Customer.js';

export async function startSession(customer, visit) {  // TODO: use something else for session key
    const sessionKey = `session:${customer._id.toString()}`;
    const customerData = JSON.stringify({
        customer,
        visit,
        lastUpdated: Date.now()
    });

    await redisClient.set(sessionKey, customerData);

    console.log(`Session started for character ${customer.name}.`);
}

export async function getSession(customerId) {
    const sessionKey = `session:${customerId}`;
    const customerData = await redisClient.get(sessionKey);

    return customerData ? JSON.parse(customerData) : null;
}

export async function updateSession(customer, visit) {  // TODO
    const sessionKey = `session:${customer._id.toString()}`;
    const customerData = JSON.stringify({
        customer,
        visit,
        lastUpdated: Date.now()
    });

    await redisClient.set(sessionKey, customerData);
}

export async function cleanupSessions() {
    const redisConnected = await isRedisConnected();
    const mongoConnected = isMongoConnected();

    if (!redisConnected || !mongoConnected) {
        console.log('Skipping session cleanup: Redis or MongoDB not connected.');
        return;
    }
    
    try {
        const keys = await scanKeys('session:*');

        for (const key of keys) {
            const data = await redisClient.get(key);
            
            if (data) {  // TODO: considering cleaning sessions without data
                const { customer, lastUpdated } = JSON.parse(data);
                
                const currentTime = Date.now();
                const expirationPeriod = 10 * 60 * 1000;  // TODO: currently 10 minutes

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