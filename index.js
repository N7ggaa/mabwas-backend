// backend/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js"; // relative path to the db module

dotenv.config();

const app = express();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// quick health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
