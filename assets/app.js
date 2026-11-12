/* Malaz Portfolio — public site (home + campaign pages) */
(function () {
  const M = window.MZ, E = M.esc;
  const { data, draft } = M.loadData();
  const agency = Object.assign({ name: "ملاذ", site: "https://malaz-sa.com", slogan: "ملاذك الآمن حين كثرت مشاكل التسويق", influencersPool: "+5000" }, data.agency || {});
  const camps = (data.campaigns || []).filter(c => !c.hidden);
  const app = document.getElementById("app");

  /* ---------- icons ---------- */
  const IC = {
    vol: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    mute: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>',
    exp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    out: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c766c" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
  };
  const pfBadges = arr => (arr || []).map(p => `<span class="pf pf-${E(p)}">${E(p)}</span>`).join("");
  const initial = s => (String(s || "?").replace(/[^A-Za-z0-9؀-ۿ]/g, "")[0] || "?").toUpperCase();
  const logoHTML = c => {
    const src = M.safeUrl(c.logo);
    return src ? `<div class="blogo"><img src="${E(src)}" alt="${E(c.brand)}"></div>`
               : `<div class="blogo ph"><span>${E(initial(c.brand))}</span></div>`;
  };
  const toast = msg => {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0b0b0b;color:#fff;padding:10px 18px;border-radius:99px;font-size:14px;z-index:200;transition:.3s;opacity:0"; document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, 1800);
  };

  /* ================= PLAYERS ================= */
  const players = new Map(); // el -> player
  let io = null;
  const TT_BASE = "https://www.tiktok.com/player/v1/";
  const ttParams = full => full
    ? "?autoplay=1&loop=1&rel=0&music_info=0&description=0&native_context_menu=0&closed_caption=0"
    : "?autoplay=1&loop=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0";

  function sourceOf(c) {
    const v = M.safeUrl(c.video);
    if (v) return { kind: "mp4", src: v };
    const L = c.link;
    if (L.platform === "TikTok" && L.id) return { kind: "tt", id: L.id };
    if (L.platform === "Instagram" && L.id) return { kind: "ig", id: L.id };
    if (L.platform === "YouTube" && L.id) return { kind: "yt", id: L.id };
    return { kind: "none" };
  }

  function mediaHTML(c, no, full) {
    const s = sourceOf(c);
    const src = c.link.platform && c.link.platform !== "Link" ? `<span class="pf pf-${E(c.link.platform)}">${E(c.link.platform)}</span>` : (s.kind === "mp4" ? '<span class="badge dark">مقطع من الفيديو</span>' : "");
    const canSound = s.kind === "mp4" || s.kind === "tt" || s.kind === "yt";
    return `<div class="media ${s.kind === "ig" ? "ig" : ""}" data-kind="${s.kind}" data-full="${full ? 1 : 0}" data-src="${E(s.src || "")}" data-id="${E(s.id || "")}">
      <div class="ph"><div class="av">${E(initial(c.creator))}</div><b class="ltr">${c.creator ? "@" + E(c.creator) : ""}</b>
        <small>${s.kind === "none" ? (c.url ? "افتح التغطية من الرابط" : "لا يوجد رابط فيديو") : "جارِ تحميل الفيديو…"}</small>
        <div class="chips" style="justify-content:center">${pfBadges(c.platforms)}</div></div>
      ${full ? "" : '<div class="ov"></div>'}
      ${no ? `<span class="no">#${no}</span>` : ""}
      ${src && !full ? `<span class="src">${src}</span>` : ""}
      ${canSound && !full ? `<button class="snd" type="button">${IC.vol}<span>تشغيل الصوت</span></button>` : ""}
      ${!full && s.kind !== "none" ? `<button class="exp" type="button" title="تكبير">${IC.exp}</button>` : ""}
    </div>`;
  }

  function mountPlayer(el) {
    if (players.has(el)) return players.get(el);
    const kind = el.dataset.kind, full = el.dataset.full === "1";
    const p = { el, kind, full, sound: full, loaded: false, ready: false, visible: false };
    players.set(el, p);
    const btn = el.querySelector(".snd");
    if (btn) btn.addEventListener("click", e => { e.stopPropagation(); setSound(p, !p.sound); });
    return p;
  }
  function load(p) {
    if (p.loaded || p.kind === "none") return;
    p.loaded = true;
    const el = p.el, id = el.dataset.id;
    if (p.kind === "mp4") {
      const v = document.createElement("video");
      v.src = el.dataset.src; v.muted = !p.sound; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "metadata";
      if (p.full) v.controls = true;
      v.setAttribute("playsinline", "");
      el.insertBefore(v, el.firstChild.nextSibling);
      p.video = v;
      v.play().catch(() => {});
    } else {
      const f = document.createElement("iframe");
      f.loading = "lazy";
      f.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write";
      f.setAttribute("allowfullscreen", "");
      if (p.kind === "tt") f.src = TT_BASE + id + ttParams(p.full);
      if (p.kind === "ig") f.src = "https://www.instagram.com/p/" + encodeURIComponent(id) + "/embed/";
      if (p.kind === "yt") f.src = "https://www.youtube.com/embed/" + encodeURIComponent(id) + "?autoplay=1&mute=" + (p.sound ? 0 : 1) + "&loop=1&playlist=" + encodeURIComponent(id) + "&playsinline=1&enablejsapi=1&controls=" + (p.full ? 1 : 0);
      f.addEventListener("load", () => { const ph = el.querySelector(".ph"); if (ph && p.kind !== "tt") ph.style.display = "none"; });
      el.insertBefore(f, el.firstChild.nextSibling);
      p.iframe = f;
    }
  }
  function ttSend(p, type, value) {
    if (!p.iframe || !p.iframe.contentWindow) return;
    const msg = { type, "x-tiktok-player": true }; if (value !== undefined) msg.value = value;
    try { p.iframe.contentWindow.postMessage(msg, "*"); } catch (e) {}
  }
  function ytSend(p, func) {
    try { p.iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*"); } catch (e) {}
  }
  function play(p) {
    if (p.kind === "mp4" && p.video) p.video.play().catch(() => {});
    if (p.kind === "tt" && p.ready) ttSend(p, "play");
    if (p.kind === "yt" && p.iframe) ytSend(p, "playVideo");
  }
  function pause(p) {
    if (p.kind === "mp4" && p.video) p.video.pause();
    if (p.kind === "tt" && p.ready) ttSend(p, "pause");
    if (p.kind === "yt" && p.iframe) ytSend(p, "pauseVideo");
  }
  function setSound(p, on) {
    if (on) players.forEach(q => { if (q !== p && q.sound) setSound(q, false); });
    p.sound = on;
    if (p.kind === "mp4" && p.video) { p.video.muted = !on; if (on) p.video.play().catch(() => {}); }
    if (p.kind === "tt") { ttSend(p, on ? "unMute" : "mute"); if (on) ttSend(p, "play"); }
    if (p.kind === "yt") { ytSend(p, on ? "unMute" : "mute"); if (on) ytSend(p, "playVideo"); }
    const b = p.el.querySelector(".snd");
    if (b) { b.classList.toggle("on", on); b.innerHTML = (on ? IC.mute : IC.vol) + `<span>${on ? "كتم الصوت" : "تشغيل الصوت"}</span>`; }
  }
  window.addEventListener("message", e => {
    let host = ""; try { host = new URL(e.origin).hostname; } catch (_) { return; }
    if (!/(^|\.)tiktok\.com$/.test(host)) return;
    let d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (_) { return; } }
    if (!d || !d["x-tiktok-player"]) return;
    let p = null; players.forEach(q => { if (q.iframe && q.iframe.contentWindow === e.source) p = q; });
    if (!p) return;
    if (d.type === "onPlayerReady") {
      p.ready = true;
      const ph = p.el.querySelector(".ph"); if (ph) ph.style.display = "none";
      ttSend(p, p.sound ? "unMute" : "mute");
      if (p.visible || p.full) ttSend(p, "play"); else ttSend(p, "pause");
    }
    if (d.type === "onMute" && !p.full) {
      const muted = !!d.value; if (p.sound === muted) { p.sound = !muted; const b = p.el.querySelector(".snd"); if (b) { b.classList.toggle("on", !muted); b.innerHTML = (!muted ? IC.mute : IC.vol) + `<span>${!muted ? "كتم الصوت" : "تشغيل الصوت"}</span>`; } }
    }
  });
  function observe(root) {
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(en => {
      const p = mountPlayer(en.target);
      p.visible = en.isIntersecting;
      if (en.isIntersecting) { load(p); play(p); } else { pause(p); if (p.sound) setSound(p, false); }
    }), { rootMargin: "200px 0px", threshold: 0.25 });
    root.querySelectorAll(".media").forEach(el => { mountPlayer(el); io.observe(el); });
  }
  function destroyPlayers() { if (io) io.disconnect(); io = null; players.clear(); }

  /* ================= HOME ================= */
  function home() {
    const all = camps.map(c => ({ c, ...M.campStats(c) }));
    const tViews = all.reduce((a, x) => a + (x.s.views || 0), 0);
    const tCreators = all.reduce((a, x) => a + (x.s.creators || 0), 0);
    const types = [...new Set(camps.map(c => c.type).filter(Boolean))];
    app.innerHTML = `
    <section class="hero fade"><div class="wrap">
      <span class="eyebrow">لوحة التغطية — <span class="num">${new Date().getFullYear()}</span></span>
      <h1>تغطية تتوسّع<br><em>مع كل حملة.</em></h1>
      <p class="lead">سجل حي لكل حملة مؤثرين — المنصة، الموقع، روابط التغطية والنتائج، في مكان واحد.</p>
      <div class="kpis">
        <div class="kpi"><div class="v num">${M.fmt(camps.length)}</div><div class="l">حملات</div></div>
        <div class="kpi g"><div class="v num">${M.fmt(tCreators)}</div><div class="l">مؤثرين</div></div>
        <div class="kpi"><div class="v num">${M.fmt(tViews)}</div><div class="l">إجمالي المشاهدات</div></div>
        <div class="kpi hl"><div class="v num">${E(agency.influencersPool)}</div><div class="l">من المشاهير والمؤثرين داخل المملكة، نختار منهم ما يناسب كل حملة وجمهورها.</div></div>
      </div>
      <div class="why">
        <div><span class="eyebrow">WHY MALAZ</span><h2>اختيار المشاهير عند ${E(agency.name)} مو عشوائي.</h2>
        <p>نشتغل على حملات المشاهير كجزء من استراتيجية متكاملة: ما ينزل أي مشهور في الحملة إلا بعد اختياره واعتماده بما يتناسب مع النشاط والجمهور والمنصة وطبيعة الحملة، مع متابعة التغطيات والنتائج في مكان واحد.</p></div>
        <div class="steps">
          <div class="step"><small>SELECTION — 01</small><b>اختيار المشاهير المناسبين للحملة</b></div>
          <div class="step"><small>CONTROL — 02</small><b>ما يتم اعتماد أي اسم قبل اختياره</b></div>
          <div class="step"><small>TRACKING — 03</small><b>متابعة التغطيات والروابط والمشاهدات</b></div>
        </div>
      </div>
    </div></section>
    <section class="sec" id="campaigns"><div class="wrap">
      <div class="sec-h"><div><span class="eyebrow">الحملات</span><h2>كل <em>حملاتنا</em></h2></div>
        <p style="color:var(--muted);max-width:420px">توثيق كامل لكل تغطيات الحملات ونتائجها. اضغط على أي حملة لفتح تفاصيل المؤثرين ومشاهدة الفيديوهات.</p></div>
      <div class="tools">
        <label class="search">${IC.search}<input id="q" type="search" placeholder="دوّر على حملة أو يوزر…" autocomplete="off"></label>
        ${types.length > 1 ? `<button class="chip on" data-t="">الكل</button>` + types.map(t => `<button class="chip" data-t="${E(t)}">${E(t)}</button>`).join("") : ""}
      </div>
      <div class="clist" id="clist"></div>
    </div></section>`;
    let q = "", ty = "";
    const list = document.getElementById("clist");
    const draw = () => {
      const qq = q.trim().toLowerCase().replace(/^@/, "");
      const rows = all.filter(x => {
        if (ty && x.c.type !== ty) return false;
        if (!qq) return true;
        const hay = [x.c.brand, x.c.title, x.c.type, x.c.city].join(" ").toLowerCase();
        return hay.includes(qq) || x.covs.some(v => (v.creator || "").toLowerCase().includes(qq));
      });
      list.innerHTML = rows.length ? rows.map(x => {
        const hit = qq && x.covs.find(v => (v.creator || "").toLowerCase().includes(qq));
        return `<a class="crow fade" href="#c-${E(x.c.id)}">
          ${logoHTML(x.c)}
          <div><span class="badge">${E(x.c.type || "حملة")}</span><h3>${E(x.c.title || x.c.brand)}</h3>
            <div class="meta">${E(x.c.brand)}${x.c.city ? " · " + E(x.c.city) : ""}${hit ? ` · <span class="ltr" style="color:var(--green-d)">@${E(hit.creator)}</span>` : ""}</div></div>
          <div class="side"><span class="chips">${pfBadges(x.s.platforms)}</span>
            <span class="badge line"><span class="num">${M.fmt(x.s.creators)}</span> مؤثر</span>
            ${x.s.views ? `<span class="badge gold"><span class="num">${M.fmt(x.s.views)}</span> مشاهدة</span>` : ""}</div>
          <span class="arr">‹</span></a>`;
      }).join("") : `<div class="empty">ما فيه نتائج لـ «${E(q)}»</div>`;
    };
    document.getElementById("q").addEventListener("input", e => { q = e.target.value; draw(); });
    document.querySelectorAll(".chip[data-t]").forEach(b => b.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-t]").forEach(x => x.classList.remove("on")); b.classList.add("on"); ty = b.dataset.t; draw();
    }));
    draw();
    document.title = agency.name + " — بورتفوليو الحملات";
  }

  /* ================= CAMPAIGN (report layout) ================= */
  const TIERS = [
    { k: "t0", n: "أقل من 50K", min: 0, max: 5e4, c: "#bdb6aa" },
    { k: "t1", n: "50K–100K", min: 5e4, max: 1e5, c: "#629e63" },
    { k: "t2", n: "100K–200K", min: 1e5, max: 2e5, c: "#ffb004" },
    { k: "t3", n: "+200K", min: 2e5, max: Infinity, c: "#f6f4ef" }
  ];
  const tierOf = f => f === null ? null : TIERS.find(t => f >= t.min && f < t.max);
  const METRICS = [
    { k: "views", n: "المشاهدات", fmt: M.fmt },
    { k: "likes", n: "الإعجابات", fmt: M.fmt },
    { k: "saves", n: "الحفظ والمشاركة", fmt: M.fmt },
    { k: "comments", n: "التعليقات", fmt: M.fmt },
    { k: "er", n: "نسبة التفاعل", fmt: v => M.pct(v) },
    { k: "followers", n: "المتابعين", fmt: M.fmt }
  ];
  const hl = s => E(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
  const brandMark = (c, cls) => { const s = M.safeUrl(c.logo); return `<div class="${cls}">${s ? `<img src="${E(s)}" alt="${E(c.brand)}">` : `<span>${E(c.brand || "")}</span>`}</div>`; };
  function niceMax(v) { if (!v) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function counters(root) {
    root.querySelectorAll("[data-count]").forEach(el => {
      const to = +el.dataset.count, d = +(el.dataset.dec || 0), suf = el.dataset.suf || "", t0 = performance.now(), dur = 1600;
      const f = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4), v = to * e; el.textContent = (d ? v.toFixed(d) : Math.round(v).toLocaleString("en-US")) + suf; if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
  }
  let rvIO = null;
  function reveal(root) {
    if (rvIO) rvIO.disconnect();
    rvIO = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; const el = en.target; el.classList.add("in");
      if (el.dataset.onin && revealHooks[el.dataset.onin]) revealHooks[el.dataset.onin](el);
      counters(el); rvIO.unobserve(el);
    }), { threshold: .15 });
    root.querySelectorAll(".rv").forEach(el => rvIO.observe(el));
  }
  const revealHooks = {};
  const tipEl = () => { let t = document.getElementById("rtip"); if (!t) { t = document.createElement("div"); t.id = "rtip"; t.className = "tip"; document.body.appendChild(t); } return t; };
  function showTip(e, html) { const t = tipEl(); t.innerHTML = html; t.style.opacity = 1; moveTip(e); }
  function moveTip(e) { const t = tipEl(), w = t.offsetWidth, h = t.offsetHeight; let x = e.clientX + 16, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = x + "px"; t.style.top = y + "px"; }
  function hideTip() { tipEl().style.opacity = 0; }
  const covTip = v => `<h5>@${E(v.creator || ("تغطية #" + v._no))}</h5>
    <div><span>متابعين</span><b>${M.fmt(v.followers)}</b></div><div><span>مشاهدة</span><b>${M.fmt(v.views)}</b></div>
    <div><span>إعجاب</span><b>${M.fmt(v.likes)}</b></div><div><span>تعليق</span><b>${M.fmt(v.comments)}</b></div>
    <div><span>حفظ ومشاركة</span><b>${M.fmt(v.saves)}</b></div><div><span>نسبة التفاعل</span><b>${M.pct(v.er)}</b></div>
    ${sourceOf(v).kind !== "none" ? '<div style="color:#ffb004;margin-top:4px">اضغط لتشغيل الفيديو ▶</div>' : ""}`;

  function autoInsights(covs, s, tierStats) {
    const out = [];
    const withL = covs.filter(v => v.likes !== null);
    if (withL.length >= 8 && s.likes) {
      const top = [...withL].sort((a, b) => b.likes - a.likes).slice(0, 5);
      const tl = top.reduce((a, v) => a + v.likes, 0), sh = tl / withL.reduce((a, v) => a + v.likes, 0) * 100;
      const tv = top.reduce((a, v) => a + (v.views || 0), 0), vs = s.views ? tv / covs.reduce((a, v) => a + (v.views || 0), 0) * 100 : null;
      out.push({ title: `5 تغطيات صنعت ${Math.round(sh)}% من الإعجابات`, body: `${top.map(v => v.creator).filter(Boolean).join(" و")} حققوا ${M.fmt(tl)} إعجاب${vs !== null ? ` من ${Math.round(vs)}% فقط من المشاهدات` : ""}. هؤلاء أولوية للحملات القادمة.` });
    }
    const best = tierStats.filter(t => t.count >= 2 && t.er !== null).sort((a, b) => b.er - a.er)[0];
    if (best) out.push({ title: `حسابات ${best.n} حققت أعلى تفاعل`, body: `نسبة تفاعل ${M.pct(best.er)} من ${best.count} تغطيات، مقابل ${M.pct(s.er)} لمتوسط الحملة.` });
    const over = covs.filter(v => v.views && v.followers && v.views > v.followers);
    if (over.length) out.push({ title: `${over.length} تغطيات تخطّت حجم الحساب`, body: `${over.slice(0, 4).map(v => v.creator).filter(Boolean).join(" و")} حققوا مشاهدات أكثر من عدد متابعيهم — محتوى مناسب للتعزيز بإعلانات Spark.` });
    return out;
  }

  function campaign(id) {
    const c = camps.find(x => x.id === id);
    if (!c) { app.innerHTML = `<div class="wrap"><div class="empty">الحملة غير موجودة. <a href="#home">ارجع للرئيسية</a></div></div>`; return; }
    document.body.classList.add("report");
    const { covs, s } = M.campStats(c);
    covs.forEach((v, i) => { v._no = v.no || i + 1; v.tier = tierOf(v.followers); });
    const brandUrl = M.safeUrl(c.brandUrl);
    const year = (c.date || "").slice(0, 4) || new Date().getFullYear();
    const dataDate = c.dataDate ? new Date(c.dataDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }) : "";
    const startDate = c.date ? new Date(c.date).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }) : "";
    const withViews = covs.filter(v => v.views !== null).length;
    const avg = s.views && withViews ? s.views / withViews : null;
    const plat = s.platforms.map(p => p.toUpperCase()).join(" + ");

    /* marquee items */
    const mq = [];
    (c.hashtags || []).forEach(h => mq.push("#" + String(h).replace(/^#/, "")));
    if (c.brand) mq.push(c.brand);
    if (s.views) mq.push("مشاهدة " + M.compact(s.views));
    if (s.creators) mq.push("صانع محتوى " + s.creators);
    if (s.followers) mq.push("متابع " + M.compact(s.followers));
    if (s.likes) mq.push("إعجاب " + M.compact(s.likes));
    if (c.city) mq.push(c.city);
    while (mq.length && mq.length < 8) mq.push(...mq.slice(0, 8 - mq.length));
    const mqHTML = mq.map(x => `<span>${E(x)}</span>`).join("");

    /* chart availability */
    const metrics = METRICS.filter(m => covs.filter(v => v[m.k] !== null && v[m.k] !== undefined).length >= 2);
    const hasTiers = covs.filter(v => v.followers !== null).length >= 3;
    const tierStats = TIERS.map(t => {
      const r = covs.filter(v => v.tier === t);
      const vw = r.reduce((a, v) => a + (v.views || 0), 0);
      const inter = r.reduce((a, v) => a + (v.likes || 0) + (v.comments || 0) + (v.saves || 0), 0);
      const fol = r.reduce((a, v) => a + (v.followers || 0), 0);
      return Object.assign({}, t, { count: r.length, views: vw, er: vw ? inter / vw * 100 : null, reach: fol ? vw / fol * 100 : null });
    });
    const tierViews = tierStats.reduce((a, t) => a + t.views, 0);
    const showTierSec = hasTiers && tierViews > 0 && tierStats.filter(t => t.count).length >= 2;
    const insights = (c.insights && c.insights.filter(x => x && (x.title || x.body)).length) ? c.insights.filter(x => x && (x.title || x.body)) : autoInsights(covs, s, tierStats);
    let secN = 1; const sn = () => String(++secN).padStart(2, "0");

    const conf = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${-5 - (i * 13) % 30}px;background:${["#ffb004", "#629e63", "#f6f4ef", "#ffb004"][i % 4]};animation-delay:${-(i * .83).toFixed(2)}s;animation-duration:${7 + (i % 5)}s;width:${6 + (i % 3) * 3}px;height:${6 + (i % 3) * 3}px"></i>`).join("");

    app.innerHTML = `
    <section class="rhero"><div class="confetti">${conf}</div><div class="wrap">
      <div class="rmeta"><a href="#home">→ كل الحملات</a><span class="dots">• • •</span><span>${E((agency.nameEn || "MALAZ").toUpperCase())} / INFLUENCER MARKETING</span></div>
      <div class="rgrid">
        <div>
          <div class="rlogos rv"><img class="mlg" src="assets/malaz-gold.png" alt="${E(agency.name)}"><span class="x">×</span>${brandMark(c, "bl")}</div>
          <div class="rkicker rv d1"><span class="num">01</span> / ${E((c.brand || "").toUpperCase())}${c.type ? " · " + E(c.type) : ""}</div>
          <h1 class="rtitle rv d2">${hl(c.title || c.brand)}</h1>
          ${c.description ? `<p class="rdesc rv d3">${E(c.description)}</p>` : ""}
          <div class="rpills rv d4">
            <span class="rpill gold"><span class="num">${M.fmt(s.creators)}</span> مؤثر</span>
            ${s.followers ? `<span class="rpill"><span class="num">${M.compact(s.followers)}</span> متابع</span>` : ""}
            ${plat ? `<span class="rpill ltr">${E(plat)}</span>` : ""}
            ${c.city ? `<span class="rpill">${E(c.city)}</span>` : ""}
            ${startDate ? `<span class="rpill">${E(startDate)}</span>` : ""}
            ${dataDate ? `<span class="rpill">أرقام ${E(dataDate)}</span>` : ""}
          </div>
          <div class="racts rv d4">
            ${brandUrl ? `<a class="btn gold" href="${E(brandUrl)}" target="_blank" rel="noopener">${IC.out} زيارة ${E(c.brand || "البراند")}</a>` : ""}
            <button class="btn" id="share" type="button">${IC.link} نسخ رابط الحملة</button>
          </div>
        </div>
        <div class="vcard-wrap rv d2"><span class="dia a"></span><span class="dia b"></span>
          <div class="vcard"><span class="h h1"></span><span class="h h2"></span><span class="h h3"></span><span class="h h4"></span>
            ${brandMark(c, "blg")}
            <small>TOTAL VIEWS</small>
            <div class="big" ${s.views ? `data-count="${s.views}"` : ""}>${s.views ? "0" : "—"}</div>
            <div class="cap">مشاهدة خلال الحملة</div>
          </div><span class="dotrow">• • • • • • • •</span></div>
      </div>
    </div></section>
    <div class="rmarq"><div class="tr">${mqHTML}${mqHTML}</div></div>

    <div class="wrap">
      <div class="rkpis">
        <div class="rk dark rv"><div class="v" ${s.views ? `data-count="${s.views}"` : ""}>${s.views ? 0 : "—"}</div><div class="l">${s.views ? `مشاهدة من ${M.fmt(withViews)} تغطية${avg ? `، بمتوسط ${M.compact(avg)} للتغطية` : ""}${s.followers ? ` · ${M.compact(s.followers)} متابع مجتمعين` : ""}` : "المشاهدات تُضاف قريبًا"}</div></div>
        <div class="rk rv d1"><div class="v" ${s.likes !== null ? `data-count="${s.likes}"` : ""}>${s.likes !== null ? 0 : "—"}</div><div class="l">إعجاب</div></div>
        <div class="rk rv d2"><div class="v" ${s.saves !== null ? `data-count="${s.saves}"` : ""}>${s.saves !== null ? 0 : "—"}</div><div class="l">حفظ ومشاركة</div></div>
        <div class="rk rv d3"><div class="v" ${s.comments !== null ? `data-count="${s.comments}"` : ""}>${s.comments !== null ? 0 : "—"}</div><div class="l">تعليق</div></div>
        <div class="rk gold rv d4"><div class="v" ${s.er !== null ? `data-count="${s.er.toFixed(2)}" data-dec="2" data-suf="%"` : ""}>${s.er !== null ? 0 : "—"}</div><div class="l">نسبة التفاعل الإجمالية</div></div>
      </div>

      ${metrics.length ? `<section class="rsec" id="sec-chart">
        <span class="rlabel rv">${sn()} / REACH VS ENGAGEMENT</span>
        <h2 class="rh2 rv">من حقق الوصول <em>ومن حقق التفاعل</em></h2>
        <div class="ctrl rv">
          <div class="tabs" id="mtabs">${metrics.map((m, i) => `<button data-m="${m.k}" class="${i === 0 ? "on" : ""}">${m.n}</button>`).join("")}</div>
          ${hasTiers ? `<div class="tiers-f" id="tf"><button data-t="" class="on">الكل</button>${TIERS.slice().reverse().filter(t => covs.some(v => v.tier === t)).map(t => `<button data-t="${t.k}">${t.n}</button>`).join("")}</div>` : ""}
        </div>
        <div class="chart rv" data-onin="chart"><div id="chartIn"></div></div>
      </section>` : ""}

      ${showTierSec ? `<section class="rsec" id="sec-tiers">
        <span class="rlabel rv">${sn()} / CREATOR TIERS BY FOLLOWERS</span>
        <h2 class="rh2 rv" id="tierTitle"></h2>
        <div class="tiergrid" id="tiers"></div>
        <p class="tcap rv" id="tierCap"></p>
      </section>` : ""}

      <section class="rsec" id="sec-cov">
        <span class="rlabel rv">${sn()} / COVERAGE</span>
        <h2 class="rh2 rv"><span class="num">${M.fmt(covs.length)}</span> ${covs.length > 1 ? "تغطية" : "تغطية"} <em>وكل فيديو يشتغل هنا مباشرة</em></h2>
        <p class="rsub rv">مقطع من كل تغطية يعمل تلقائيًا بدون صوت — اضغط زر الصوت لتسمعه، أو كبّر الفيديو، أو افتحه كاملًا على المنصة.</p>
        <div class="vbar">
          <div class="seg" id="view"><button class="on" data-v="cards">بطاقات الفيديو</button><button data-v="table">جدول</button></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${s.platforms.length > 1 ? `<select class="sel" id="pf"><option value="">كل المنصات</option>${s.platforms.map(p => `<option>${E(p)}</option>`).join("")}</select>` : ""}
            <select class="sel" id="sort"><option value="">الترتيب الافتراضي</option><option value="views">الأعلى مشاهدة</option><option value="er">الأعلى تفاعلًا</option><option value="likes">الأعلى إعجابًا</option><option value="saves">الأعلى حفظًا</option></select>
          </div>
        </div>
        <div id="out"></div>
      </section>

      ${insights.length ? `<section class="rsec" id="sec-ins">
        <span class="rlabel rv">${sn()} / NEXT CAMPAIGNS</span>
        <h2 class="rh2 rv">ما تعلمناه <em>للحملات القادمة</em></h2>
        <div class="ins">${insights.slice(0, 6).map((x, i) => `<div class="insc rv d${i % 3 + 1}"><span class="n num">${String(i + 1).padStart(2, "0")}</span><h3>${E(x.title || "")}</h3><p>${E(x.body || "")}</p></div>`).join("")}</div>
      </section>` : ""}
    </div>

    <section class="rfoot"><div class="wrap">
      <div class="lg2"><img class="mlg" src="assets/malaz-gold.png" alt="${E(agency.name)}" style="height:52px"><span style="color:#555">×</span>${brandMark(c, "bl")}</div>
      <div><h4>${E(agency.slogan || "")}</h4>
        <p>نسبة التفاعل = (الإعجابات + التعليقات + الحفظ والمشاركة) ÷ المشاهدات.${dataDate ? ` الأرقام بتاريخ ${E(dataDate)}.` : ""} ${c.methodology ? E(c.methodology) : ""}</p></div>
    </div></section>`;
    document.title = (c.title || c.brand).replace(/\*/g, "") + " — " + agency.name;

    document.getElementById("share").addEventListener("click", () => {
      const u = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("تم نسخ رابط الحملة")).catch(() => toast(u));
    });

    /* ----- bar chart ----- */
    const withLikes = covs.filter(v => v.likes !== null);
    const topLikes = new Set(withLikes.length >= 8 ? [...withLikes].sort((a, b) => b.likes - a.likes).slice(0, 5) : []);
    let metric = metrics[0] && metrics[0].k, tierF = "", showAll = false;
    const chartIn = document.getElementById("chartIn");
    function drawChart(animate) {
      if (!chartIn) return;
      const m = METRICS.find(x => x.k === metric);
      let rows = covs.filter(v => v[metric] !== null && (!tierF || (v.tier && v.tier.k === tierF)));
      rows.sort((a, b) => b[metric] - a[metric]);
      const total = metric === "er" ? null : rows.reduce((a, v) => a + v[metric], 0);
      const lim = showAll ? rows.length : 12, shown = rows.slice(0, lim);
      const mx = niceMax(shown.length ? shown[0][metric] : 1);
      const ticks = [0, .25, .5, .75, 1].map(f => mx * f);
      chartIn.innerHTML = `<div class="chart-h"><div><h3>${m.n}</h3><div class="tot">${total !== null ? `الإجمالي <b class="num">${M.fmt(total)}</b> · ` : ""}<span class="num">${rows.length}</span> تغطية${tierF ? " · " + E(TIERS.find(t => t.k === tierF).n) : ""}</div></div>
        <div class="lg">${topLikes.size ? `<span><i style="background:linear-gradient(90deg,#ffd36b,#ffb004);box-shadow:inset 0 0 0 1.5px #0b0b0b"></i>أعلى 5 في الإعجابات</span><span><i style="background:#0b0b0b"></i>باقي التغطيات</span>` : ""}<span>مرّر على أي صف للتفاصيل، واضغط لتشغيل الفيديو</span></div></div>
        <div class="axis"><span></span><div class="tk">${ticks.map(t => `<span style="right:${t / mx * 100}%">${metric === "er" ? (+t.toFixed(2)) + "%" : M.compact(t)}</span>`).join("")}</div></div>
        <div class="bars">${shown.map((v, i) => `<div class="bar ${topLikes.has(v) ? "hot" : ""}" data-i="${covs.indexOf(v)}">
          <div class="who"><span class="rk2 num">${String(i + 1).padStart(2, "0")}</span><div class="nm"><b>${E(v.creator || "تغطية #" + v._no)}</b><small>${v.followers !== null ? M.compact(v.followers) + " متابع" : ""}</small></div></div>
          <div class="tr2"><div class="fl" data-w="${v[metric] / mx * 100}"></div><span class="val" data-w="${v[metric] / mx * 100}">${m.fmt(v[metric])}</span></div></div>`).join("") || '<div class="empty">ما فيه بيانات لهذا الفلتر</div>'}</div>
        ${rows.length > 12 ? `<div class="more"><button class="btn" id="showAll">${showAll ? "عرض أعلى 12 فقط" : `عرض كل التغطيات (${rows.length})`}</button></div>` : ""}`;
      const go = () => chartIn.querySelectorAll(".bar").forEach((b, i) => {
        const fl = b.querySelector(".fl"), val = b.querySelector(".val"), w = +fl.dataset.w;
        setTimeout(() => { fl.style.width = Math.max(w, 1.2) + "%"; if (w > 22) { val.classList.add("inside"); val.style.right = "0"; val.style.paddingRight = "10px"; } else { val.style.right = w + "%"; } }, animate ? i * 45 : 0);
      });
      requestAnimationFrame(() => requestAnimationFrame(go));
      chartIn.querySelectorAll(".bar").forEach(b => {
        const v = covs[+b.dataset.i];
        b.addEventListener("mouseenter", e => showTip(e, covTip(v))); b.addEventListener("mousemove", moveTip); b.addEventListener("mouseleave", hideTip);
        b.addEventListener("click", () => { hideTip(); if (sourceOf(v).kind !== "none") openModal(covs, covs.indexOf(v)); else if (v.url) window.open(v.url, "_blank", "noopener"); });
      });
      const sa = document.getElementById("showAll"); if (sa) sa.onclick = () => { showAll = !showAll; drawChart(true); };
    }
    let chartShown = false;
    revealHooks.chart = () => { chartShown = true; drawChart(true); };
    if (chartIn) {
      chartIn.innerHTML = '<div style="height:420px"></div>';
      document.querySelectorAll("#mtabs button").forEach(b => b.onclick = () => { document.querySelectorAll("#mtabs button").forEach(x => x.classList.remove("on")); b.classList.add("on"); metric = b.dataset.m; showAll = false; drawChart(true); });
      document.querySelectorAll("#tf button").forEach(b => b.onclick = () => { document.querySelectorAll("#tf button").forEach(x => x.classList.remove("on")); b.classList.add("on"); tierF = b.dataset.t; drawChart(true); });
    }

    /* ----- tiers ----- */
    if (showTierSec) {
      const present = tierStats.filter(t => t.count);
      const best = present.filter(t => t.er !== null).sort((a, b) => b.er - a.er)[0];
      const mostViews = present.slice().sort((a, b) => b.views - a.views)[0];
      const maxEr = Math.max(...present.map(t => t.er || 0)) || 1;
      document.getElementById("tierTitle").innerHTML = best ? `حسابات <span class="num">${E(best.n)}</span> <em>حققت أعلى تفاعل</em>` : "تصنيف المؤثرين <em>حسب المتابعين</em>";
      const C = 2 * Math.PI * 32;
      const card = t => `<div class="tcard rv ${t === best ? "best" : ""}">
        <div class="ring"><svg viewBox="0 0 76 76"><circle class="bg" cx="38" cy="38" r="32"/><circle class="fg" cx="38" cy="38" r="32" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - (t.er || 0) / maxEr)}"/></svg><span>${M.pct(t.er)}<small>تفاعل</small></span></div>
        <div><div class="tt">${E(t.n)}</div><div class="tv num">${M.fmt(t.views)}</div><div class="tl">مشاهدة · <span class="num">${t.count}</span> تغطية</div>
        <p>${tierViews ? `<span class="num">${Math.round(t.views / tierViews * 100)}%</span> من المشاهدات` : ""}${t.reach !== null ? ` · الوصول <span class="num">${Math.round(t.reach)}%</span> من متابعيهم` : ""}</p></div></div>`;
      const left = present.slice(0, Math.ceil(present.length / 2)), right = present.slice(Math.ceil(present.length / 2));
      const R = 80, CC = 2 * Math.PI * R; let off = 0;
      const segs = present.map((t, i) => { const len = t.views / tierViews * CC; const s2 = `<circle class="seg" data-i="${i}" cx="100" cy="100" r="${R}" stroke="${t.c}" stroke-dasharray="${Math.max(0, len - 2)} ${CC}" stroke-dashoffset="${-off}"/>`; off += len; return s2; }).join("");
      document.getElementById("tiers").innerHTML = `<div class="tcol">${left.map(card).join("")}</div><div class="tcol">${right.map(card).join("")}</div>
        <div class="donutc rv"><small>SHARE OF VIEWS BY FOLLOWER TIER</small><div class="dn"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${R}" fill="none" stroke="#1d1d1d" stroke-width="22"/>${segs}</svg>
          <div class="ctr"><b class="num" id="dnv">${Math.round(mostViews.views / tierViews * 100)}%</b><span id="dnl">${E(mostViews.n)}</span></div></div>
          <div class="lgd">${present.map((t, i) => `<div data-i="${i}"><i style="background:${t.c}"></i>${E(t.n)}<b>${Math.round(t.views / tierViews * 100)}%</b></div>`).join("")}</div></div>`;
      const dn = document.querySelector(".donutc");
      const setD = i => { const t = present[i]; document.getElementById("dnv").textContent = Math.round(t.views / tierViews * 100) + "%"; document.getElementById("dnl").textContent = t.n; dn.querySelectorAll(".seg").forEach(sg => { sg.style.opacity = +sg.dataset.i === i ? 1 : .35; sg.style.strokeWidth = +sg.dataset.i === i ? 26 : 22; }); };
      const resetD = () => { document.getElementById("dnv").textContent = Math.round(mostViews.views / tierViews * 100) + "%"; document.getElementById("dnl").textContent = mostViews.n; dn.querySelectorAll(".seg").forEach(sg => { sg.style.opacity = 1; sg.style.strokeWidth = 22; }); };
      dn.querySelectorAll(".seg,.lgd div").forEach(el => { el.addEventListener("mouseenter", () => setD(+el.dataset.i)); el.addEventListener("mouseleave", resetD); });
      const cap = [];
      if (mostViews) cap.push(`حسابات ${mostViews.n} (${mostViews.count} تغطية) صنعت ${Math.round(mostViews.views / tierViews * 100)}% من المشاهدات`);
      if (best && best !== mostViews) cap.push(`وحسابات ${best.n} حققت أعلى نسبة تفاعل ${M.pct(best.er)}`);
      const over = covs.filter(v => v.views && v.followers && v.views > v.followers).length;
      if (over) cap.push(`و${over} تغطيات تخطّت مشاهداتها عدد متابعي الحساب نفسه`);
      document.getElementById("tierCap").textContent = cap.join("، ") + ".";
      revealHooks.ring = el => el.querySelectorAll(".fg").forEach(f => f.style.strokeDashoffset = f.dataset.off);
      document.querySelectorAll("#tiers .tcard").forEach(el => el.dataset.onin = "ring");
    }

    /* ----- coverage (cards / table) ----- */
    let view = "cards", sort = "", pf = "";
    const out = document.getElementById("out");
    const list = () => { let r = covs.filter(v => !pf || v.platforms.includes(pf)); if (sort) r = [...r].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1)); return r; };
    const draw = () => {
      destroyPlayers();
      const r = list();
      if (!r.length) { out.innerHTML = '<div class="empty">ما فيه تغطيات مضافة لهذه الحملة لسه.</div>'; return; }
      out.innerHTML = view === "cards" ? `<div class="rgrid4">${r.map(card).join("")}</div>` : table(r);
      out.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); openModal(r, +b.dataset.open); }));
      if (view === "cards") {
        out.querySelectorAll(".card").forEach((el, i) => { const ex = el.querySelector(".exp"); if (ex) ex.addEventListener("click", e => { e.stopPropagation(); openModal(r, i); }); });
        observe(out);
      } else out.querySelectorAll("th[data-s]").forEach(th => th.addEventListener("click", () => { sort = sort === th.dataset.s ? "" : th.dataset.s; document.getElementById("sort").value = sort; draw(); }));
    };
    document.querySelectorAll("#view button").forEach(b => b.addEventListener("click", () => { document.querySelectorAll("#view button").forEach(x => x.classList.remove("on")); b.classList.add("on"); view = b.dataset.v; draw(); }));
    document.getElementById("sort").addEventListener("change", e => { sort = e.target.value; draw(); });
    const pfs = document.getElementById("pf"); if (pfs) pfs.addEventListener("change", e => { pf = e.target.value; draw(); });
    draw();
    reveal(app);
  }

  const erClass = er => er === null ? "" : er >= 3 ? "hi" : er < 1 ? "lo" : "";
  function openLabel(v) {
    const p = v.link.platform;
    return p === "TikTok" ? "مشاهدة الفيديو كاملًا على تيك توك ←" : p === "Instagram" ? "فتح المنشور على إنستغرام ←" : p === "Snapchat" ? "فتح على سناب شات ←" : p === "YouTube" ? "مشاهدة على يوتيوب ←" : "فتح التغطية ←";
  }
  function creatorLink(v) {
    const pl = v.link.creator ? v.link.platform : v.platforms[0];
    return M.profileUrl(pl, v.creator);
  }
  function card(v, i) {
    const cu = creatorLink(v), url = M.safeUrl(v.url);
    return `<article class="card fade">
      ${mediaHTML(v, v._no, false)}
      <div class="cb">
        <div class="ch">${v.creator ? `<a ${cu ? `href="${E(cu)}" target="_blank" rel="noopener"` : ""}>${E(v.creator)}</a>` : `<b style="color:var(--muted)">تغطية <span class="num">#${v._no}</span></b>`}
          ${v.followers !== null ? `<span class="fpill"><span class="num">${M.compact(v.followers)}</span> متابع</span>` : ""}</div>
        <div class="st">
          <div><b>${M.fmt(v.views)}</b><span>مشاهدة</span></div>
          <div><b>${M.fmt(v.likes)}</b><span>إعجاب</span></div>
          <div><b>${M.fmt(v.comments)}</b><span>تعليق</span></div>
          <div><b>${M.fmt(v.saves)}</b><span>حفظ ومشاركة</span></div>
        </div>
        ${v.followers !== null ? `<div class="rl"><span>الوصول <span class="num">${v.reach !== null ? Math.round(v.reach) + "%" : "—"}</span> من المتابعين</span><b class="num">${M.fmt(v.followers)} متابع</b></div>` : ""}
        ${v.er !== null ? `<span class="erp ${erClass(v.er)}">نسبة التفاعل <span class="num">${M.pct(v.er)}</span></span>` : ""}
        ${(v.formats && v.formats.length) || v.location || v.kind ? `<div class="chips">${v.kind ? `<span class="badge line">${E(v.kind)}</span>` : ""}${(v.formats || []).map(f => `<span class="badge line">${E(f)}</span>`).join("")}${v.location ? `<span class="badge">${E(v.location)}</span>` : ""}</div>` : ""}
        ${v.note ? `<p class="note">${E(v.note)}</p>` : ""}
        ${url ? `<a class="olink" href="${E(url)}" target="_blank" rel="noopener">${openLabel(v)}</a>` : ""}
      </div></article>`;
  }
  function table(r) {
    const sum = k => { const x = r.filter(v => v[k] !== null); return x.length ? x.reduce((a, v) => a + v[k], 0) : null; };
    const tv = sum("views"), tl = sum("likes"), tc = sum("comments"), ts = sum("saves");
    const ter = tv && tl !== null ? ((tl || 0) + (tc || 0) + (ts || 0)) / tv * 100 : null;
    const th = (l, k) => `<th ${k ? `data-s="${k}"` : ""}>${l}${k ? " ↕" : ""}</th>`;
    return `<div class="twrap"><table><thead><tr>${th("#")}${th("اليوزر")}${th("النوع")}${th("الموقع")}${th("المنصة")}${th("التغطية")}${th("الرابط")}${th("المتابعون", "followers")}${th("المشاهدات", "views")}${th("اللايكات", "likes")}${th("الكومنتات", "comments")}${th("الحفظ", "saves")}${th("التفاعل", "er")}</tr></thead><tbody>
    ${r.map((v, i) => {
      const s = sourceOf(v), url = M.safeUrl(v.url);
      return `<tr><td class="num">${v._no}</td><td class="u">${E(v.creator || "—")}</td><td>${E(v.kind || "—")}</td><td>${E(v.location || "—")}</td>
      <td><div class="chips">${pfBadges(v.platforms) || "—"}</div></td>
      <td><div class="chips">${(v.formats || []).map(f => `<span class="badge line">${E(f)}</span>`).join("") || "—"}</div></td>
      <td>${s.kind !== "none" ? `<button class="play" data-open="${i}" title="تشغيل داخل الموقع">${IC.play}</button>` : url ? `<a class="play" href="${E(url)}" target="_blank" rel="noopener">${IC.out}</a>` : "—"}</td>
      <td class="num">${M.fmt(v.followers)}</td><td class="num">${M.fmt(v.views)}</td><td class="num">${M.fmt(v.likes)}</td><td class="num">${M.fmt(v.comments)}</td><td class="num">${M.fmt(v.saves)}</td><td class="num">${M.pct(v.er)}</td></tr>`;
    }).join("")}</tbody>
    <tfoot><tr><td></td><td>الإجمالي</td><td colspan="5"></td><td class="num">${M.fmt(sum("followers"))}</td><td class="num">${M.fmt(tv)}</td><td class="num">${M.fmt(tl)}</td><td class="num">${M.fmt(tc)}</td><td class="num">${M.fmt(ts)}</td><td class="num">${M.pct(ter)}</td></tr></tfoot></table></div>`;
  }

  /* ---------- modal ---------- */
  const modal = document.getElementById("modal");
  let mList = [], mIdx = 0, mPlayer = null;
  function openModal(list, i) {
    mList = list.filter(v => sourceOf(v).kind !== "none" || v.url);
    const target = list[i]; mIdx = Math.max(0, mList.indexOf(target));
    players.forEach(p => { pause(p); if (p.sound) setSound(p, false); });
    renderModal(); modal.classList.add("open"); document.body.style.overflow = "hidden";
  }
  function renderModal() {
    const v = mList[mIdx], url = M.safeUrl(v.url), cu = creatorLink(v);
    modal.querySelector(".mbox").innerHTML = `${mediaHTML(v, v._no, true)}
      <div class="mside">
        <span class="chips">${pfBadges(v.platforms)}</span>
        <h3 class="ltr" style="text-align:right;font-family:Alexandria;font-size:22px">${v.creator ? (cu ? `<a href="${E(cu)}" target="_blank" rel="noopener" style="text-decoration:none">@${E(v.creator)}</a>` : "@" + E(v.creator)) : "تغطية #" + v._no}</h3>
        ${v.followers !== null ? `<span class="fpill" style="align-self:flex-start"><span class="num">${M.fmt(v.followers)}</span> متابع</span>` : ""}
        <div class="st">
          <div><b>${M.fmt(v.views)}</b><span>مشاهدة</span></div><div><b>${M.fmt(v.likes)}</b><span>إعجاب</span></div>
          <div><b>${M.fmt(v.comments)}</b><span>تعليق</span></div><div><b>${M.fmt(v.saves)}</b><span>حفظ ومشاركة</span></div>
        </div>
        ${v.er !== null ? `<span class="erp ${erClass(v.er)}">نسبة التفاعل <span class="num">${M.pct(v.er)}</span></span>` : ""}
        ${v.note ? `<p class="note">${E(v.note)}</p>` : ""}
        ${url ? `<a class="btn dark" href="${E(url)}" target="_blank" rel="noopener" style="align-self:flex-start">${IC.out} ${openLabel(v).replace(" ←", "")}</a>` : ""}
        <small style="color:var(--muted)"><span class="num">${mIdx + 1} / ${mList.length}</span></small>
      </div>`;
    const el = modal.querySelector(".media");
    mPlayer = { el, kind: el.dataset.kind, full: true, sound: true, loaded: false, ready: false, visible: true };
    players.set(el, mPlayer);
    load(mPlayer);
  }
  function closeModal() {
    if (mPlayer) { pause(mPlayer); players.delete(mPlayer.el); mPlayer = null; }
    modal.querySelector(".mbox").innerHTML = ""; modal.classList.remove("open"); document.body.style.overflow = "";
    players.forEach(p => { if (p.visible) play(p); });
  }
  function step(d) { if (mPlayer) players.delete(mPlayer.el); mIdx = (mIdx + d + mList.length) % mList.length; renderModal(); }
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  modal.querySelector(".mclose").addEventListener("click", closeModal);
  modal.querySelector(".mnav.p").addEventListener("click", () => step(-1));
  modal.querySelector(".mnav.n").addEventListener("click", () => step(1));
  addEventListener("keydown", e => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") step(-1);
    if (e.key === "ArrowLeft") step(1);
  });

  /* ================= ROUTER ================= */
  function route() {
    if (modal.classList.contains("open")) closeModal();
    destroyPlayers();
    const h = decodeURIComponent(location.hash.slice(1));
    document.querySelectorAll(".top nav a[data-r]").forEach(a => a.classList.toggle("on", (a.dataset.r === "home" && !h.startsWith("c-")) ));
    document.body.classList.remove("report");
    if (h.startsWith("c-")) campaign(h.slice(2)); else home();
    if (h === "campaigns") { const el = document.getElementById("campaigns"); if (el) el.scrollIntoView(); } else scrollTo(0, 0);
  }
  addEventListener("hashchange", route);

  /* chrome */
  document.querySelectorAll("[data-agency-name]").forEach(el => el.textContent = agency.name);
  document.querySelectorAll("[data-agency-slogan]").forEach(el => el.textContent = agency.slogan);
  const site = document.getElementById("agency-site"); if (site) { site.href = M.safeUrl(agency.site) || "#"; site.textContent = (agency.site || "").replace(/^https?:\/\//, "").replace(/\/$/, ""); }
  const cta = document.getElementById("cta"); if (cta && agency.site) cta.href = M.safeUrl(agency.site);
  if (draft) { const b = document.getElementById("draft"); if (b) b.style.display = "block"; }
  route();
})();
