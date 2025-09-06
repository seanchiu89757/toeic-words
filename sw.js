// Service Worker - 離線支援
const CACHE_NAME = 'toeic-words-v1';
const urlsToCache = [
  '/',
  '/index-mobile.html',
  '/learn.html',
  '/admin.html',
  '/css/style.css',
  '/js/app.js',
  '/js/database.js',
  '/js/speech.js',
  '/js/local-generator.js'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果有快取就返回快取
        if (response) {
          return response;
        }
        
        // 否則嘗試網路請求
        return fetch(event.request).then(response => {
          // 檢查是否為有效回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 複製回應並加入快取
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // 離線時返回離線頁面
        return new Response('離線模式 - 請確保已載入資料', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});