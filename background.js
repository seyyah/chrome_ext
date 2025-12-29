// Harici web sayfalarından veya diğer extensionlardan gelen mesajları dinler
chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        console.log("Mesaj alındı:", request);

        if (request.action === "hello") {
            console.log("Hello action tetiklendi!");
            sendResponse({ result: "Merhaba! Mesajın alındı." });
        }

        if (request.action === "open_popup_with_data") {
            console.log("Pencere açma isteği geldi. Veri:", request.text);

            // 1. Veriyi kaydet
            chrome.storage.local.set({ userText: request.text }, function () {
                console.log("Veri kaydedildi.");

                // 2. Pencereyi aç
                chrome.windows.create({
                    url: chrome.runtime.getURL("popup.html"),
                    type: "popup",
                    width: 300,
                    height: 200
                });
            });

            sendResponse({ result: "Pencere açılıyor..." });
        }

        // Asenkron işlemler (storage, windows.create) olduğu için true dönmek önemli!
        return true;
    }
);

console.log("Hello World Extension Background Service Worker Yüklendi.");
