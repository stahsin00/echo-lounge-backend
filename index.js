import "dotenv/config.js";
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import apiRouter from "./routes/api.js";
import connectDB from "./db/db.js";
import redisClient from "./services/redis.js";
import './services/cron.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/', (req, res) => {
    res.status(200).send('Echo Lounge.');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
    initializeServer();
});

async function initializeServer() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await connectDB();
        console.log('MongoDB connected successfully.');

        console.log('Attempting to connect to Redis...');
        await redisClient.connect();
        console.log('Connected to Redis successfully.');

        console.log('Registering routes...');
        app.use("/api", apiRouter);
        console.log('Routes registered successfully.');

    } catch (error) {
        console.error('Error during server initialization:', error);
    }
}
