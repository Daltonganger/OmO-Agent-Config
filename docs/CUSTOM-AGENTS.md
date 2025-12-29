# Custom Agent Creation - Future Feature

## Overview

Currently, OmO Agent Config manages model assignments for Oh My Opencode's built-in agents. This document outlines requirements for implementing full custom agent creation (user-defined agents with system prompts) in a future release.

## Current Limitation

When you add an agent via the tool, it creates:
```json
{
  "agents": {
    "my-custom-agent": {
      "model": "opencode/gpt-5.2"
    }
  }
}
```

**This agent won't work** because:
1. No `description` field (required by OpenCode)
2. No `prompt` field pointing to system prompt file
3. OpenCode doesn't know what this agent does or when to invoke it
4. No tool configuration, temperature, or behavior settings

## How OmO Agents Work

Oh My Opencode ships with complete agent definitions:
- **System prompts**: Pre-written instructions for each agent (oracle, librarian, etc.)
- **Descriptions**: When to use the agent (for primary agent to call as subagent)
- **Tool configurations**: Which tools are available
- **Behavior settings**: Temperature, max iterations, etc.

These are baked into the OmO plugin source code at: `node_modules/oh-my-opencode/src/agents/`

## Requirements for Custom Agent Support

### 1. Agent Configuration Structure

A complete agent needs (per OpenCode docs):

```json
{
  "agents": {
    "my-custom-agent": {
      "model": "opencode/gpt-5.2",
      "description": "What this agent does and when to use it (required)",
      "prompt": "relative/path/to/prompt.md",
      "temperature": 0,
      "maxSteps": 50,
      "tools": {
        "bash": true,
        "edit": true,
        "read": true,
        "search": false
      }
    }
  }
}
```

### 2. System Prompt File Management

Agents can be defined via:
- **JSON config** (in `opencode.json` or `oh-my-opencode.json`)
- **Markdown files** in `~/.config/opencode/agent/` or `.opencode/agent/`

For custom agents, we should:
- Create markdown files in `~/.config/opencode/agent/custom/`
- File structure:
  ```
  ~/.config/opencode/agent/custom/
  ├── my-agent.md
  └── another-agent.md
  ```

### 3. Prompt File Format

System prompt files should use markdown with optional frontmatter:

```markdown
---
description: "Strategic reasoning and complex problem solving"
model: "opencode/gpt-5.2"
temperature: 0
maxSteps: 50
---

# System Prompt for My Agent

You are a specialized agent focused on [specific task].

## Your Responsibilities
- [Responsibility 1]
- [Responsibility 2]

## Tools Available
- bash: Execute shell commands
- edit: Modify files
- read: Read file contents

## Behavior Guidelines
- [Guideline 1]
- [Guideline 2]
```

### 4. UI Flow for Custom Agent Creation

```
[A] Add new agent
  ↓
Enter agent name: "my-debugger"
  ↓
Agent Type Selection:
  1. Basic agent (model only - limited functionality)
  2. Full agent (with system prompt)
  ↓
[If Full agent selected]
  ↓
Enter description: "Debugging specialist for complex issues"
  ↓
System Prompt Options:
  1. Write prompt now (multi-line input)
  2. Use template (select from common patterns)
  3. Specify existing file path
  ↓
[Template selection if chosen]
Common templates:
  1. Research agent (like librarian)
  2. Specialist coder (like frontend-ui-ux-engineer)
  3. Analyzer (like oracle)
  4. Generic subagent
  ↓
Select model (with recommendations)
  ↓
Advanced Options? (yes/no)
  ├─ Temperature (0-1, default: 0)
  ├─ Max steps (default: 50)
  └─ Tool configuration
  ↓
Preview agent configuration
  ↓
Confirm creation
  ↓
✓ Created custom agent "my-debugger"
  - Config: ~/.config/opencode/oh-my-opencode.json
  - Prompt: ~/.config/opencode/agent/custom/my-debugger.md
```

### 5. Implementation Tasks

#### Phase 1: Basic Infrastructure
- [ ] Create prompt file manager class
- [ ] Add markdown file creation/editing utilities
- [ ] Implement prompt template system
- [ ] Add validation for agent configurations

#### Phase 2: UI Components
- [ ] Multi-line prompt editor (using external editor if available)
- [ ] Template selection menu
- [ ] Advanced options configuration
- [ ] Preview/review screen before creation

#### Phase 3: File Management
- [ ] Create `~/.config/opencode/agent/custom/` directory
- [ ] Generate markdown files with frontmatter
- [ ] Handle file naming conflicts
- [ ] Validate markdown syntax

#### Phase 4: Integration
- [ ] Update agent listing to show custom vs built-in agents
- [ ] Add "Edit agent prompt" option for custom agents
- [ ] Support agent deletion (remove both config and file)
- [ ] Add agent export/import with prompts

