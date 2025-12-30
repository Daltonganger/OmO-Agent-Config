const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'opencode-agent-config',
        'Accept': 'application/vnd.github+json'
      }
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}`));
          }
          return;
        }
        reject(new Error(`Request failed (${res.statusCode}) for ${url}`));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'opencode-agent-config'
      }
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
          return;
        }
        reject(new Error(`Request failed (${res.statusCode}) for ${url}`));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getLatestReleaseTag(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const data = await fetchJson(url);
  if (!data || !data.tag_name) {
    throw new Error('Latest release tag not found');
  }
  return data.tag_name;
}

function getCachedSchema(cacheDir) {
  const cachePath = path.join(cacheDir, 'omo-schema.json');
  if (!fs.existsSync(cachePath)) return null;

  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeCachedSchema(cacheDir, payload) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, 'omo-schema.json');
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2));
}

async function checkAndUpdateOhMyOpenCodeSchema({ cacheDir }) {
  const owner = 'code-yeongyu';
  const repo = 'oh-my-opencode';

  const tag = await getLatestReleaseTag(owner, repo);
  const schemaUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/assets/oh-my-opencode.schema.json`;

  const schemaText = await fetchText(schemaUrl);
  const hash = sha256(schemaText);

  const cached = getCachedSchema(cacheDir);
  if (cached && cached.sha256 === hash) {
    return { updated: false, tag, url: schemaUrl };
  }

  writeCachedSchema(cacheDir, {
    tag,
    url: schemaUrl,
    sha256: hash,
    downloaded_at: new Date().toISOString(),
    schema: JSON.parse(schemaText)
  });

  return { updated: true, tag, url: schemaUrl };
}

module.exports = {
  checkAndUpdateOhMyOpenCodeSchema
};
