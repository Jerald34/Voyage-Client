import { fetchApi } from "./client.js";

export async function createProblemReport(body) {
  return fetchApi("/support/reports", { method: "POST", body: JSON.stringify(body) });
}
