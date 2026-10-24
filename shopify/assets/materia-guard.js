/* Materia Themes. materia-guard: the theme activation gate, moved out of
   snippets/materia-guard so it is a cached file. The snippet writes the
   store's values into window.__materiaGuard just before loading this,
   deferred; everything else is the snippet's script as it was. */
(function () {
  var CFG      = window.__materiaGuard || {};
  var SHOP     = CFG.shop;   // stable, unique, same everywhere
  var SHOPNAME = CFG.name;
  var THEME    = CFG.theme || { id: "", name: "", role: "" };
  var API      = "https://app.materiathemes.com/api/theme";
  var HB_API   = "https://app.materiathemes.com/api/heartbeat";
  var LK       = "__MATERIA_LICENSE_KEY__"; // optional hint only — the server decides by SHOP
  var HBK      = "mt_hb_" + SHOP;           // per-session fast-path cache (never a source of truth)
  var BILLING  = "https://app.materiathemes.com/dashboard/settings/billing";
  var LOGO     = "https://storelib.com/media/images/Untitled%20design%20-%202026-07-10T094107.479.png";
  var LOGOHOST = "https://zcawjnmhkrmlnqtuqlun.supabase.co";
  var IMG      = "https://cdn.shopify.com/s/files/1/0918/6322/0561/files/Untitled_design_-_2025-04-04T150130.454.png?v=1743771704&width=1000";
  var SK       = "materia_ok_" + SHOP;
  var mode = "email", built = false, activated = false, observer = null;
  function setRec(v){ try { localStorage.setItem(SK, JSON.stringify(v)); } catch (e) {} }
  function open2(u){ try { window.open(u, "_blank", "noopener"); } catch (e) {} }
  function preload(){
    try {
      var h = document.head || document.documentElement;
      var pc = document.createElement("link"); pc.rel = "preconnect"; pc.href = LOGOHOST; pc.crossOrigin = "anonymous"; h.appendChild(pc);
      var pl = document.createElement("link"); pl.rel = "preload"; pl.as = "image"; pl.href = LOGO; h.appendChild(pl);
      var im = new Image(); im.decoding = "async"; im.src = LOGO;
    } catch (e) {}
  }
  function lockContent(gate){
    if (!document.body) return;
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el === gate || el.id === "mt-css" || el.tagName === "SCRIPT") continue;
      if (!el.getAttribute("data-mt-b")) {
        el.setAttribute("data-mt-b", "1");
        el.setAttribute("data-mt-f", el.style.filter || "");
        el.setAttribute("data-mt-p", el.style.pointerEvents || "");
        el.style.filter = "blur(7px)"; el.style.pointerEvents = "none"; el.style.userSelect = "none";
      }
    }
  }
  function unlockContent(){
    var m = document.querySelectorAll('[data-mt-b]');
    for (var i = 0; i < m.length; i++) {
      var el = m[i];
      el.style.filter = el.getAttribute("data-mt-f") || "";
      el.style.pointerEvents = el.getAttribute("data-mt-p") || "";
      el.style.userSelect = "";
      el.removeAttribute("data-mt-b"); el.removeAttribute("data-mt-f"); el.removeAttribute("data-mt-p");
    }
  }
  function css(){
    if (document.getElementById("mt-css")) return;
    var s = document.createElement("style"); s.id = "mt-css";
    s.textContent = [
      // --- 100% scope hardening: neutralise theme globals that could leak into the modal ---
      "#mt-gate,#mt-gate *{box-sizing:border-box!important}",
      "#mt-card,#mt-card *{text-transform:none!important;letter-spacing:normal!important;font-family:-apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',Roboto,sans-serif!important;float:none!important;text-shadow:none!important}",
      // --- gate + card ---
      "#mt-gate{position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(11,12,16,.55)!important;-webkit-backdrop-filter:blur(7px)!important;backdrop-filter:blur(7px)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;margin:0!important;opacity:0;transition:opacity .5s ease}",
      "#mt-gate.mt-in{opacity:1}",
      "#mt-card{display:flex!important;width:min(94%,880px)!important;max-height:92vh;background:#fff!important;border-radius:24px!important;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.38)!important;transform:translateY(12px) scale(.985);opacity:0;transition:transform .55s cubic-bezier(.2,.8,.2,1),opacity .55s ease}",
      "#mt-gate.mt-in #mt-card{transform:none;opacity:1}",
      ".mt-pane{flex:1 1 54%!important;min-width:0;padding:42px 42px 30px!important;display:flex!important;flex-direction:column!important;overflow-y:auto;text-align:left}",
      ".mt-media{flex:1 1 46%!important;min-width:0;background-image:url('" + IMG + "')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;background-color:#eaf1fb}",
      ".mt-lw{position:relative;height:46px;margin:0 0 22px!important;display:flex!important;align-items:center;justify-content:center}",
      ".mt-skel{position:absolute;width:132px;height:32px;border-radius:9px;background:#edeff2;overflow:hidden;transition:opacity .25s ease}",
      ".mt-skel::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.7),rgba(255,255,255,0));animation:mt-sh 1.15s ease-in-out infinite}",
      "@keyframes mt-sh{100%{transform:translateX(100%)}}",
      ".mt-logo{position:relative;z-index:1;height:46px!important;width:auto!important;max-width:200px!important;object-fit:contain;opacity:0;transition:opacity .5s ease;display:block;-webkit-user-select:none;user-select:none;-webkit-user-drag:none;-khtml-user-drag:none;pointer-events:none;margin:0!important}",
      ".mt-mono{position:relative;z-index:1;width:50px;height:50px;border-radius:14px;background:#111319;color:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:600;-webkit-user-select:none;user-select:none;pointer-events:none}",
      ".mt-h{font-size:36px!important;font-weight:700!important;line-height:1.08!important;color:#0e1116!important;margin:0 0 10px!important;text-align:center!important}",
      ".mt-sub{font-size:14.5px!important;color:#767b85!important;line-height:1.55!important;margin:0 0 24px!important;text-align:center!important}",
      ".mt-field{transition:opacity .28s ease,transform .28s ease}",
      ".mt-field.mt-swap{opacity:0;transform:translateY(4px)}",
      // --- the email / key input: fully self-styled + rounded, immune to theme input rules ---
      ".mt-input{display:block!important;width:100%!important;height:50px!important;min-height:50px!important;max-width:none!important;border:1px solid #dfe3ea!important;border-radius:14px!important;background:#f7f8fb!important;padding:0 17px!important;margin:0!important;font-size:15px!important;line-height:normal!important;color:#0e1116!important;outline:none!important;box-shadow:none!important;-webkit-appearance:none!important;appearance:none!important;text-align:left!important;transition:border-color .15s,box-shadow .15s,background .15s}",
      ".mt-input:focus{border-color:#2f6bff!important;background:#fff!important;box-shadow:0 0 0 3px rgba(47,107,255,.15)!important}",
      ".mt-help{font-size:12.5px!important;color:#9096a0!important;margin-top:9px!important;line-height:1.45!important;text-align:center!important}",
      ".mt-err{display:none;font-size:12.5px!important;color:#d64545!important;margin-top:10px!important;text-align:center!important}",
      ".mt-btn{display:block!important;width:100%!important;height:50px!important;min-height:50px!important;margin:18px 0 0!important;background:#2f6bff!important;color:#fff!important;border:none!important;border-radius:13px!important;font-size:15px!important;font-weight:550!important;line-height:normal!important;text-transform:none!important;cursor:pointer;transition:background .15s,transform .1s}",
      ".mt-btn:hover{background:#2357db!important}",
      ".mt-btn:active{transform:scale(.99)}",
      ".mt-up{display:block!important;width:100%!important;height:46px!important;min-height:46px!important;margin:10px 0 0!important;background:#fff!important;color:#3a4150!important;border:1px solid #e6e8ee!important;border-radius:13px!important;font-size:14px!important;font-weight:550!important;line-height:normal!important;text-transform:none!important;cursor:pointer;transition:background .15s}",
      ".mt-up:hover{background:#f6f7f9!important}",
      ".mt-foot{display:flex!important;flex-direction:column!important;align-items:center;gap:9px;margin-top:20px!important;padding-top:16px!important;border-top:1px solid #f0f1f4!important}",
      ".mt-toggle{font-size:13px!important;color:#8b909b!important;cursor:pointer;transition:color .15s}",
      ".mt-toggle:hover{color:#2f6bff!important}",
      ".mt-find{display:none;font-size:13px!important;color:#2f6bff!important;text-decoration:none;cursor:pointer}",
      ".mt-find:hover{text-decoration:underline}",
      ".mt-ok{display:none;flex-direction:column;align-items:center;text-align:center;padding:6px 0}",
      ".mt-okc{width:56px;height:56px;border-radius:50%;background:#eafaf0;color:#1a9d55;display:flex;align-items:center;justify-content:center;font-size:29px;margin-bottom:14px}",
      "@media (max-width:720px){#mt-card{flex-direction:column!important;width:min(94%,420px)!important;max-height:90vh}.mt-media{display:none!important}.mt-pane{flex:1 1 auto!important;padding:34px 26px 26px!important}.mt-h{font-size:30px!important}}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }
  function wireLogo(g){
    var logo = g.querySelector("#mt-logo"), skel = g.querySelector("#mt-skel"), mono = g.querySelector("#mt-mono");
    if (!logo) return;
    function lok(){ if (skel) { skel.style.opacity = "0"; setTimeout(function(){ if (skel) skel.style.display = "none"; }, 260); } logo.style.opacity = "1"; }
    function lfail(){ if (skel) skel.style.display = "none"; logo.style.display = "none"; if (mono) mono.style.display = "flex"; }
    if (logo.complete) { if (logo.naturalWidth > 0) lok(); else lfail(); }
    else {
      logo.addEventListener("load", lok);
      logo.addEventListener("error", lfail);
      setTimeout(function(){ if (logo.style.opacity !== "1" && logo.style.display !== "none") lfail(); }, 8000);
    }
  }
  function build(){
    if (built || activated) return;
    css();
    var g = document.createElement("div"); g.id = "mt-gate";
    g.innerHTML =
      '<div id="mt-card" role="dialog" aria-modal="true" aria-label="Activate Materia">' +
        '<div class="mt-pane">' +
          '<div class="mt-lw">' +
            '<div class="mt-skel" id="mt-skel"></div>' +
            '<img class="mt-logo" id="mt-logo" src="' + LOGO + '" alt="Materia" decoding="async" fetchpriority="high" draggable="false" oncontextmenu="return false">' +
            '<div class="mt-mono" id="mt-mono" style="display:none">M</div>' +
          '</div>' +
          '<div class="mt-h">Activate Materia</div>' +
          '<div class="mt-sub">Activate your license to start using this theme.</div>' +
          '<div class="mt-field" id="mt-field">' +
            '<input class="mt-input" id="mt-input" type="email" placeholder="Email address" autocomplete="email">' +
            '<div class="mt-help" id="mt-help">Enter the email address you used to purchase the theme.</div>' +
          '</div>' +
          '<div class="mt-err" id="mt-err"></div>' +
          '<button class="mt-btn" id="mt-activate" type="button">Activate</button>' +
          '<button class="mt-up" id="mt-upgrade" type="button">Upgrade your plan</button>' +
          '<div class="mt-foot">' +
            '<span class="mt-toggle" id="mt-toggle">Activate using license key</span>' +
            '<span class="mt-find" id="mt-find">Can\u2019t find your license key?</span>' +
          '</div>' +
          '<div class="mt-ok" id="mt-ok">' +
            '<div class="mt-okc">\u2713</div>' +
            '<div style="font-size:19px;font-weight:600;color:#0e1116;margin-bottom:5px">Activation complete</div>' +
            '<div style="font-size:14px;color:#767b85;line-height:1.5">This store is now licensed to run Materia.</div>' +
          '</div>' +
        '</div>' +
        '<div class="mt-media" aria-hidden="true"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(g);
    try { document.documentElement.style.overflow = "hidden"; } catch (e) {}
    lockContent(g);
    wireLogo(g);
    built = true;
    requestAnimationFrame(function(){ g.classList.add("mt-in"); });
    wire(g);
    observe();
  }
  function msgFor(res){
    if (res && res.message) return res.message;
    var c = res && (res.code || (typeof res.error === "string" ? res.error : null));
    if (c === "store_limit") return "This license is already active on another store. Starter includes one store — upgrade to Pro for unlimited stores.";
    if (c === "not_found" || c === "invalid_email" || c === "no_purchase") return "We couldn\u2019t find a purchase for that email. Check the email you bought with, or use your license key.";
    if (c === "invalid_key") return "That license key isn\u2019t valid. Copy it exactly from your Materia billing page.";
    if (c === "refunded" || c === "revoked") return "This license is no longer active. Contact support to continue.";
    if (c === "blocked" || c === "disabled") return "This store has been disabled \u2014 contact support.";
    return "We couldn\u2019t verify that. Check your details and try again.";
  }
  function wire(g){
    var input  = g.querySelector("#mt-input"), help = g.querySelector("#mt-help"),
        toggle = g.querySelector("#mt-toggle"), find = g.querySelector("#mt-find"),
        field  = g.querySelector("#mt-field"), err = g.querySelector("#mt-err"),
        btn    = g.querySelector("#mt-activate");
    function showErr(m){ err.textContent = m; err.style.display = "block"; }
    function clr(){ err.style.display = "none"; }
    toggle.addEventListener("click", function(){
      field.classList.add("mt-swap");
      setTimeout(function(){
        clr();
        if (mode === "email") {
          mode = "key"; input.type = "text"; input.placeholder = "MATERIA-XXXX-XXXX-XXXX"; input.value = "";
          help.textContent = "Paste the license key from your Materia billing page.";
          toggle.textContent = "Activate using email instead"; find.style.display = "inline-block";
        } else {
          mode = "email"; input.type = "email"; input.placeholder = "Email address"; input.value = "";
          help.textContent = "Enter the email address you used to purchase the theme.";
          toggle.textContent = "Activate using license key"; find.style.display = "none";
        }
        field.classList.remove("mt-swap");
      }, 200);
    });
    g.querySelector("#mt-upgrade").addEventListener("click", function(){ open2(BILLING); });
    find.addEventListener("click", function(){ open2(BILLING); });
    btn.addEventListener("click", function(){
      clr();
      var v = (input.value || "").trim();
      if (!v) { showErr(mode === "email" ? "Enter your purchase email." : "Enter your license key."); return; }
      if (mode === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { showErr("That email looks invalid."); return; }
      if (mode === "key" && v.length < 4) { showErr("That license key looks too short."); return; }
      btn.textContent = "Activating\u2026"; btn.disabled = true;
      var body = { shop: SHOP, shopName: SHOPNAME, themeId: THEME.id, themeName: THEME.name, themeRole: THEME.role, method: mode };
      if (mode === "email") body.email = v; else body.key = v;
      fetch(API + "/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "omit"
      })
      .then(function(r){ var st = r.status; return r.text().then(function(t){ var d = null; try { d = JSON.parse(t); } catch (e) {} return { st: st, d: d, raw: t }; }); })
      .then(function(o){
        var res = o.d;
        var ok = res && (res.ok === true || res.success === true || res.activated === true || res.valid === true);
        if (ok) {
          var token = res.token || res.activation_token || (res.data && res.data.token) || null;
          var plan  = res.plan  || (res.data && res.data.plan) || null;
          setRec({ activated: true, token: token, plan: plan, at: Date.now() });
          try { sessionStorage.setItem(HBK, "ok"); } catch (e) {}
          success(g); return;
        }
        try { console.warn("[Materia] activation rejected — HTTP " + o.st + " —", o.raw); } catch (e) {}
        btn.textContent = "Activate"; btn.disabled = false;
        showErr(res ? msgFor(res) : (o.st >= 500 ? "Activation server error — please try again shortly." : "We couldn\u2019t verify that. Check your details and try again."));
      })
      .catch(function(e){
        try { console.warn("[Materia] activation network error —", e); } catch (_) {}
        btn.textContent = "Activate"; btn.disabled = false;
        showErr("Couldn\u2019t reach the activation server. Check your connection and try again.");
      });
    });
  }
  function success(g){
    activated = true;
    try { sessionStorage.setItem(HBK, "ok"); } catch (e) {}
    try { document.documentElement.style.overflow = ""; } catch (e) {}
    // Pin the modal's current size BEFORE swapping to the confirmation so the card — and
    // the image panel beside it — keep their dimensions instead of collapsing.
    var pane = g.querySelector(".mt-pane");
    if (pane) { pane.style.height = pane.offsetHeight + "px"; pane.style.minHeight = pane.offsetHeight + "px"; }
    ["#mt-field", "#mt-err", "#mt-activate", "#mt-upgrade", ".mt-foot", ".mt-sub", ".mt-h"].forEach(function(sel){
      var el = g.querySelector(sel); if (el) el.style.display = "none";
    });
    var ok = g.querySelector("#mt-ok");
    ok.style.display = "flex";
    ok.style.margin = "auto 0";
    setTimeout(function(){ teardown(g); }, 1600);
  }
  function teardown(g){
    if (observer) { observer.disconnect(); observer = null; }
    unlockContent();
    g.classList.remove("mt-in");
    setTimeout(function(){
      try { g.parentNode && g.parentNode.removeChild(g); } catch (e) {}
      try { document.documentElement.style.overflow = ""; } catch (e) {}
      built = false;
    }, 500);
  }
  function observe(){
    if (observer || !("MutationObserver" in window)) return;
    observer = new MutationObserver(function(){
      if (activated) return;
      if (!document.getElementById("mt-gate")) { built = false; build(); }
      else { lockContent(document.getElementById("mt-gate")); }
    });
    try { observer.observe(document.body || document.documentElement, { childList: true }); } catch (e) {}
  }
  // Authoritative, per-shop licence check — keyed on the shop domain, NOT the browser.
  // The gate can appear ONLY when the server recognises this shop and explicitly says it
  // is not licensed. activated:true, an unrecognised/blank response, missing fields, a
  // non-JSON body, a timeout or a network error ALL fail OPEN, so a licensed storefront
  // is never blocked in incognito, on a custom domain, on a new device or anywhere else.
  function serverStatus(cb){
    var cached = null; try { cached = sessionStorage.getItem(HBK); } catch (e) {}
    if (cached === "ok") return cb("ok");
    var done = false;
    // persist === true ONLY when the server has EXPLICITLY confirmed this shop is licensed.
    // A fail-open outcome (timeout, network/parse error, ambiguous body) must NEVER be cached
    // as "ok" — otherwise one slow first heartbeat (e.g. a Vercel cold start) would suppress
    // the gate for the whole session on a store that is genuinely unlicensed. Fail-open still
    // means "don't block THIS page load", but the very next navigation re-checks the server.
    function finish(v, persist){
      if (done) return; done = true; clearTimeout(tm);
      if (v === "ok" && persist) { try { sessionStorage.setItem(HBK, "ok"); } catch (e) {} }
      cb(v);
    }
    var tm = setTimeout(function(){ finish("ok", false); }, 6000); // stalled network → FAIL OPEN, do NOT cache
    try {
      fetch(HB_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: LK, s: SHOP, n: SHOPNAME, t: THEME.id, tn: THEME.name, r: THEME.role }),
        credentials: "omit",
        cache: "no-store",
        keepalive: true
      })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if (done) return;
        var licensed  = res && res.activated === true;
        var blockedEx = res && (res.activated === false || res.blocked === true);
        if (licensed) finish("ok", true);            // server CONFIRMED licensed → cache for the session
        else if (blockedEx) finish("blocked", false); // server SAID not licensed / disabled → show gate
        else finish("ok", false);                     // ambiguous/blank body → FAIL OPEN, do NOT cache
      })
      .catch(function(){ finish("ok", false); }); // network / parse error → FAIL OPEN, do NOT cache
    } catch (e) { finish("ok", false); }
  }
  function init(){
    preload();
    // Always send the heartbeat so this store registers in your Stores tab — even inside the
    // theme editor and even before it is activated. But NEVER show the gate while the merchant
    // is customising in the editor (designMode); only a live, server-confirmed-unlicensed
    // store is ever gated.
    var design = !!(window.Shopify && window.Shopify.designMode);
    serverStatus(function(status){
      if (!design || status !== "blocked") { activated = true; return; }
      setTimeout(build, 300);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
