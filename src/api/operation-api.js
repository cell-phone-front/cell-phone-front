// src/api/operation-api.js
const serverAddr = "http://localhost:8080";

export async function getOperations() {
  const response = await fetch(`${serverAddr}/api/operation`);
  return response.json();
}

export async function postOperations(operations) {
  const response = await fetch(`${serverAddr}/api/operation/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationList: operations }),
  });

  return response.ok;
}

export async function parseOperationXLS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${serverAddr}/api/operation/xls`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}
