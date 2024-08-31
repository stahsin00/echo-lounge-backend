import "dotenv/config.js";
import express from "express";
import { getChatGptResponse, generateCustomer, startSession, updateSession, visitCustomer, getSession } from "../services/services.js";
import Customer from "../models/Customer.js";

const router = express.Router();

// TODO: validate request body

router.post('/serve', async (req, res) => {
    const { drink, customer } = req.body;  // TODO: get customer info from cache instead

    try {
        const cachedData = await getSession(customer._id.toString());

        const service = `**The user has served you a ${drink.name}. This drink is ${drink.mixed ? 'well' : 'not'} mixed. It is made of ${drink.ingredients['bubbly-quasar']} parts Bubbly Quasar (an ingredient to make drinks bubbly), ${drink.ingredients['dark-matter-brew']} parts Dark Matter Brew (an ingredient to make drinks bitter), ${drink.ingredients['nebula-nectar']} parts Nebula Nectar (an ingredient to make drinks sweet), and ${drink.ingredients['plasma-peppers']} parts Plasma Peppers (an ingredient to make drinks spicy). ${drink.description} ${(drink.quality != null)? drink.quality : ''}**`;
        customer.history.push({ role: 'user', content: service })

        const prompt = `
            Please respond with a JSON object that includes:
            - "message": The response message from you as the customer.
            - "expression": The facial expression to display (e.g., "smile", "frown").
            - "tone": The tone of the message (e.g., "happy", "sad", "neutral").

            Respond only with the JSON object.`;

        const content = customer.history;
        content.push({role: 'system', content: prompt});

        const data = await getChatGptResponse(content);

        let response;
        try {
            response = JSON.parse(data);
        } catch (error) {
            throw new Error("Could not parse ChatGPT response.");
        }

        let { message, expression, tone } = response;

        customer.history.push({ role: 'assistant', content: message });

        await updateSession(customer, cachedData.visit);
        res.json({ message, expression, tone, customer });
    } catch (error) {
        console.error('Error serving drink:', error);
        res.status(500).json({ message: 'Error Seriving.' });
    }
});

router.post('/dialog', async (req, res) => {
    const { userInput, customer } = req.body;  // TODO: get customer info from cache instead

    try {
        const cachedData = await getSession(customer._id.toString());

        if (userInput == null || userInput.trim() == "") {
            customer.history.push({ role: 'user', content: '**The user has decided to stay silent and let you continue speaking.**' })
        } else {
            customer.history.push({ role: 'user', content: userInput })
        }

        const data = await getChatGptResponse(customer.history);

        customer.history.push({ role: 'assistant', content: data });
        await updateSession(customer, cachedData.visit);
        res.json({ message: data, customer: customer });
    } catch (error) {
        console.error('Error chatting:', error);
        res.status(500).json({ message: 'Error chatting' });
    }
});

router.get('/new-customer', async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();  // TODO: cache
        const availableCustomers = await Customer.countDocuments({ busy: false });

        const availablePercentage = availableCustomers / totalCustomers;

        const generateThreshold = 1;  // TODO

        let customer;

        if (availablePercentage < generateThreshold) {
            customer = await generateCustomer();
        } else {
            customer = await Customer.findOneAndUpdate(
                { busy: false },
                { busy: true, lastVisit: Date.now() },
                { sort: { lastVisit: 1 }, new: true }
            );
        }

        let visit = await visitCustomer(customer);
        const visitPrompt = `The goal of your current visit is: ${visit.visitGoal}; Your current mood is ${visit.mood}; You've had the following recent events: ${visit.recentEvents}.`;
        customer.history.push({ role: 'system', content: visitPrompt })

        await startSession(customer, visit);
        res.json({ customer });
    } catch (error) {
        console.error('Error generating customer:', error);
        res.status(500).json({ message: 'Error generating customer' });
    }
});

export default router;