var CACHE_VER  = 'spbm1-v5.27p';
var CACHE_URLS = [
  './index.html','./css/styles.css?v=5.27','./js/config.js?v=5.27',
  './js/game.js?v=5.27','./js/operator.js?v=5.27','./js/progressive.js?v=5.27',
  './assets/scott_full.png','./assets/banner.jpg','./assets/splash.jpg',
  './assets/credits_addup.wav','./assets/red_spin_music.mp3',
  './assets/ring1.mp3','./assets/splash_welcome.wav'
];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE_VER).then(function(c){return c.addAll(CACHE_URLS);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k!==CACHE_VER)return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){if(e.request.url.indexOf('supabase.co')!==-1||e.request.url.indexOf('jsdelivr.net')!==-1)return;e.respondWith(caches.match(e.request).then(function(c){return c||fetch(e.request).catch(function(){return c;});}));});
