const { execSync } = require('child_process');
const { AGENT_PROFILES } = require('./constants');

function parseModels(output) {
  const models = [];
  const lines = output.split('\n');
  let currentModel = null;
  let jsonBuffer = '';
  let braceCount = 0;

  for (const line of lines) {
    if (line.match(/^[a-z0-9-]+\/[a-z0-9-.:/]+$/i) && braceCount === 0) {
      currentModel = line.trim();
      jsonBuffer = '';
    } else if (currentModel) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      jsonBuffer += (jsonBuffer ? '\n' : '') + line;
      
      if (braceCount === 0 && jsonBuffer) {
        try {
           const modelData = JSON.parse(jsonBuffer);
           const baseId = modelData.id;
           models.push({
             ...modelData,
             modelID: baseId,
             id: currentModel
           });
        } catch (e) {
          // Skip malformed JSON
        }
        currentModel = null;
        jsonBuffer = '';
      }
    }
  }

  return models;
}

function extractProviders(models) {
  const providerSet = new Set();
  models.forEach(model => {
    const provider = model.providerID || model.id.split('/')[0];
    if (provider) {
      providerSet.add(provider);
    }
  });
  return Array.from(providerSet).sort();
}

function loadModels() {
  process.stdout.write('Loading available models');
  
  let output;
  try {
    output = execSync('opencode models --verbose', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (execError) {
    const stderr = execError?.stderr ? String(execError.stderr) : '';

    const messageParts = [
      'Failed to run "opencode models --verbose".',
      '',
      'Possible causes:',
      '  1. OpenCode is not installed',
      '  2. OpenCode is not in your PATH',
      '  3. OpenCode failed to start due to a configuration/plugin error (common: ProviderModelNotFoundError)',
      ''
    ];

    if (stderr.trim()) {
      messageParts.push('OpenCode error output:', stderr.trim(), '');
    }

    messageParts.push(
      'To fix:',
      '  - Verify installation: opencode --version',
      '  - Try: opencode models',
      '  - If you recently changed providers/models, your config may reference a model that no longer exists.'
    );

    const error = new Error(messageParts.join('\n'));
    error.cause = execError;
    throw error;
  }
  
  process.stdout.write('... parsing');
  const models = parseModels(output);
  const providers = extractProviders(models);
  console.log(` ✓\nLoaded ${models.length} models from ${providers.length} providers\n`);
  
  return { models, providers };
}

function hasExtendedThinking(model) {
  const interleaved = model.capabilities?.interleaved;
  if (interleaved && typeof interleaved === 'object' && interleaved.field) {
    return true;
  }
  return false;
}

function isFastModel(model) {
  const name = (model.name || '').toLowerCase();
  const id = (model.id || '').toLowerCase();
  const family = (model.family || '').toLowerCase();
  
  const fastPatterns = ['flash', 'fast', 'mini', 'lite', 'haiku', 'instant'];
  for (const pattern of fastPatterns) {
    if (name.includes(pattern) || id.includes(pattern) || family.includes(pattern)) {
      return true;
    }
  }

  const cost = model.cost;
  if (cost) {
    const totalCost = (cost.input || 0) + (cost.output || 0);
    if (totalCost < 5 && totalCost > 0) {
      return true;
    }
  }

  return false;
}

function scoreModel(model, agentType, config) {
  const profile = AGENT_PROFILES[agentType];
  if (!profile) return 0;

  let score = 0;
  const caps = model.capabilities || {};
  const context = model.limit?.context || 0;
  const minContext = profile.minContext || 32000;

  if (context >= minContext) {
    score += 10;
    const contextRatio = Math.min(context / minContext, 4);
    score += Math.floor((contextRatio - 1) * 3.33);
  } else {
    const deficit = (minContext - context) / minContext;
    score -= Math.floor(deficit * 20);
  }

  for (const pref of profile.preferred) {
    switch (pref) {
      case "reasoning":
        if (caps.reasoning) {
          score += 15;
        } else if (hasExtendedThinking(model)) {
          score += 15;
        }
        break;

      case "thinking":
        if (hasExtendedThinking(model)) {
          score += 12;
        } else if (model.name?.toLowerCase().includes('thinking') || 
                   model.id?.toLowerCase().includes('thinking')) {
          score += 10;
        }
        break;

      case "large_context":
        if (context >= 500000) score += 12;
        else if (context >= 200000) score += 8;
        else if (context >= 128000) score += 4;
        break;

      case "multimodal":
        const hasImage = caps.input?.image;
        const hasPdf = caps.input?.pdf;
        const hasVideo = caps.input?.video;
        if (hasImage && hasPdf) score += 15;
        else if (hasImage || hasPdf) score += 10;
        if (hasVideo) score += 3;
        break;

      case "image_input":
        if (caps.input?.image) score += 12;
        break;

      case "pdf_input":
        if (caps.input?.pdf) score += 8;
        break;

      case "fast":
        if (isFastModel(model)) score += 10;
        break;

      case "text_output":
        if (caps.output?.text) score += 5;
        break;
    }
  }

  const preferredProviders = config?.preferred_providers || [];
  if (preferredProviders.length > 0) {
    const provider = model.providerID || model.id.split('/')[0];
    const providerIndex = preferredProviders.indexOf(provider);
    if (providerIndex !== -1) {
      score += (preferredProviders.length - providerIndex) * 5;
    }
  }

  return score;
}

function getRecommendedModels(models, agentType, config, limit = 5) {
  const scored = models.map(model => ({
    ...model,
    score: scoreModel(model, agentType, config)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

module.exports = {
  loadModels,
  parseModels,
  extractProviders,
  hasExtendedThinking,
  isFastModel,
  scoreModel,
  getRecommendedModels
};
