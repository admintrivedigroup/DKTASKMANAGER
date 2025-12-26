const axios = require("axios");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-8b-8192";

const SYSTEM_PROMPT = [
  "Write a professional weekly summary for admins.",
  "Do NOT add or invent data.",
  "Do NOT modify numbers.",
  "Improve clarity and readability only.",
  "Keep tone neutral and concise.",
].join(" ");

const generateWeeklySummaryAI = async (rawSummaryText) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  if (!rawSummaryText || typeof rawSummaryText !== "string") {
    throw new Error("rawSummaryText is required");
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawSummaryText },
        ],
        temperature: 0.4,
        max_tokens: 512, // 🔑 REQUIRED BY GROQ
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No summary returned from Groq");
    }

    return content;
  } catch (error) {
    // 🔍 VERY IMPORTANT LOG
    console.error(
      "Groq API error:",
      error?.response?.data || error.message
    );
    throw error;
  }
};

module.exports = { generateWeeklySummaryAI };
