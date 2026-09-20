// Same pattern as update-board.js: runs on Netlify's servers, uses the
// same private GitHub key and the same personal editing code.

const GITHUB_OWNER = "BlessVan";
const GITHUB_REPO = "http711";
const FILE_PATH = "content/checklist-data.json";
const BRANCH = "main";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Bad request body." }) };
  }

  const { pin, data } = body;

  if (!process.env.EDITOR_PIN || pin !== process.env.EDITOR_PIN) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: "Incorrect editor code." }) };
  }

  if (!process.env.GITHUB_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server is not configured with a GitHub key yet." }) };
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const headers = {
    "Authorization": `token ${process.env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json"
  };

  try {
    const getResp = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
    if (!getResp.ok) {
      const errText = await getResp.text();
      return { statusCode: getResp.status, body: JSON.stringify({ success: false, error: "Could not read current file: " + errText }) };
    }
    const getJson = await getResp.json();
    const sha = getJson.sha;

    const newContent = Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64");
    const putResp = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Update checklist data via editor",
        content: newContent,
        sha: sha,
        branch: BRANCH
      })
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      return { statusCode: putResp.status, body: JSON.stringify({ success: false, error: "Could not save: " + errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: String(err) }) };
  }
};
