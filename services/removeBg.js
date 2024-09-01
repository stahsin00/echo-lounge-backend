import "dotenv/config.js";
import sharp from 'sharp';
import { Blob } from 'buffer';

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