const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function askAI(prompt) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a nutrition and calorie analysis assistant. Respond clearly and accurately."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("Groq AI Error:", err);
    return "AI analysis temporarily unavailable.";
  }
}

module.exports = { askAI };
