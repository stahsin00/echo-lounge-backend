import "dotenv/config.js";
import express from "express";
import Customer from "../models/Customer.js";
import { getChatGptResponse } from "../services/chatGpt.js";
import { generateCustomer, visitCustomer } from '../services/customerService.js';
import { startSession, updateSession, getSession } from "../services/sessionService.js";
import { parseCustomerResponse } from "../utils/jsonUtils.js";

const router = express.Router();

// TODO: validate request body
// TODO: checks for if env is not properly set
// TODO: handle fetch request timeouts (?)
// TODO: consider adding middleware for logging, checking session validity, and updating session
// TODO: fix duplicate code in serve and converse endpoints
// TODO: get customer info from cache instead

router.post('/serve', async (req, res) => {
    const { drink, customer } = req.body;
    if (!drink || !customer || !customer._id) {
        res.status(400).json({ message: "Missing required fields."});
        return;
    }

    try {
        const cachedData = await getSession(customer._id.toString());
        if (!cachedData)  {
            res.status(401).json({ message: "Invalid session."});
            return;
        }

        const service = `**The user has served you a ${drink.name}. This drink is ${drink.mixed ? 'well' : 'not'} mixed. It is made of ${drink.ingredients['bubbly-quasar']} parts Bubbly Quasar (an ingredient to make drinks bubbly), ${drink.ingredients['dark-matter-brew']} parts Dark Matter Brew (an ingredient to make drinks bitter), ${drink.ingredients['nebula-nectar']} parts Nebula Nectar (an ingredient to make drinks sweet), and ${drink.ingredients['plasma-peppers']} parts Plasma Peppers (an ingredient to make drinks spicy). ${drink.description} ${(drink.quality != null)? drink.quality : ''}**`;
        customer.history.push({ role: 'user', content: service })

        customer.history.push({ role: 'system', content: `Remember to respond in strict JSON format following the structure: { "message": "[The response message from you as the customer]", "expression": "[The facial expression to display (must be one of the following: "smily", "angry", "dizzy", "flushed", "sad", "sheepish", "inLove", "laughing", "wink", "crying", "surprised", "excited", "neutral"]", "tone": "[The tone of the message (e.g., "happy", "sad", "neutral", etc. The tone must a simple single word)]"} Do not include anything except the JSON`})

        const data = await getChatGptResponse(customer.history);
        const response = parseCustomerResponse(data);
        const { message, expression, tone } = response;

        customer.history.push({ role: 'assistant', content: data });

        await updateSession(customer, cachedData.visit);
        res.json({ message, expression, tone, customer });
    } catch (error) {
        console.error('Error serving drink:', error);
        res.status(500).json({ message: 'Error Seriving.' });
    }
});

router.post('/converse', async (req, res) => {
    const { userInput, customer } = req.body;
    if (!customer || !customer._id) {
        res.status(400).json({ message: "Missing required fields."});
        return;
    }

    try {
        const cachedData = await getSession(customer._id.toString());
        if (!cachedData)  {
            res.status(401).json({ message: "Invalid session."});
            return;
        }

        if (!userInput || userInput.trim() == "") {
            customer.history.push({ role: 'user', content: '**The user has decided to just listen.**' })
        } else {
            customer.history.push({ role: 'user', content: userInput })
        }

        customer.history.push({ role: 'system', content: `Remember to respond in strict JSON format following the structure: { "message": "[The response message from you as the customer]", "expression": "[The facial expression to display (must be one of the following: "smily", "angry", "dizzy", "flushed", "sad", "sheepish", "inLove", "laughing", "wink", "crying", "surprised", "excited", "neutral"]", "tone": "[The tone of the message (e.g., "happy", "sad", "neutral", etc. The tone must a simple single word)]"} Do not include anything except the JSON`})

        const data = await getChatGptResponse(customer.history);
        const response = parseCustomerResponse(data);
        const { message, expression, tone } = response;

        customer.history.push({ role: 'assistant', content: data });

        await updateSession(customer, cachedData.visit);
        res.json({ message, expression, tone, customer });
    } catch (error) {
        console.error('Error chatting:', error);
        res.status(500).json({ message: 'Error chatting' });
    }
});

router.get('/new-customer', async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();  // TODO: cache
        const availableCustomers = await Customer.countDocuments({ busy: false, attention: false });

        const availablePercentage = availableCustomers / totalCustomers;
        const generateThreshold = 0;  // TODO: choose an appropriate threshold

        let customer;

        if (availablePercentage < generateThreshold || availableCustomers === 0) {
            // TODO: consider having a scheduler keep the database pre-loaded with a certain percentage of available customers
            customer = await generateCustomer();
        } else {
            customer = await Customer.findOneAndUpdate(
                { busy: false, attention: false },
                { busy: true, lastVisit: Date.now() },  // TODO: randomize and pick from the last x customers
                { sort: { lastVisit: 1 }, new: true }
            );
        }

        const visit = await visitCustomer(customer);
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