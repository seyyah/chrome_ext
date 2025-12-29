import type { AgentAction } from '../types';

console.log("AIPex Content Script Loaded");

// Helper to get simplified page context
function getPageContext() {
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, [role="button"]');
    const context = Array.from(interactiveElements)
        .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
        })
        .map((el, index) => {
            const element = el as HTMLElement;
            const rect = element.getBoundingClientRect();

            // Calculate Position (3x3 Grid)
            const viewW = window.innerWidth;
            const viewH = window.innerHeight;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let posX = "center";
            if (centerX < viewW / 3) posX = "left";
            else if (centerX > (viewW * 2) / 3) posX = "right";

            let posY = "center";
            if (centerY < viewH / 3) posY = "top";
            else if (centerY > (viewH * 2) / 3) posY = "bottom";

            const position = `${posY}-${posX}`; // e.g. bottom-right

            // Add a temporary unique attribute to Reference it easily
            const tempId = `ai-ref-${index}`;
            element.setAttribute('data-ai-id', tempId);

            let text = element.innerText.slice(0, 50).replace(/\s+/g, ' ').trim();
            if (!text && element instanceof HTMLInputElement) text = element.placeholder;
            if (!text) text = element.getAttribute('aria-label') || '';

            // Get Computed Visuals for ID resolution
            const compStyle = window.getComputedStyle(element);
            const visuals = `bg:${compStyle.backgroundColor}|col:${compStyle.color}`;

            return `[${index}] <${element.tagName.toLowerCase()} id="${element.id}" class="${element.className}" ai-ref="${tempId}" visuals="${visuals}" pos="${position}">${text}</${element.tagName.toLowerCase()}>`;
        }).join('\n');

    return `Page Title: ${document.title}\nURL: ${window.location.href}\n\nInteractive Elements:\n${context}`;
}

// Mesaj dinleyici (Executor)
chrome.runtime.onMessage.addListener((message: { action: string, data?: AgentAction }, _sender, sendResponse) => {
    if (message.action === "get_page_context") {
        const context = getPageContext();
        sendResponse({ context });
    }
    else if (message.action === "execute_agent_action" && message.data) {
        const { action, selector, value } = message.data;
        console.log("Executing Action:", message.data);

        try {
            if (action === "click" && selector) {
                let el: HTMLElement | null = null;
                try {
                    el = document.querySelector(selector) as HTMLElement;
                } catch (e) { /* ignore invalid selector */ }

                // Fallback: If not found or invalid, try constructing a data-ai-id selector
                if (!el && !selector.includes('[')) {
                    try {
                        // Safe quote handling
                        const safeSelector = selector.replace(/"/g, '\\"');
                        el = document.querySelector(`[data-ai-id="${safeSelector}"]`) as HTMLElement;
                    } catch (e) { /* ignore */ }
                }

                // Helper to simulate full click sequence
                function simulateClick(element: HTMLElement) {
                    // Visual Feedback
                    const originalBorder = element.style.outline;
                    element.style.outline = "2px solid red";
                    setTimeout(() => { element.style.outline = originalBorder; }, 1000);

                    const options = { bubbles: true, cancelable: true, view: window };
                    element.dispatchEvent(new MouseEvent('mousedown', options));
                    element.dispatchEvent(new MouseEvent('mouseup', options));
                    element.click();
                }

                if (el) {
                    simulateClick(el);
                    // Bazı elementler focus ister
                    el.focus();
                    sendResponse({ success: true, message: `Clicked ${selector}` });
                } else {
                    throw new Error(`Element not found: ${selector}`);
                }
            }
            else if (action === "type" && selector && value) {
                let el: HTMLInputElement | null = null;
                try {
                    el = document.querySelector(selector) as HTMLInputElement;
                } catch (e) { /* ignore */ }

                if (!el && !selector.includes('[')) {
                    try {
                        const safeSelector = selector.replace(/"/g, '\\"');
                        el = document.querySelector(`[data-ai-id="${safeSelector}"]`) as HTMLInputElement;
                    } catch (e) { /* ignore */ }
                }

                if (el) {
                    el.focus();
                    el.value = value;
                    // React/Framework eventlerini tetikle
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    sendResponse({ success: true, message: `Typed "${value}" into ${selector}` });
                } else {
                    throw new Error(`Element not found: ${selector}`);
                }
            }
            else if (action === "scroll") {
                window.scrollBy({ top: 500, behavior: 'smooth' });
                sendResponse({ success: true, message: "Scrolled down" });
            }
            else if (action === "navigate" && value) {
                window.location.href = value;
                sendResponse({ success: true, message: `Navigating to ${value}` });
            }
            else {
                sendResponse({ success: true, message: "No action performed or missing parameters" });
            }

        } catch (error: any) {
            console.error("Executor Error:", error);
            // Extract detailed error info
            const msg = error.message || error.toString();
            const name = error.name || "Error";
            sendResponse({ success: false, error: `${name}: ${msg}` });
        }

        return true; // Asenkron yanıt için
    }
});
