// Harici web sayfalarından veya diğer extensionlardan gelen mesajları dinler
chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        console.log("Mesaj alındı:", request);

        if (request.action === "hello") {
            console.log("Hello action tetiklendi!");
            sendResponse({ result: "Merhaba! Mesajın alındı." });
        }

        // Asenkron yanıt döneceksek true return etmeliyiz, şu an senkron yanıt yeterli.
        // return true; 
    }
);

console.log("Hello World Extension Background Service Worker Yüklendi.");
