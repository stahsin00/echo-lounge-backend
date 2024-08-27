import express from 'express';
import cors from 'cors';
import "dotenv/config.js";
import fs from 'fs';
import sharp from 'sharp';
import { Blob } from 'buffer';
import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/serve', (req, res) => {
    const { ingredients } = req.body;

    // TODO
    const drinkResult = `Your drink with ${ingredients.join(', ')} has been served!`;
    res.json({ message: drinkResult });
});

app.post('/api/dialog', (req, res) => {
    const { userInput } = req.body;

    // TODO
    const dialogResponse = (userInput.trim() === "") ? "You stayed silent." : `You said: ${userInput}. Let's continue the conversation!`;
    res.json({ message: dialogResponse });
});

app.get('/api/new-customer', async (req, res) => {
    try {
        // Generate Customer Info
        const customerPrompt = "We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take orders. This world is populated with androids that look entirely human. They dress up in a variety of ways inspired by the many styles and cultures of the past, present, and future. They can also have any type of personality, thoughts, or preferences. You are one such android that has come as a customer. Give a detailed description of you including name, personality, looks, and preferences. Respond strictly in the following JSON format: { \"name\": \"[YOUR NAME]\", \"appearance\": \"[YOUR DESCRIPTION]\", \"personality\": \"[YOUR DESCRIPTION]\", \"preferences\": \"[YOUR DESCRIPTION]\", \"backstory\": \"[YOUR DESCRIPTION]\" } do not include anything else in the response.";
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: customerPrompt }
                ]
            })
        });

        const openAiData = await openAiResponse.json();
        const customerData = openAiData.choices[0].message.content
        const customer = JSON.parse(customerData);

        // Generate Image
        const stableAiPrompt = `Generate a cyberpunk pixel art of an anime character. The character should be depicted from the CHEST UP; THIS IS IMPORTANT! DO NOT INCLUDE ANYTHING CHEST DOWN. NOT FULL BODY!! The background should be a single color. The image should have a style reminiscent of retro pixel art games like va11-hall-a. The description of the character is: ${customer.appearance}`;
        const stableAiFormData = new FormData();
        stableAiFormData.append('prompt', stableAiPrompt);
        stableAiFormData.append('output_format', 'webp');

        const stableAiResponse = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
            method: 'POST',
            body: stableAiFormData,
            headers: {
                'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}`,
                "accept": "image/*",
            }
        });

        if (!stableAiResponse.ok) {
            const errorText = await stableAiResponse.text();
            throw new Error(`${stableAiResponse.status}: ${errorText}`);
        }

        // Remove Background
        const imageData = await stableAiResponse.arrayBuffer();
        const pngBuffer = await sharp(Buffer.from(imageData)).png().toBuffer();

        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', new Blob([pngBuffer], { type: 'image/png' }), 'image.png');

        const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            body: removeBgFormData,
            headers: {
                'X-Api-Key': process.env.REMOVEBG_API_KEY,
            },
        });

        if (!removeBgResponse.ok) {
            const errorText = await removeBgResponse.text();
            throw new Error(`Background removal failed: ${removeBgResponse.status}: ${errorText}`);
        }

        // Upload to S3
        const processedImageData = await removeBgResponse.arrayBuffer();
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `customer_${Date.now()}.png`,
            Body: Buffer.from(processedImageData),
            ContentType: 'image/png'
        };
        const uploadData = await s3.upload(uploadParams).promise();

        res.json({ customer, imageUrl : uploadData.Location });
    } catch (error) {
        console.error('Error generating customer:', error);
        res.status(500).json({ message: 'Error generating customer' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