#### Phase 5: Documentation
- [ ] Agent creation guide in README
- [ ] Prompt writing best practices
- [ ] Template documentation
- [ ] Troubleshooting guide

### 6. Code Structure Changes

New files needed:
```
src/
├── prompt-manager.js          # Prompt file operations
├── agent-validator.js         # Validate agent configs
├── templates/
│   ├── research-agent.md
│   ├── specialist-coder.md
│   ├── analyzer.md
│   └── generic-subagent.md
└── utils/
    ├── markdown-parser.js     # Parse/generate markdown
    └── frontmatter.js         # Handle YAML frontmatter
```

Existing code modifications:
- `addAgent()`: Add custom agent wizard flow
- `editAgent()`: Support editing prompts for custom agents
- `deleteAgent()`: Clean up prompt files
- `displayAgentList()`: Differentiate custom/built-in agents

### 7. Validation Requirements

Before creating a custom agent, validate:
- ✓ Agent name is unique
- ✓ Description is provided (required by OpenCode)
- ✓ Model is valid and available
- ✓ System prompt is non-empty
- ✓ Tool configuration is valid (if provided)
- ✓ Temperature is between 0 and 1
- ✓ File path doesn't conflict with existing prompts

### 8. Template System

#### Template: Research Agent
```markdown
---
description: "Research and information retrieval specialist"
temperature: 0
---

You are a research specialist focused on finding and synthesizing information.

Your responsibilities:
- Search codebases efficiently
- Provide accurate, cited information
- Summarize findings clearly

Available tools: read, search, grep
```

#### Template: Specialist Coder
```markdown
---
description: "Specialized coding for [domain]"
temperature: 0
---

You are a coding specialist for [domain].

Your responsibilities:
- Write clean, maintainable code
- Follow best practices for [domain]
- Consider performance and UX

Available tools: bash, edit, read, search
```

#### Template: Analyzer
```markdown
---
description: "Code analysis and strategic planning"
temperature: 0
---

You are an analyst focused on understanding complex systems.

Your responsibilities:
- Analyze code architecture
- Identify patterns and issues
- Provide strategic recommendations

Available tools: read, search, grep (read-only)
```

### 9. External Editor Integration

For writing prompts, support external editors:
```javascript
async function editPromptInEditor(initialContent = '') {
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  const tempFile = path.join(os.tmpdir(), `agent-prompt-${Date.now()}.md`);
  
  fs.writeFileSync(tempFile, initialContent);
  
  execSync(`${editor} ${tempFile}`, { stdio: 'inherit' });
  
  const content = fs.readFileSync(tempFile, 'utf8');
  fs.unlinkSync(tempFile);
  
  return content;
}
```

### 10. Migration Path

When implementing custom agents:
1. Existing "add agent" functionality continues to work (basic agents)
2. Add new "Create custom agent" option with wizard
3. Show warning when creating basic agents: "This agent will have limited functionality. Create a full custom agent?"
4. Provide migration tool: convert basic → full custom agent

### 11. Testing Checklist

Before release:
- [ ] Create custom agent via UI
- [ ] Verify OpenCode recognizes the agent
- [ ] Test agent invocation (@mention and primary agent calls)
- [ ] Verify prompt file is created correctly
- [ ] Test editing existing custom agent
- [ ] Test deleting custom agent (both config and file)
- [ ] Validate all templates work
- [ ] Test export/import with custom agents
- [ ] Verify file permission handling
- [ ] Test with invalid inputs (validation)

### 12. Known Limitations

Custom agents created this way:
- Must be invoked manually or by primary agents (not automatic)
- Require understanding of agent system prompts
- Tool configuration requires OpenCode knowledge
- Won't have OmO plugin-specific features (hooks, MCP integration)

### 13. Documentation Needed

New docs:
- `docs/CUSTOM-AGENTS-GUIDE.md` - Step-by-step tutorial
- `docs/PROMPT-WRITING.md` - Best practices for agent prompts
- `docs/TEMPLATES.md` - Template reference
- Update `README.md` with custom agent examples

### 14. Future Enhancements

Beyond initial implementation:
- Prompt syntax validation
- Agent testing/preview mode
- Shared agent library (community prompts)
- Version control for prompts
- Agent performance metrics
- Prompt optimization suggestions

## References

- [OpenCode Agent Documentation](https://opencode.ai/docs/agents/)
- [Oh My Opencode GitHub](https://github.com/code-yeongyu/oh-my-opencode)
- [OpenCode Config Documentation](https://opencode.ai/docs/config/)

## Version Planning

Target for: **v0.4.0** or **v0.5.0** (after Option 1 release and user feedback)

Estimated effort: **Medium-High** (2-3 weeks development + testing)

Priority: **Low-Medium** - Nice to have, but current functionality serves primary use case
