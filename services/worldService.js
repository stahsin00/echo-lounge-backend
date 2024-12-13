import World from "../models/World.js";
import { getChatGptResponse } from "./chatGpt.js";

export const processWorldInfo = async (message) => {
    try {

        const processPrompt = `The following message contains information about our cyberpunk world. Message: "${message}". Extract the world information, categorize it, and provide relevant tags. Reply in strict JSON format: { "category": "LORE/LOCATION/ORGANIZATION/EVENT", "narrative": "The extracted world fact in a clear, concise statement", "tags": ["relevant", "tags", "for", "this", "information"] } Do not include markdown formatting, code blocks, or any other text - ONLY the JSON object.`;

        const worldData = await getChatGptResponse([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: processPrompt }
        ]);

        const cleanedData = worldData.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();  // TODO

        // TODO: handle multiple new info in same message
        const worldInfo = JSON.parse(cleanedData);
        console.log(worldInfo);

        const embedding = await getEmbeddings(worldInfo.narrative);

        const world = new World({
            category: worldInfo.category,
            narrative: worldInfo.narrative,
            tags: worldInfo.tags,
            embedding: embedding
            // TODO: handle canonicity
        });

        await world.save();
        return world;

    } catch (error) {
        console.error('Error processing world information:', error);
    }
}

async function getEmbeddings(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: "text-embedding-3-small"
            })
        });

        if (!response.ok) {
            throw new Error(`Embedding API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (error) {
        console.error('Error getting embeddings:', error);
        throw error;
    }
}

export const getWorldContext = async (query, limit = 5, minScore = 0.7) => {
    try {
        console.log(query);
        const queryEmbedding = await getEmbeddings(query);

        const relevantFacts = await World.aggregate([  // TODO: review
            {
                $vectorSearch: {
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: limit * 10,
                    limit: limit,
                    index: "vector_search"
                }
            },
            {
                $project: {
                    narrative: 1,
                    category: 1,
                    tags: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $match: {
                    score: { $gt: minScore }
                }
            }
        ]);

        console.log("relevant facts: ");
        console.log(relevantFacts);
        return relevantFacts;
    } catch (error) {
        console.error('Error getting relevant world context:', error);
        throw error;
    }
}