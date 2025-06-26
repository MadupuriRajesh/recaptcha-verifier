const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();
const app = express();

// Accept any incoming content type as raw text
app.use(bodyParser.text({ type: "*/*" }));

const PORT = process.env.PORT || 3000;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

// Verify reCAPTCHA token endpoint
app.post("/verify-recaptcha", async (req, res) => {
  const rawBody = req.body;
  let parsedBody;

  // Log raw body (helpful for debugging Marketo payload issues)
  console.log("📦 Raw body from Marketo:", rawBody);

  try {
    parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    return res.status(400).json({ verified: false, error: "Invalid JSON format" });
  }

  console.log("✅ Parsed request body:", parsedBody);

  const token = parsedBody["g-recaptcha-response"];
  if (!token || token === "none" || token.trim() === "") {
    console.error("⚠️ Missing or empty token:", token);
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
    console.log("🔍 reCAPTCHA verification result:", result);

    if (result.success && result.score >= 0.5) {
      return res.json({ verified: true, score: result.score });
    } else {
      return res.json({
        verified: false,
        score: result.score || 0,
        reason: result["error-codes"] || ["Low score or other verification failure"],
      });
    }
  } catch (err) {
    console.error("❌ Error calling Google reCAPTCHA API:", err.message);
    return res.status(500).json({ verified: false, error: "Internal verification error" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send("✅ reCAPTCHA verifier is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
