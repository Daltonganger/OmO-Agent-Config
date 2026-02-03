const fs = require('fs');
const path = require('path');
const { CONFIG_FILE, BACKUP_DIR, CATEGORY_MODEL_REQUIREMENTS, ALL_CATEGORIES } = require('./constants');

const MIGRATION_MARKER = 'migratedToCategories';

function needsMigration(config) {
  if (!config.meta) return true;
  return !config.meta[MIGRATION_MARKER];
}

function markMigration(config) {
  const newConfig = JSON.parse(JSON.stringify(config));
  if (!newConfig.meta) {
    newConfig.meta = {};
  }
  newConfig.meta[MIGRATION_MARKER] = new Date().toISOString().split('T')[0];
  return newConfig;
}

function createBackup(config) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `oh-my-opencode-pre-migration-${timestamp}.json`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  fs.writeFileSync(backupFile, JSON.stringify(config, null, 2));
  return backupFile;
}

function migrateAgentToCategory(config, agentName, targetCategory) {
  const newConfig = JSON.parse(JSON.stringify(config));
  
  if (!newConfig.agents) {
    newConfig.agents = {};
  }
  
  if (!newConfig.agents[agentName]) {
    newConfig.agents[agentName] = {};
  }
  
  newConfig.agents[agentName].category = targetCategory;
  
  return newConfig;
}

function migrateAllAgents(config) {
  let newConfig = JSON.parse(JSON.stringify(config));
  
  const migrationMap = {
    'explore': 'quick'
  };
  
  if (newConfig.agents) {
    for (const [agentName, targetCategory] of Object.entries(migrationMap)) {
      if (newConfig.agents[agentName] && !newConfig.agents[agentName].category) {
        newConfig = migrateAgentToCategory(newConfig, agentName, targetCategory);
      }
    }
  }
  
  return markMigration(newConfig);
}

function migrateAllConfigs() {
  let config = {};
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Warning: Could not read existing config:', e.message);
    return null;
  }
  
  if (!needsMigration(config)) {
    return null;
  }
  
  const backupPath = createBackup(config);
  
  const migrated = migrateAllAgents(config);
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(migrated, null, 2));
    console.log(`✓ Config migrated successfully`);
    console.log(`  Backup created: ${backupPath}`);
    return migrated;
  } catch (e) {
    console.error('Error: Failed to write migrated config:', e.message);
    return null;
  }
}

module.exports = {
  needsMigration,
  markMigration,
  createBackup,
  migrateAgentToCategory,
  migrateAllAgents,
  migrateAllConfigs,
  MIGRATION_MARKER
};