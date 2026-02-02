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
const CACHE_DIR = path.join(CONFIG_DIR, 'cache');
const SECRETS_DIR = path.join(CONFIG_DIR, 'secrets');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR, 'opencode.json');
const ACTIVE_CONFIG_FILE = path.join(CONFIG_DIR, 'active-config.json');

// Default agent configurations
// Based on Oh My Opencode defaults: https://github.com/code-yeongyu/oh-my-opencode
const DEFAULTS = {
  "google_auth": false,
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude-opus-4-5"
    },
    "hephaestus": {
      "model": "openai/gpt-5.2-codex",
      "variant": "medium"
    },
    "prometheus": {
      "model": "anthropic/claude-opus-4-5"
    },
    "atlas": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "oracle": {
      "model": "openai/gpt-5.2"
    },
    "librarian": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "explore": {
      "model": "opencode/grok-code"
    },
    "multimodal-looker": {
      "model": "google/gemini-3-flash"
    },
    "metis": {
      "model": "anthropic/claude-opus-4-5"
    },
    "momus": {
      "model": "openai/gpt-5.2"
    },
    "sisyphus-junior": {
      "model": "anthropic/claude-sonnet-4-5"
    }
  },
  "mcps": {
    "websearch_exa": {
      "url": "https://mcp.exa.ai/mcp?exaApiKey={env:EXA_API_KEY}&tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check",
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
  "sisyphus": {
    description: "Primary orchestrator with extended thinking (Opus class)",
    preferred: ["reasoning", "thinking", "large_context"],
    minContext: 128000
  },
  "hephaestus": {
    description: "Autonomous deep worker - goal-oriented execution with thorough research (GPT-5.2 Codex class)",
    preferred: ["reasoning", "large_context", "deep_work"],
    minContext: 128000
  },
  "prometheus": {
    description: "Strategic planner and architect (Opus class)",
    preferred: ["reasoning", "thinking", "large_context"],
    minContext: 128000
  },
  "atlas": {
    description: "Master orchestrator with todo list management (Sonnet class)",
    preferred: ["reasoning", "large_context"],
    minContext: 128000
  },
  "oracle": {
    description: "Architecture decisions, debugging, code review (GPT-5.2 class)",
    preferred: ["reasoning", "large_context"],
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
  "multimodal-looker": {
    description: "PDF/image analysis, visual content (Flash class)",
    preferred: ["multimodal", "image_input", "pdf_input", "fast"],
    minContext: 32000
  },
  "metis": {
    description: "Pre-planning consultant - analyzes requests for ambiguities (Opus class)",
    preferred: ["reasoning", "thinking", "large_context"],
    minContext: 128000
  },
  "momus": {
    description: "Expert reviewer - evaluates work plans against standards (GPT-5.2 class)",
    preferred: ["reasoning", "large_context"],
    minContext: 128000
  },
  "sisyphus-junior": {
    description: "Delegated task executor - focused specialist via category delegation (Sonnet class)",
    preferred: ["fast", "large_context"],
    minContext: 64000
  }
};

// Agent display priority order (high to low)
const AGENT_PRIORITY_ORDER = [
  "sisyphus",
  "atlas",
  "prometheus",
  "hephaestus",
  "oracle",
  "librarian",
  "metis",
  "momus",
  "explore",
  "multimodal-looker",
  "sisyphus-junior"
];

module.exports = {
  colors,
  CONFIG_DIR,
  CONFIG_FILE,
  BACKUP_DIR,
  CONFIGS_DIR,
  ACTIVE_CONFIG_FILE,
  CACHE_DIR,
  SECRETS_DIR,
  OPENCODE_CONFIG_FILE,
  DEFAULTS,
  AGENT_PROFILES,
  AGENT_PRIORITY_ORDER
};
