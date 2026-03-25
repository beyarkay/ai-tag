# `<ai>build a $1B website. no misakes<ai>` — HTML that writes itself

> **This is a joke. Please don't actually use this.** But it does work.

A tiny (~2KB) JavaScript library that lets you use LLMs directly in HTML. Describe what you want, and the AI fills it in.

```html
<ai>A navigation bar with links to Home, About, and Contact</ai>
```

or

```html
<div ai="A pricing table with three tiers"></div>
```

## Quick Start

```html
<!DOCTYPE html>
<html>
  <head>
    <meta name="ai:key" content="your-openrouter-api-key" />
  </head>
  <body>
    <ai>A hero section with a gradient background and a call to action</ai>

    <script src="https://raw.githubusercontent.com/your-user/ai-tag/main/ai.js"></script>
  </body>
</html>
```

## How It Works

1. Include `ai.js` via a `<script>` tag
2. The script scans for `<ai>` elements and any element with an `[ai]` attribute
3. The text content (for `<ai>`) or attribute value (for `[ai]`) is sent as a prompt to an LLM via [OpenRouter](https://openrouter.ai)
4. The response HTML replaces the element's `innerHTML`
5. A `MutationObserver` watches for dynamically added elements, so it works with SPAs and dynamic content

## Configuration

### Option 1: Meta tags

```html
<meta name="ai:key" content="your-openrouter-key" />
<meta name="ai:model" content="anthropic/claude-sonnet-4" />
<meta name="ai:url" content="https://openrouter.ai/api/v1/chat/completions" />
```

### Option 2: JavaScript (before loading ai.js)

```html
<script>
  window.aiConfig = {
    apiKey: "your-openrouter-key",
    model: "openai/gpt-4o-mini", // any OpenRouter model
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    systemPrompt: "You are an HTML generator. Return only raw HTML.",
    loadingClass: "ai-loading", // added while loading
    errorClass: "ai-error", // added on error
    doneClass: "ai-done", // added on success
  };
</script>
```

### Defaults

| Setting        | Default                                         |
| -------------- | ----------------------------------------------- |
| `apiUrl`       | `https://openrouter.ai/api/v1/chat/completions` |
| `model`        | `openai/gpt-4o-mini`                            |
| `loadingClass` | `ai-loading`                                    |
| `errorClass`   | `ai-error`                                      |
| `doneClass`    | `ai-done`                                       |

## Usage

### `<ai>` tag

The element's text content becomes the prompt:

```html
<ai>A red button that says "Subscribe"</ai>
```

### `[ai]` attribute

The attribute value becomes the prompt. Works on any element:

```html
<nav ai="A horizontal nav bar with 5 links"></nav>
<ul ai="A list of the 10 largest countries by population"></ul>
<table ai="A comparison of React vs Vue vs Svelte"></table>
```

### Dynamic elements

Elements added after page load are automatically processed:

```javascript
const el = document.createElement("ai");
el.textContent = "A loading spinner animation";
document.body.appendChild(el);
// ai.js picks this up automatically via MutationObserver
```

## Events

Each element dispatches events you can listen to:

```javascript
// Success
document.addEventListener("ai:done", (e) => {
  console.log("Prompt:", e.detail.prompt);
  console.log("Generated HTML:", e.detail.html);
});

// Error
document.addEventListener("ai:error", (e) => {
  console.log("Prompt:", e.detail.prompt);
  console.log("Error:", e.detail.error.message);
});
```

## CSS Classes

Style the loading/error/done states:

```css
.ai-loading {
  opacity: 0.5;
  background: #f0f0f0;
}

.ai-error {
  border: 2px solid red;
}

.ai-done {
  animation: fadeIn 0.3s ease-in;
}
```

## JavaScript API

```javascript
// Re-scan the DOM for unprocessed elements
AI.run();

// Manually process a specific element
AI.process(element, "your prompt", AI.getConfig());

// Get current config
AI.getConfig();

// Call the LLM directly
const html = await AI.callLLM("A blue button", AI.getConfig());
```

## Examples

See the `examples/` directory:

- **[basic.html](examples/basic.html)** — `<ai>` tags and `[ai]` attributes
- **[dynamic.html](examples/dynamic.html)** — Dynamically adding elements with buttons
- **[events.html](examples/events.html)** — Listening to `ai:done` and `ai:error`
- **[config.html](examples/config.html)** — Different configuration methods

## Tests

Open `tests/test.html` in a browser. All tests run client-side with a mocked fetch — no API key needed.

## Security Note

Your API key is visible in the page source. This is fine for:

- Local development
- Prototyping
- Internal tools

For production, proxy the requests through your own backend to keep the key secret.

## License

MIT
