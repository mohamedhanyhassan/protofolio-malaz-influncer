/* Shared helpers — used by index.html and admin.html */
(function (g) {
  const M = {};

  M.parseLink = function (url) {
    const out = { platform: "", id: "", creator: "", kind: "" };
    if (!url) return out;
    let u;
    try { u = new URL(url.trim()); } catch (e) { return out; }
    const h = u.hostname.replace(/^www\.|^m\.|^vm\.|^vt\./, "");
    const parts = u.pathname.split("/").filter(Boolean);
    if (h.endsWith("tiktok.com")) {
      out.platform = "TikTok";
      const at = parts.find(p => p.startsWith("@"));
      if (at) out.creator = at.slice(1);
      const vi = parts.indexOf("video");
      if (vi > -1 && parts[vi + 1]) out.id = parts[vi + 1].replace(/\D/g, "");
      const pi = parts.indexOf("photo");
      if (!out.id && pi > -1 && parts[pi + 1]) out.id = parts[pi + 1].replace(/\D/g, "");
      out.kind = "video";
    } else if (h.endsWith("instagram.com")) {
      out.platform = "Instagram";
      const i = parts.findIndex(p => ["p", "reel", "reels", "tv"].includes(p));
      if (i > -1 && parts[i + 1]) { out.id = parts[i + 1]; out.kind = parts[i] === "p" ? "post" : "reel"; }
      else if (parts[0] && parts[0] !== "stories") out.creator = parts[0];
      if (parts[0] === "stories" && parts[1]) { out.creator = parts[1]; out.kind = "story"; }
    } else if (h.endsWith("snapchat.com")) {
      out.platform = "Snapchat";
      const a = parts.find(p => p.startsWith("@")) || (parts[0] === "add" ? parts[1] : "");
      if (a) out.creator = a.replace(/^@/, "");
    } else if (h.endsWith("youtube.com") || h === "youtu.be") {
      out.platform = "YouTube";
      out.id = h === "youtu.be" ? parts[0] : (u.searchParams.get("v") || (parts[0] === "shorts" ? parts[1] : ""));
    } else if (h.endsWith("x.com") || h.endsWith("twitter.com")) {
      out.platform = "X"; out.creator = parts[0] || "";
    } else {
      out.platform = "Link";
    }
    return out;
  };

  /* normalized coverage with derived fields */
  M.cov = function (c) {
    const L = M.parseLink(c.url);
    const platforms = (c.platforms && c.platforms.length) ? c.platforms : (L.platform && L.platform !== "Link" ? [L.platform] : []);
    const creator = c.creator || L.creator || "";
    const n = v => (v === null || v === undefined || v === "" || isNaN(+v)) ? null : +v;
    const r = Object.assign({}, c, {
      link: L, platforms, creator,
      followers: n(c.followers), views: n(c.views), likes: n(c.likes), comments: n(c.comments), saves: n(c.saves)
    });
    r.er = (r.views && r.likes !== null) ? ((r.likes || 0) + (r.comments || 0) + (r.saves || 0)) / r.views * 100 : null;
    r.reach = (r.views && r.followers) ? r.views / r.followers * 100 : null;
    return r;
  };

  M.campStats = function (camp) {
    const covs = (camp.coverages || []).map(M.cov);
    const sum = k => { const v = covs.filter(c => c[k] !== null); return v.length ? v.reduce((a, c) => a + c[k], 0) : null; };
    const creators = new Set(covs.map(c => c.creator).filter(Boolean)).size + covs.filter(c => !c.creator).length;
    const s = { creators, coverages: covs.length, views: sum("views"), followers: sum("followers"), likes: sum("likes"), comments: sum("comments"), saves: sum("saves") };
    const t = camp.totals || {};
    for (const k in t) if (t[k] !== null && t[k] !== "" && t[k] !== undefined) s[k] = +t[k];
    s.er = (s.views && s.likes !== null) ? ((s.likes || 0) + (s.comments || 0) + (s.saves || 0)) / s.views * 100 : null;
    s.platforms = [...new Set(covs.flatMap(c => c.platforms))];
    return { covs, s };
  };

  M.fmt = v => (v === null || v === undefined) ? "—" : Math.round(v).toLocaleString("en-US");
  M.compact = v => {
    if (v === null || v === undefined) return "—";
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return Math.round(v / 1e3) + "K";
    return String(v);
  };
  M.pct = (v, d = 2) => v === null || v === undefined ? "—" : v.toFixed(d) + "%";
  M.esc = s => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  M.safeUrl = u => {
    if (!u) return "";
    u = String(u).trim();
    if (/^data:image\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:/i.test(u)) return "";
    return u;
  };
  M.profileUrl = (platform, h) => {
    if (!h) return "";
    if (platform === "TikTok") return "https://www.tiktok.com/@" + h;
    if (platform === "Instagram") return "https://www.instagram.com/" + h + "/";
    if (platform === "Snapchat") return "https://www.snapchat.com/add/" + h;
    if (platform === "X") return "https://x.com/" + h;
    return "";
  };

  M.DRAFT_KEY = "malaz_portfolio_draft_v1";
  M.loadData = function () {
    let d = g.PORTFOLIO || { agency: {}, campaigns: [] }, draft = false;
    try { const s = localStorage.getItem(M.DRAFT_KEY); if (s) { d = JSON.parse(s); draft = true; } } catch (e) {}
    return { data: d, draft };
  };

  g.MZ = M;
})(window);
