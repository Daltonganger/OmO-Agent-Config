const { DEFAULTS, AGENT_PROFILES } = require('./constants');

function validateConfig(config) {
  const issues = {
    missingAgents: [],
    missingMcps: [],
    extraAgents: [],
    extraMcps: []
  };

  const configAgents = config?.agents || {};
  const configMcps = config?.mcps || {};
  const defaultAgents = DEFAULTS.agents || {};
  const defaultMcps = DEFAULTS.mcps || {};

  for (const agentName of Object.keys(defaultAgents)) {
    if (!configAgents[agentName]) {
      issues.missingAgents.push({
        name: agentName,
        defaultModel: defaultAgents[agentName].model,
        description: AGENT_PROFILES[agentName]?.description || 'OmO built-in agent'
      });
    }
  }

  for (const mcpName of Object.keys(defaultMcps)) {
    if (!configMcps[mcpName]) {
      issues.missingMcps.push({
        name: mcpName,
        config: defaultMcps[mcpName]
      });
    }
  }

  for (const agentName of Object.keys(configAgents)) {
    if (!defaultAgents[agentName]) {
      issues.extraAgents.push({
        name: agentName,
        model: configAgents[agentName].model
      });
    }
  }

  for (const mcpName of Object.keys(configMcps)) {
    if (!defaultMcps[mcpName]) {
      issues.extraMcps.push({
        name: mcpName
      });
    }
  }

  const hasIssues = issues.missingAgents.length > 0 || 
                    issues.missingMcps.length > 0 ||
                    issues.extraAgents.length > 0 ||
                    issues.extraMcps.length > 0;

  return hasIssues ? issues : null;
}

function addAllMissing(config, issues) {
  let added = 0;

  if (!config.agents) config.agents = {};
  for (const agent of issues.missingAgents) {
    config.agents[agent.name] = { model: agent.defaultModel };
    added++;
  }

  if (!config.mcps) config.mcps = {};
  for (const mcp of issues.missingMcps) {
    config.mcps[mcp.name] = mcp.config;
    added++;
  }

  return added;
}

function addMissingAgent(config, agent) {
  if (!config.agents) config.agents = {};
  config.agents[agent.name] = { model: agent.defaultModel };
}

function addMissingMcp(config, mcp) {
  if (!config.mcps) config.mcps = {};
  config.mcps[mcp.name] = mcp.config;
}

module.exports = {
  validateConfig,
  addAllMissing,
  addMissingAgent,
  addMissingMcp
};
