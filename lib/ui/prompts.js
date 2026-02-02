const readline = require('readline');
const { colors, AGENT_PROFILES } = require('../constants');
const { hasExtendedThinking, isFastModel } = require('../model-loader');

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function formatModel(model, showScore = false, score = 0) {
  const ctx = model.limit?.context ? `${Math.floor(model.limit.context / 1000)}K` : '?';
  const caps = [];
  
  if (model.capabilities?.reasoning || hasExtendedThinking(model)) caps.push('R');
  if (hasExtendedThinking(model)) caps.push('T');
  if (model.capabilities?.input?.image) caps.push('I');
  if (model.capabilities?.input?.pdf) caps.push('P');
  if (isFastModel(model)) caps.push('F');
  
  const capsStr = caps.length > 0 ? `[${caps.join('')}]` : '';
  const provider = model.providerID || model.id.split('/')[0];
  const providerStr = `${colors.cyan}${provider}${colors.reset}`;
  const displayScore = Math.max(0, score);
  const scoreStr = showScore ? ` ${colors.dim}(score: ${displayScore})${colors.reset}` : '';
  
  return `${model.name || model.id} (${ctx}${capsStr}) ${providerStr}${scoreStr}`;
}

function showAgentInfo(rl, prompt) {
  return async function() {
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
    
    await prompt('Press Enter to continue...');
  };
}

module.exports = {
  createReadlineInterface,
  prompt,
  formatModel,
  showAgentInfo
};
