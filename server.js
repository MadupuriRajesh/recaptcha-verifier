const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();
const app = express();

// Middleware: Parse JSON and raw text (Marketo sends non-standard JSON sometimes)
app.use(bodyParser.text({ type: "*/*" }));

const PORT = process.env.PORT || 3000;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

// Endpoint to verify reCAPTCHA token
app.post("/verify-recaptcha", async (req, res) => {
  let rawBody = req.body;
  let parsedBody = null;

  try {
    parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    return res.status(400).json({ verified: false, error: "Invalid JSON format" });
  }

  console.log("📩 Parsed request body:", parsedBody);

  const token = parsedBody["g-recaptcha-response"];
  if (!token) {
    return res.status(400).json({ verified: false, error: "Missing token" });
  }

  try {
    const googleResponse = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET,
          response: token,
        },
      }
    );

    const result = googleResponse.data;
    console.log("🔐 Google reCAPTCHA result:", result);

    if (result.success && result.score >= 0.5) {
      return res.json({ verified: true, score: result.score });
    } else {
      return res.json({
        verified: false,
        score: result.score || null,
        reason: result["error-codes"] || ["Low score or failed verification"],
      });
    }
  } catch (err) {
    console.error("❌ Verification API error:", err.message);
    return res.status(500).json({ verified: false, error: "Internal server error" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send("✅ reCAPTCHA verifier is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
