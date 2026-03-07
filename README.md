# ClinicalTrials.gov MCP Server

A professional-grade "bridge" between the **Claude AI** and individual clinical trial data. This server uses the **Model Context Protocol (MCP)** to allow Claude to search, read, and interpret live data from ClinicalTrials.gov.

---

## 🌟 What is an MCP Server?

Imagine Claude is a very smart researcher, but they are locked in a room with books from 2023. They don't know what happened yesterday. 

The **Model Context Protocol (MCP)** is like a secure window we open for Claude. This specific "window" (this server) lets Claude look directly at the live databases of **ClinicalTrials.gov**. It allows the AI to:
1. **Search** for active studies.
2. **Read** full trial details (NCT records).
3. **Understand** the complex data structure of the medical registry.

---

## 🛠 Technical Design: How it Works

The design is split into three core capabilities that make the AI smarter and more reliable.

### 1. The "Toolbox" (Tools)
Tools are **actions** Claude can take. 
- `search_trials`: Allows Claude to find trials by condition (e.g., "Parkinsons") and status (e.g., "Recruiting").
- `get_trial`: Allows Claude to pull the full technical record for a specific trial using its ID (NCT number).

### 2. The "Knowledge Map" (Resources)
Resources are **reference materials** Claude can look at anytime. 
- Instead of Claude guessing how the data is structured, we provide a **Data Schema**. This is a map that explains exactly what fields (like "eligibility criteria" or "outcome measures") exist in a trial record.

### 3. The "Cheat Sheet" (Prompts)
Prompts are **expert templates**. 
- Interpreting medical data is hard. We've built an `interpret_trial` prompt that explicitly tells Claude how to translate technical medical jargon into "Patient-Friendly" language.

---

## 🚀 What makes this "Optimized"?

If you are explaining this in an interview, here are the technical decisions we made to make it state-of-the-art:

*   **Type Safety (Zod)**: We use a library called `Zod` to validate every request Claude makes. If Claude tries to send a "broken" request, the server catches it immediately. This prevents the AI from "hallucinating" or crashing.
*   **Modern API v2**: The US government updated their systems in late 2024. This server uses the **API v2 (OpenAPI 3.0)** standard, making it faster and more accurate than older tools.
*   **Asynchronous Processing**: The server uses modern JavaScript "Async/Await" logic, meaning it can wait for the government database to respond without freezing the rest of the application.

---

## 📥 Setup Guide

### 1. Prerequisites
- **Node.js** (v18 or higher) installed on your computer.
- **Claude Desktop** app.

### 2. Installation
Open your terminal and run:
```bash
git clone [YOUR_REPO_URL]
cd clinicaltrials-mcp-server
npm install
npm run build
```

### 3. Adding to Claude
1. Open your Claude Desktop settings (typically found at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS).
2. Add this server to the `mcpServers` list:
```json
{
  "mcpServers": {
    "clinicaltrials": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/clinicaltrials-mcp-server/build/index.js"]
    }
  }
}
```
3. Restart Claude Desktop. You will see a 🔌 icon showing the server is connected!

---

## 📖 Example Use Cases

Once connected, you can ask Claude:
- *"Find me recruiting Phase 3 trials for Type 2 Diabetes in New York."*
- *"Explain the NCT01234567 trial to me like I'm a patient."*
- *"What is the primary outcome measure for the newest Alzheimer's study?"*
