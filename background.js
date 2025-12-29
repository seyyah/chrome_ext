// Harici web sayfalarından veya diğer extensionlardan gelen mesajları dinler
chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        console.log("Mesaj alındı:", request);

        if (request.action === "hello") {
            console.log("Hello action tetiklendi!");
            sendResponse({ result: "Merhaba! Mesajın alındı." });
        }

        if (request.action === "open_popup_with_data") {
            const messageText = request.text;
            console.log("Side Panel isteği geldi. Veri:", messageText);

            // 1. Tab ID'yi al (Mesajı gönderen tab)
            const tabId = sender.tab ? sender.tab.id : null;

            if (!tabId) {
                console.error("Tab ID bulunamadı, side panel açılamıyor.");
                return;
            }

            // 2. Mesajı listeye ekle
            chrome.storage.local.get(['messages'], function (result) {
                const messages = result.messages || [];
                messages.push({
                    text: messageText,
                    time: new Date().toLocaleTimeString(),
                    tabId: tabId
                });

                chrome.storage.local.set({ messages: messages }, function () {
                    console.log("Mesaj listeye eklendi.");
                });
            });

            // 3. Side Paneli Aç
            // Özel not: Side Panel'in açılması için kullanıcının extension'a izin vermiş olması gerekebilir.
            // setOptions({enabled: true}) yapmak panelin görünür olmasını sağlar.
            chrome.sidePanel.setOptions({
                tabId: tabId,
                path: 'sidepanel.html',
                enabled: true
            });

            // Side panel açma komutu (User gesture kısıtlaması olabilir, ancak deneyelim)
            // Chrome 116+ sonrası sidePanel.open destekleniyor.
            if (chrome.sidePanel.open) {
                chrome.sidePanel.open({ tabId: tabId })
                    .catch(err => console.error("Side panel açılamadı (gesture gerekli olabilir):", err));
            }

            sendResponse({ result: "Mesaj panele eklendi." });
        }

        if (request.action === "close_side_panel") {
            const tabId = sender.tab ? sender.tab.id : null;
            if (tabId) {
                // Paneli kapatmak için enabled: false yapıyoruz
                chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: false
                });
                sendResponse({ result: "Panel gizlendi/kapatıldı." });
            }
        }

        // Asenkron işlemler (storage, windows.create) olduğu için true dönmek önemli!
        return true;
    }
);

console.log("Hello World Extension Background Service Worker Yüklendi.");
