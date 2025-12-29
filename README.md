Minimalist Chrome eklentisi hazır! Dosyalar /home/seyyah/works/etc/chrome_ext dizininde oluşturuldu.

Eklentiyi yüklemek ve test etmek için 'Chrome Extension Kurulum ve Test Yönergeleri' dokümanını (walkthrough.md) inceleyebilirsiniz. Test için bir Python sunucusu başlatmanız gerekecek.

Özetle:

chrome://extensions -> Load unpacked
ID'yi kopyala.
python3 -m http.server 8000 ile sunucuyu başlat (çalışma dizininde).
http://localhost:8000/test_page.html adresine git ve ID ile test et.