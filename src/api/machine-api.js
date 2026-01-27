export async function getTools() {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/machine`,
  );
  const json = await response.json();
  return json;
}

export async function postTools(tools) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/machine/upsert`,
    {
      headers: {
        "Content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ tools: tools }),
    },
  );
  if (response.status === 204) {
    return true;
  } else {
    return false;
  }
}

export async function parseXLS(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/machine/xls`,
    {
      method: "POST",
      body: formData,
    },
  );
  const json = await response.json();
  return json;
}
