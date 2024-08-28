import "dotenv/config.js";
import express from 'express';
import cors from 'cors';
import apiRouter from "./routes/api.js";
import connectDB from "./db/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api", apiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
