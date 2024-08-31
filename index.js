import "dotenv/config.js";
import express from 'express';
import cors from 'cors';
import apiRouter from "./routes/api.js";
import connectDB from "./db/db.js";
import redisClient from "./services/redis.js";
import './services/cron.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api", apiRouter);

await redisClient.connect();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
