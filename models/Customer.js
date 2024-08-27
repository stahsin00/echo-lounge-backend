import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageUrl: String,
    personality: String,
    appearance: String,
    backstory: String,
    preferences: String,
    createdAt: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    busy: { type: Boolean, default: true },
    history: { type: Array, default: [] }
});

const Customer = mongoose.model('Customer', CustomerSchema);

export default Customer;
