import "dotenv/config.js";
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { Blob } from 'buffer';

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