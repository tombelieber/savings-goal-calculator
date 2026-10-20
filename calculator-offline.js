(function(){
 'use strict';
 const status=document.getElementById('offline-status');
 if(location.protocol==='file:'){
  status.textContent='離線檔案使用中；設定只存呢個瀏覽器／檔案位置。';
  document.getElementById('download-offline').hidden=true;return;
 }
 if(!('serviceWorker' in navigator)){status.textContent='可下載單一 HTML 離線使用；此瀏覽器未支援離線快取。';return;}
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready).then(()=>{
  status.textContent='已備妥離線使用；首次開啟及下載網站檔案需要網絡。';
 }).catch(()=>{status.textContent='可下載離線版；目前未能建立離線快取。';});
})();
