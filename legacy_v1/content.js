// Sayfa yüklendiğinde çalışır
console.log("Chatbot Content Script Aktif!");

// Extension'dan (Side Panel'den) gelen mesajları dinle
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Extension'dan mesaj geldi:", request);

    if (request.action === "update_input") {
        const inputField = document.getElementById('customData');
        const statusDiv = document.getElementById('status');

        if (inputField) {
            // Mesajı input alanına yaz
            inputField.value = request.text;

            // Sayfanın algılaması için event tetikle
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));

            // Görsel efekt (Yanıp sönme veya border)
            inputField.style.backgroundColor = "#e8f0fe";
            setTimeout(() => {
                inputField.style.backgroundColor = "white";
            }, 500);

            if (statusDiv) {
                statusDiv.innerText = "Extension'dan yanıt geldi!";
                statusDiv.style.color = "green";
            }

            sendResponse({ status: "success" });
        } else {
            console.error("Hedef input alanı (customData) bulunamadı!");
            sendResponse({ status: "error", message: "Input alanı bulunamadı" });
        }
    }
});
