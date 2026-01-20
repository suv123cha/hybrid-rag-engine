import { vectorOnlySearch, postFilterSearch, hybridSearch } from "./search.js";

export async function runBenchmark(filters) {
  const vector = await vectorOnlySearch();
  const post = await postFilterSearch(filters);
  const hybrid = await hybridSearch(filters);

  return {
    vectorOnly: {
      latency: vector.totalTime,
      scanned: vector.scanned
    },
    postFilter: {
      latency: post.totalTime,
      scanned: post.scanned
    },
    hybrid: {
      latency: hybrid.totalTime,
      candidates: hybrid.candidates
    }
  };
}
