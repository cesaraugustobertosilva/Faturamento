const OWNER = 'cesaraugustobertosilva';
const REPO = 'Faturamento';
const FILE_PATH = 'data/data.json';
const BRANCH = 'main';

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured');
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const file = await githubRequest(`/contents/${FILE_PATH}?ref=${BRANCH}`);
      const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      res.status(200).json(content);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const newContent = JSON.stringify(body, null, 2);
      const encoded = Buffer.from(newContent).toString('base64');

      let sha;
      try {
        const existing = await githubRequest(`/contents/${FILE_PATH}?ref=${BRANCH}`);
        sha = existing.sha;
      } catch (_) {}

      await githubRequest(`/contents/${FILE_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'chore: update dashboard data',
          content: encoded,
          branch: BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });

      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
