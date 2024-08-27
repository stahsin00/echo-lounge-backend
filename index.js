import express from 'express';
import cors from 'cors';
import apiRouter from "./routes/api.js";
import "dotenv/config.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
