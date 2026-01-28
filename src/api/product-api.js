export async function getProduct() {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/product`,
  );
  const json = await response.json();
  return json;
}

export async function postProduct(product) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/product/upsert`,
    {
      headers: {
        "Content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ jobs: jobs }),
    },
  );
  if (response.status === 200) {
    return true;
  } else {
    return false;
  }
}

export async function parseXLS(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/operation/product/xls`,
    {
      method: "POST",
      body: formData,
    },
  );
  const json = await response.json();
  return json;
}
