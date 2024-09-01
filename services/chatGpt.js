import "dotenv/config.js";

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