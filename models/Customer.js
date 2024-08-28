import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    personality: { type: String, required: true },
    appearance: { type: String, required: true },
    backstory: { type: String, required: true },
    preferences: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    busy: { type: Boolean, default: true },
    history: { type: Array, required: true }
});

const Customer = mongoose.model('Customer', CustomerSchema);

export default Customer;
