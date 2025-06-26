const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json()); // Handles JSON
app.use(express.urlencoded({ extended: true })); // Handles x-www-form-urlencoded

const PORT = process.env.PORT || 3000;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

app.post("/verify-recaptcha", async (req, res) => {
  const token = req.body["g-recaptcha-response"];

  if (!token) {
    return res.status(400).json({ verified: false, error: "Missing token" });
  }

  try {
    const googleRes = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET,
          response: token
        }
      }
    );

    const result = googleRes.data;

    if (result.success && result.score >= 0.5) {
      return res.json({ verified: true, score: result.score });
    } else {
      return res.json({ verified: false, score: result.score, reason: result["error-codes"] });
    }
  } catch (error) {
    console.error("Verification error:", error.message);
    res.status(500).json({ verified: false, error: "Internal server error" });
  }
});
