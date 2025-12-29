/**
 * Configuration Manager - handles named configuration profiles
 */

const fs = require('fs');
const path = require('path');
const { CONFIG_FILE, BACKUP_DIR, CONFIGS_DIR, ACTIVE_CONFIG_FILE, DEFAULTS } = require('./constants');

class ConfigurationManager {
  constructor() {
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(CONFIGS_DIR)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  validateConfigName(name) {
    if (!name || typeof name !== 'string') return false;
    return /^[a-z0-9-_]+$/i.test(name);
  }

  getConfigPath(name) {
    return path.join(CONFIGS_DIR, `${name}.json`);
  }

  listConfigurations() {
    try {
      const files = fs.readdirSync(CONFIGS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
      return files;
    } catch (error) {
      return [];
    }
  }

  configExists(name) {
    return fs.existsSync(this.getConfigPath(name));
  }

  loadConfiguration(name) {
    const configPath = this.getConfigPath(name);
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration "${name}" not found at ${configPath}`);
      } else if (error instanceof SyntaxError) {
        throw new Error(`Configuration "${name}" has invalid JSON. Check ${configPath} for syntax errors.`);
      }
      throw new Error(`Failed to load configuration "${name}": ${error.message}`);
    }
  }

  saveConfiguration(name, description, config) {
    if (!this.validateConfigName(name)) {
      throw new Error('Invalid configuration name. Use only letters, numbers, hyphens, and underscores.');
    }

    const configPath = this.getConfigPath(name);
    const now = new Date().toISOString();
    
    let metadata = {
      name,
      description,
      created: now,
      modified: now,
      config
    };

    if (fs.existsSync(configPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (existing.created) {
          metadata.created = existing.created;
        }
      } catch (e) {
        // Ignore, will use new timestamp
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(metadata, null, 2));
    return metadata;
  }

  deleteConfiguration(name) {
    const configPath = this.getConfigPath(name);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration "${name}" does not exist`);
    }
    fs.unlinkSync(configPath);
  }

  renameConfiguration(oldName, newName) {
    if (!this.validateConfigName(newName)) {
      throw new Error('Invalid configuration name. Use only letters, numbers, hyphens, and underscores.');
    }

    const oldPath = this.getConfigPath(oldName);
    const newPath = this.getConfigPath(newName);

    if (!fs.existsSync(oldPath)) {
      throw new Error(`Configuration "${oldName}" does not exist`);
    }

    if (fs.existsSync(newPath)) {
      throw new Error(`Configuration "${newName}" already exists`);
    }

    const metadata = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    metadata.name = newName;
    metadata.modified = new Date().toISOString();
    
    fs.writeFileSync(newPath, JSON.stringify(metadata, null, 2));
    fs.unlinkSync(oldPath);
  }

  getActiveConfig() {
    try {
      if (fs.existsSync(ACTIVE_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(ACTIVE_CONFIG_FILE, 'utf8'));
        return data.active;
      }
    } catch (error) {
      // Fall through to default
    }
    return null;
  }

  setActiveConfig(name) {
    fs.writeFileSync(ACTIVE_CONFIG_FILE, JSON.stringify({ active: name }, null, 2));
  }

  updateMainConfigFile(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  migrateIfNeeded() {
    this.ensureDirectories();
    
    if (this.listConfigurations().length > 0) {
      return false;
    }

    console.log('\nFirst-time setup: migrating to configuration profiles...\n');

    this.saveConfiguration('omo-default', 'Oh My Opencode default configuration', DEFAULTS);

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        this.saveConfiguration('user-config', 'Migrated user configuration', existing);
        this.setActiveConfig('user-config');
        console.log('✓ Migrated existing configuration to "user-config"');
      } catch (error) {
        console.error('Warning: Could not migrate existing config, using defaults');
        this.setActiveConfig('omo-default');
      }
    } else {
      this.setActiveConfig('omo-default');
    }

    console.log('✓ Created "omo-default" configuration');
    console.log('✓ Migration complete\n');
    return true;
  }

  exportConfiguration(name, destPath) {
    const metadata = this.loadConfiguration(name);
    fs.writeFileSync(destPath, JSON.stringify(metadata, null, 2));
  }

  importConfiguration(sourcePath, name, description) {
    const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const config = data.config || data;
    const desc = description || data.description || 'Imported configuration';
    this.saveConfiguration(name, desc, config);
  }
}

module.exports = { ConfigurationManager };
