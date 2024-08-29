import "dotenv/config.js";
import express from "express";
import { getChatGptResponse, generateCustomer } from "../services/services.js";
import Customer from "../models/Customer.js";

const router = express.Router();

// TODO: validate request body

router.post('/serve', async (req, res) => {
    const { drink, customer } = req.body;  // TODO: get customer info from cache instead

    try {
        const service = `**The user has serve you a ${drink.name}. This drink is ${drink.mixed ? 'well' : 'not'} mixed. It is made of ${drink.ingredients['bubbly-quasar']} parts Bubbly Quasar (an ingredient to make drinks bubbly), ${drink.ingredients['dark-matter-brew']} parts Dark Matter Brew (an ingredient to make drinks bitter), ${drink.ingredients['nebula-nectar']} parts Nebula Nectar (an ingredient to make drinks sweet), and ${drink.ingredients['plasma-peppers']} parts Plasma Peppers (an ingredient to make drinks spicy). ${drink.description} ${(drink.quality != null)? drink.quality : ''}**`;
        customer.history.push({ role: 'user', content: service })
        const data = await getChatGptResponse(customer.history);
        customer.history.push({ role: 'assistant', content: data });

        res.json({ message: data, customer: customer });
    } catch (error) {
        console.error('Error serving drink:', error);
        res.status(500).json({ message: 'Error Seriving.' });
    }
});

router.post('/dialog', async (req, res) => {
    const { userInput, customer } = req.body;  // TODO: get customer info from cache instead

    try {
        if (userInput == null || userInput.trim() == "") {
            customer.history.push({ role: 'user', content: '**The user has decided to stay silent and let you continue speaking.**' })
        } else {
            customer.history.push({ role: 'user', content: userInput })
        }

        const data = await getChatGptResponse(customer.history);

        customer.history.push({ role: 'assistant', content: data });
        res.json({ message: data, customer: customer });
    } catch (error) {
        console.error('Error chatting:', error);
        res.status(500).json({ message: 'Error chatting' });
    }
});

router.get('/new-customer', async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();
        const availableCustomers = await Customer.countDocuments({ busy: false });

        const availablePercentage = availableCustomers / totalCustomers;
        const generateThreshold = 0.2;

        let customer;

        if (availablePercentage < generateThreshold) {
            customer = await generateCustomer();
        } else {
            customer = await Customer.findOne({ busy: false }).sort({ lastVisit: 1 });
            customer.lastVisit = Date.now();
            await customer.save();
        }

        res.json({ customer });
    } catch (error) {
        console.error('Error generating customer:', error);
        res.status(500).json({ message: 'Error generating customer' });
    }
});

export default router;