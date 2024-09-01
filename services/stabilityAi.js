import "dotenv/config.js";

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