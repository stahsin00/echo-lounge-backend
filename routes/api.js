import "dotenv/config.js";
import express from "express";
import { getChatGptResponse, generateStabilityAiImage, removeBg, uploadToS3 } from "../services/services.js";
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
        // Generate Customer Info
        const gender = Math.random() < 0.5 ? 'male' : 'female';  // TODO: temp 

        const customerPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take orders. This world is populated with androids that look entirely human. They dress up in a variety of ways inspired by the many styles and cultures of the past, present, and future. They can also have any type of personality, thoughts, or preferences. You are one such android that has come as a customer. Your gender is ${gender}. Give a detailed description of you including name, personality, looks, and preferences. Respond strictly in the following JSON format: { \"name\": \"[YOUR NAME]\", \"appearance\": \"[YOUR DESCRIPTION]\", \"personality\": \"[YOUR DESCRIPTION]\", \"preferences\": \"[YOUR DESCRIPTION]\", \"backstory\": \"[YOUR DESCRIPTION]\" } do not include anything else in the response.`;
        const customerData = await getChatGptResponse([
                                            { role: 'system', content: 'You are a helpful assistant.' },
                                            { role: 'user', content: customerPrompt }
                                        ]);
        const customerInfo = JSON.parse(customerData);
        console.log("New customer info generated.");

        // Generate Image
        const imagePrompt = `Generate a cyberpunk pixel art of a ${gender} anime character. The character should be depicted from the CHEST UP; THIS IS IMPORTANT! DO NOT INCLUDE ANYTHING CHEST DOWN. NOT FULL BODY!! The background should be a single color. The image should have a style reminiscent of retro pixel art games like va11-hall-a. The description of the character is: ${customerInfo.appearance}`;
        const imageData = await generateStabilityAiImage(imagePrompt);
        console.log("New customer image generated.");

        // Remove Background
        const processedImageData = await removeBg(imageData);
        console.log("Image background removed.");

        // Upload to S3
        const imageUrl = await uploadToS3(processedImageData);
        console.log("Image uploaded.");

        // Create Context
        const historyPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take drink orders. This world is populated with androids that look entirely human. You are one such android that has come as a customer. Reply with only what you say (your response will be placed directly in a dialog display) and no other descriptions of the setting or anything else. Your name is: ${customerInfo.name}; Your personality is: ${customerInfo.personality}; Your appearance is: ${customerInfo.appearance}; Your backstory is: ${customerInfo.backstory}; Your preferences are: ${customerInfo.preferences}; Speak in character to the descriptions and respond like you are speaking directly to the bartender. You do not know anything about the bartender so do not comment on anyone but yourself.`;
        customerInfo.history = [{ role: 'system', content: historyPrompt }];

        customerInfo.imageUrl = imageUrl;
        const customer = new Customer(customerInfo);
        await customer.save();
        console.log("Customer saved to MongoDB.");

        res.json({ customer });
    } catch (error) {
        console.error('Error generating customer:', error);
        res.status(500).json({ message: 'Error generating customer' });
    }
});

export default router;