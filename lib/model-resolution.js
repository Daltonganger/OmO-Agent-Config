/**
 * Five-tier model resolution pipeline
 * Tier 1: UI Override (primary agents only)
 * Tier 2: User Config Override
 * Tier 3: Category Default
 * Tier 4: Fallback Chain
 * Tier 5: System Default
 */

const { AGENT_MODEL_REQUIREMENTS, CATEGORY_MODEL_REQUIREMENTS, DEFAULTS } = require('./constants');
const fs = require('fs');
const path = require('path');

const PRIMARY_AGENTS = ['sisyphus', 'atlas'];

function isPrimaryAgent(agentName) {
  return PRIMARY_AGENTS.includes(agentName);
}

function normalizeModelName(modelName) {
  return modelName
    .toLowerCase()
    .replace(/^antigravity-/, '')
    .replace(/-preview$/, '')
    .replace(/-tee$/, '');
}

function fuzzyMatchModel(availableModels, targetModel) {
  const targetLower = targetModel.toLowerCase();
  const targetBaseName = targetLower.split('/')[1] || targetLower;
  const targetNormalized = normalizeModelName(targetBaseName);
  
  for (const modelId of availableModels) {
    const modelLower = modelId.toLowerCase();
    const baseName = modelLower.split('/')[1] || modelLower;
    const normalizedBaseName = normalizeModelName(baseName);
    const providerName = modelLower.split('/')[0] || '';
    const targetProvider = targetLower.split('/')[0] || '';
    
    if (baseName === targetBaseName) {
      return modelId;
    }
    
    if (normalizedBaseName === targetNormalized) {
      return modelId;
    }
    
    if (baseName.startsWith(targetBaseName) || targetBaseName.startsWith(baseName)) {
      return modelId;
    }
    
    if (baseName.includes(targetBaseName) || targetBaseName.includes(baseName)) {
      return modelId;
    }
    
    const modelParts = normalizedBaseName.split(/[-.]/);
    const targetParts = targetNormalized.split(/[-.]/);
    const commonParts = modelParts.filter(p => targetParts.includes(p) && p.length > 2);
    if (commonParts.length >= 2 && targetProvider === providerName) {
      return modelId;
    }
  }
  
  return null;
}

function resolveFromFallbackChain(availableModels, fallbackChain, agentOrCategory, availableProviders = null) {
  for (const entry of fallbackChain) {
    for (const provider of entry.providers) {
      if (availableProviders && !availableProviders.includes(provider)) {
        continue;
      }
      
      const targetModelId = `${provider}/${entry.model}`;
      const match = fuzzyMatchModel(availableModels, targetModelId);
      
      if (match) {
        return {
          model: match,
          variant: entry.variant || null,
          provenance: 'provider-fallback'
        };
      }
    }
  }
  
  return null;
}

