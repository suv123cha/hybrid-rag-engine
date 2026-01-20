import axios from "axios";

export const qdrant = axios.create({
	baseURL: "http://localhost:6333"
});

export async function initCollection() {
	try {
		await qdrant.put("/collections/docs", {
			vectors: {
				size: 384,
				distance: "Cosine"
			}
		});
		console.log("Qdrant collection created");
	} catch (err) {
		console.log("Collection already exists");
	}
}
