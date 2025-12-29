function addMessageToUI(text, time) {
    const list = document.getElementById('messageList');

    // Empty state varsa kaldır
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const li = document.createElement('li');
    li.className = 'message-item';

    const textSpan = document.createElement('span');
    textSpan.innerText = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    timeSpan.innerText = time || new Date().toLocaleTimeString();

    li.appendChild(textSpan);
    li.appendChild(timeSpan);

    list.appendChild(li);
    window.scrollTo(0, document.body.scrollHeight);
}

function loadMessages() {
    chrome.storage.local.get(['messages'], function (result) {
        const list = document.getElementById('messageList');
        list.innerHTML = ''; // Temizle

        const messages = result.messages || [];

        if (messages.length === 0) {
            list.innerHTML = '<div class="empty-state">Henüz mesaj yok.</div>';
        } else {
            messages.forEach(msg => {
                addMessageToUI(msg.text, msg.time);
            });
        }
    });
    // Gönder butonu olay dinleyicisi
    const replyBtn = document.getElementById('replyBtn');
    const replyInput = document.getElementById('replyInput');

    if (replyBtn) {
        // Önceki listener'ı temizlemek için klonlama yöntemi veya sadece onclick atama
        replyBtn.onclick = async function () {
            const text = replyInput.value.trim();
            if (!text) return;

            // 1. UI'ya ekle
            const fullText = "Siz: " + text;
            addMessageToUI(fullText);

            // 2. Storage'a kaydet
            chrome.storage.local.get(['messages'], function (result) {
                const messages = result.messages || [];
                messages.push({
                    text: fullText,
                    time: new Date().toLocaleTimeString()
                });
                chrome.storage.local.set({ messages: messages });
            });

            // 3. Mesajı Background'a ilet (O da sayfaya iletecek)
            chrome.runtime.sendMessage({ action: "send_reply_to_tab", text: text }, function (response) {
                console.log("Mesaj iletim sonucu:", response);
            });

            replyInput.value = '';
        };
    }
}

// İlk yükleme
document.addEventListener('DOMContentLoaded', loadMessages);

// Storage değişimlerini dinle (yeni mesaj gelince anlık güncelleme için)
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.messages) {
        const newMessages = changes.messages.newValue;
        if (newMessages && newMessages.length > 0) {
            // Tüm listeyi yeniden yüklemek yerine sadece son mesajı da ekleyebilirdik,
            // ama basitlik için listeyi yeniliyoruz (veya sonuncuyu alıyoruz).
            loadMessages();
        }
    }
});
