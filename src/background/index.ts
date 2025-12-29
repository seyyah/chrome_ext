console.log("Background Service Worker Initialized");

// Side Panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Message Relay: Content Script -> Background -> Side Panel
chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
    if (message.action === "incoming_message_from_page") {
        console.log("Relaying message from page:", message.text);

        // 1. Open Side Panel (Critical Fix)
        if (sender.tab?.id) {
            chrome.sidePanel.open({ tabId: sender.tab.id })
                .catch((err) => console.error("Failed to open panel:", err));
        }

        // 2. Buffer message for late-loading UI (Race Condition Fix)
        chrome.storage.local.set({ pendingMessage: message.text });

        // 3. Broadcast to Side Panel (Immediate delivery for already open panel)
        chrome.runtime.sendMessage({
            action: "relayed_message_from_page",
            text: message.text
        });
    }
});

// Legacy Support: External messages from page (using ID)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === "open_popup_with_data") {
        console.log("External request to open panel:", request.text);

        if (sender.tab?.id) {
            // Open Side Panel
            chrome.sidePanel.open({ tabId: sender.tab.id })
                .catch((err) => console.error("Failed to open panel (external):", err));

            // Broadcast relay
            chrome.runtime.sendMessage({
                action: "relayed_message_from_page",
                text: request.text
            });
        }
        sendResponse({ success: true });
    }
});
