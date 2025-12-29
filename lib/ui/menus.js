const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { colors, BACKUP_DIR, CONFIGS_DIR, DEFAULTS, AGENT_PROFILES } = require('../constants');
const { ConfigurationManager } = require('../config-manager');
const { loadModels, getRecommendedModels, hasExtendedThinking, isFastModel } = require('../model-loader');
const { validateConfig, addAllMissing, addMissingAgent, addMissingMcp } = require('../validation');
const { formatModel } = require('./prompts');

class AgentConfigTool {
  constructor() {
    this.config = null;
    this.configName = null;
    this.configMetadata = null;
    this.models = null;
    this.providers = [];
    this.configManager = new ConfigurationManager();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => resolve(answer.trim()));
    });
  }

  async loadConfig() {
    try {
      this.configManager.migrateIfNeeded();
      this.configName = this.configManager.getActiveConfig();
      if (!this.configName) {
        this.configName = 'omo-default';
        this.configManager.setActiveConfig(this.configName);
      }
      this.configMetadata = this.configManager.loadConfiguration(this.configName);
      this.config = this.configMetadata.config;
      this.configManager.updateMainConfigFile(this.config);
    } catch (error) {
      console.error(`Error loading config: ${error.message}`);
      console.error('\nPossible causes:');
      console.error('  1. Configuration file is corrupted or has invalid JSON');
      console.error('  2. File permissions issue');
      console.error('\nTo fix:');
      console.error(`  - Check file permissions: ls -la ${CONFIGS_DIR}`);
      console.error(`  - Restore from backup: ls ${BACKUP_DIR}`);
      console.error('  - Delete configs dir and restart to regenerate defaults:');
      console.error(`    rm -rf ${CONFIGS_DIR} && opencode-agent-config`);
      process.exit(1);
    }
  }

  async loadModelsData() {
    const { models, providers } = loadModels();
    this.models = models;
    this.providers = providers;
  }

  async promptConfigSync() {
    const issues = validateConfig(this.config);
    if (!issues) return;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${colors.yellow}⚠ Configuration Sync Available${colors.reset}`);
    console.log(`${'='.repeat(70)}\n`);

    console.log('Your configuration differs from the latest OmO defaults.\n');

    if (issues.missingAgents.length > 0) {
      console.log(`${colors.cyan}NEW AGENTS available:${colors.reset}`);
      for (const agent of issues.missingAgents) {
        console.log(`  + ${colors.green}${agent.name}${colors.reset}`);
        console.log(`    ${agent.description}`);
        console.log(`    Default model: ${agent.defaultModel}\n`);
      }
    }

    if (issues.missingMcps.length > 0) {
      console.log(`${colors.cyan}NEW MCPs available:${colors.reset}`);
      for (const mcp of issues.missingMcps) {
        console.log(`  + ${colors.green}${mcp.name}${colors.reset}`);
        console.log(`    Type: ${mcp.config.type || 'unknown'}\n`);
      }
    }

    if (issues.extraAgents.length > 0) {
      console.log(`${colors.dim}EXTRA agents in your config (not in defaults):${colors.reset}`);
      for (const agent of issues.extraAgents) {
        console.log(`  ? ${agent.name} → ${agent.model}`);
      }
      console.log(`  ${colors.dim}(These will be kept - may be custom or deprecated)${colors.reset}\n`);
    }

    if (issues.extraMcps.length > 0) {
      console.log(`${colors.dim}EXTRA MCPs in your config (not in defaults):${colors.reset}`);
      for (const mcp of issues.extraMcps) {
        console.log(`  ? ${mcp.name}`);
      }
      console.log(`  ${colors.dim}(These will be kept)${colors.reset}\n`);
    }

    if (issues.missingAgents.length > 0 || issues.missingMcps.length > 0) {
      console.log('Options:');
      console.log('  [A] Add all missing agents and MCPs');
      console.log('  [S] Select which to add');
      console.log('  [N] Skip for now\n');

      const choice = await this.prompt('Choose option: ');

      switch (choice.toLowerCase()) {
        case 'a':
          const added = addAllMissing(this.config, issues);
          if (added > 0) {
            this.saveConfig();
            console.log(`\n${colors.green}✓ Added ${added} items to configuration.${colors.reset}\n`);
          }
          break;
        case 's':
          await this.selectiveSync(issues);
          break;
        case 'n':
        default:
          console.log('\nSkipped. You can sync later from the main menu.\n');
          break;
      }
    } else {
      await this.prompt('Press Enter to continue...');
    }
  }

  async selectiveSync(issues) {
    let added = 0;

    if (issues.missingAgents.length > 0) {
      console.log('\n--- Missing Agents ---\n');
      for (const agent of issues.missingAgents) {
        const answer = await this.prompt(`Add ${agent.name}? (${agent.defaultModel}) [Y/n]: `);
        if (answer.toLowerCase() !== 'n') {
          addMissingAgent(this.config, agent);
          added++;
          console.log(`  ${colors.green}✓ Added ${agent.name}${colors.reset}`);
        }
      }
    }

    if (issues.missingMcps.length > 0) {
      console.log('\n--- Missing MCPs ---\n');
      for (const mcp of issues.missingMcps) {
        const answer = await this.prompt(`Add ${mcp.name}? [Y/n]: `);
        if (answer.toLowerCase() !== 'n') {
          addMissingMcp(this.config, mcp);
          added++;
          console.log(`  ${colors.green}✓ Added ${mcp.name}${colors.reset}`);
        }
      }
    }

    if (added > 0) {
      this.saveConfig();
      console.log(`\n${colors.green}✓ Added ${added} items to configuration.${colors.reset}\n`);
    } else {
      console.log('\nNo changes made.\n');
    }
  }

  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `${this.configName}-${timestamp}.json`);
    
    try {
      const configPath = this.configManager.getConfigPath(this.configName);
      if (fs.existsSync(configPath)) {
        fs.copyFileSync(configPath, backupFile);
        console.log(`✓ Backup created: ${backupFile}\n`);
      }
      return backupFile;
    } catch (error) {
      console.error(`Error creating backup: ${error.message}`);
      console.error(`\nBackup path: ${backupFile}`);
      if (error.code === 'EACCES') {
        console.error('Permission denied. Check directory permissions:');
        console.error(`  ls -la ${BACKUP_DIR}`);
      } else if (error.code === 'ENOSPC') {
        console.error('Disk full. Free up space and try again.');
      }
      throw error;
    }
  }

  saveConfig() {
    try {
      this.createBackup();
      const description = this.configMetadata?.description || 'Configuration';
      this.configMetadata = this.configManager.saveConfiguration(
        this.configName,
        description,
        this.config
      );
      this.configManager.updateMainConfigFile(this.config);
      console.log('✓ Configuration saved successfully\n');
    } catch (error) {
      console.error(`Error saving config: ${error.message}`);
      console.error('\nYour changes may not have been saved.');
      console.error('The previous config should still be intact.');
      console.error(`\nTo recover, check backups: ls ${BACKUP_DIR}`);
      throw error;
    }
  }

  async restoreDefaults() {
    try {
      await this.switchToConfiguration('omo-default');
      console.log('✓ Switched to default configuration\n');
    } catch (error) {
      console.error(`Error restoring defaults: ${error.message}`);
    }
  }

  async switchToConfiguration(configName) {
    if (!this.configManager.configExists(configName)) {
      throw new Error(`Configuration "${configName}" does not exist`);
    }

    this.configName = configName;
    this.configManager.setActiveConfig(configName);
    this.configMetadata = this.configManager.loadConfiguration(configName);
    this.config = this.configMetadata.config;
    this.configManager.updateMainConfigFile(this.config);
  }

  async selectModel(agentType, currentModel) {
    console.clear();
    const profile = AGENT_PROFILES[agentType];
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Select Model for: ${agentType}`);
    console.log(`Description: ${profile?.description || 'Custom agent'}`);
    console.log(`Current: ${currentModel}`);
    if (profile) {
      console.log(`Prefers: ${profile.preferred.join(', ')} | Min context: ${Math.floor(profile.minContext / 1000)}K`);
    }
    console.log(`${'='.repeat(70)}\n`);

    const recommended = getRecommendedModels(this.models, agentType, this.config, 8);
    
    console.log('RECOMMENDED MODELS:\n');
    recommended.forEach((model, idx) => {
      const current = model.id === currentModel ? ' ⭐ (current)' : '';
      console.log(`  ${idx + 1}. ${formatModel(model, true, model.score)}${current}`);
    });

    console.log(`\n${colors.dim}Capabilities: [R]=Reasoning [T]=Thinking [I]=Image [P]=PDF [F]=Fast${colors.reset}`);
    
    const bookmarks = this.config.model_bookmarks || [];
    console.log('\n[S] Search all models');
    console.log('[F] Filter by provider');
    if (bookmarks.length > 0) {
      console.log(`[*] Bookmarks (${bookmarks.length} saved)`);
    }
    console.log('[C] Cancel\n');

    const choice = await this.prompt('Select option: ');

    if (choice.toLowerCase() === 'c') {
      return null;
    }

    if (choice.toLowerCase() === 's') {
      return await this.searchModels(agentType, currentModel);
    }

    if (choice.toLowerCase() === 'f') {
      return await this.filterByProvider(agentType, currentModel);
    }

    if (choice === '*' && bookmarks.length > 0) {
      return await this.selectFromBookmarks(agentType, currentModel);
    }

    const idx = parseInt(choice, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < recommended.length) {
      return recommended[idx].id;
    }

    console.log('Invalid choice');
    await this.prompt('Press Enter to continue...');
    return await this.selectModel(agentType, currentModel);
  }

  async searchModels(agentType, currentModel) {
    console.clear();
    console.log('\n--- Search Models ---\n');
    
    const preferredProviders = this.config.preferred_providers || [];
    const hasPreferred = preferredProviders.length > 0;
    
    if (hasPreferred) {
      console.log(`Preferred providers: ${preferredProviders.join(', ')}`);
      console.log('[P] Search preferred providers only');
      console.log('[A] Search all providers\n');
      
      const scope = await this.prompt('Scope (P/A, default=P): ');
      var searchInPreferred = scope.toLowerCase() !== 'a';
    } else {
      var searchInPreferred = false;
    }
    
    const query = await this.prompt('\nSearch (provider/name or Enter for all): ');
    
    let baseModels = this.models;
    if (searchInPreferred && hasPreferred) {
      baseModels = this.models.filter(m => {
        const provider = m.providerID || m.id.split('/')[0];
        return preferredProviders.includes(provider);
      });
    }
    
    const filtered = query 
      ? baseModels.filter(m => m.id.toLowerCase().includes(query.toLowerCase()) || 
                                 m.name?.toLowerCase().includes(query.toLowerCase()))
      : baseModels;

    if (filtered.length === 0) {
      console.log('No models found');
      if (searchInPreferred) {
        console.log('Try searching all providers instead.');
      }
      await this.prompt('Press Enter to continue...');
      return await this.selectModel(agentType, currentModel);
    }

    return await this.displayModelList(filtered, agentType, currentModel);
  }

  async filterByProvider(agentType, currentModel) {
    console.clear();
    console.log('\n--- Filter by Provider ---\n');
    
    const preferredProviders = this.config.preferred_providers || [];
    const hasPreferred = preferredProviders.length > 0;
    
    console.log('AVAILABLE PROVIDERS:\n');
    this.providers.forEach((provider, idx) => {
      const count = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider).length;
      const preferred = preferredProviders.includes(provider) ? ` ${colors.green}★${colors.reset}` : '';
      console.log(`  ${idx + 1}. ${provider} (${count} models)${preferred}`);
    });

    if (hasPreferred) {
      console.log(`\n${colors.green}★${colors.reset} = preferred provider`);
      console.log('\n[P] Use preferred providers only');
    }
    console.log('[A] Select All');
    console.log('[C] Cancel\n');
    
    const choice = await this.prompt('Select providers (comma-separated numbers or letters): ');
    
    if (choice.toLowerCase() === 'c') {
      return await this.selectModel(agentType, currentModel);
    }

    let selectedProviders = [];
    if (choice.toLowerCase() === 'p' && hasPreferred) {
      selectedProviders = preferredProviders.filter(p => this.providers.includes(p));
    } else if (choice.toLowerCase() === 'a') {
      selectedProviders = this.providers;
    } else {
      const indices = choice.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
      selectedProviders = indices
        .filter(idx => idx >= 0 && idx < this.providers.length)
        .map(idx => this.providers[idx]);
    }

    if (selectedProviders.length === 0) {
      console.log('No providers selected');
      await this.prompt('Press Enter to continue...');
      return await this.filterByProvider(agentType, currentModel);
    }

    const filtered = this.models.filter(m => {
      const provider = m.providerID || m.id.split('/')[0];
      return selectedProviders.includes(provider);
    });

    return await this.displayModelList(filtered, agentType, currentModel);
  }

  async displayModelList(filtered, agentType, currentModel) {
    const perPage = 15;
    let page = 0;

    while (true) {
      console.clear();
      console.log(`\n--- Models (${filtered.length} total) - Page ${page + 1}/${Math.ceil(filtered.length / perPage)} ---\n`);

      const start = page * perPage;
      const end = Math.min(start + perPage, filtered.length);

      for (let i = start; i < end; i++) {
        const current = filtered[i].id === currentModel ? ' ⭐' : '';
        console.log(`  ${i + 1}. ${formatModel(filtered[i])}${current}`);
      }

      console.log('\n[N] Next page  [P] Previous page  [#] Select number  [C] Cancel\n');
      const choice = await this.prompt('Select option: ');

      if (choice.toLowerCase() === 'c') {
        return await this.selectModel(agentType, currentModel);
      }
      if (choice.toLowerCase() === 'n' && end < filtered.length) {
        page++;
        continue;
      }
      if (choice.toLowerCase() === 'p' && page > 0) {
        page--;
        continue;
      }

      const idx = parseInt(choice, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < filtered.length) {
        return filtered[idx].id;
      }
    }
  }

  async editAgent(agentName, fromMenu = false) {
    const currentModel = this.config.agents[agentName]?.model || 'none';
    const newModel = await this.selectModel(agentName, currentModel);

    if (newModel && newModel !== currentModel) {
      console.log(`\nChange ${agentName} model:`);
      console.log(`  From: ${currentModel}`);
      console.log(`  To:   ${newModel}\n`);
      const confirm = await this.prompt('Confirm change? (yes/no): ');
      
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Change cancelled');
        if (!fromMenu) {
          await this.prompt('Press Enter to continue...');
        }
        return false;
      }
      
      if (!this.config.agents[agentName]) {
        this.config.agents[agentName] = {};
      }
      this.config.agents[agentName].model = newModel;
      this.saveConfig();
      console.log(`✓ Updated ${agentName} to ${newModel}`);
      
      if (!fromMenu) {
        await this.prompt('Press Enter to continue...');
      }
    }
    return newModel !== null;
  }

  async deleteAgent(agentName, fromMenu = false) {
    const confirm = await this.prompt(`Delete agent "${agentName}"? (yes/no): `);
    if (confirm.toLowerCase() === 'yes') {
      delete this.config.agents[agentName];
      this.saveConfig();
      console.log(`✓ Deleted agent ${agentName}`);
      
      if (!fromMenu) {
        await this.prompt('Press Enter to continue...');
      }
      return true;
    }
    return false;
  }

  async showAgentInfo() {
    console.clear();
    console.log('\n' + '='.repeat(70));
    console.log('Oh My Opencode Built-in Agents');
    console.log('='.repeat(70) + '\n');
    
    console.log('This tool manages model assignments for Oh My Opencode\'s curated agents.\n');
    console.log('AVAILABLE AGENTS:\n');
    
    Object.entries(AGENT_PROFILES).forEach(([name, profile]) => {
      console.log(`${colors.cyan}${name}${colors.reset}`);
      console.log(`  ${profile.description}`);
      console.log(`  Preferred: ${profile.preferred.join(', ')}`);
      console.log(`  Min context: ${profile.minContext.toLocaleString()} tokens\n`);
    });
    
    console.log('Note: To create custom agents with system prompts, see:');
    console.log('      docs/CUSTOM-AGENTS.md\n');
    
    await this.prompt('Press Enter to continue...');
  }

  async setPreferredProviders() {
    console.clear();
    console.log('\n--- Set Preferred Providers ---\n');
    
    const currentPreferred = this.config.preferred_providers || [];
    
    if (currentPreferred.length > 0) {
      console.log('CURRENT PREFERRED PROVIDERS:\n');
      currentPreferred.forEach((provider, idx) => {
        console.log(`  ${idx + 1}. ${provider}`);
      });
      console.log('');
    }
    
    console.log('AVAILABLE PROVIDERS:\n');
    this.providers.forEach((provider, idx) => {
      const count = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider).length;
      const preferred = currentPreferred.includes(provider) ? ' (preferred)' : '';
      console.log(`  ${idx + 1}. ${provider} (${count} models)${preferred}`);
    });

    console.log('\n[X] Clear preferences');
    console.log('[B] Back\n');
    
    const choice = await this.prompt('Select providers (comma-separated numbers) or action: ');
    
    if (choice.toLowerCase() === 'b') {
      return;
    }

    if (choice.toLowerCase() === 'x') {
      delete this.config.preferred_providers;
      this.saveConfig();
      console.log('✓ Cleared preferred providers');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const indices = choice.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
    const selectedProviders = indices
      .filter(idx => idx >= 0 && idx < this.providers.length)
      .map(idx => this.providers[idx]);

    if (selectedProviders.length === 0) {
      console.log('No providers selected');
      await this.prompt('Press Enter to continue...');
      return;
    }

    this.config.preferred_providers = selectedProviders;
    this.saveConfig();
    console.log(`✓ Set preferred providers: ${selectedProviders.join(', ')}`);
    await this.prompt('Press Enter to continue...');
  }

  async agentConfigMenu() {
    while (true) {
      console.clear();
      console.log('\n--- Configure Agents ---\n');
      
      const agents = Object.entries(this.config.agents || {});
      
      if (agents.length === 0) {
        console.log('No agents configured\n');
      } else {
        console.log('CURRENT AGENTS:\n');
        agents.forEach(([name, config], idx) => {
          console.log(`  ${idx + 1}. ${name.padEnd(30)} → ${config.model}`);
        });
      }
      
      console.log('\nOPTIONS:\n');
      console.log('  [E] Edit agent model (enter number or name)');
      console.log('  [D] Delete agent (enter number or name)');
      console.log('  [A] Auto-optimize all (apply recommended models)');
      console.log('  [L] Bulk edit (apply same model to multiple agents)');
      console.log('  [O] Reorder agents');
      console.log('  [?] Show agent information');
      console.log('  [B] Back to main menu');
      
      console.log('\nCapabilities: [R]=Reasoning [I]=Image [P]=PDF\n');
      
      const choice = await this.prompt('Select option: ');
      
      switch (choice.toLowerCase()) {
        case 'e': {
          const agentInput = await this.prompt('Agent # or name: ');
          
          const agentIdx = parseInt(agentInput, 10) - 1;
          let agentName = null;
          
          if (!isNaN(agentIdx) && agentIdx >= 0 && agentIdx < agents.length) {
            agentName = agents[agentIdx][0];
          } else if (this.config.agents[agentInput]) {
            agentName = agentInput;
          }
          
          if (agentName) {
            await this.editAgent(agentName, true);
          } else {
            console.log('Agent not found');
            await this.prompt('Press Enter to continue...');
          }
          break;
        }
        case 'd': {
          const agentInput = await this.prompt('Agent # or name: ');
          
          const agentIdx = parseInt(agentInput, 10) - 1;
          let agentName = null;
          
          if (!isNaN(agentIdx) && agentIdx >= 0 && agentIdx < agents.length) {
            agentName = agents[agentIdx][0];
          } else if (this.config.agents[agentInput]) {
            agentName = agentInput;
          }
          
          if (agentName) {
            await this.deleteAgent(agentName, true);
          } else {
            console.log('Agent not found');
            await this.prompt('Press Enter to continue...');
          }
          break;
        }
        case 'a':
          await this.autoOptimizeAllAgents();
          break;
        case 'l':
          await this.bulkEditAgents();
          break;
        case 'o':
          await this.reorderAgents();
          break;
        case '?':
          await this.showAgentInfo();
          break;
        case 'b':
          return;
        default:
          console.log('Invalid option');
          await this.prompt('Press Enter to continue...');
      }
    }
  }

  async autoOptimizeAllAgents() {
    console.clear();
    console.log('\n--- Auto-Optimize All Agents ---\n');
    
    const agents = Object.entries(this.config.agents || {});
    if (agents.length === 0) {
      console.log('No agents to optimize');
      await this.prompt('Press Enter to continue...');
      return;
    }

    console.log('This will apply the top recommended model to each agent.\n');
    console.log('PROPOSED CHANGES:\n');

    const changes = [];
    for (const [agentName, agentConfig] of agents) {
      const recommended = getRecommendedModels(this.models, agentName, this.config, 1);
      if (recommended.length > 0) {
        const topModel = recommended[0];
        const current = agentConfig.model;
        const willChange = topModel.id !== current;
        changes.push({
          agent: agentName,
          current,
          recommended: topModel.id,
          score: topModel.score,
          willChange
        });
        
        const status = willChange ? `${colors.yellow}→${colors.reset}` : `${colors.green}✓${colors.reset}`;
        console.log(`  ${status} ${agentName.padEnd(28)} ${current}`);
        if (willChange) {
          console.log(`    ${' '.repeat(28)} → ${topModel.id} (score: ${topModel.score})`);
        }
      }
    }

    const changesToApply = changes.filter(c => c.willChange);
    
    if (changesToApply.length === 0) {
      console.log('\n✓ All agents already have optimal models');
      await this.prompt('Press Enter to continue...');
      return;
    }

    console.log(`\n${changesToApply.length} agent(s) will be updated.`);
    const confirm = await this.prompt('Apply changes? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
      for (const change of changesToApply) {
        this.config.agents[change.agent].model = change.recommended;
      }
      this.saveConfig();
      console.log(`\n✓ Updated ${changesToApply.length} agent(s)`);
    } else {
      console.log('\nCancelled');
    }
    
    await this.prompt('Press Enter to continue...');
  }

  async bulkEditAgents() {
    console.clear();
    console.log('\n--- Bulk Edit Agents ---\n');
    
    const agents = Object.entries(this.config.agents || {});
    if (agents.length === 0) {
      console.log('No agents to edit');
      await this.prompt('Press Enter to continue...');
      return;
    }

    console.log('Select agents to update (comma-separated numbers, or "all"):\n');
    
    agents.forEach(([name, config], idx) => {
      console.log(`  ${idx + 1}. ${name.padEnd(28)} → ${config.model}`);
    });

    console.log('\n[C] Cancel\n');
    const selection = await this.prompt('Select agents: ');
    
    if (selection.toLowerCase() === 'c') return;

    let selectedAgents = [];
    if (selection.toLowerCase() === 'all') {
      selectedAgents = agents.map(([name]) => name);
    } else {
      const indices = selection.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
      selectedAgents = indices
        .filter(idx => idx >= 0 && idx < agents.length)
        .map(idx => agents[idx][0]);
    }

    if (selectedAgents.length === 0) {
      console.log('No agents selected');
      await this.prompt('Press Enter to continue...');
      return;
    }

    console.log(`\nSelected ${selectedAgents.length} agent(s): ${selectedAgents.join(', ')}`);
    console.log('\nNow select a model to apply to all selected agents.\n');
    await this.prompt('Press Enter to continue...');

    const newModel = await this.selectModelForBulk();
    if (!newModel) return;

    console.clear();
    console.log('\n--- Confirm Bulk Update ---\n');
    console.log(`Model: ${newModel}\n`);
    console.log('Agents to update:');
    for (const agentName of selectedAgents) {
      const current = this.config.agents[agentName]?.model || 'none';
      console.log(`  - ${agentName}: ${current} → ${newModel}`);
    }

    const confirm = await this.prompt('\nApply changes? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
      for (const agentName of selectedAgents) {
        if (!this.config.agents[agentName]) {
          this.config.agents[agentName] = {};
        }
        this.config.agents[agentName].model = newModel;
      }
      this.saveConfig();
      console.log(`\n✓ Updated ${selectedAgents.length} agent(s) to ${newModel}`);
    } else {
      console.log('\nCancelled');
    }
    
    await this.prompt('Press Enter to continue...');
  }

  async reorderAgents() {
    console.clear();
    console.log('\n--- Reorder Agents ---\n');
    
    const agents = Object.entries(this.config.agents || {});
    if (agents.length < 2) {
      console.log('Need at least 2 agents to reorder');
      await this.prompt('Press Enter to continue...');
      return;
    }

    console.log('Current order:\n');
    agents.forEach(([name, config], idx) => {
      console.log(`  ${idx + 1}. ${name.padEnd(28)} → ${config.model}`);
    });

    console.log('\nCommands:');
    console.log('  Type "2 4" to swap positions 2 and 4');
    console.log('  Type "3 1" to move agent 3 to position 1');
    console.log('  [S] Save new order');
    console.log('  [C] Cancel\n');

    const newOrder = [...agents];
    let modified = false;

    while (true) {
      const input = await this.prompt('Enter command: ');
      
      if (input.toLowerCase() === 'c') {
        if (modified) {
          console.log('Changes discarded');
        }
        return;
      }
      
      if (input.toLowerCase() === 's') {
        if (!modified) {
          console.log('No changes to save');
          await this.prompt('Press Enter to continue...');
          return;
        }
        
        // Rebuild agents object in new order
        const newAgents = {};
        for (const [name, config] of newOrder) {
          newAgents[name] = config;
        }
        this.config.agents = newAgents;
        this.saveConfig();
        console.log('\n✓ Agent order saved');
        await this.prompt('Press Enter to continue...');
        return;
      }

      const parts = input.split(/\s+/).map(s => parseInt(s.trim(), 10) - 1);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const [from, to] = parts;
        if (from >= 0 && from < newOrder.length && to >= 0 && to < newOrder.length) {
          [newOrder[from], newOrder[to]] = [newOrder[to], newOrder[from]];
          modified = true;
          
          console.clear();
          console.log('\n--- Reorder Agents ---\n');
          console.log('New order:\n');
          newOrder.forEach(([name, config], idx) => {
            console.log(`  ${idx + 1}. ${name.padEnd(28)} → ${config.model}`);
          });
          console.log('\nCommands: "# #" to swap | [S] Save | [C] Cancel\n');
        } else {
          console.log('Invalid positions. Use numbers 1-' + newOrder.length);
        }
      } else {
        console.log('Invalid command. Use "# #" to swap positions, [S] to save, [C] to cancel');
      }
    }
  }

  async selectModelForBulk() {
    console.clear();
    console.log('\n--- Select Model for Bulk Update ---\n');

    console.log('Options:\n');
    console.log('  [S] Search all models');
    console.log('  [F] Filter by provider');
    console.log('  [C] Cancel\n');

    const choice = await this.prompt('Select option: ');

    if (choice.toLowerCase() === 'c') {
      return null;
    }

    if (choice.toLowerCase() === 's') {
      return await this.searchModelsForBulk();
    }

    if (choice.toLowerCase() === 'f') {
      return await this.filterByProviderForBulk();
    }

    return await this.selectModelForBulk();
  }

  async searchModelsForBulk() {
    console.clear();
    console.log('\n--- Search Models ---\n');
    
    const preferredProviders = this.config.preferred_providers || [];
    const hasPreferred = preferredProviders.length > 0;
    
    let searchInPreferred = false;
    if (hasPreferred) {
      console.log(`Preferred providers: ${preferredProviders.join(', ')}`);
      console.log('[P] Search preferred providers only');
      console.log('[A] Search all providers\n');
      
      const scope = await this.prompt('Scope (P/A, default=P): ');
      searchInPreferred = scope.toLowerCase() !== 'a';
    }
    
    const query = await this.prompt('\nSearch (provider/name or Enter for all): ');
    
    let baseModels = this.models;
    if (searchInPreferred && hasPreferred) {
      baseModels = this.models.filter(m => {
        const provider = m.providerID || m.id.split('/')[0];
        return preferredProviders.includes(provider);
      });
    }
    
    const filtered = query 
      ? baseModels.filter(m => m.id.toLowerCase().includes(query.toLowerCase()) || 
                                 m.name?.toLowerCase().includes(query.toLowerCase()))
      : baseModels;

    if (filtered.length === 0) {
      console.log('No models found');
      await this.prompt('Press Enter to continue...');
      return await this.selectModelForBulk();
    }

    return await this.displayModelListForBulk(filtered);
  }

  async filterByProviderForBulk() {
    console.clear();
    console.log('\n--- Filter by Provider ---\n');
    
    const preferredProviders = this.config.preferred_providers || [];
    const hasPreferred = preferredProviders.length > 0;
    
    console.log('AVAILABLE PROVIDERS:\n');
    this.providers.forEach((provider, idx) => {
      const count = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider).length;
      const preferred = preferredProviders.includes(provider) ? ` ${colors.green}★${colors.reset}` : '';
      console.log(`  ${idx + 1}. ${provider} (${count} models)${preferred}`);
    });

    if (hasPreferred) {
      console.log(`\n${colors.green}★${colors.reset} = preferred provider`);
      console.log('\n[P] Use preferred providers only');
    }
    console.log('[A] Select All');
    console.log('[C] Cancel\n');
    
    const choice = await this.prompt('Select providers (comma-separated numbers): ');
    
    if (choice.toLowerCase() === 'c') {
      return await this.selectModelForBulk();
    }

    let selectedProviders = [];
    if (choice.toLowerCase() === 'p' && hasPreferred) {
      selectedProviders = preferredProviders.filter(p => this.providers.includes(p));
    } else if (choice.toLowerCase() === 'a') {
      selectedProviders = this.providers;
    } else {
      const indices = choice.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
      selectedProviders = indices
        .filter(idx => idx >= 0 && idx < this.providers.length)
        .map(idx => this.providers[idx]);
    }

    if (selectedProviders.length === 0) {
      console.log('No providers selected');
      await this.prompt('Press Enter to continue...');
      return await this.filterByProviderForBulk();
    }

    const filtered = this.models.filter(m => {
      const provider = m.providerID || m.id.split('/')[0];
      return selectedProviders.includes(provider);
    });

    return await this.displayModelListForBulk(filtered);
  }

  async displayModelListForBulk(filtered) {
    const perPage = 15;
    let page = 0;

    while (true) {
      console.clear();
      console.log(`\n--- Models (${filtered.length} total) - Page ${page + 1}/${Math.ceil(filtered.length / perPage)} ---\n`);

      const start = page * perPage;
      const end = Math.min(start + perPage, filtered.length);

      for (let i = start; i < end; i++) {
        console.log(`  ${i + 1}. ${formatModel(filtered[i])}`);
      }

      console.log('\n[N] Next page  [P] Previous page  [#] Select number  [C] Cancel\n');
      const choice = await this.prompt('Select option: ');

      if (choice.toLowerCase() === 'c') {
        return null;
      }
      if (choice.toLowerCase() === 'n' && end < filtered.length) {
        page++;
        continue;
      }
      if (choice.toLowerCase() === 'p' && page > 0) {
        page--;
        continue;
      }

      const idx = parseInt(choice, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < filtered.length) {
        return filtered[idx].id;
      }
    }
  }

  async manageConfigurationsMenu() {
    while (true) {
      console.clear();
      console.log('\n' + '='.repeat(70));
      console.log('Manage Configurations');
      console.log('='.repeat(70) + '\n');

      const configs = this.configManager.listConfigurations();
      
      console.log('AVAILABLE CONFIGURATIONS:\n');
      configs.forEach((name, idx) => {
        const active = name === this.configName ? ' [ACTIVE]' : '';
        const metadata = this.configManager.loadConfiguration(name);
        const modDate = new Date(metadata.modified).toLocaleDateString();
        const agentCount = Object.keys(metadata.config.agents || {}).length;
        console.log(`  ${idx + 1}. ${name}${active} (${agentCount} agents)`);
        console.log(`     ${metadata.description}`);
        console.log(`     Modified: ${modDate}\n`);
      });

      console.log('ACTIONS:\n');
      console.log('  [S] Switch active configuration');
      console.log('  [N] New configuration');
      console.log('  [R] Rename configuration');
      console.log('  [T] Edit description');
      console.log('  [D] Delete configuration');
      console.log('  [E] Export configuration');
      console.log('  [I] Import configuration');
      console.log('  [B] Back to main menu\n');

      const choice = await this.prompt('Select option: ');

      switch (choice.toLowerCase()) {
        case 's':
          await this.switchConfiguration();
          break;
        case 'n':
          await this.createConfiguration();
          break;
        case 'r':
          await this.renameConfiguration();
          break;
        case 't':
          await this.editDescription();
          break;
        case 'd':
          await this.deleteConfiguration();
          break;
        case 'e':
          await this.exportConfiguration();
          break;
        case 'i':
          await this.importConfiguration();
          break;
        case 'b':
          return;
        default:
          console.log('Invalid option');
          await this.prompt('Press Enter to continue...');
      }
    }
  }

  async switchConfiguration() {
    console.clear();
    console.log('\n--- Switch Configuration ---\n');
    
    const configs = this.configManager.listConfigurations();
    configs.forEach((name, idx) => {
      const active = name === this.configName ? ' [ACTIVE]' : '';
      console.log(`  ${idx + 1}. ${name}${active}`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select configuration: ');

    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < configs.length) {
      const configName = configs[idx];
      if (configName === this.configName) {
        console.log('Already active');
      } else {
        try {
          await this.switchToConfiguration(configName);
          console.log(`\n✓ Switched to configuration: ${configName}`);
        } catch (error) {
          console.error(`Error: ${error.message}`);
        }
      }
    } else {
      console.log('Invalid selection');
    }

    await this.prompt('Press Enter to continue...');
  }

  async createConfiguration() {
    console.clear();
    console.log('\n--- Create New Configuration ---\n');

    const name = await this.prompt('Configuration name: ');
    if (!name) return;

    if (this.configManager.configExists(name)) {
      console.log('Configuration already exists');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const description = await this.prompt('Description: ');
    
    console.log('\nCreate from:\n');
    console.log('  [1] Copy omo-default (recommended - start with OmO agents)');
    console.log('  [2] Copy from another configuration');
    console.log('  [3] Copy current configuration');
    console.log('  [4] Minimal configuration (no agents)\n');

    const choice = await this.prompt('Select option: ');
    
    let config;
    let needsSetup = false;
    let copiedFrom = null;
    
    switch (choice) {
      case '1':
        const defaultMeta = this.configManager.loadConfiguration('omo-default');
        config = JSON.parse(JSON.stringify(defaultMeta.config));
        copiedFrom = 'omo-default';
        break;
      case '2': {
        console.clear();
        console.log('\n--- Select Configuration to Copy ---\n');
        
        const configs = this.configManager.listConfigurations();
        configs.forEach((configName, idx) => {
          const metadata = this.configManager.loadConfiguration(configName);
          const current = configName === this.configName ? ' [CURRENT]' : '';
          console.log(`  ${idx + 1}. ${configName}${current}`);
          console.log(`     ${metadata.description}\n`);
        });
        
        console.log('[C] Cancel\n');
        const copyChoice = await this.prompt('Select configuration: ');
        
        if (copyChoice.toLowerCase() === 'c') return;
        
        const copyIdx = parseInt(copyChoice, 10) - 1;
        if (copyIdx < 0 || copyIdx >= configs.length) {
          console.log('Invalid selection');
          await this.prompt('Press Enter to continue...');
          return;
        }
        
        const sourceConfig = configs[copyIdx];
        const sourceMeta = this.configManager.loadConfiguration(sourceConfig);
        config = JSON.parse(JSON.stringify(sourceMeta.config));
        copiedFrom = sourceConfig;
        break;
      }
      case '3':
        config = JSON.parse(JSON.stringify(this.config));
        copiedFrom = this.configName;
        break;
      case '4':
        config = { google_auth: false, agents: {}, mcps: {} };
        needsSetup = true;
        break;
      default:
        console.log('Invalid option');
        await this.prompt('Press Enter to continue...');
        return;
    }

    try {
      this.configManager.saveConfiguration(name, description || 'New configuration', config);
      console.log(`\n✓ Created configuration: ${name}`);
      
      if (copiedFrom) {
        console.log(`  Copied from: ${copiedFrom}`);
      }
      
      if (needsSetup) {
        console.log('\nNote: This configuration has no agents.');
        console.log('Oh My Opencode expects agents to be configured.');
        console.log('You should add agents before using this configuration.');
      }
      
      const switchNow = await this.prompt('\nSwitch to this configuration now? (yes/no): ');
      if (switchNow.toLowerCase() === 'yes') {
        await this.switchToConfiguration(name);
        console.log(`✓ Switched to: ${name}`);
        
        if (needsSetup) {
          console.log('\nLet\'s add agents to this configuration.');
          await this.prompt('Press Enter to continue...');
          await this.agentConfigMenu();
        } else {
          console.log('\nWould you like to configure agents now?');
          const configureNow = await this.prompt('(yes/no): ');
          if (configureNow.toLowerCase() === 'yes') {
            await this.agentConfigMenu();
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }

  async renameConfiguration() {
    console.clear();
    console.log('\n--- Rename Configuration ---\n');

    const configs = this.configManager.listConfigurations();
    configs.forEach((name, idx) => {
      console.log(`  ${idx + 1}. ${name}`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select configuration to rename: ');

    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= configs.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const oldName = configs[idx];
    const newName = await this.prompt('New name: ');

    if (!newName) return;

    try {
      this.configManager.renameConfiguration(oldName, newName);
      
      if (oldName === this.configName) {
        this.configName = newName;
        this.configManager.setActiveConfig(newName);
      }
      
      console.log(`\n✓ Renamed "${oldName}" to "${newName}"`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    await this.prompt('Press Enter to continue...');
  }

  async editDescription() {
    console.clear();
    console.log('\n--- Edit Configuration Description ---\n');

    const configs = this.configManager.listConfigurations();
    configs.forEach((name, idx) => {
      const metadata = this.configManager.loadConfiguration(name);
      console.log(`  ${idx + 1}. ${name}`);
      console.log(`     Current: ${metadata.description}\n`);
    });

    console.log('[C] Cancel\n');
    const choice = await this.prompt('Select configuration to edit: ');

    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= configs.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const configName = configs[idx];
    const metadata = this.configManager.loadConfiguration(configName);
    
    console.log(`\nCurrent description: ${metadata.description}`);
    const newDescription = await this.prompt('New description (or Enter to keep current): ');

    if (!newDescription) {
      console.log('No changes made');
      await this.prompt('Press Enter to continue...');
      return;
    }

    try {
      this.configManager.saveConfiguration(configName, newDescription, metadata.config);
      console.log(`\n✓ Updated description for "${configName}"`);
      
      if (configName === this.configName) {
        this.configMetadata.description = newDescription;
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    await this.prompt('Press Enter to continue...');
  }

  async deleteConfiguration() {
    console.clear();
    console.log('\n--- Delete Configuration ---\n');

    const configs = this.configManager.listConfigurations();
    
    if (configs.length === 1) {
      console.log('Cannot delete the last configuration');
      await this.prompt('Press Enter to continue...');
      return;
    }

    configs.forEach((name, idx) => {
      const active = name === this.configName ? ' [ACTIVE - cannot delete]' : '';
      console.log(`  ${idx + 1}. ${name}${active}`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select configuration to delete: ');

    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= configs.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const configName = configs[idx];
    
    if (configName === this.configName) {
      console.log('Cannot delete active configuration. Switch to another first.');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const confirm = await this.prompt(`Delete "${configName}"? This cannot be undone. (yes/no): `);
    if (confirm.toLowerCase() === 'yes') {
      try {
        this.configManager.deleteConfiguration(configName);
        console.log(`\n✓ Deleted configuration: ${configName}`);
      } catch (error) {
        console.error(`Error: ${error.message}`);
      }
    }

    await this.prompt('Press Enter to continue...');
  }

  async exportConfiguration() {
    console.clear();
    console.log('\n--- Export Configuration ---\n');

    const configs = this.configManager.listConfigurations();
    configs.forEach((name, idx) => {
      console.log(`  ${idx + 1}. ${name}`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select configuration to export: ');

    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= configs.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const configName = configs[idx];
    const destPath = await this.prompt('Destination path (e.g., ~/my-config.json): ');

    if (!destPath) return;

    try {
      const expandedPath = destPath.replace(/^~/, process.env.HOME);
      this.configManager.exportConfiguration(configName, expandedPath);
      console.log(`\n✓ Exported "${configName}" to ${expandedPath}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    await this.prompt('Press Enter to continue...');
  }

  async importConfiguration() {
    console.clear();
    console.log('\n--- Import Configuration ---\n');

    const sourcePath = await this.prompt('Source path (e.g., ~/my-config.json): ');
    if (!sourcePath) return;

    const name = await this.prompt('Configuration name: ');
    if (!name) return;

    if (this.configManager.configExists(name)) {
      console.log('Configuration with this name already exists');
      await this.prompt('Press Enter to continue...');
      return;
    }

    const description = await this.prompt('Description (optional): ');

    try {
      const expandedPath = sourcePath.replace(/^~/, process.env.HOME);
      this.configManager.importConfiguration(expandedPath, name, description);
      console.log(`\n✓ Imported configuration as "${name}"`);
    } catch (error) {
      console.error(`\nError importing configuration: ${error.message}`);
      if (error.code === 'ENOENT') {
        console.error(`File not found: ${sourcePath}`);
        console.error('Check the file path and try again.');
      } else if (error instanceof SyntaxError) {
        console.error('The file contains invalid JSON.');
        console.error('Ensure the file is a valid JSON configuration.');
      }
    }

    await this.prompt('Press Enter to continue...');
  }

  async viewBackups() {
    console.clear();
    console.log('\n--- Configuration Backups ---\n');
    
    try {
      const allFiles = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
      
      const currentConfigFiles = allFiles.filter(f => f.startsWith(`${this.configName}-`));
      
      console.log(`Backups for "${this.configName}":\n`);
      if (currentConfigFiles.length === 0) {
        console.log('  No backups found for this configuration');
      } else {
        currentConfigFiles.slice(0, 10).forEach((file, idx) => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          console.log(`  ${idx + 1}. ${file} (${stats.size} bytes)`);
        });
      }
      
      const otherFiles = allFiles.filter(f => !f.startsWith(`${this.configName}-`));
      if (otherFiles.length > 0) {
        console.log(`\nOther configurations have ${otherFiles.length} backup(s)`);
        const showAll = await this.prompt('Show all backups? (yes/no): ');
        
        if (showAll.toLowerCase() === 'yes') {
          console.clear();
          console.log('\n--- All Configuration Backups ---\n');
          allFiles.slice(0, 20).forEach((file, idx) => {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            console.log(`  ${idx + 1}. ${file} (${stats.size} bytes)`);
          });
        }
      }
      
      if (currentConfigFiles.length > 0 || allFiles.length > 0) {
        console.log('');
        const restore = await this.prompt('Restore from backup? (yes/no): ');
        if (restore.toLowerCase() === 'yes') {
          await this.restoreFromBackup(currentConfigFiles, allFiles);
        }
      }
    } catch (error) {
      console.log(`Error reading backups: ${error.message}`);
    }
  }

  async restoreFromBackup(currentConfigFiles, allFiles) {
    console.clear();
    console.log('\n--- Restore from Backup ---\n');
    
    console.log('Restore from:\n');
    console.log('  [1] Current configuration backups');
    console.log('  [2] All backups');
    console.log('  [C] Cancel\n');
    
    const scope = await this.prompt('Select option: ');
    if (scope.toLowerCase() === 'c') return;
    
    const files = scope === '2' ? allFiles : currentConfigFiles;
    
    if (files.length === 0) {
      console.log('No backups available');
      await this.prompt('Press Enter to continue...');
      return;
    }
    
    console.clear();
    console.log('\n--- Select Backup to Restore ---\n');
    
    files.slice(0, 20).forEach((file, idx) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      const date = file.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] || '';
      console.log(`  ${idx + 1}. ${file}`);
      console.log(`      ${new Date(date.replace('T', ' ').replace(/-/g, ':')).toLocaleString()} (${stats.size} bytes)\n`);
    });
    
    console.log('[C] Cancel\n');
    const choice = await this.prompt('Select backup: ');
    
    if (choice.toLowerCase() === 'c') return;
    
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= files.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return;
    }
    
    const backupFile = files[idx];
    const backupPath = path.join(BACKUP_DIR, backupFile);
    const configNameFromBackup = backupFile.split('-202')[0];
    
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      console.clear();
      console.log('\n--- Backup Preview ---\n');
      console.log(`Configuration: ${configNameFromBackup}`);
      console.log(`Backup file: ${backupFile}`);
      
      const backupConfig = backupData.config || backupData;
      const agentCount = Object.keys(backupConfig.agents || {}).length;
      console.log(`\nAgents in backup: ${agentCount}`);
      
      if (agentCount > 0) {
        console.log('\nAgents:');
        Object.entries(backupConfig.agents).forEach(([name, config]) => {
          console.log(`  - ${name} → ${config.model}`);
        });
      }
      
      console.log('\n⚠️  Warning: This will replace the current configuration!');
      console.log('A backup of the current state will be created first.\n');
      
      const confirm = await this.prompt('Proceed with restore? (yes/no): ');
      
      if (confirm.toLowerCase() === 'yes') {
        this.createBackup();
        const description = backupData.description || `Restored from ${backupFile}`;
        this.configMetadata = this.configManager.saveConfiguration(
          this.configName,
          description,
          backupConfig
        );
        this.config = backupConfig;
        this.configManager.updateMainConfigFile(this.config);
        
        console.log(`\n✓ Successfully restored from backup`);
        console.log(`  Configuration: ${this.configName}`);
        console.log(`  Agents: ${agentCount}`);
      } else {
        console.log('Restore cancelled');
      }
    } catch (error) {
      console.error(`\nError restoring backup: ${error.message}`);
    }
    
    await this.prompt('\nPress Enter to continue...');
  }

  async selectFromBookmarks(agentType, currentModel) {
    console.clear();
    console.log('\n--- Bookmarked Models ---\n');
    
    const bookmarks = this.config.model_bookmarks || [];
    if (bookmarks.length === 0) {
      console.log('No bookmarks saved');
      await this.prompt('Press Enter to continue...');
      return await this.selectModel(agentType, currentModel);
    }

    bookmarks.forEach((modelId, idx) => {
      const model = this.models.find(m => m.id === modelId);
      const current = modelId === currentModel ? ' ⭐ (current)' : '';
      if (model) {
        console.log(`  ${idx + 1}. ${formatModel(model)}${current}`);
      } else {
        console.log(`  ${idx + 1}. ${modelId} ${colors.dim}(not available)${colors.reset}${current}`);
      }
    });

    console.log('\n[#] Select number');
    console.log('[B] Back to model selection');
    console.log('[M] Manage bookmarks\n');
    
    const choice = await this.prompt('Select option: ');
    
    if (choice.toLowerCase() === 'b') {
      return await this.selectModel(agentType, currentModel);
    }
    
    if (choice.toLowerCase() === 'm') {
      await this.manageBookmarks();
      return await this.selectFromBookmarks(agentType, currentModel);
    }
    
    const idx = parseInt(choice, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < bookmarks.length) {
      const modelId = bookmarks[idx];
      const model = this.models.find(m => m.id === modelId);
      if (model) {
        return modelId;
      } else {
        console.log('Model not available in current provider list');
        await this.prompt('Press Enter to continue...');
        return await this.selectFromBookmarks(agentType, currentModel);
      }
    }
    
    return await this.selectFromBookmarks(agentType, currentModel);
  }

  async manageBookmarks() {
    while (true) {
      console.clear();
      console.log('\n--- Manage Bookmarks ---\n');
      
      const bookmarks = this.config.model_bookmarks || [];
      
      if (bookmarks.length === 0) {
        console.log('No bookmarks saved\n');
      } else {
        console.log('SAVED BOOKMARKS:\n');
        bookmarks.forEach((modelId, idx) => {
          const model = this.models.find(m => m.id === modelId);
          if (model) {
            console.log(`  ${idx + 1}. ${formatModel(model)}`);
          } else {
            console.log(`  ${idx + 1}. ${modelId} ${colors.dim}(not available)${colors.reset}`);
          }
        });
      }
      
      console.log('\nOPTIONS:\n');
      console.log('  [A] Add bookmark');
      if (bookmarks.length > 0) {
        console.log('  [R] Remove bookmark');
        console.log('  [X] Clear all bookmarks');
      }
      console.log('  [B] Back\n');
      
      const choice = await this.prompt('Select option: ');
      
      switch (choice.toLowerCase()) {
        case 'a':
          await this.addBookmark();
          break;
        case 'r':
          if (bookmarks.length > 0) {
            await this.removeBookmark();
          }
          break;
        case 'x':
          if (bookmarks.length > 0) {
            const confirm = await this.prompt('Clear all bookmarks? (yes/no): ');
            if (confirm.toLowerCase() === 'yes') {
              delete this.config.model_bookmarks;
              this.saveConfig();
              console.log('✓ Cleared all bookmarks');
              await this.prompt('Press Enter to continue...');
            }
          }
          break;
        case 'b':
          return;
        default:
          console.log('Invalid option');
          await this.prompt('Press Enter to continue...');
      }
    }
  }

  async addBookmark() {
    console.clear();
    console.log('\n--- Add Bookmark ---\n');
    console.log('[S] Search for model');
    console.log('[F] Filter by provider');
    console.log('[C] Cancel\n');
    
    const choice = await this.prompt('Select option: ');
    
    if (choice.toLowerCase() === 'c') return;
    
    let modelId = null;
    if (choice.toLowerCase() === 's') {
      modelId = await this.searchModelsForBookmark();
    } else if (choice.toLowerCase() === 'f') {
      modelId = await this.filterByProviderForBookmark();
    }
    
    if (modelId) {
      if (!this.config.model_bookmarks) {
        this.config.model_bookmarks = [];
      }
      if (!this.config.model_bookmarks.includes(modelId)) {
        this.config.model_bookmarks.push(modelId);
        this.saveConfig();
        console.log(`\n✓ Added ${modelId} to bookmarks`);
      } else {
        console.log('\nModel already bookmarked');
      }
      await this.prompt('Press Enter to continue...');
    }
  }

  async searchModelsForBookmark() {
    console.clear();
    console.log('\n--- Search Models ---\n');
    
    const query = await this.prompt('Search (provider/name or Enter for all): ');
    const filtered = query 
      ? this.models.filter(m => m.id.toLowerCase().includes(query.toLowerCase()) || 
                                 m.name?.toLowerCase().includes(query.toLowerCase()))
      : this.models;

    if (filtered.length === 0) {
      console.log('No models found');
      await this.prompt('Press Enter to continue...');
      return null;
    }

    return await this.displayModelListForBookmark(filtered);
  }

  async filterByProviderForBookmark() {
    console.clear();
    console.log('\n--- Filter by Provider ---\n');
    
    console.log('AVAILABLE PROVIDERS:\n');
    this.providers.forEach((provider, idx) => {
      const count = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider).length;
      console.log(`  ${idx + 1}. ${provider} (${count} models)`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select provider: ');
    
    if (choice.toLowerCase() === 'c') return null;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= this.providers.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return null;
    }

    const provider = this.providers[idx];
    const filtered = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider);

    return await this.displayModelListForBookmark(filtered);
  }

  async displayModelListForBookmark(filtered) {
    const bookmarks = this.config.model_bookmarks || [];
    const perPage = 15;
    let page = 0;

    while (true) {
      console.clear();
      console.log(`\n--- Models (${filtered.length} total) - Page ${page + 1}/${Math.ceil(filtered.length / perPage)} ---\n`);

      const start = page * perPage;
      const end = Math.min(start + perPage, filtered.length);

      for (let i = start; i < end; i++) {
        const bookmarked = bookmarks.includes(filtered[i].id) ? ` ${colors.yellow}★${colors.reset}` : '';
        console.log(`  ${i + 1}. ${formatModel(filtered[i])}${bookmarked}`);
      }

      console.log('\n[N] Next page  [P] Previous page  [#] Select number  [C] Cancel\n');
      const choice = await this.prompt('Select option: ');

      if (choice.toLowerCase() === 'c') return null;
      if (choice.toLowerCase() === 'n' && end < filtered.length) {
        page++;
        continue;
      }
      if (choice.toLowerCase() === 'p' && page > 0) {
        page--;
        continue;
      }

      const idx = parseInt(choice, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < filtered.length) {
        return filtered[idx].id;
      }
    }
  }

  async removeBookmark() {
    console.clear();
    console.log('\n--- Remove Bookmark ---\n');
    
    const bookmarks = this.config.model_bookmarks || [];
    bookmarks.forEach((modelId, idx) => {
      const model = this.models.find(m => m.id === modelId);
      if (model) {
        console.log(`  ${idx + 1}. ${formatModel(model)}`);
      } else {
        console.log(`  ${idx + 1}. ${modelId}`);
      }
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select bookmark to remove: ');
    
    if (choice.toLowerCase() === 'c') return;

    const idx = parseInt(choice, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < bookmarks.length) {
      const removed = bookmarks.splice(idx, 1);
      this.config.model_bookmarks = bookmarks;
      this.saveConfig();
      console.log(`\n✓ Removed ${removed[0]} from bookmarks`);
    } else {
      console.log('Invalid selection');
    }
    await this.prompt('Press Enter to continue...');
  }

  async compareModels() {
    console.clear();
    console.log('\n--- Compare Models ---\n');
    console.log('Select models to compare (up to 4).\n');
    
    const selectedModels = [];
    
    while (selectedModels.length < 4) {
      console.log(`Selected: ${selectedModels.length}/4 models`);
      if (selectedModels.length > 0) {
        console.log(`  ${selectedModels.map(m => m.id).join(', ')}\n`);
      }
      
      console.log('[S] Search for a model');
      console.log('[F] Filter by provider');
      if (selectedModels.length >= 2) {
        console.log('[C] Compare now');
      }
      console.log('[X] Cancel\n');
      
      const choice = await this.prompt('Select option: ');
      
      if (choice.toLowerCase() === 'x') return;
      if (choice.toLowerCase() === 'c' && selectedModels.length >= 2) break;
      
      let modelId = null;
      if (choice.toLowerCase() === 's') {
        modelId = await this.selectModelForComparison();
      } else if (choice.toLowerCase() === 'f') {
        modelId = await this.filterByProviderForComparison();
      }
      
      if (modelId) {
        const model = this.models.find(m => m.id === modelId);
        if (model && !selectedModels.find(m => m.id === modelId)) {
          selectedModels.push(model);
          console.log(`\n✓ Added ${modelId}\n`);
        } else if (selectedModels.find(m => m.id === modelId)) {
          console.log('\nModel already selected');
          await this.prompt('Press Enter to continue...');
        }
      }
      console.clear();
      console.log('\n--- Compare Models ---\n');
    }
    
    if (selectedModels.length < 2) {
      console.log('Need at least 2 models to compare');
      await this.prompt('Press Enter to continue...');
      return;
    }
    
    this.displayModelComparison(selectedModels);
    await this.prompt('\nPress Enter to continue...');
  }

  async selectModelForComparison() {
    console.clear();
    console.log('\n--- Search Models ---\n');
    
    const query = await this.prompt('Search (provider/name or Enter for all): ');
    const filtered = query 
      ? this.models.filter(m => m.id.toLowerCase().includes(query.toLowerCase()) || 
                                 m.name?.toLowerCase().includes(query.toLowerCase()))
      : this.models;

    if (filtered.length === 0) {
      console.log('No models found');
      await this.prompt('Press Enter to continue...');
      return null;
    }

    return await this.displayModelListForSelection(filtered);
  }

  async filterByProviderForComparison() {
    console.clear();
    console.log('\n--- Filter by Provider ---\n');
    
    console.log('AVAILABLE PROVIDERS:\n');
    this.providers.forEach((provider, idx) => {
      const count = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider).length;
      console.log(`  ${idx + 1}. ${provider} (${count} models)`);
    });

    console.log('\n[C] Cancel\n');
    const choice = await this.prompt('Select provider: ');
    
    if (choice.toLowerCase() === 'c') return null;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= this.providers.length) {
      console.log('Invalid selection');
      await this.prompt('Press Enter to continue...');
      return null;
    }

    const provider = this.providers[idx];
    const filtered = this.models.filter(m => (m.providerID || m.id.split('/')[0]) === provider);

    return await this.displayModelListForSelection(filtered);
  }

  async displayModelListForSelection(filtered) {
    const perPage = 15;
    let page = 0;

    while (true) {
      console.clear();
      console.log(`\n--- Models (${filtered.length} total) - Page ${page + 1}/${Math.ceil(filtered.length / perPage)} ---\n`);

      const start = page * perPage;
      const end = Math.min(start + perPage, filtered.length);

      for (let i = start; i < end; i++) {
        console.log(`  ${i + 1}. ${formatModel(filtered[i])}`);
      }

      console.log('\n[N] Next page  [P] Previous page  [#] Select number  [C] Cancel\n');
      const choice = await this.prompt('Select option: ');

      if (choice.toLowerCase() === 'c') return null;
      if (choice.toLowerCase() === 'n' && end < filtered.length) {
        page++;
        continue;
      }
      if (choice.toLowerCase() === 'p' && page > 0) {
        page--;
        continue;
      }

      const idx = parseInt(choice, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < filtered.length) {
        return filtered[idx].id;
      }
    }
  }

  displayModelComparison(models) {
    console.clear();
    console.log('\n' + '='.repeat(90));
    console.log('MODEL COMPARISON');
    console.log('='.repeat(90) + '\n');
    
    const colWidth = Math.floor(80 / models.length);
    
    const headers = models.map(m => (m.name || m.id).substring(0, colWidth - 2).padEnd(colWidth));
    console.log('Model:'.padEnd(15) + headers.join(''));
    console.log('-'.repeat(15 + colWidth * models.length));
    
    const providers = models.map(m => (m.providerID || m.id.split('/')[0]).padEnd(colWidth));
    console.log('Provider:'.padEnd(15) + providers.join(''));
    
    const contexts = models.map(m => {
      const ctx = m.limit?.context;
      return (ctx ? `${Math.floor(ctx / 1000)}K` : '?').padEnd(colWidth);
    });
    console.log('Context:'.padEnd(15) + contexts.join(''));
    
    const reasoning = models.map(m => {
      const has = m.capabilities?.reasoning || hasExtendedThinking(m);
      return (has ? `${colors.green}Yes${colors.reset}` : 'No').padEnd(colWidth + (has ? 9 : 0));
    });
    console.log('Reasoning:'.padEnd(15) + reasoning.join(''));
    
    const thinking = models.map(m => {
      const has = hasExtendedThinking(m);
      return (has ? `${colors.green}Yes${colors.reset}` : 'No').padEnd(colWidth + (has ? 9 : 0));
    });
    console.log('Thinking:'.padEnd(15) + thinking.join(''));
    
    const image = models.map(m => {
      const has = m.capabilities?.input?.image;
      return (has ? `${colors.green}Yes${colors.reset}` : 'No').padEnd(colWidth + (has ? 9 : 0));
    });
    console.log('Image Input:'.padEnd(15) + image.join(''));
    
    const pdf = models.map(m => {
      const has = m.capabilities?.input?.pdf;
      return (has ? `${colors.green}Yes${colors.reset}` : 'No').padEnd(colWidth + (has ? 9 : 0));
    });
    console.log('PDF Input:'.padEnd(15) + pdf.join(''));
    
    const fast = models.map(m => {
      const is = isFastModel(m);
      return (is ? `${colors.green}Yes${colors.reset}` : 'No').padEnd(colWidth + (is ? 9 : 0));
    });
    console.log('Fast Model:'.padEnd(15) + fast.join(''));
    
    const costs = models.map(m => {
      if (m.cost) {
        const input = m.cost.input || 0;
        const output = m.cost.output || 0;
        return `$${input}/$${output}`.padEnd(colWidth);
      }
      return '?'.padEnd(colWidth);
    });
    console.log('Cost (I/O):'.padEnd(15) + costs.join(''));
    
    console.log('\n' + '='.repeat(90));
  }

  async mainMenu() {
    while (true) {
      console.clear();
      console.log('\n' + '='.repeat(70));
      console.log('Oh My Opencode - Agent Configuration');
      console.log('='.repeat(70));
      
      const modDate = new Date(this.configMetadata.modified).toLocaleDateString();
      console.log(`\nActive Configuration: ${this.configName}`);
      console.log(`Description: ${this.configMetadata.description}`);
      console.log(`Modified: ${modDate}\n`);

      console.log('CURRENT AGENTS:\n');
      const agents = Object.entries(this.config.agents || {});
      
      if (agents.length === 0) {
        console.log('  No agents configured\n');
      } else {
        agents.forEach(([name, config], idx) => {
          console.log(`  ${idx + 1}. ${name.padEnd(30)} → ${config.model}`);
        });
      }

      console.log('\nACTIONS:\n');
      console.log('  [E] Edit agent model (enter number or name)');
      console.log('  [D] Delete agent (enter number or name)');
      console.log('  [?] Show agent information');
      console.log('  [K] Compare models');
      console.log('  [*] Manage bookmarks');
      console.log('  [P] Set preferred providers');
      console.log('  [L] Reload models');
      console.log('  [U] Update config (sync with OmO defaults)');
      console.log('  [M] Manage configurations');
      console.log('  [R] Restore defaults');
      console.log('  [B] View backups');
      console.log('  [Q] Quit');
      
      console.log('\nCapabilities: [R]=Reasoning [T]=Thinking [I]=Image [P]=PDF [F]=Fast');
      console.log('Managing OmO built-in agents only (see [?] for custom agents)\n');
      
      const choice = await this.prompt('Select option: ');
      
      switch (choice.toLowerCase()) {
        case 'e': {
          const agentInput = await this.prompt('Agent # or name: ');
          const agentIdx = parseInt(agentInput, 10) - 1;
          let agentName = null;
          
          if (!isNaN(agentIdx) && agentIdx >= 0 && agentIdx < agents.length) {
            agentName = agents[agentIdx][0];
          } else if (this.config.agents[agentInput]) {
            agentName = agentInput;
          }
          
          if (agentName) {
            await this.editAgent(agentName);
          } else {
            console.log('Agent not found');
            await this.prompt('Press Enter to continue...');
          }
          break;
        }
        case 'd': {
          const agentInput = await this.prompt('Agent # or name: ');
          const agentIdx = parseInt(agentInput, 10) - 1;
          let agentName = null;
          
          if (!isNaN(agentIdx) && agentIdx >= 0 && agentIdx < agents.length) {
            agentName = agents[agentIdx][0];
          } else if (this.config.agents[agentInput]) {
            agentName = agentInput;
          }
          
          if (agentName) {
            await this.deleteAgent(agentName);
          } else {
            console.log('Agent not found');
            await this.prompt('Press Enter to continue...');
          }
          break;
        }
        case '?':
          await this.showAgentInfo();
          break;
        case 'k':
          await this.compareModels();
          break;
        case '*':
          await this.manageBookmarks();
          break;
        case 'p':
          await this.setPreferredProviders();
          break;
        case 'l':
          console.log('\nReloading models...');
          await this.loadModelsData();
          console.log(`✓ Loaded ${this.models.length} models from ${this.providers.length} providers`);
          await this.prompt('Press Enter to continue...');
          break;
        case 'u':
          await this.promptConfigSync();
          break;
        case 'm':
          await this.manageConfigurationsMenu();
          break;
        case 'r': {
          const confirm = await this.prompt('Restore all agents to defaults? (yes/no): ');
          if (confirm.toLowerCase() === 'yes') {
            await this.restoreDefaults();
            await this.prompt('Press Enter to continue...');
          }
          break;
        }
        case 'b':
          await this.viewBackups();
          break;
        case 'q':
          this.rl.close();
          console.log('\nGoodbye!\n');
          return;
        default:
          console.log('Invalid option');
          await this.prompt('Press Enter to continue...');
      }
    }
  }

  async run() {
    console.log('\nOh My Opencode Agent Configuration Tool\n');
    
    await this.loadConfig();
    await this.loadModelsData();
    await this.promptConfigSync();
    await this.mainMenu();
  }

  showHelp() {
    console.log(`
Oh My Opencode Agent Configuration Tool

USAGE:
  opencode-agent-config [OPTIONS]

OPTIONS:
  -h, --help              Show this help message
  -l, --list              List all configurations
  -c, --current           Show current active configuration
  -s, --switch <name>     Switch to specified configuration

EXAMPLES:
  opencode-agent-config                    # Run interactive mode
  opencode-agent-config --list             # List all configurations
  opencode-agent-config --switch work      # Switch to 'work' config
  opencode-agent-config -s omo-default     # Switch to default config
`);
  }

  listConfigsCli() {
    const configs = this.configManager.listConfigurations();
    
    console.log('AVAILABLE CONFIGURATIONS:\n');
    configs.forEach(name => {
      const metadata = this.configManager.loadConfiguration(name);
      const active = name === this.configName ? ' [ACTIVE]' : '';
      const modDate = new Date(metadata.modified).toLocaleDateString();
      const agentCount = Object.keys(metadata.config.agents || {}).length;
      console.log(`  ${name}${active} (${agentCount} agents)`);
      console.log(`  ${metadata.description}`);
      console.log(`  Modified: ${modDate}\n`);
    });
  }

  showCurrentCli() {
    const modDate = new Date(this.configMetadata.modified).toLocaleDateString();
    console.log(`Active Configuration: ${this.configName}`);
    console.log(`Description: ${this.configMetadata.description}`);
    console.log(`Modified: ${modDate}`);
    
    const agentCount = Object.keys(this.config.agents || {}).length;
    console.log(`\nAgents configured: ${agentCount}`);
  }

  async switchConfigCli(configName) {
    if (!this.configManager.configExists(configName)) {
      console.error(`Error: Configuration "${configName}" does not exist`);
      console.log('\nAvailable configurations:');
      const configs = this.configManager.listConfigurations();
      configs.forEach(name => console.log(`  - ${name}`));
      process.exit(1);
    }

    try {
      await this.switchToConfiguration(configName);
      console.log(`✓ Switched to configuration: ${configName}`);
      
      const agentCount = Object.keys(this.config.agents || {}).length;
      console.log(`  Agents: ${agentCount}`);
    } catch (error) {
      console.error(`Error switching configuration: ${error.message}`);
      process.exit(1);
    }
  }

  async handleCliArgs(args) {
    const command = args[0];

    switch (command) {
      case '--help':
      case '-h':
        this.showHelp();
        process.exit(0);
        break;

      case '--list':
      case '-l':
        await this.loadConfig();
        this.listConfigsCli();
        process.exit(0);
        break;

      case '--current':
      case '-c':
        await this.loadConfig();
        this.showCurrentCli();
        process.exit(0);
        break;

      case '--switch':
      case '-s':
        if (!args[1]) {
          console.error('Error: Configuration name required');
          console.log('Usage: opencode-agent-config --switch <config-name>');
          process.exit(1);
        }
        await this.loadConfig();
        await this.switchConfigCli(args[1]);
        process.exit(0);
        break;

      default:
        if (command && command.startsWith('-')) {
          console.error(`Error: Unknown option '${command}'`);
          console.log('Use --help to see available options');
          process.exit(1);
        }
        await this.run();
    }
  }
}

module.exports = { AgentConfigTool };
