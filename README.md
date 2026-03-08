# BioPharma Sentinel 🛡️ 

**BioPharma Sentinel** is a high-strategic intelligence platform for life sciences, built on the **Model Context Protocol (MCP)**. It transforms Claude into a sophisticated Pharma Analyst capable of real-time clinical trial audits, competitive landscape mapping, regulatory cross-referencing, and financial milestone correlation.

---

## 🌟 Capabilities & Tools (v2 Platform)
BioPharma Sentinel provides a comprehensive suite of 17 analytical tools.

### 1. The Pharma Olympics Framework 🏆
Rank companies by clinical and financial performance using dynamic benchmarks.
- `get_pharma_olympics`: Unified medal table for top-tier pharma companies.
- `get_leaderboard`: Real-time ranking of top 10 companies by therapeutic focus.
- `get_conversion_velocity`: "The Sprinter" - Phase 1 to Phase 3 speed.
- `get_pipeline`: "The Heavyweight" - Total active Phase 3 assets.
- `get_success_rates`: "The Sharpshooter" - Historical Phase 3 success probability.
- `get_market_impact`: "Volatility Gold" - Stock delta correlation with milestones (Alpha Vantage).

### 2. Market & Competitive Intelligence 📊
Discover white space and perform head-to-head analysis.
- `get_competitive_landscape`: Analyzes market crowding for specific medical conditions.
- `compare_companies`: Head-to-head competitive comparison across pipeline, velocity, and success metrics.
- `get_company_deep_dive`: Full 360° intelligence report on a single pharma company.

### 3. Comprehensive Trial Analytics 🔬
- `search_trials`: Advanced resilient search across ClinicalTrials.gov v2.
- `get_trial` & `get_trial_timeline`: Deep data and milestone extraction for specific trials.
- `get_geographic_intelligence`: Map geographic distribution, sites, and country footprints.
- `get_modality_breakdown`: Analyze therapeutic mix (Small Molecule, Biologic, Genetic, Device).
- `get_enrollment_intelligence`: Trial duration, site density, and participant velocity tracking.
- `get_endpoint_landscape`: Identify prevalent primary endpoints and outcome measures.
- `get_regulatory_landscape`: Cross-reference trial activity with FDA approval status (OpenFDA).

---

## 🛠 Advanced Architecture
- **Server-Side Mitigation**: Intelligent payload projection (`&fields=`) and auto-summarization reduce token consumption by **~90%**, eliminating context bloat.
- **Resilient Infrastructure**: Built-in 429 Rate Limiting handling via `p-limit` concurrency arrays and `fetchWithRetry` adapters.
- **Modular Handlers**: Extensible V2 architecture isolating endpoints cleanly in `src/handlers/`.

---

## 📥 Setup Guide

### 1. Installation
```bash
git clone https://github.com/renga92/clinicaltrials-mcp-server.git
cd clinicaltrials-mcp-server
pnpm install
pnpm run build
```

### 2. Environment Variables (.env)
```env
ALPHA_VANTAGE_API_KEY=your_key_here
MAX_PAGES=10
RATE_LIMIT_DELAY_MS=300
```

### 3. Configuration (Claude Desktop)
Add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "biopharma-sentinel": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/clinicaltrials-mcp-server/build/index.js"],
      "env": {
        "ALPHA_VANTAGE_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

---

## 🧪 Stability & Testing
The platform maintains a professional-grade stability suite utilizing Test-Driven Development (TDD). 
Run tests via `pnpm test`. Coverage includes core optimizations, parameter resiliency, and integrated live API fallback testing.

## 📖 Example Strategic Queries
Ask Claude:
- *"Who is winning the Pharma Olympics for GLP-1 velocity?"*
- *"Analyze the competitive landscape for NASH and find white space."*
- *"Audit the Phase 3 success rates for Eli Lilly vs Novo Nordisk."*
- *"Give me a deep dive on Moderna's modality breakdown and pipeline."*
