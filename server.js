const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

app.post("/verify-recaptcha", async (req, res) => {
  console.log("🔍 Incoming request body:", req.body); // log what Marketo sends
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

app.get("/", (req, res) => {
  res.send("reCAPTCHA verifier running!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
