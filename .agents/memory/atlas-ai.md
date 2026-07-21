---
name: ATLAS AI architecture
description: Rule-based fishing AI assistant. Provider interface is ready for OpenAI swap without UI changes.
---

## Files
- `atlas.html` — standalone page, 6-item nav, `atlas-body` flex layout for full-height chat
- `atlas.js` — ~950 lines, 6 modules (§0–§6)
- CSS at end of `style.css` (after line ~585, section "ATLAS AI — Chat Interface")

## Module structure
```
§0 State          — _rivers[], _sending flag
§1 AtlasDB        — loads database.json, findByName() with alias map (Scopello→Sesia, lis→lys)
§2 AtlasContext   — builds {season, period, lastRiver, weather} from Date + localStorage
§3 AtlasMemory    — localStorage key "atlas_history", max 30 messages, lastMentionedRiver()
§4 LocalProvider  — respond(msg, ctx, history) → Promise<string> — rule-based engine
§5 AtlasUI        — addMessage(), addLoading(), sendMessage(), initUI(), window.copyMsg/newQuestion
§6 Init           — await AtlasDB.load(); initUI();
```

## Provider interface (for OpenAI swap)
```js
// Drop-in replacement for LocalProvider:
const OpenAIProvider = {
  async respond(msg, ctx, history) {
    const systemPrompt = buildSystemPrompt(ctx);  // inject season/river/conditions
    // call OpenAI API here
    return text;
  }
};
// In §6 Init: swap LocalProvider → OpenAIProvider
```

## Context flow
- `river.js` stores `localStorage.setItem("atlas_last_river", river.id)` on every river page load
- `AtlasContext.build()` reads this + tries to find cached weather (key: `intel_wx_` + btoa(url))
- `AtlasMemory.lastMentionedRiver(history)` extracts river from conversation when none in current msg

## Intent detection keywords (detectIntent)
saluto | dove_pescare | tecnica_mosca | tecnica_spinning | condizioni | orario | trote_habitat | spiegazione | regolamenti | attrezzatura | meteo | followup | generico

## SEASON_DATA structure
Each season has: label, months, mosca[], secca[], ninfa[], streamer[], condizioni, best_rivers[], advice

## Navigation
- All 7 HTML files have 6-item nav (Torrenti, Trote, Nodi, Negozi, Mappa, Atlas AI)
- `.bottom-nav` has `overflow-x: auto; scrollbar-width: none` for scroll on narrow screens
- `.bnav-item` has `min-width: 54px; flex-shrink: 0`
- Label shortened: "Nodi & Mosche" → "Nodi", "La tua mappa" → "Mappa" to fit 6 items

## SW cache
Currently `troutatlas-v12` — atlas.html and atlas.js added to SHELL precache list.

**Why rule-based first:** spec explicitly requests simulated/temporary provider for v1 with architecture ready for real AI. LocalProvider reads real seasonal data (July = Estate) and live river data from database.json, so responses are contextually accurate even without an LLM.
