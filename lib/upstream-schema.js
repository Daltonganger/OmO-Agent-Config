/**
 * Upstream schema fetching and caching for Oh My Opencode
 * Fetches AGENT_MODEL_REQUIREMENTS and CATEGORY_MODEL_REQUIREMENTS from upstream
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(process.env.HOME, '.config', 'opencode', 'cache', 'oh-my-opencode-schema.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if cache is valid (exists and not expired)
 */
function isCacheValid() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return false;
    }
    const stats = fs.statSync(CACHE_FILE);
    const age = Date.now() - stats.mtime.getTime();
    return age < CACHE_TTL_MS;
  } catch (e) {
    return false;
  }
}

/**
 * Load schema from cache
 */
function loadFromCache() {
  try {
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.warn('Warning: Failed to load schema from cache:', e.message);
    return null;
  }
}

/**
 * Save schema to cache
 */
function saveToCache(schema) {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(schema, null, 2));
  } catch (e) {
    console.warn('Warning: Failed to save schema to cache:', e.message);
  }
}

/**
 * Fetch schema from GitHub releases
 * Returns promise that resolves to schema object or null on failure
 */
function fetchFromGitHub() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/code-yeongyu/oh-my-opencode/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'OmO-Agent-Config-Tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`GitHub API returned status ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          // Try to find schema file in release assets
          const schemaAsset = release.assets?.find(asset => 
            asset.name === 'schema.json' || 
            asset.name === 'oh-my-opencode-schema.json'
          );
          
          if (schemaAsset) {
            // Download schema from asset URL
            downloadSchema(schemaAsset.browser_download_url)
              .then(schema => resolve(schema))
              .catch(err => reject(err));
          } else {
            // Fallback: try to extract schema from release body or tag
            // For now, return null to indicate no schema found
            resolve(null);
          }
        } catch (e) {
          reject(new Error(`Failed to parse GitHub response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error fetching from GitHub: ${e.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Download schema from URL
 */
function downloadSchema(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'OmO-Agent-Config-Tool'
      }
    };

    const req = https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        downloadSchema(res.headers.location)
          .then(schema => resolve(schema))
          .catch(err => reject(err));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const schema = JSON.parse(data);
          resolve(schema);
        } catch (e) {
          reject(new Error(`Failed to parse schema JSON: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Download error: ${e.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });

    req.end();
  });
}

/**
 * Fetch upstream schema with caching
 * Returns schema object or null if fetch fails (caller should use hardcoded fallback)
 */
async function fetchUpstreamSchema() {
  // Check cache first
  if (isCacheValid()) {
    const cached = loadFromCache();
    if (cached) {
      return cached;
    }
  }

  // Fetch from GitHub
  try {
    const schema = await fetchFromGitHub();
    if (schema) {
      saveToCache(schema);
      return schema;
    }
  } catch (e) {
    console.warn('Warning: Failed to fetch upstream schema:', e.message);
  }

  // Return null to indicate fetch failed (use hardcoded fallback)
  return null;
}

/**
 * Force refresh schema (ignore cache)
 */
async function refreshUpstreamSchema() {
  try {
    fs.unlinkSync(CACHE_FILE);
  } catch (e) {
    // Ignore error if cache file doesn't exist
  }
  return fetchUpstreamSchema();
}

/**
 * Get schema with fallback to hardcoded constants
 * Returns schema object (either from cache/network or hardcoded fallback)
 */
async function getSchemaWithFallback(hardcodedSchema) {
  const upstream = await fetchUpstreamSchema();
  if (upstream) {
    return upstream;
  }
  
  console.warn('Warning: Using hardcoded schema fallback (upstream fetch failed)');
  return hardcodedSchema;
}

module.exports = {
  fetchUpstreamSchema,
  refreshUpstreamSchema,
  getSchemaWithFallback,
  isCacheValid,
  loadFromCache,
  saveToCache
};