import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    personality: { type: String, required: true },
    appearance: { type: String, required: true },
    backstory: { type: String, required: true },
    preferences: { type: String, required: true },
    conversationStyle: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    busy: { type: Boolean, required: false },
    history: { type: Array, required: true },
    personalGoal: { type: String, required: true},
    attention: { type: Boolean, default: false}
});

CustomerSchema.index({ isBusy: 1 });

const Customer = mongoose.model('Customer', CustomerSchema);

export default Customer;