function getSystemDefaultModel() {
  try {
    const opencodeConfigPath = path.join(process.env.HOME, '.config', 'opencode', 'opencode.json');
    if (fs.existsSync(opencodeConfigPath)) {
      const config = JSON.parse(fs.readFileSync(opencodeConfigPath, 'utf8'));
      return config.model || null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function extractProvidersFromModels(availableModels) {
  const providerSet = new Set();
  availableModels.forEach(model => {
    const provider = model.split('/')[0];
    if (provider) {
      providerSet.add(provider);
    }
  });
  return Array.from(providerSet);
}

function resolveModelPipeline(availableModels, config, agentOrCategory, uiSelectedModel = null) {
  const availableProviders = extractProvidersFromModels(availableModels);
  
  const requirements = AGENT_MODEL_REQUIREMENTS[agentOrCategory] || 
                      CATEGORY_MODEL_REQUIREMENTS[agentOrCategory];
  
  const isCategory = !!CATEGORY_MODEL_REQUIREMENTS[agentOrCategory];
  const isAgent = !!AGENT_MODEL_REQUIREMENTS[agentOrCategory];
  
  if (!requirements && !isAgent && !isCategory) {
    return {
      model: getSystemDefaultModel(),
      variant: null,
      provenance: 'system-default'
    };
  }

  if (isAgent && isPrimaryAgent(agentOrCategory) && uiSelectedModel) {
    const match = fuzzyMatchModel(availableModels, uiSelectedModel);
    if (match) {
      return {
        model: match,
        variant: null,
        provenance: 'ui-override'
      };
    }
  }

  const userAgentConfig = config.agents?.[agentOrCategory];
  const userCategoryConfig = config.categories?.[agentOrCategory];
  const userConfig = isCategory ? userCategoryConfig : userAgentConfig;
  
  if (userConfig?.model) {
    const match = fuzzyMatchModel(availableModels, userConfig.model);
    if (match) {
      return {
        model: match,
        variant: userConfig.variant || null,
        provenance: 'user-config'
      };
    }
  }

  if (isAgent && userAgentConfig?.category) {
    const categoryName = userAgentConfig.category;
    const categoryReqs = CATEGORY_MODEL_REQUIREMENTS[categoryName];
    
    if (categoryReqs) {
      const categoryDefault = config.categories?.[categoryName]?.model;
      
      if (categoryDefault) {
        const match = fuzzyMatchModel(availableModels, categoryDefault);
        if (match) {
          return {
            model: match,
            variant: config.categories[categoryName]?.variant || null,
            provenance: 'category-default'
          };
        }
      }
      
      if (categoryReqs.fallbackChain) {
        const result = resolveFromFallbackChain(availableModels, categoryReqs.fallbackChain, categoryName, availableProviders);
        if (result) return result;
      }
    }
  }

  if (requirements?.fallbackChain) {
    const result = resolveFromFallbackChain(availableModels, requirements.fallbackChain, agentOrCategory, availableProviders);
    if (result) return result;
  }

  const systemDefault = getSystemDefaultModel();
  if (systemDefault) {
    const match = fuzzyMatchModel(availableModels, systemDefault);
    if (match) {
      return {
        model: match,
        variant: null,
        provenance: 'system-default'
      };
    }
  }

  if (availableModels.length > 0) {
    return {
      model: availableModels[0],
      variant: null,
      provenance: 'system-default'
    };
  }

  return null;
}

function resolveVariant(config, agentOrCategory, fallbackVariant) {
  const userConfig = config.agents?.[agentOrCategory] || config.categories?.[agentOrCategory];
  
  if (userConfig?.variant) {
    return userConfig.variant;
  }
  
  if (fallbackVariant) {
    return fallbackVariant;
  }
  
  const categoryName = config.agents?.[agentOrCategory]?.category;
  if (categoryName) {
    return config.categories?.[categoryName]?.variant || null;
  }
  
  return null;
}

function checkRequiresModel(requirements, availableModels) {
  if (!requirements?.requiresModel) {
    return { valid: true };
  }
  
  const requiredModel = requirements.requiresModel;
  
  for (const modelId of availableModels) {
    const baseName = modelId.split('/')[1] || modelId;
    if (baseName === requiredModel || baseName.includes(requiredModel)) {
      return { valid: true };
    }
  }
  
  return {
    valid: false,
    error: `Required model "${requiredModel}" not available in connected providers`
  };
}

function validateAgentModel(agentName, availableModels, config) {
  const requirements = AGENT_MODEL_REQUIREMENTS[agentName];
  
  if (requirements?.requiresModel) {
    const check = checkRequiresModel(requirements, availableModels);
    if (!check.valid) {
      return check;
    }
  }
  
  const result = resolveModelPipeline(availableModels, config, agentName);
  if (!result) {
    return {
      valid: false,
      error: `Could not resolve model for agent "${agentName}"`
    };
  }
  
  return {
    valid: true,
    model: result.model,
    variant: result.variant,
    provenance: result.provenance
  };
}

function validateCategoryModel(categoryName, availableModels, config) {
  const requirements = CATEGORY_MODEL_REQUIREMENTS[categoryName];
  
  if (requirements?.requiresModel) {
    const check = checkRequiresModel(requirements, availableModels);
    if (!check.valid) {
      return check;
    }
  }
  
  const result = resolveModelPipeline(availableModels, config, categoryName);
  if (!result) {
    return {
      valid: false,
      error: `Could not resolve model for category "${categoryName}"`
    };
  }
  
  return {
    valid: true,
    model: result.model,
    variant: result.variant,
    provenance: result.provenance
  };
}

module.exports = {
  resolveModelPipeline,
  resolveVariant,
  fuzzyMatchModel,
  checkRequiresModel,
  validateAgentModel,
  validateCategoryModel,
  isPrimaryAgent,
  getSystemDefaultModel,
  extractProvidersFromModels
};