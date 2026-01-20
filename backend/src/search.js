import { pool } from "./db.js";
import { qdrant } from "./qdrant.js";

function fakeQueryEmbedding() {
    return Array(384).fill(0.5);
}

/* 1️⃣ Vector Only (Broken but common) */
export async function vectorOnlySearch() {
    const start = Date.now();

    const result = await qdrant.post("/collections/docs/points/search", {
        vector: fakeQueryEmbedding(),
        limit: 5
    });

    return {
        mode: "vector-only",
        totalTime: Date.now() - start,
        scanned: 50000,
        results: result.data.result
    };
}

/* 2️⃣ Post Filter Only (Slow & wasteful) */
export async function postFilterSearch(filters) {
    const start = Date.now();

    const vectorResult = await qdrant.post("/collections/docs/points/search", {
        vector: fakeQueryEmbedding(),
        limit: 50
    });

    const ids = vectorResult.data.result.map(r => r.id);

    const metaStart = Date.now();
    const { rows } = await pool.query(
        `SELECT id FROM documents
     WHERE id = ANY($1)
       AND year=$2 AND quarter=$3 AND department=$4`,
        [ids, filters.year, filters.quarter, filters.department]
    );
    const metaTime = Date.now() - metaStart;

    return {
        mode: "post-filter",
        totalTime: Date.now() - start,
        metaTime,
        scanned: 50000,
        results: rows
    };
}

/* 3️⃣ Hybrid Search (Production Correct) */
export async function hybridSearch(filters) {
    const start = Date.now();

    // 1️⃣ Metadata pre-filter
    const metaStart = Date.now();
    const { rows: metaRows } = await pool.query(
        `SELECT id FROM documents
     WHERE year=$1 AND quarter=$2 AND department=$3 AND access='internal'`,
        [filters.year, filters.quarter, filters.department]
    );
    const metaTime = Date.now() - metaStart;

    const ids = metaRows.map(r => r.id);

    // 🚨 IMPORTANT: handle empty candidate set
    if (ids.length === 0) {
        return {
            mode: "hybrid",
            totalTime: Date.now() - start,
            metaTime,
            vectorTime: 0,
            candidates: 0,
            docs: []
        };
    }

    // 2️⃣ Vector search on filtered IDs
    const vectorStart = Date.now();
    const vectorResult = await qdrant.post(
        "/collections/docs/points/search",
        {
            vector: Array(384).fill(0.5),
            filter: {
                must: [{ key: "doc_id", match: { any: ids } }]
            },
            limit: 5
        }
    );
    const vectorTime = Date.now() - vectorStart;

    const topIds = vectorResult.data.result.map(r => r.id);

    // 3️⃣ Fetch text for LLM
    const { rows: docs } = await pool.query(
        `SELECT id, text FROM documents WHERE id = ANY($1)`,
        [topIds]
    );

    return {
        mode: "hybrid",
        totalTime: Date.now() - start,
        metaTime,
        vectorTime,
        candidates: ids.length,
        docs
    };
}

