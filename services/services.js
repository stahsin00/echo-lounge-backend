import "dotenv/config.js";
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { Blob } from 'buffer';
import Customer from "../models/Customer.js";

// TODO: checks for if env is not properly set
// TODO: fetch request timeouts (?)
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

export const getChatGptResponse = async (messages) => {
    try {
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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error) {
        console.error('Error getting ChatGPT response:', error);
        throw error;
    }
}

export const generateStabilityAiImage = async (prompt) => {
    try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('output_format', 'webp');

        const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}`,
                "accept": "image/*",
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status}: ${errorText}`);
        }

        const imageData = await response.arrayBuffer();
        return imageData;
    } catch (error) {
        console.error('Error generating Stability AI image:', error);
        throw error;
    }
}

export const removeBg = async (imageData) => {
    try {
        const pngBuffer = await sharp(Buffer.from(imageData)).png().toBuffer();  // TODO: consider resizing/compressing

        const formData = new FormData();
        formData.append('image_file', new Blob([pngBuffer], { type: 'image/png' }), 'image.png');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Api-Key': process.env.REMOVEBG_API_KEY,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status}: ${errorText}`);
        }

        const processedImageData = await response.arrayBuffer();
        return processedImageData;
    } catch (error) {
        console.error('Error removing image background:', error);
        throw error;
    }
}

export const uploadToS3 = async (imageData) => {
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `customer_${Date.now()}.png`,  // TODO: consider key collisions if trying to upload mutiple images at close time intervals
            Body: Buffer.from(imageData),
            ContentType: 'image/png'
        };

        const uploadData = await s3.upload(uploadParams).promise();
        return uploadData.Location;
    } catch (error) {
        console.error('Error uploading image to AWS S3:', error);
        throw error;
    }
}

export const generateCustomer = async (busy = true) => {
    try {
        // Generate Customer Info
        const gender = Math.random() < 0.5 ? 'male' : 'female';  // TODO: temp 

        const customerPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take orders. This world is populated with androids that look entirely human. They dress up in a variety of ways inspired by the many styles and cultures of the past, present, and future. They can also have any type of personality, thoughts, or preferences. You are one such android that has come as a customer. Your gender is ${gender}. Give a detailed description of you including name, personality, looks, and preferences. Respond strictly in the following JSON format: { \"name\": \"[YOUR NAME]\", \"appearance\": \"[YOUR DESCRIPTION]\", \"personality\": \"[YOUR DESCRIPTION]\", \"preferences\": \"[YOUR DESCRIPTION]\", \"backstory\": \"[YOUR DESCRIPTION]\" } do not include anything else in the response.`;
        const customerData = await getChatGptResponse([
                                            { role: 'system', content: 'You are a helpful assistant.' },
                                            { role: 'user', content: customerPrompt }
                                        ]);
        console.log(customerData);
        let customerInfo;
        try {
            customerInfo = JSON.parse(customerData);
            console.log("New customer info generated.");
        } catch (error) {
            throw new Error("Could not parse ChatGPT response.");
        }

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
        customerInfo.busy = busy;
        const customer = new Customer(customerInfo);
        await customer.save();
        console.log("Customer saved to MongoDB.");

        return customer;
    } catch (error) {
        console.error('Error generating customer:', error);
        throw error;
    }
}