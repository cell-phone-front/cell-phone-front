export async function getTools() {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/tools`
  );
  const json = await response.json();
  return json;
}

export async function postTools(tools) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/tools`,
    {
      headers: {
        "Content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ tools: tools }),
    }
  );
  if (response.status === 204) {
    return true;
  } else {
    return false;
  }
}
