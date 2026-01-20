import { initCollection } from "./qdrant.js";
import { ingest } from "./ingest.js";

await initCollection();
await ingest(50000); // start with 50k for speed
process.exit();
