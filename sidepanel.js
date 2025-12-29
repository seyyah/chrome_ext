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
