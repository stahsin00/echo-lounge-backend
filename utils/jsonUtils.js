export function parseCustomerResponse(data) {
    try {
        const response = JSON.parse(data);

        const { message, expression, tone } = response;

        if (!message) {
            throw new Error("Customer response missing required fields.");
        }

        response.expression = expression || 'neutral';
        response.tone = tone || 'neutral';

        return response;
    } catch (error) {
        console.error('Error parsing customer response:', error);
        throw new Error("Could not parse customer response.");
    }
};

export function parseVisitInfo(data) {
    try {
        const info = JSON.parse(data);

        const { visitGoal, mood, recentEvents } = info;

        if (!visitGoal || !mood || !recentEvents) {
            throw new Error("Visit info missing required fields.");
        }

        return info;
    } catch (error) {
        console.error('Error parsing visit info:', error);
        throw new Error("Could not parse visit info.");
    }
}

export function parseCustomerInfo(data) {
    try {
        const info = JSON.parse(data);

        const { name, personality, appearance, preferences, backstory, conversationStyle, personalGoal } = info;

        if (!name || !personality || !appearance || !preferences || !backstory || !conversationStyle || !personalGoal) {
            throw new Error("Customer info missing required fields.");
        }

        return info;
    } catch (error) {
        console.error('Error parsing customer info:', error);
        throw new Error("Could not parse customer info.");
    }
}

// TODO: add a method for re-attempts at getting parseable JSON from ChatGPT