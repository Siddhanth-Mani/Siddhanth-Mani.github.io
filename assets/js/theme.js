/* Apply the saved light/dark choice before the page paints (avoids a flash). */
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) { /* storage blocked: follow the system setting */ }

/* Clickjacking guard: GitHub Pages can't send a frame-blocking header,
   so refuse to render inside another site's frame. */
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) { /* sandboxed frame: page stays hidden */ }
}

/* One public address: visitors on the github.io copy go to the real domain. */
if (/\.github\.io$/.test(location.hostname)) location.replace('https://siddhanth.ryzn.pro' + location.pathname + location.search + location.hash);
