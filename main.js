const root = document.documentElement;
const $ = (s) => document.querySelector(s), $$ = (s) => document.querySelectorAll(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let accent;

// Theme
const themeBtn = $('.theme-btn');
function setTheme(t, save) {
  root.dataset.theme = t;
  themeBtn.textContent = t === 'dark' ? '☀' : '☾';
  accent = getComputedStyle(root).getPropertyValue('--accent').trim();
  if (save) try { localStorage.setItem('theme', t); } catch (e) {}
}
setTheme(root.dataset.theme || 'light');
themeBtn.onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);

// Staggered reveal
const revealObs = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
}), { threshold: 0.1 });
$$('.fade-in').forEach((el) => {
  [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
  revealObs.observe(el);
});

// Scroll progress + back-to-top
const toTop = $('.to-top');
addEventListener('scroll', () => {
  root.style.setProperty('--p', scrollY / (root.scrollHeight - innerHeight || 1));
  toTop.classList.toggle('show', scrollY > 600);
}, { passive: true });
toTop.onclick = () => scrollTo({ top: 0 });

// Scrollspy
const navLinks = $$('.nav-links a');
const spy = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.hash === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
$$('section').forEach((s) => spy.observe(s));

// Typing effect
const words = ['persona AI memory', 'LLM memory & reasoning', 'knowledge graph QA', 'AI that feels human'];
const typed = $('.typed');
if (!reduced) {
  let w = 0, i = words[0].length, del = true;
  function type() {
    const s = words[w];
    typed.textContent = s.slice(0, i += del ? -1 : 1);
    let t = del ? 35 : 70;
    if (!del && i === s.length) { del = true; t = 1800; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; t = 300; }
    setTimeout(type, t);
  }
  setTimeout(type, 1800);
}

// Knowledge-graph canvas in hero
const cv = $('#graph'), ctx = cv.getContext('2d');
let W, H, nodes = [], mouse = { x: -1e4, y: -1e4 };
function resize() {
  const dpr = devicePixelRatio || 1;
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nodes = Array.from({ length: Math.round(W * H / 15000) }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
  }));
}
function line(a, b, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function frame() {
  if (!reduced) requestAnimationFrame(frame);
  if (scrollY > H) return;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = ctx.fillStyle = accent;
  for (const n of nodes) {
    n.x += n.vx; n.y += n.vy;
    if (n.x < 0 || n.x > W) n.vx *= -1;
    if (n.y < 0 || n.y > H) n.vy *= -1;
  }
  nodes.forEach((a, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(a.x - nodes[j].x, a.y - nodes[j].y);
      if (d < 120) line(a, nodes[j], (1 - d / 120) * 0.3);
    }
    const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
    if (dm < 170) line(a, mouse, (1 - dm / 170) * 0.6);
    ctx.globalAlpha = dm < 170 ? 0.9 : 0.5;
    ctx.beginPath(); ctx.arc(a.x, a.y, dm < 170 ? 2.6 : 1.8, 0, 7); ctx.fill();
  });
}
addEventListener('resize', resize);
addEventListener('pointermove', (e) => {
  const r = cv.getBoundingClientRect();
  mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
});
resize(); frame();

// Project filter + tilt
$$('.filter-btn').forEach((b) => b.onclick = () => {
  $('.filter-btn.active').classList.remove('active');
  b.classList.add('active');
  $$('.proj-card').forEach((c) => c.hidden = b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f);
});
$$('.proj-card').forEach((c) => {
  c.onpointermove = (e) => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    c.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
    c.style.setProperty('--mx', `${x * 100}%`);
    c.style.setProperty('--my', `${y * 100}%`);
  };
  c.onpointerleave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
});

// BibTeX toggle + copy to clipboard
$$('[data-toggle]').forEach((b) => b.onclick = () => $(b.dataset.toggle).classList.toggle('open'));
const toast = $('.toast');
$$('[data-copy], [data-copy-from]').forEach((b) => b.onclick = () => {
  const text = b.dataset.copy ?? $(b.dataset.copyFrom).textContent;
  navigator.clipboard.writeText(text).then(() => {
    toast.textContent = 'Copied to clipboard';
    toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toast.classList.remove('show'), 1600);
  });
});

// Live demo modal (iframe loads only while open)
const demo = $('.demo-modal'), demoFrame = demo.querySelector('iframe');
$$('[data-demo]').forEach((b) => b.onclick = () => { demoFrame.src = b.dataset.demo; demo.showModal(); });
demo.querySelector('.demo-close').onclick = () => demo.close();
demo.onclick = (e) => { if (e.target === demo) demo.close(); };
demo.onclose = () => { demoFrame.src = 'about:blank'; };
