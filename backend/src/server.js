import "dotenv/config";
import Fastify from "fastify";

import { vectorOnlySearch, postFilterSearch, hybridSearch } from "./search.js";
import { answerWithContext } from "./llm.js";
import { runBenchmark } from "./benchmark.js";

const app = Fastify();

/* Health check */
app.get("/", async () => {
  return { status: "ok" };
});

/* Retrieval modes */
app.post("/search", async (req) => {
  const { mode, filters } = req.body;

  if (mode === "vector") return vectorOnlySearch();
  if (mode === "post") return postFilterSearch(filters);
  if (mode === "hybrid") return hybridSearch(filters);

  return { error: "Invalid mode" };
});

/* Conversational RAG */
app.post("/ask", async (req) => {
  const { question, filters } = req.body;

  const retrieval = await hybridSearch(filters);

  const answer = await answerWithContext(
    question,
    retrieval.docs
  );

  return {
    question,
    answer,
    retrievalStats: {
      totalTime: retrieval.totalTime,
      metaTime: retrieval.metaTime,
      vectorTime: retrieval.vectorTime,
      candidates: retrieval.candidates
    }
  };
});

/* Benchmark */
app.post("/benchmark", async (req) => {
  const { filters } = req.body;
  return runBenchmark(filters);
});

app.listen({ port: 3000 }, () => {
  console.log("API running at http://localhost:3000");
});
