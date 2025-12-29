document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['userText'], function (result) {
        if (result.userText) {
            document.getElementById('displayArea').innerText = result.userText;
        } else {
            document.getElementById('displayArea').innerText = "Veri yok.";
        }
    });
});
