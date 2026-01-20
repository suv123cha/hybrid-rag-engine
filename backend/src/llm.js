import axios from "axios";

const ollama = axios.create({
    baseURL: process.env.OLLAMA_URL || "http://rag-ollama:11434"
});

const MODEL = process.env.LLM_MODEL || "phi3:mini";

export async function answerWithContext(question, contexts = []) {
    if (!contexts.length) {
        return "Data not available in documents.";
    }

    const systemPrompt = `
You are an enterprise analytics assistant.
Answer ONLY using the provided context.
If the answer is missing, say "Data not available in documents".
`;

    const contextText = contexts
        .map((c, i) => `Document ${i + 1}: ${c.text}`)
        .join("\n\n");

    const response = await ollama.post("/api/generate", {
        model: MODEL,
        prompt: `
${systemPrompt}

Context:
${contextText}

Question:
${question}

Answer:
`,
        stream: false
    });

    return response.data.response;
}

