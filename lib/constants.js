/**
 * Constants and configuration values for OmO Agent Config
 */

const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  dim: '\x1b[2m'
};

// Validate HOME environment variable
if (!process.env.HOME) {
  console.error('Error: HOME environment variable is not set.');
  console.error('This tool requires HOME to be defined to locate configuration files.');
  process.exit(1);
}

// Configuration paths
const CONFIG_DIR = path.join(process.env.HOME, '.config', 'opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'oh-my-opencode.json');
const BACKUP_DIR = path.join(CONFIG_DIR, 'backups');
const CONFIGS_DIR = path.join(CONFIG_DIR, 'configs');
const ACTIVE_CONFIG_FILE = path.join(CONFIG_DIR, 'active-config.json');

// Default agent configurations
// Based on Oh My Opencode defaults: https://github.com/code-yeongyu/oh-my-opencode
const DEFAULTS = {
  "google_auth": false,
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.2"
    },
    "Sisyphus": {
      "model": "anthropic/claude-opus-4-5"
    },
    "librarian": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "explore": {
      "model": "opencode/grok-code"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/gemini-3-pro-preview"
    },
    "document-writer": {
      "model": "google/gemini-3-pro-preview"
    },
    "multimodal-looker": {
      "model": "google/gemini-3-flash"
    }
  },
  "mcps": {
    "websearch_exa": {
      "url": "https://mcp.exa.ai/mcp?exaApiKey=4bfbfbd6-a907-4f05-98ca-cf6206af4eba&tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check",
      "type": "remote",
      "enabled": true
    },
    "grep_app": {
      "url": "https://mcp.grep.app",
      "type": "remote"
    }
  }
};

// Agent characteristics for recommendations
// Agent profiles based on Oh My Opencode's actual agent purposes
// See: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/src/agents/AGENTS.md
const AGENT_PROFILES = {
  "oracle": {
    description: "Architecture decisions, debugging, code review (GPT-5.2 class)",
    preferred: ["reasoning", "large_context"],
    minContext: 128000
  },
  "Sisyphus": {
    description: "Primary orchestrator with extended thinking (Opus class)",
    preferred: ["reasoning", "thinking", "large_context"],
    minContext: 128000
  },
  "librarian": {
    description: "Multi-repo research, docs, GitHub examples (Sonnet class)",
    preferred: ["reasoning", "large_context"],
    minContext: 128000
  },
  "explore": {
    description: "Fast contextual grep for codebase exploration (Grok/Flash class)",
    preferred: ["fast", "large_context"],
    minContext: 64000
  },
  "frontend-ui-ux-engineer": {
    description: "UI/UX code generation with visual understanding (Gemini Pro class)",
    preferred: ["reasoning", "multimodal", "image_input"],
    minContext: 64000
  },
  "document-writer": {
    description: "Technical documentation and writing (Gemini Pro class)",
    preferred: ["reasoning", "text_output", "large_context"],
    minContext: 64000
  },
  "multimodal-looker": {
    description: "PDF/image analysis, visual content (Flash class)",
    preferred: ["multimodal", "image_input", "pdf_input", "fast"],
    minContext: 32000
  }
};

module.exports = {
  colors,
  CONFIG_DIR,
  CONFIG_FILE,
  BACKUP_DIR,
  CONFIGS_DIR,
  ACTIVE_CONFIG_FILE,
  DEFAULTS,
  AGENT_PROFILES
};
