import mongoose from 'mongoose';

const WorldSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    category: { type: String, required: true, enum: ['LORE', 'LOCATION', 'ORGANIZATION', 'EVENT'] },
    narrative: { type: String, required: true },
    tags: { type: [String], required: true },
    isCanon: { type: String, enum: ['true', 'false', 'unconfirmed'], default: 'unconfirmed' },
    embedding: { type: [Number], required: true }
});

const World = mongoose.model('World', WorldSchema);

export default World;
