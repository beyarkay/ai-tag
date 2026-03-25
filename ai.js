(function () {
  "use strict";

  const DEFAULTS = {
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini",
    apiKey: null,
    systemPrompt:
      "You are an HTML generator. Given a description, return ONLY the inner HTML content. No markdown fences, no explanation, just raw HTML.",
    loadingClass: "ai-loading",
    errorClass: "ai-error",
    doneClass: "ai-done",
  };

  // Resolve config: window.aiConfig > <meta> tags > defaults
  function getConfig() {
    const cfg = Object.assign({}, DEFAULTS, window.aiConfig || {});

    // Allow <meta name="ai:key" content="..."> overrides
    const metaMap = { apiKey: "ai:key", apiUrl: "ai:url", model: "ai:model" };
    for (const [prop, name] of Object.entries(metaMap)) {
      const el = document.querySelector(`meta[name="${name}"]`);
      if (el) cfg[prop] = el.getAttribute("content");
    }

    return cfg;
  }

  async function callLLM(prompt, cfg) {
    if (!cfg.apiKey) {
      throw new Error(
        "ai.js: No API key. Set window.aiConfig = { apiKey: '...' } or <meta name=\"ai:key\" content=\"...\">",
      );
    }

    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: cfg.systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ai.js: API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  async function processElement(el, prompt, cfg) {
    el.classList.add(cfg.loadingClass);

    try {
      const html = await callLLM(prompt, cfg);
      el.innerHTML = html;
      el.classList.remove(cfg.loadingClass);
      el.classList.add(cfg.doneClass);
      el.dispatchEvent(
        new CustomEvent("ai:done", { bubbles: true, detail: { prompt, html } }),
      );
    } catch (err) {
      el.classList.remove(cfg.loadingClass);
      el.classList.add(cfg.errorClass);
      el.setAttribute("data-ai-error", err.message);
      el.dispatchEvent(
        new CustomEvent("ai:error", {
          bubbles: true,
          detail: { prompt, error: err },
        }),
      );
      console.error(err);
    }
  }

  function run() {
    const cfg = getConfig();

    // 1. <ai>prompt</ai> custom elements
    document.querySelectorAll("ai").forEach((el) => {
      if (el.dataset.aiProcessed) return;
      el.dataset.aiProcessed = "true";
      const prompt = el.textContent.trim();
      if (prompt) processElement(el, prompt, cfg);
    });

    // 2. [ai="prompt"] attribute on any element
    document.querySelectorAll("[ai]").forEach((el) => {
      if (el.tagName.toLowerCase() === "ai") return; // already handled
      if (el.dataset.aiProcessed) return;
      el.dataset.aiProcessed = "true";
      const prompt = el.getAttribute("ai");
      if (prompt) processElement(el, prompt, cfg);
    });
  }

  // Observe DOM for dynamically added elements
  function observe() {
    const observer = new MutationObserver((mutations) => {
      let shouldRun = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (
            node.tagName?.toLowerCase() === "ai" ||
            node.hasAttribute?.("ai") ||
            node.querySelector?.("ai, [ai]")
          ) {
            shouldRun = true;
            break;
          }
        }
        if (shouldRun) break;
      }
      if (shouldRun) run();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // Public API
  window.AI = {
    run,
    process: processElement,
    getConfig,
    callLLM,
  };

  // Auto-run on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      run();
      observe();
    });
  } else {
    run();
    observe();
  }
})();
