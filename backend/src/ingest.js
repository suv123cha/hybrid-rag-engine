import { v4 as uuid } from "uuid";
import { pool } from "./db.js";
import { qdrant } from "./qdrant.js";

const departments = ["finance", "hr", "engineering"];
const years = [2023, 2024, 2025];
const quarters = ["Q1", "Q2", "Q3", "Q4"];

function fakeEmbedding() {
    return Array.from({ length: 384 }, () => Math.random());
}

export async function ingest(batchCount = 50000) {
    console.log("Starting ingestion...");

    for (let i = 0; i < batchCount; i++) {
        // 🔥 Generate ONCE
        const year = years[Math.floor(Math.random() * years.length)];
        const quarter = quarters[Math.floor(Math.random() * quarters.length)];
        const department = departments[Math.floor(Math.random() * departments.length)];
        const cost = (Math.random() * 5 + 1).toFixed(2); // $1M – $6M

        const doc = {
            id: uuid(),
            year,
            quarter,
            department,
            access: "internal",
            author: "cloud-team",
            text: `
${quarter} ${year} ${department} finance report:
Cloud infrastructure costs were approximately $${cost} million.
Primary cost drivers included EC2 compute usage and analytics workloads.
      `.trim()
        };

        await pool.query(
            `INSERT INTO documents VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [doc.id, doc.text, doc.year, doc.quarter, doc.department, doc.access, doc.author]
        );

        await qdrant.put("/collections/docs/points", {
            points: [
                {
                    id: doc.id,
                    vector: fakeEmbedding(),
                    payload: {
                        doc_id: doc.id,
                        year,
                        quarter,
                        department
                    }
                }
            ]
        });

        if (i % 5000 === 0) console.log(`Inserted ${i}`);
    }

    console.log("Ingestion complete");
}
