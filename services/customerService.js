import Customer from "../models/Customer.js";
import { getChatGptResponse } from "./chatGpt.js";
import { generateStabilityAiImage } from "./stabilityAi.js";
import { removeBg } from "./removeBg.js";
import { uploadToS3 } from "./s3.js";
import { parseCustomerInfo, parseVisitInfo } from "../utils/jsonUtils.js";

// TODO: make prompts easier to read and modify
// TODO: known prompt issue - ChatGPT JSON response often surrounds text with ```json [TEXT] ```

export const visitCustomer = async (customer) => {
    try {
        const visitPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take drink orders. This world is populated with androids that look entirely human. One such android that has come as a customer. The customer has the following characteristics name : ${customer.name}; personality : ${customer.personality}; appearance : ${customer.appearance}; backstory : ${customer.backstory}; preferences : ${customer.preferences}; conversation style : ${customer.conversationStyle}; overall personal goals are: ${customer.personalGoal}; Come up with the goal for their current visit, current mood, and any recent events that have happened to the customer. Reply only in valid JSON format with the following fields: { \"visitGoal\" : \"[YOUR DESCRIPTION]\", \"mood\" : \"[YOUR DESCRIPTION]\", \"recentEvents\" : \"[YOUR DESCRIPTION]\" } Reply only with the valid JSON and nothing else.`;
        
        const visitData = await getChatGptResponse([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: visitPrompt }
        ]);

        const visitInfo = parseVisitInfo(visitData);

        return visitInfo;
    } catch (error) {
        console.error('Error creating visit information:', error);
        return {
            visitGoal: "To unwind and converse with the bartender.",
            mood: "neutral",
            recentEvents: "Nothing particularly eventful has happened lately."
        }
    }
}

// TODO: consider re-attempt or other fallback mechanisms for if one of the in-between steps fail
// TODO: look into exponential backoff
export const generateCustomer = async (busy = true) => {
    try {
        // Generate Customer Info
        const gender = Math.random() < 0.5 ? 'male' : 'female';  // TODO: temp; find other methods of varying gender; generations without gender specifications are almost all female ow

        const customerPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take orders. This world is populated with androids that look entirely human. They dress up in a variety of ways inspired by the many styles and cultures of the past, present, and future. They can also have any type of personality, thoughts, or preferences. You are one such android that has come as a customer. Your gender is ${gender}. Give a detailed description of you including name, personality, appearance, preferences, backstory, conversation style, and personal goals. Respond strictly in the following JSON format: { \"name\": \"[YOUR NAME]\", \"appearance\": \"[YOUR DESCRIPTION]\", \"personality\": \"[YOUR DESCRIPTION]\", \"preferences\": \"[YOUR DESCRIPTION]\", \"backstory\": \"[YOUR DESCRIPTION]\", \"conversationStyle\": \"[YOUR DESCRIPTION]\", \"personalGoal\": \"[YOUR DESCRIPTION]\" } do not include anything else in the response. This response must be strictly JSON.`;
        const customerData = await getChatGptResponse([
                                            { role: 'system', content: 'You are a helpful assistant.' },
                                            { role: 'user', content: customerPrompt }
                                        ]);
        
        const customerInfo = parseCustomerInfo(customerData);
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
        const historyPrompt = `We are in a bar in a futuristic cyberpunk setting. I am a bartender at this bar ready to converse and take drink orders. This world is populated with androids that look entirely human. You are one such android that has come as a customer. Reply with only what you say (your response will be placed directly in a dialog display) and no other descriptions of the setting or anything else. Your name is: ${customerInfo.name}; Your personality is: ${customerInfo.personality}; Your appearance is: ${customerInfo.appearance}; Your backstory is: ${customerInfo.backstory}; Your preferences are: ${customerInfo.preferences}; Your conversation style is: ${customerInfo.conversationStyle}; Speak in character to the descriptions and respond like you are speaking directly to the bartender. You do not know anything about the bartender so do not comment on anyone but yourself. All your responses will be in valid JSON structure following the format: { "message": "[The response message from you as the customer]", "expression": "[The facial expression to display (must be one of the following: "smily", "angry", "dizzy", "flushed", "sad", "sheepish", "inLove", "laughing", "wink", "crying", "surprised", "excited", "neutral"]", "tone": "[The tone of the message (e.g., "happy", "sad", "neutral", etc. The tone must a simple single word)]"} Do not include anything except the JSON`;
        customerInfo.history = [
            { role: 'system', content: historyPrompt },
            { role: 'system', content: `Yours current personal goals are: ${customerInfo.personalGoal}`}
        ];

        customerInfo.imageUrl = imageUrl;
        customerInfo.busy = busy;

        // Save Customer to Database
        const customer = new Customer(customerInfo);
        await customer.save();
        console.log("Customer saved to MongoDB.");

        return customer;
    } catch (error) {
        console.error('Error generating customer:', error);
        throw error;
    }
}