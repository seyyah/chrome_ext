// Harici web sayfalarından veya diğer extensionlardan gelen mesajları dinler
let currentTargetTabId = null;

chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        console.log("Mesaj alındı (External):", request);

        if (request.action === "hello") {
            console.log("Hello action tetiklendi!");
            sendResponse({ result: "Merhaba! Mesajın alındı." });
        }

        if (request.action === "open_popup_with_data") {
            const messageText = request.text;
            console.log("Side Panel isteği geldi. Veri:", messageText);

            // 1. Tab ID'yi al ve sakla
            const tabId = sender.tab ? sender.tab.id : null;

            if (!tabId) {
                console.error("Tab ID bulunamadı, side panel açılamıyor.");
                return;
            }

            currentTargetTabId = tabId; // ID'yi sakla
            console.log("Hedef Tab ID ayarlandı:", currentTargetTabId);

            // 2. Mesajı listeye ekle
            chrome.storage.local.get(['messages'], function (result) {
                const messages = result.messages || [];
                messages.push({
                    text: messageText,
                    time: new Date().toLocaleTimeString(),
                    tabId: tabId
                });

                chrome.storage.local.set({ messages: messages });
            });

            // 3. Side Paneli Aç
            chrome.sidePanel.setOptions({
                tabId: tabId,
                path: 'sidepanel.html',
                enabled: true
            });

            if (chrome.sidePanel.open) {
                chrome.sidePanel.open({ tabId: tabId })
                    .catch(err => console.error("Side panel açılamadı:", err));
            }

            sendResponse({ result: "Mesaj panele eklendi." });
        }

        if (request.action === "close_side_panel") {
            const tabId = sender.tab ? sender.tab.id : null;
            if (tabId) {
                chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: false
                });
                sendResponse({ result: "Panel gizlendi/kapatıldı." });
            }
        }

        return true;
    }
);

// Side Panel'den (dahili) gelen mesajları dinle
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "send_reply_to_tab") {
        console.log("Side Panel'den cevap geldi, sayfaya iletiliyor:", request.text);

        if (currentTargetTabId) {
            chrome.tabs.sendMessage(currentTargetTabId, { action: "update_input", text: request.text })
                .then(() => sendResponse({ status: "success" }))
                .catch(err => {
                    console.error("Content Script'e ulaşılamadı:", err);
                    sendResponse({ status: "error", message: err.message });
                });
        } else {
            console.error("Hedef Tab ID yok!");
            sendResponse({ status: "error", message: "Hedef tab bulunamadı" });
        }
        return true;
    }
});

console.log("Hello World Extension Background Service Worker Yüklendi.");
