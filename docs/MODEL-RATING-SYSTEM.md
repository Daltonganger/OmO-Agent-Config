# Model Rating System Analysis

> Investigation of how OmO-Agent-Config rates/recommends models for agents

## Overview

OmO-Agent-Config uses a sophisticated scoring system to recommend models for each agent based on their capabilities and the agent's requirements.

## Current Scoring System

### Location
- **Primary**: `lib/model-loader.js` (lines 131-211)
- **Profiles**: `lib/constants.js` - `AGENT_PROFILES` object

### How It Works

The `scoreModel()` function calculates a score (0-100+) for each model based on:

#### 1. Context Window (minContext from AGENT_PROFILES)
- Base: +10 points if meets minimum context
- Bonus: Up to +10 additional points for context 4x above minimum
- Penalty: Up to -20 points for insufficient context

#### 2. Preferred Capabilities (from AGENT_PROFILES.preferred)

| Capability | Points | Detection Method |
|------------|--------|------------------|
| `reasoning` | +15 | Model has reasoning capability |
| `thinking` | +12/+10 | Extended thinking mode |
| `large_context` | +4 to +12 | Based on context size tiers |
| `multimodal` | +10 to +15 | Image/PDF input support |
| `fast` | +10 | Fast/cheap model detection |

#### 3. Provider Preferences
- +5 points per position in preference list

### Current Agent Profiles (11 agents)

All agents are defined in `lib/constants.js` with their preferred capabilities and minimum context requirements.

## Key Findings

### 1. Missing Scoring Logic
The `hephaestus` agent has `deep_work` in preferred capabilities, but there's NO scoring logic for it in `scoreModel()`.

### 2. Extensible Architecture
The scoring system uses a switch statement that makes it easy to add new capabilities.

### 3. Auto-Discovery
Models are automatically loaded from OpenCode - no manual registration needed.

## How to Add New Models

### Method 1: Update Defaults
Edit `lib/constants.js` DEFAULTS object to set new default models for agents.

### Method 2: Add New Capability
1. Add capability to AGENT_PROFILES.preferred array
2. Add scoring logic in scoreModel() switch statement

### Method 3: Provider Preference
Users can set preferred_providers in their config for bonus scoring.

## Recommendations

1. **Add missing `deep_work` scoring** for hephaestus agent
2. **Add cost-aware scoring** for budget-conscious recommendations  
3. **Add model version detection** to prefer newer models
4. **Document the scoring system** for power users

## Files Analyzed

- `lib/model-loader.js` - Core scoring logic
- `lib/constants.js` - Agent profiles and defaults
- `lib/ui/menus.js` - UI integration

---

*This document was generated as part of investigating the model rating system*
