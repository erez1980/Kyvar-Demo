// GitHub Pages serves index.html for both / and /index.html (and the same
// for /insights/). A static meta refresh in that file would reload the
// directory URL forever. Refresh only when the address bar says index.html.
(function () {
  var path = location.pathname;
  if (!/\/index\.html$/i.test(path)) return;
  var dest = path.replace(/index\.html$/i, '') + location.search + location.hash;
  var meta = document.createElement('meta');
  meta.httpEquiv = 'refresh';
  meta.content = '0;url=' + dest;
  (document.head || document.documentElement).appendChild(meta);
  location.replace(dest);
})();
// Applies the visitor's stored theme choice before first paint
try{var t=localStorage.getItem('kyvar-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}
