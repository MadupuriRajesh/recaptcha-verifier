const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();
const app = express();

// Middleware: Handle both JSON and text (for Marketo compatibility)
app.use(bodyParser.json());
app.use(bodyParser.text());

const PORT = process.env.PORT || 3000;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

// reCAPTCHA verification endpoint
app.post("/verify-recaptcha", async (req, res) => {
  let body = req.body;

  // Fallback: if Marketo sends as plain text, parse it
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err.message);
      return res.status(400).json({ verified: false, error: "Invalid JSON format" });
    }
  }

  console.log("🔍 Final parsed body:", body);

  const token = body["g-recaptcha-response"];
  if (!token) {
    return res.status(400).json({ verified: false, error: "Missing token" });
  }

  try {
    const googleRes = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET,
          response: token,
        },
      }
    );

    const result = googleRes.data;

    if (result.success && result.score >= 0.5) {
      return res.json({ verified: true, score: result.score });
    } else {
      return res.json({
        verified: false,
        score: result.score,
        reason: result["error-codes"] || "Low score or failed verification",
      });
    }
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    return res.status(500).json({ verified: false, error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ reCAPTCHA verifier running");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
