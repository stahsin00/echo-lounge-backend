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

app.post('/api/dialog', async (req, res) => {
    const { userInput, customer } = req.body;  // TODO: get customer info from cache instead

    try {
        let messages = [];

        if (customer.history != null) {
            messages = customer.history;
        } else {
            const prompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take drink orders. This world is populated with androids that look entirely human. You are one such android that has come as a customer. Reply with only what you say (your response will be placed directly in a dialog display) and no other descriptions of the setting or anything else. Your name is: ${customer.name}; Your personality is: ${customer.personality}; Your appearance is: ${customer.appearance}; Your backstory is: ${customer.backstory}; Your preferences are: ${customer.preferences}; Speak in character to the descriptions and respond like you are speaking directly to the bartender. You do not know anything about the bartender so do not comment on anyone but yourself.`;
            messages.push({ role: 'system', content: prompt });
        }

        if (userInput.trim() == "") {
            messages.push({ role: 'user', content: '**The user has decided to stay silent and let you continue speaking.**' })
        } else {
            messages.push({ role: 'user', content: userInput })
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages
            })
        });

        const result = await response.json();
        const data = result.choices[0].message.content

        messages.push({ role: 'assistant', content: data });
        customer.history = messages;
        res.json({ message: data, customer: customer });
    } catch (error) {
        console.error('Error chatting:', error);
        res.status(500).json({ message: 'Error chatting' });
    }
});

app.get('/api/new-customer', async (req, res) => {
    try {
        // // Generate Customer Info
        // const gender = Math.random() < 0.5 ? 'male' : 'female';  // TODO: temp 

        // const customerPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take orders. This world is populated with androids that look entirely human. They dress up in a variety of ways inspired by the many styles and cultures of the past, present, and future. They can also have any type of personality, thoughts, or preferences. You are one such android that has come as a customer. Your gender is ${gender}. Give a detailed description of you including name, personality, looks, and preferences. Respond strictly in the following JSON format: { \"name\": \"[YOUR NAME]\", \"appearance\": \"[YOUR DESCRIPTION]\", \"personality\": \"[YOUR DESCRIPTION]\", \"preferences\": \"[YOUR DESCRIPTION]\", \"backstory\": \"[YOUR DESCRIPTION]\" } do not include anything else in the response.`;
        // const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         model: 'gpt-4',
        //         messages: [
        //             { role: 'system', content: 'You are a helpful assistant.' },
        //             { role: 'user', content: customerPrompt }
        //         ]
        //     })
        // });

        // const openAiData = await openAiResponse.json();
        // const customerData = openAiData.choices[0].message.content
        // const customer = JSON.parse(customerData);

        // // Generate Image
        // const stableAiPrompt = `Generate a cyberpunk pixel art of a ${gender} anime character. The character should be depicted from the CHEST UP; THIS IS IMPORTANT! DO NOT INCLUDE ANYTHING CHEST DOWN. NOT FULL BODY!! The background should be a single color. The image should have a style reminiscent of retro pixel art games like va11-hall-a. The description of the character is: ${customer.appearance}`;
        // const stableAiFormData = new FormData();
        // stableAiFormData.append('prompt', stableAiPrompt);
        // stableAiFormData.append('output_format', 'webp');

        // const stableAiResponse = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
        //     method: 'POST',
        //     body: stableAiFormData,
        //     headers: {
        //         'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}`,
        //         "accept": "image/*",
        //     }
        // });

        // if (!stableAiResponse.ok) {
        //     const errorText = await stableAiResponse.text();
        //     throw new Error(`${stableAiResponse.status}: ${errorText}`);
        // }

        // // Remove Background
        // const imageData = await stableAiResponse.arrayBuffer();
        // const pngBuffer = await sharp(Buffer.from(imageData)).png().toBuffer();

        // const removeBgFormData = new FormData();
        // removeBgFormData.append('image_file', new Blob([pngBuffer], { type: 'image/png' }), 'image.png');

        // const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        //     method: 'POST',
        //     body: removeBgFormData,
        //     headers: {
        //         'X-Api-Key': process.env.REMOVEBG_API_KEY,
        //     },
        // });

        // if (!removeBgResponse.ok) {
        //     const errorText = await removeBgResponse.text();
        //     throw new Error(`Background removal failed: ${removeBgResponse.status}: ${errorText}`);
        // }

        // // Upload to S3
        // const processedImageData = await removeBgResponse.arrayBuffer();
        // const uploadParams = {
        //     Bucket: process.env.AWS_S3_BUCKET_NAME,
        //     Key: `customer_${Date.now()}.png`,
        //     Body: Buffer.from(processedImageData),
        //     ContentType: 'image/png'
        // };
        // const uploadData = await s3.upload(uploadParams).promise();



        // TODO; temp
        await new Promise(resolve => setTimeout(resolve, 2000));
        const imageList = ["https://echo-lounge.s3.ca-central-1.amazonaws.com/customer_1724717524938.png","https://echo-lounge.s3.ca-central-1.amazonaws.com/customer_1724717641769.png","https://echo-lounge.s3.ca-central-1.amazonaws.com/customer_1724708119497.png"];
        const customer = {
            "name" : "Seraphina",
            "appearance" : "Seraphina has a svelte, athletic body, standing at 5'7\". Her skin has a metallic sheen, a stark cold silver that contrasts with the warmth of her eyes, a vibrant emerald green color. Her face is sharply angular with high cheekbones, giving her a regal look. She has a sleek straight bob of platinum blonde, the ends of which just barely touch her shoulders. Seraphina is almost always seen in on-trend high fashion gear, ranging from modified Victorian era gothic wear to streamlined minimal future-chic attire. Despite the assorted styles, black dominates her color choice, with the occasional dash of white or metallics.",
            "personality" : "Seraphina hails from the class of androids who were designed for diplomacy, hence her sophisticated, confident personality. She is intelligent, meticulously polite, and always maintains a calm demeanor. Seraphina delights in the art of conversation and exudes a charisma that makes her easy to get along with. She is curious about everyone she meets, always open to hearing their stories. But she also has a fierce streak, you wouldn’t want to be on the wrong side of an argument with her.",
            "backstory" : "Seraphina was initially created to serve as an emissary, handling diplomatic talks amid corporates in the neon metropolis. She became a fixture in the high-end soirees, impressing people with her charm and wit. However, the monotony of the elite's droning conversations soon began to wear thin. Driven by a desire to expand her understanding of the world and its diverse inhabitants, she chose to leave that life behind. These days, Seraphina explores the multifaceted, vibrant world outside the corporate bubble, savoring drinks and stories from different corners of the unpredictably chaotic city.",
            "preferences" : "Seraphina is particular about the origins of her beverages of choice and prefers to drink locally brewed spirits rather than mass-produced ones. She adores classical music fused with cyberpunk beats. She is fond of nights, neon lights, contemplative walks, and the thrill of discovering the histories of the ancient relics scattered through the megacities. She appreciates quality in all things from her clothing to her interactions."

        };
        const uploadData = { "Location" : imageList[Math.floor(Math.random() * imageList.length)] };



        customer.imageUrl = uploadData.Location

        res.json({ customer });
    } catch (error) {
        console.error('Error generating customer:', error);
        res.status(500).json({ message: 'Error generating customer' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
