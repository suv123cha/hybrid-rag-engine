import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "localhost",
  user: "rag",
  password: "rag",
  database: "ragdb",
  port: 5432
});
