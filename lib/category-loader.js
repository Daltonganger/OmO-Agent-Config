const { CATEGORY_MODEL_REQUIREMENTS, ALL_CATEGORIES } = require('./constants');
const { fetchUpstreamSchema, loadFromCache } = require('./upstream-schema');

const CACHE_FILE_NAME = 'oh-my-opencode-schema.json';

function loadCategories() {
  const cached = loadFromCache();
  if (cached && cached.CATEGORY_MODEL_REQUIREMENTS) {
    return cached.CATEGORY_MODEL_REQUIREMENTS;
  }
  return CATEGORY_MODEL_REQUIREMENTS;
}

function getCategoryDefault(categoryName, config = {}) {
  const categoryConfig = config.categories?.[categoryName];
  if (categoryConfig?.model) {
    return categoryConfig.model;
  }
  
  const requirements = CATEGORY_MODEL_REQUIREMENTS[categoryName];
  if (requirements?.fallbackChain && requirements.fallbackChain.length > 0) {
    const firstEntry = requirements.fallbackChain[0];
    const provider = firstEntry.providers[0];
    return `${provider}/${firstEntry.model}`;
  }
  
  return null;
}

function getCategoryDefaultWithAvailableProviders(categoryName, config = {}, availableProviders = []) {
  const categoryConfig = config.categories?.[categoryName];
  if (categoryConfig?.model) {
    const modelProvider = categoryConfig.model.split('/')[0];
    if (availableProviders.includes(modelProvider)) {
      return categoryConfig.model;
    }
  }
  
  const requirements = CATEGORY_MODEL_REQUIREMENTS[categoryName];
  if (requirements?.fallbackChain) {
    for (const entry of requirements.fallbackChain) {
      for (const provider of entry.providers) {
        if (availableProviders.includes(provider)) {
          return `${provider}/${entry.model}`;
        }
      }
    }
  }
  
  return null;
}

function getCategoryRequirements(categoryName) {
  return CATEGORY_MODEL_REQUIREMENTS[categoryName] || null;
}

function isValidCategory(categoryName) {
  return ALL_CATEGORIES.includes(categoryName) || 
         !!CATEGORY_MODEL_REQUIREMENTS[categoryName];
}

function applyCategoryToAgent(config, agentName, categoryName) {
  if (!isValidCategory(categoryName)) {
    throw new Error(`Invalid category: ${categoryName}`);
  }
  
  const newConfig = JSON.parse(JSON.stringify(config));
  
  if (!newConfig.agents) {
    newConfig.agents = {};
  }
  
  if (!newConfig.agents[agentName]) {
    newConfig.agents[agentName] = {};
  }
  
  newConfig.agents[agentName].category = categoryName;
  
  return newConfig;
}

function getAgentCategory(config, agentName) {
  return config.agents?.[agentName]?.category || null;
}

function listAllCategories() {
  return ALL_CATEGORIES.map(name => ({
    name,
    requirements: CATEGORY_MODEL_REQUIREMENTS[name] || null
  }));
}

module.exports = {
  loadCategories,
  getCategoryDefault,
  getCategoryDefaultWithAvailableProviders,
  getCategoryRequirements,
  isValidCategory,
  applyCategoryToAgent,
  getAgentCategory,
  listAllCategories,
  ALL_CATEGORIES
};