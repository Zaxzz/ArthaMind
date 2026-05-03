import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function askAI(prompt) {
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    return chat.choices[0].message.content;
  } catch (error) {
    console.log("AI Error:", error);
    return "AI sedang sibuk, coba lagi.";
  }
}
