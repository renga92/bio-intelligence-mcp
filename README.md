# BioPharma Sentinel 🛡️ (Pharma Olympics 🏆)

**BioPharma Sentinel** is a high-strategic intelligence platform for life sciences, built on the **Model Context Protocol (MCP)**. It transforms Claude into a sophisticated Pharma Analyst capable of real-time clinical trial audits, competitive landscape mapping, and financial milestone correlation.

---

## 🌟 The Pharma Olympics Framework
The server introduces the **Pharma Olympics**, a suite of tools designed to rank companies by clinical and financial performance using 2026 industry benchmarks.

| Metric | Tool | Description |
| :--- | :--- | :--- |
| **Success Velocity** | `get_conversion_velocity` | "The Sprinter" - Phase 1 to Phase 3 speed. |
| **Pipeline Breadth** | `get_pipeline` | "The Heavyweight" - Total active Phase 3 assets. |
| **PoS Precision** | `get_success_rates` | "The Sharpshooter" - Historical Phase 3 success probability. |
| **Market Impact** | `get_market_impact` | "Volatility Gold" - Stock delta correlation with milestones. |
| **Unified Ranking** | `get_pharma_olympics` | The official medal table for top-tier pharma companies. |

---

## 🛠 Advanced Features (2026 Edition)

### 1. Context Optimization & Anti-Bloat
- **Server-Side Summarization**: Automatically extracts high-signal fields (`nctId`, `status`, `sponsor`, `phase`) from massive ClinicalTrials.gov JSON blocks. This reduces token consumption by **~90%**, allowing Claude to process hundreds of trials in a single conversation without context overflow.
- **Robust Querying**: Optimized for drug-based searches (e.g., "Semaglutide", "Tirzepatide") using resilient API v2 parameters.

### 2. High-Strategic Tools
- `get_competitive_landscape`: Analyzes "white space" and market crowding for specific medical conditions.
- `get_leaderboard`: Real-time ranking of top 10 companies by therapeutic focus (e.g., "GLP-1 Leaderboard").

### 3. Agentic Workflow Support
Designed for Anthropic's **Orchestrator-Worker** and **Evaluator-Optimizer** patterns. The server supports bidirectional data flow, allowing Claude to "Expert-Audit" success rates using advanced reasoning.

---

## 🧪 Stability & Testing
The platform maintains a professional-grade stability suite with **>80% Code Coverage**.

```bash
pnpm test
```
The tests verify:
- **Resilient Parameters**: Switching from `query.cond` to `query.term` to fix "Bad Request" errors.
- **Aggregation Logic**: Accurate counting of pipeline assets across therapeutic areas.
- **Error Handling**: capturing 400/500 API errors with detailed context.

---

## 📥 Setup Guide

### 1. Installation
```bash
git clone https://github.com/renga92/clinicaltrials-mcp-server.git
cd clinicaltrials-mcp-server
pnpm install
pnpm run build
```

### 2. Configuration (Claude Desktop)
Add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "biopharma-sentinel": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/clinicaltrials-mcp-server/build/index.js"]
    }
  }
}
```

---

## 📖 Example Strategic Queries
Ask Claude:
- *"Who is winning the Pharma Olympics for GLP-1 velocity?"*
- *"Analyze the competitive landscape for NASH and find white space."*
- *"Audit the Phase 3 success rates for Eli Lilly vs Novo Nordisk."*
- *"Find all Phase 3 trials for Tirzepatide and summarize the market impact."*

---
© 2026 BioPharma Sentinel. Part of the Advanced Pharma Intelligence Suite.
