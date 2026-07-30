(function () {
  const INDEX_PATH = "encyclopedia/index.json";
  const LINK_CLASS = "ency-inline-link";

  const state = {
    loaded: false,
    index: [],
    terms: []
  };

  let scanTimer = null;

  async function ensureIndex() {
    if (state.loaded) return;
    try {
      const res = await fetch(INDEX_PATH);
      state.index = await res.json();
    } catch (_) {
      state.index = [];
    }
    state.terms = buildTerms(state.index);
    state.loaded = true;
  }

  function buildTerms(indexEntries) {
    const terms = [];
    (indexEntries || []).forEach((entry) => {
      const base = [entry.title].concat(Array.isArray(entry.aliases) ? entry.aliases : []);
      base.forEach((term) => {
        const value = String(term || "").trim();
        if (value.length < 4) return;
        terms.push({ id: entry.id, term: value, lower: value.toLowerCase() });
      });
    });

    return terms.sort((a, b) => b.term.length - a.term.length);
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function resolveId(raw) {
    const needle = normalize(raw);
    if (!needle) return null;

    const exact = state.index.find((entry) => normalize(entry.id) === needle || normalize(entry.title) === needle);
    if (exact) return exact.id;

    const alias = state.index.find((entry) => Array.isArray(entry.aliases) && entry.aliases.some((a) => normalize(a) === needle));
    if (alias) return alias.id;

    const partial = state.index.find((entry) => {
      if (normalize(entry.id).includes(needle) || needle.includes(normalize(entry.id))) return true;
      if (normalize(entry.title).includes(needle) || needle.includes(normalize(entry.title))) return true;
      return Array.isArray(entry.aliases) && entry.aliases.some((a) => normalize(a).includes(needle) || needle.includes(normalize(a)));
    });

    return partial ? partial.id : null;
  }

  function entryLabel(id) {
    const hit = state.index.find((entry) => entry.id === id);
    return hit ? hit.title : id;
  }

  function openEntry(id) {
    const target = `encyclopedia.html?entry=${encodeURIComponent(id)}`;
    window.location.href = target;
  }

  function attachBySelector(selector, extractor) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node.dataset.encyLinked === "1") return;
      const key = extractor(node);
      const id = resolveId(key);
      if (!id) return;

      node.dataset.encyLinked = "1";
      node.dataset.encyEntry = id;
      node.classList.add(LINK_CLASS);
      node.title = `Apri enciclopedia: ${entryLabel(id)}`;
      node.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEntry(id);
      });
    });
  }

  function scheduleRelink() {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => {
      linkPageElements();
    }, 120);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findBestMention(text) {
    const raw = String(text || "");
    const lower = raw.toLowerCase();
    let best = null;

    state.terms.forEach((item) => {
      const idx = lower.indexOf(item.lower);
      if (idx === -1) return;
      if (!best || idx < best.index || (idx === best.index && item.term.length > best.term.length)) {
        best = { id: item.id, index: idx, term: item.term };
      }
    });

    return best;
  }

  function linkifyAtlasMentions() {
    document.querySelectorAll(".atlas-ai-body p, .atlas-ai-body .atlas-resp-bullet > span:last-child").forEach((node) => {
      if (node.dataset.encyMentionLinked === "1") return;
      if (node.hasAttribute("data-enc-open")) return;
      if (node.closest("[data-enc-open]")) return;
      if (node.querySelector("[data-enc-open]")) return;
      if (node.childElementCount > 0) return;

      const text = node.textContent || "";
      const match = findBestMention(text);
      if (!match) {
        node.dataset.encyMentionLinked = "1";
        return;
      }

      const before = text.slice(0, match.index);
      const hit = text.slice(match.index, match.index + match.term.length);
      const after = text.slice(match.index + match.term.length);
      node.innerHTML = `${escapeHtml(before)}<span class="${LINK_CLASS}" data-enc-open="${match.id}">${escapeHtml(hit)}</span>${escapeHtml(after)}`;
      node.dataset.encyMentionLinked = "1";
    });
  }

  async function linkPageElements() {
    await ensureIndex();

    attachBySelector("#active-hatch-list strong", (node) => node.textContent);
    attachBySelector("#recommendation-grid strong", (node) => node.textContent);
    attachBySelector("#fly-catalog .fly-name", (node) => node.textContent);
    attachBySelector("#species-grid strong", (node) => node.textContent);
    attachBySelector(".trip-list strong", (node) => node.textContent);
    attachBySelector(".atlas-ai-body strong", (node) => node.textContent);
    attachBySelector(".atlas-ai-body em", (node) => node.textContent);
    attachBySelector("[data-enc-open]", (node) => node.getAttribute("data-enc-open"));

    linkifyAtlasMentions();

    // Summary/insetti lists without strong tag
    attachBySelector(".trip-list li", (node) => node.textContent.replace(/[🎣🪰🐟📍•\-]/g, " "));
  }

  window.TroutAtlasEncyclopedia = {
    ensureIndex,
    resolveId,
    openEntry,
    linkPageElements
  };

  window.addEventListener("DOMContentLoaded", () => {
    ensureIndex().then(() => {
      linkPageElements();

      const observer = new MutationObserver(() => scheduleRelink());
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    });
  });
})();
