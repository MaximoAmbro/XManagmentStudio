/*
 * XManagmentStudio 1.0 - Modulo 1, Mi cuenta.
 * Corre en x.com dentro de la sesion del usuario. Requiere window.XMS_CONFIG (config.js).
 * No usa la API de X ni credenciales. Lee y actua sobre el DOM.
 */
(function () {
  'use strict';

  var C = window.XMS_CONFIG;
  if (!C) {
    window.alert('XManagmentStudio: falta config.js.');
    return;
  }
  if (!/(^|\.)(x|twitter)\.com$/.test(location.hostname)) {
    window.alert('XManagmentStudio: abrí x.com con tu sesión iniciada y volvé a ejecutarlo.');
    return;
  }
  if (window.__XMS__) {
    window.__XMS__.show();
    return;
  }

  var SEL = C.selectors;
  var K = C.storage;
  var T = C.timing;
  var INSTANCE_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ------------------------------------------------------------------ */
  /* Errores de control                                                  */
  /* ------------------------------------------------------------------ */

  function WarnError(reason) { this.name = 'WarnError'; this.message = reason; }
  WarnError.prototype = Object.create(Error.prototype);

  function StopError() { this.name = 'StopError'; this.message = 'Detenido por el usuario'; }
  StopError.prototype = Object.create(Error.prototype);

  /* ------------------------------------------------------------------ */
  /* Almacenamiento                                                      */
  /* ------------------------------------------------------------------ */

  function load(key, fallback, store) {
    try {
      var raw = (store || localStorage).getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value, store) {
    try {
      (store || localStorage).setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logMsg('No se pudo guardar ' + key + ': ' + e.message);
      return false;
    }
  }

  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function getSettings() {
    var s = load(K.settings, {});
    return {
      perSession: toPosInt(s.perSession, C.limits.perSession),
      perDay: toPosInt(s.perDay, C.limits.perDay)
    };
  }

  function toPosInt(v, fallback) {
    var n = parseInt(v, 10);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function getDaily() {
    var d = load(K.daily, null);
    if (!d || d.date !== todayKey()) {
      d = { date: todayKey(), count: 0 };
      save(K.daily, d);
    }
    return d;
  }

  function incDaily() {
    var d = getDaily();
    d.count += 1;
    save(K.daily, d);
    return d.count;
  }

  function getSessionCount() {
    var s = load(K.session, { count: 0 }, sessionStorage);
    return s.count || 0;
  }

  function incSession() {
    var n = getSessionCount() + 1;
    save(K.session, { count: n }, sessionStorage);
    return n;
  }

  function getHistory() { return load(K.history, []); }

  function addHistory(user, action, status, detail) {
    var h = getHistory();
    h.push({ user: user, action: action, status: status, detail: detail || '', at: new Date().toISOString() });
    if (h.length > C.historyMax) h = h.slice(h.length - C.historyMax);
    return save(K.history, h);
  }

  // Estados que cierran una cuenta: no se vuelve a actuar sobre ella.
  var FINAL_STATUSES = { ok: true, already: true, mutual: true };

  function doneSet() {
    var set = {};
    getHistory().forEach(function (e) {
      if (e.action === 'unfollow' && FINAL_STATUSES[e.status]) set[e.user.toLowerCase()] = e.status;
    });
    return set;
  }

  function logError(context, message) {
    var list = load(K.errors, []);
    list.push({ context: context, message: message, at: new Date().toISOString() });
    if (list.length > C.errorsMax) list = list.slice(list.length - C.errorsMax);
    save(K.errors, list);
  }

  var scanCache;

  function getScan() {
    if (scanCache === undefined) scanCache = load(K.scan, null);
    return scanCache;
  }

  function getQueue() { return load(K.queue, null); }

  function saveQueue(q) {
    if (!q || !q.items || q.items.length === 0) {
      try { localStorage.removeItem(K.queue); } catch (e) { /* sin acceso */ }
      return;
    }
    save(K.queue, q);
  }

  // Quita de la cola lo que el historial ya da por cerrado.
  function reconcileQueue() {
    var q = getQueue();
    if (!q) return null;
    var done = doneSet();
    q.items = q.items.filter(function (u) { return !done[u.toLowerCase()]; });
    saveQueue(q);
    return q.items.length ? q : null;
  }

  function getPState() {
    return load(K.state, { status: 'idle', reason: '', sinceLong: 0, longAt: 0 });
  }

  function setPState(patch) {
    var s = getPState();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    save(K.state, s);
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Bloqueo: un solo proceso activo                                     */
  /* ------------------------------------------------------------------ */

  var heartbeat = null;

  function acquireLock() {
    var l = load(K.lock, null);
    if (l && l.id !== INSTANCE_ID && Date.now() - l.ts < C.lockStaleMs) return false;
    save(K.lock, { id: INSTANCE_ID, ts: Date.now() });
    heartbeat = setInterval(function () {
      save(K.lock, { id: INSTANCE_ID, ts: Date.now() });
    }, Math.floor(C.lockStaleMs / 4));
    return true;
  }

  function releaseLock() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    var l = load(K.lock, null);
    if (l && l.id === INSTANCE_ID) {
      try { localStorage.removeItem(K.lock); } catch (e) { /* sin acceso */ }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Observacion de red                                                  */
  /* ------------------------------------------------------------------ */

  var net = { watching: false, flag: null };

  function watchedUrl(url) {
    url = String(url || '');
    return C.network.watchPatterns.some(function (p) { return url.indexOf(p) !== -1; });
  }

  function flagNet(reason) {
    if (net.watching && !net.flag) net.flag = reason;
  }

  (function patchNetwork() {
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input) {
        var url = typeof input === 'string' ? input : (input && input.url);
        return origFetch.apply(this, arguments).then(function (res) {
          if (res && res.status === 429 && watchedUrl(url)) flagNet('HTTP 429 en ' + shortUrl(url));
          return res;
        }, function (err) {
          if (err && err.name !== 'AbortError' && watchedUrl(url)) flagNet('Error de red en ' + shortUrl(url));
          throw err;
        });
      };
    }
    var XO = XMLHttpRequest.prototype.open;
    var XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__xmsUrl = url;
      return XO.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      if (watchedUrl(xhr.__xmsUrl)) {
        xhr.addEventListener('load', function () {
          if (xhr.status === 429) flagNet('HTTP 429 en ' + shortUrl(xhr.__xmsUrl));
        });
        xhr.addEventListener('error', function () {
          flagNet('Error de red en ' + shortUrl(xhr.__xmsUrl));
        });
      }
      return XS.apply(this, arguments);
    };
  })();

  function shortUrl(url) {
    try {
      var u = new URL(url, location.origin);
      return u.pathname.split('/').slice(-1)[0] || u.pathname;
    } catch (e) {
      return String(url).slice(0, 60);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Deteccion de advertencias                                           */
  /* ------------------------------------------------------------------ */

  var blockedRe = C.blockedPaths.map(function (p) { return new RegExp(p, 'i'); });
  var warnTexts = C.warningTexts.map(function (t) { return t.toLowerCase(); });

  function detectWarning() {
    if (net.flag) return net.flag;
    var path = location.pathname;
    for (var i = 0; i < blockedRe.length; i++) {
      if (blockedRe[i].test(path)) return 'Redirección a ' + path;
    }
    var nodes = document.querySelectorAll([SEL.toast, SEL.alert, SEL.sheetDialog, SEL.errorDetail].join(','));
    for (var j = 0; j < nodes.length; j++) {
      if (nodes[j].closest('#' + C.ui.rootId)) continue;
      var text = (nodes[j].textContent || '').toLowerCase();
      for (var k = 0; k < warnTexts.length; k++) {
        if (text.indexOf(warnTexts[k]) !== -1) return 'Mensaje de X: "' + text.trim().slice(0, 120) + '"';
      }
    }
    return null;
  }

  function guard() {
    if (run.stopRequested) throw new StopError();
    var w = detectWarning();
    if (w) throw new WarnError(w);
  }

  /* ------------------------------------------------------------------ */
  /* Esperas                                                             */
  /* ------------------------------------------------------------------ */

  function rand(range) {
    return Math.floor(range.min + Math.random() * (range.max - range.min + 1));
  }

  function sleep(ms, label) {
    var end = Date.now() + ms;
    if (label) { run.waitUntil = end; run.waitLabel = label; }
    return new Promise(function (resolve, reject) {
      (function tick() {
        try { guard(); } catch (e) { clearWait(label); reject(e); return; }
        var left = end - Date.now();
        if (left <= 0) { clearWait(label); resolve(); return; }
        setTimeout(tick, Math.min(250, left));
      })();
    });
  }

  function clearWait(label) {
    if (label) { run.waitUntil = 0; run.waitLabel = ''; }
  }

  function waitFor(fn, timeout, what) {
    var end = Date.now() + timeout;
    return new Promise(function (resolve, reject) {
      (function tick() {
        try { guard(); } catch (e) { reject(e); return; }
        var v;
        try { v = fn(); } catch (e) { v = null; }
        if (v) { resolve(v); return; }
        if (Date.now() > end) { reject(new Error('Tiempo agotado esperando ' + what)); return; }
        setTimeout(tick, 250);
      })();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navegacion dentro de la SPA                                          */
  /* ------------------------------------------------------------------ */

  function route(name, user) {
    return C.routes[name].replace('{user}', user);
  }

  function samePath(a, b) {
    return a.replace(/\/+$/, '').toLowerCase() === b.replace(/\/+$/, '').toLowerCase();
  }

  function navigate(path) {
    if (samePath(location.pathname, path)) return;
    var link = document.querySelector(SEL.linkByHref.replace('{path}', path));
    if (link && !link.closest('#' + C.ui.rootId)) {
      link.click();
      if (samePath(location.pathname, path)) return;
    }
    history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }

  function getMe() {
    var a = document.querySelector(SEL.ownProfileLink);
    if (!a) return null;
    var m = (a.getAttribute('href') || '').match(new RegExp(C.handlePattern));
    return m ? m[1] : null;
  }

  /* ------------------------------------------------------------------ */
  /* Escaneo                                                             */
  /* ------------------------------------------------------------------ */

  var handleRe = new RegExp(C.handlePattern);

  function readCells(into) {
    var col = document.querySelector(SEL.primaryColumn);
    if (!col) return 0;
    var cells = col.querySelectorAll(SEL.userCell);
    var added = 0;
    for (var i = 0; i < cells.length; i++) {
      var links = cells[i].querySelectorAll(SEL.userCellLink);
      var handle = null, name = '';
      for (var j = 0; j < links.length; j++) {
        var m = (links[j].getAttribute('href') || '').match(handleRe);
        if (m) {
          handle = m[1];
          name = (links[j].textContent || '').trim();
          break;
        }
      }
      if (!handle) continue;
      var key = handle.toLowerCase();
      var followsYou = !!cells[i].querySelector(SEL.followIndicator);
      if (!into[key]) {
        into[key] = { handle: handle, name: name, followsYou: followsYou };
        added++;
      } else if (followsYou) {
        into[key].followsYou = true;
      }
    }
    return added;
  }

  async function scanList(kind, me) {
    var path = route(kind, me);
    var label = kind === 'following' ? 'following' : 'followers';
    navigate(path);
    await waitFor(function () { return samePath(location.pathname, path); }, T.navTimeout, 'la ruta ' + path);
    await sleep(rand(T.readDelay));
    await waitFor(function () {
      var col = document.querySelector(SEL.primaryColumn);
      return col && (col.querySelector(SEL.userCell) || col.querySelector(SEL.emptyState));
    }, T.navTimeout, 'la lista de ' + label);

    window.scrollTo(0, 0);
    await sleep(rand(T.readDelay));

    var found = {};
    var stall = 0;
    for (var round = 0; round < C.scan.maxRounds; round++) {
      var added = readCells(found);
      run.scanCount = Object.keys(found).length;
      run.scanLabel = label;
      render();
      if (added === 0) stall++; else stall = 0;
      var atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;
      if (stall >= C.scan.maxStallRounds && atBottom) break;
      if (stall >= C.scan.maxStallRounds * 3) break;
      window.scrollBy(0, Math.floor(window.innerHeight * C.scan.scrollFactor));
      await sleep(rand(T.readDelay), 'Lectura');
    }
    readCells(found);
    return found;
  }

  async function withRetry(context, fn) {
    var attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof WarnError || e instanceof StopError) throw e;
        if (attempt >= T.maxRetries) {
          logError(context, e.message);
          throw e;
        }
        var wait = T.retryBase * Math.pow(T.retryFactor, attempt);
        attempt++;
        logMsg(context + ': ' + e.message + '. Reintento ' + attempt + ' de ' + T.maxRetries + '.');
        await sleep(wait, 'Reintento');
      }
    }
  }

  async function doScan() {
    var me = getMe();
    if (!me) throw new Error('No se encontró el usuario de la sesión. Abrí x.com/home y probá de nuevo.');
    run.me = me;
    logMsg('Escaneando following de @' + me + '.');
    var following = await withRetry('Escaneo following', function () { return scanList('following', me); });
    logMsg('Following: ' + Object.keys(following).length + ' cuentas. Escaneando followers.');
    var followers = await withRetry('Escaneo followers', function () { return scanList('followers', me); });
    logMsg('Followers: ' + Object.keys(followers).length + ' cuentas.');

    var nonMutuals = [];
    Object.keys(following).forEach(function (key) {
      var f = following[key];
      if (followers[key] || f.followsYou) return;
      nonMutuals.push({ handle: f.handle, name: f.name });
    });
    nonMutuals.sort(function (a, b) { return a.handle.toLowerCase() < b.handle.toLowerCase() ? -1 : 1; });

    var scan = {
      me: me,
      at: new Date().toISOString(),
      followingCount: Object.keys(following).length,
      followersCount: Object.keys(followers).length,
      nonMutuals: nonMutuals
    };
    save(K.scan, scan);
    scanCache = scan;
    selected = {};
    logMsg('Non-mutuals: ' + nonMutuals.length + '.');
  }

  /* ------------------------------------------------------------------ */
  /* Dejar de seguir                                                     */
  /* ------------------------------------------------------------------ */

  function isDisabled(btn) {
    return btn.disabled || btn.getAttribute('aria-disabled') === 'true';
  }

  function profileButtons() {
    var col = document.querySelector(SEL.primaryColumn);
    if (!col) return null;
    var box = col.querySelector(SEL.profileActions);
    if (!box) return null;
    return {
      unfollow: box.querySelector(SEL.unfollowButton),
      follow: box.querySelector(SEL.followButton)
    };
  }

  // Devuelve 'ok' (accion de escritura hecha), 'already' o 'mutual' (sin escritura).
  async function unfollowOne(handle) {
    var path = route('profile', handle);
    navigate(path);
    await waitFor(function () {
      if (!samePath(location.pathname, path)) return false;
      var col = document.querySelector(SEL.primaryColumn);
      var un = col && col.querySelector(SEL.profileUserName);
      if (!un || (un.textContent || '').toLowerCase().indexOf('@' + handle.toLowerCase()) === -1) return false;
      var b = profileButtons();
      return b && (b.unfollow || b.follow);
    }, T.navTimeout, 'el perfil de @' + handle);

    var col = document.querySelector(SEL.primaryColumn);
    var nameBox = col.querySelector(SEL.profileUserName);
    if (nameBox && nameBox.querySelector(SEL.followIndicator)) return 'mutual';

    var b = profileButtons();
    if (!b.unfollow && b.follow) return 'already';
    if (isDisabled(b.unfollow)) throw new WarnError('Botón de dejar de seguir deshabilitado en @' + handle);

    b.unfollow.click();
    await sleep(rand(T.clickSettle));
    var confirm = await waitFor(function () { return document.querySelector(SEL.confirmUnfollow); },
      T.elementTimeout, 'la confirmación de X');
    if (isDisabled(confirm)) throw new WarnError('Confirmación deshabilitada en @' + handle);
    confirm.click();

    try {
      await waitFor(function () {
        var bb = profileButtons();
        return bb && bb.follow && !bb.unfollow;
      }, T.confirmTimeout, 'el cambio de estado en @' + handle);
    } catch (e) {
      // Si la advertencia llega despues de que la accion se completo, se registra igual.
      var after = profileButtons();
      if (e instanceof WarnError && after && after.follow && !after.unfollow) e.completed = true;
      throw e;
    }
    return 'ok';
  }

  function buildTargets(mode) {
    var scan = getScan();
    if (!scan) return null;
    var done = doneSet();
    var pending = scan.nonMutuals.filter(function (u) { return !done[u.handle.toLowerCase()]; });
    if (mode === 'all') return pending.map(function (u) { return u.handle; });
    if (mode === 'selected') return pending.filter(function (u) { return selected[u.handle.toLowerCase()]; }).map(function (u) { return u.handle; });
    if (mode === 'except') return pending.filter(function (u) { return !selected[u.handle.toLowerCase()]; }).map(function (u) { return u.handle; });
    return [];
  }

  function capReason() {
    var s = getSettings();
    if (getSessionCount() >= s.perSession) return 'Tope de sesión alcanzado (' + s.perSession + '). Abrí una pestaña nueva o subí el tope.';
    if (getDaily().count >= s.perDay) return 'Tope diario alcanzado (' + s.perDay + '). La cola queda guardada para mañana.';
    return null;
  }

  async function processQueue() {
    var ps = getPState();
    if (!ps.longAt) ps = setPState({ sinceLong: 0, longAt: rand(T.longPauseEvery) });

    for (;;) {
      var q = reconcileQueue();
      if (!q) break;

      var cap = capReason();
      if (cap) {
        setStatus('stopped_cap', cap);
        return;
      }

      var handle = q.items[0];
      setStatus('running', 'Procesando @' + handle + '. Quedan ' + q.items.length + '.');

      var result;
      try {
        result = await withRetry('Dejar de seguir @' + handle, function () { return unfollowOne(handle); });
      } catch (e) {
        if (e instanceof WarnError && e.completed) {
          addHistory(handle, 'unfollow', 'ok');
          q.items.shift();
          saveQueue(q);
          markRow(handle);
          incSession();
          incDaily();
          setPState({ sinceLong: (getPState().sinceLong || 0) + 1 });
        }
        if (e instanceof WarnError || e instanceof StopError) throw e;
        addHistory(handle, 'unfollow', 'error', e.message);
        setStatus('paused_error', 'Falló @' + handle + ' tras ' + T.maxRetries + ' reintentos: ' + e.message);
        return;
      }

      // Primero el historial, despues la cola. Si algo corta entre ambos,
      // reconcileQueue limpia la cola en la siguiente vuelta.
      addHistory(handle, 'unfollow', result);
      q.items.shift();
      saveQueue(q);
      markRow(handle, result);

      if (result === 'ok') {
        incSession();
        incDaily();
        ps = setPState({ sinceLong: (getPState().sinceLong || 0) + 1 });
        logMsg('Dejaste de seguir a @' + handle + '.');
      } else if (result === 'already') {
        logMsg('@' + handle + ' ya no estaba en tu following.');
      } else {
        logMsg('@' + handle + ' te sigue. Se omite.');
      }
      render();

      if (!reconcileQueue()) break;
      if (capReason()) continue;

      if (result === 'ok' && ps.sinceLong >= ps.longAt) {
        setStatus('long_pause', 'Pausa larga.');
        await sleep(rand(T.longPauseDuration), 'Pausa larga');
        ps = setPState({ sinceLong: 0, longAt: rand(T.longPauseEvery) });
        setStatus('running', '');
      } else if (result === 'ok') {
        await sleep(rand(T.writeDelay), 'Próxima acción');
      } else {
        await sleep(rand(T.readDelay), 'Lectura');
      }
    }
    setStatus('idle', 'Cola terminada.');
  }

  /* ------------------------------------------------------------------ */
  /* Ejecucion de procesos                                               */
  /* ------------------------------------------------------------------ */

  var run = {
    active: false,
    kind: '',
    stopRequested: false,
    waitUntil: 0,
    waitLabel: '',
    scanCount: 0,
    scanLabel: '',
    me: null
  };

  var selected = {};

  function setStatus(status, reason) {
    setPState({ status: status, reason: reason || '' });
    if (reason) logMsg(reason);
    render();
  }

  async function startProcess(kind, fn) {
    if (run.active) { logMsg('Ya hay un proceso activo.'); return; }
    if (!acquireLock()) { logMsg('Hay otro proceso activo en otra pestaña.'); return; }
    run.active = true;
    run.kind = kind;
    run.stopRequested = false;
    net.flag = null;
    net.watching = true;
    setStatus('running', '');
    try {
      await fn();
      if (getPState().status === 'running') setStatus('idle', kind === 'scan' ? 'Escaneo terminado.' : '');
    } catch (e) {
      if (e instanceof WarnError) {
        setStatus('stopped_warning', 'Detenido por advertencia: ' + e.message + '. Revisá tu cuenta antes de reanudar.');
        logError(kind, e.message);
      } else if (e instanceof StopError) {
        setStatus('stopped_user', 'Detenido por el usuario.');
      } else {
        setStatus('paused_error', 'Error: ' + e.message);
        logError(kind, e.message);
      }
    } finally {
      net.watching = false;
      run.active = false;
      run.kind = '';
      run.waitUntil = 0;
      run.scanCount = 0;
      releaseLock();
      render();
    }
  }

  function startQueue(mode) {
    if (run.active) { logMsg('Ya hay un proceso activo.'); return; }
    var targets = buildTargets(mode);
    if (!targets) { logMsg('Primero escaneá tu cuenta.'); return; }
    if (targets.length === 0) { logMsg('No hay cuentas para procesar con esa opción.'); return; }
    var cap = capReason();
    if (cap) { setStatus('stopped_cap', cap); return; }
    saveQueue({ mode: mode, items: targets, total: targets.length, createdAt: new Date().toISOString() });
    logMsg('Cola creada: ' + targets.length + ' cuentas.');
    startProcess('queue', processQueue);
  }

  function resumeQueue() {
    if (run.active) return;
    if (!reconcileQueue()) { logMsg('No hay cola pendiente.'); render(); return; }
    startProcess('queue', processQueue);
  }

  function discardQueue() {
    if (run.active) return;
    saveQueue(null);
    setStatus('idle', 'Cola descartada.');
  }

  function stopProcess() {
    if (run.active) run.stopRequested = true;
  }

  /* ------------------------------------------------------------------ */
  /* Interfaz                                                            */
  /* ------------------------------------------------------------------ */

  var ui = {};
  var logLines = [];

  function logMsg(text) {
    var d = new Date();
    var ts = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    logLines.push(ts + '  ' + text);
    if (logLines.length > 60) logLines.shift();
    if (ui.log) {
      ui.log.textContent = logLines.slice(-8).join('\n');
      ui.log.scrollTop = ui.log.scrollHeight;
    }
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') el.textContent = attrs[k];
        else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { el.addEventListener(ev, attrs.on[ev]); });
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
    '.p{position:fixed;top:12px;right:12px;width:' + C.ui.width + 'px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);display:flex;flex-direction:column;background:#000;color:#E7E9EA;border:1px solid #1E3558;border-radius:10px;font-size:13px;line-height:1.4;box-shadow:0 8px 32px rgba(0,0,0,.6);overflow:hidden}',
    '.hd{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#0B1F3A;border-bottom:1px solid #1E3558}',
    '.hd b{font-size:14px;font-weight:600;letter-spacing:.2px}',
    '.hd span{color:#8FA3BF;font-size:12px;margin-left:6px}',
    '.x{background:none;border:0;color:#8FA3BF;cursor:pointer;font-size:16px;padding:0 4px}',
    '.x:hover{color:#E7E9EA}',
    '.st{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;padding:10px 12px;border-bottom:1px solid #16263F}',
    '.st div{display:flex;justify-content:space-between;gap:8px}',
    '.st em{font-style:normal;color:#8FA3BF}',
    '.st .full{grid-column:1 / -1}',
    '.s-running{color:#7FB3FF}.s-warn{color:#FF8A80}.s-pause{color:#E6C27A}',
    '.sec{padding:10px 12px;border-bottom:1px solid #16263F}',
    '.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.muted{color:#8FA3BF;font-size:12px}',
    'button.b{background:#0B1F3A;color:#E7E9EA;border:1px solid #23406B;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer}',
    'button.b:hover:not(:disabled){background:#123058}',
    'button.b:disabled{opacity:.4;cursor:default}',
    'button.w{width:100%;text-align:left;margin-top:6px}',
    'button.stop{border-color:#5A2A2A}',
    '.list{flex:1;min-height:80px;max-height:260px;overflow-y:auto;border-top:1px solid #16263F;border-bottom:1px solid #16263F}',
    '.list label{display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;border-bottom:1px solid #0C1626}',
    '.list label:hover{background:#06101F}',
    '.list input{accent-color:#2F5C99;margin:0}',
    '.list .n{color:#8FA3BF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:right}',
    '.list .done{opacity:.35;text-decoration:line-through}',
    '.empty{padding:12px;color:#8FA3BF}',
    'input.num{width:64px;background:#000;color:#E7E9EA;border:1px solid #23406B;border-radius:4px;padding:4px 6px;font-size:12px}',
    'pre{margin:0;padding:8px 12px;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#8FA3BF;white-space:pre-wrap;max-height:110px;overflow-y:auto;background:#030a14}',
    'details summary{cursor:pointer;color:#8FA3BF;font-size:12px}'
  ].join('');

  var STATUS_TEXT = {
    idle: ['Inactivo', ''],
    running: ['Activo', 's-running'],
    long_pause: ['Pausado (pausa larga)', 's-pause'],
    paused_error: ['Pausado (error)', 's-pause'],
    stopped_warning: ['Detenido (advertencia)', 's-warn'],
    stopped_cap: ['Detenido (tope)', 's-warn'],
    stopped_user: ['Detenido (usuario)', 's-pause']
  };

  function fmtTime(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  function buildUI() {
    var host = h('div', { id: C.ui.rootId });
    host.style.cssText = 'position:fixed;top:0;right:0;z-index:' + C.ui.zIndex + ';';
    var root = host.attachShadow({ mode: 'open' });
    root.appendChild(h('style', { text: CSS }));

    ui.status = h('b');
    ui.session = h('b');
    ui.daily = h('b');
    ui.nextPause = h('b');
    ui.wait = h('b');
    ui.reason = h('div', { 'class': 'muted full' });

    ui.scanInfo = h('div', { 'class': 'muted' });
    ui.btnScan = h('button', { 'class': 'b', text: 'Escanear following y followers', on: { click: function () { startProcess('scan', doScan); } } });

    ui.counter = h('span', { 'class': 'muted' });
    ui.list = h('div', { 'class': 'list' });

    ui.btnAll = h('button', { 'class': 'b w', text: 'Dejar de seguir a todos los non-mutuals', on: { click: function () { startQueue('all'); } } });
    ui.btnSel = h('button', { 'class': 'b w', text: 'Dejar de seguir a los seleccionados', on: { click: function () { startQueue('selected'); } } });
    ui.btnExc = h('button', { 'class': 'b w', text: 'Dejar de seguir a todos menos los seleccionados', on: { click: function () { startQueue('except'); } } });

    ui.btnStop = h('button', { 'class': 'b stop', text: 'Detener', on: { click: stopProcess } });
    ui.btnResume = h('button', { 'class': 'b', text: 'Reanudar cola', on: { click: resumeQueue } });
    ui.btnDiscard = h('button', { 'class': 'b', text: 'Descartar cola', on: { click: discardQueue } });
    ui.queueInfo = h('span', { 'class': 'muted' });

    var s = getSettings();
    ui.inSession = h('input', { 'class': 'num', type: 'number', min: '1', value: String(s.perSession) });
    ui.inDay = h('input', { 'class': 'num', type: 'number', min: '1', value: String(s.perDay) });

    ui.log = h('pre');

    var panel = h('div', { 'class': 'p' }, [
      h('div', { 'class': 'hd' }, [
        h('div', null, [h('b', { text: 'XManagmentStudio' }), h('span', { text: 'v' + C.version })]),
        h('button', { 'class': 'x', title: 'Ocultar', text: 'x', on: { click: hide } })
      ]),
      h('div', { 'class': 'st' }, [
        h('div', { 'class': 'full' }, [h('em', { text: 'Estado' }), ui.status]),
        h('div', null, [h('em', { text: 'Sesión' }), ui.session]),
        h('div', null, [h('em', { text: 'Hoy' }), ui.daily]),
        h('div', null, [h('em', { text: 'Pausa larga en' }), ui.nextPause]),
        h('div', null, [h('em', { text: 'Espera' }), ui.wait]),
        ui.reason
      ]),
      h('div', { 'class': 'sec' }, [
        h('div', { 'class': 'row' }, [ui.btnScan]),
        h('div', { style: 'margin-top:6px' }, [ui.scanInfo])
      ]),
      h('div', { 'class': 'sec row', style: 'justify-content:space-between' }, [
        h('div', { 'class': 'row' }, [
          h('button', { 'class': 'b', text: 'Seleccionar todo', on: { click: function () { setAll(true); } } }),
          h('button', { 'class': 'b', text: 'Deseleccionar todo', on: { click: function () { setAll(false); } } })
        ]),
        ui.counter
      ]),
      ui.list,
      h('div', { 'class': 'sec' }, [ui.btnAll, ui.btnSel, ui.btnExc]),
      h('div', { 'class': 'sec row' }, [ui.btnStop, ui.btnResume, ui.btnDiscard, ui.queueInfo]),
      h('div', { 'class': 'sec' }, [
        h('details', null, [
          h('summary', { text: 'Topes' }),
          h('div', { 'class': 'row', style: 'margin-top:8px' }, [
            h('span', { 'class': 'muted', text: 'Por sesión' }), ui.inSession,
            h('span', { 'class': 'muted', text: 'Por día' }), ui.inDay,
            h('button', { 'class': 'b', text: 'Guardar', on: { click: saveSettings } })
          ])
        ])
      ]),
      ui.log
    ]);
    root.appendChild(panel);
    ui.host = host;
    document.body.appendChild(host);
  }

  function saveSettings() {
    var ps = toPosInt(ui.inSession.value, C.limits.perSession);
    var pd = toPosInt(ui.inDay.value, C.limits.perDay);
    save(K.settings, { perSession: ps, perDay: pd });
    ui.inSession.value = String(ps);
    ui.inDay.value = String(pd);
    logMsg('Topes guardados: ' + ps + ' por sesión, ' + pd + ' por día.');
    render();
  }

  var rowIndex = {};

  function renderList() {
    var scan = getScan();
    rowIndex = {};
    while (ui.list.firstChild) ui.list.removeChild(ui.list.firstChild);
    if (!scan) {
      ui.list.appendChild(h('div', { 'class': 'empty', text: 'Sin escaneo todavía.' }));
      return;
    }
    if (scan.nonMutuals.length === 0) {
      ui.list.appendChild(h('div', { 'class': 'empty', text: 'No hay non-mutuals.' }));
      return;
    }
    var done = doneSet();
    var frag = document.createDocumentFragment();
    scan.nonMutuals.forEach(function (u) {
      var key = u.handle.toLowerCase();
      var cb = h('input', { type: 'checkbox' });
      cb.checked = !!selected[key];
      cb.addEventListener('change', function () {
        if (cb.checked) selected[key] = true; else delete selected[key];
        renderCounter();
      });
      var row = h('label', null, [cb, h('span', { text: '@' + u.handle }), h('span', { 'class': 'n', text: u.name })]);
      if (done[key]) { row.classList.add('done'); cb.disabled = true; }
      rowIndex[key] = { row: row, cb: cb };
      frag.appendChild(row);
    });
    ui.list.appendChild(frag);
  }

  function markRow(handle) {
    var r = rowIndex[handle.toLowerCase()];
    if (!r) return;
    r.row.classList.add('done');
    r.cb.disabled = true;
  }

  function setAll(value) {
    var scan = getScan();
    if (!scan) return;
    var done = doneSet();
    selected = {};
    scan.nonMutuals.forEach(function (u) {
      var key = u.handle.toLowerCase();
      if (value && !done[key]) selected[key] = true;
      var r = rowIndex[key];
      if (r) r.cb.checked = !!selected[key];
    });
    renderCounter();
  }

  function renderCounter() {
    var scan = getScan();
    var total = scan ? scan.nonMutuals.length : 0;
    ui.counter.textContent = 'Seleccionadas: ' + Object.keys(selected).length + ' de ' + total;
  }

  var lastScanAt = null;

  function render() {
    if (!ui.host) return;
    var ps = getPState();
    var st = STATUS_TEXT[ps.status] || STATUS_TEXT.idle;
    ui.status.textContent = st[0];
    ui.status.className = st[1];
    ui.reason.textContent = ps.reason || '';

    var s = getSettings();
    ui.session.textContent = getSessionCount() + ' / ' + s.perSession;
    ui.daily.textContent = getDaily().count + ' / ' + s.perDay;
    ui.nextPause.textContent = ps.longAt ? Math.max(0, ps.longAt - (ps.sinceLong || 0)) + ' acciones' : '-';
    ui.wait.textContent = run.waitUntil ? run.waitLabel + ' ' + fmtTime(run.waitUntil - Date.now()) : '-';

    var scan = getScan();
    if (run.active && run.kind === 'scan') {
      ui.scanInfo.textContent = 'Leyendo ' + run.scanLabel + ': ' + run.scanCount + ' cuentas.';
    } else if (scan) {
      ui.scanInfo.textContent = '@' + scan.me + '. Following ' + scan.followingCount + ', followers ' + scan.followersCount +
        ', non-mutuals ' + scan.nonMutuals.length + '. Escaneo: ' + new Date(scan.at).toLocaleString() + '.';
    } else {
      ui.scanInfo.textContent = 'Todavía no escaneaste tu cuenta.';
    }
    var scanAt = scan ? scan.at : null;
    if (scanAt !== lastScanAt) {
      lastScanAt = scanAt;
      renderList();
    }
    renderCounter();

    var q = getQueue();
    ui.queueInfo.textContent = q && q.items.length ? 'Cola: ' + q.items.length + ' pendientes' : '';

    var busy = run.active;
    ui.btnScan.disabled = busy;
    ui.btnAll.disabled = busy || !scan;
    ui.btnSel.disabled = busy || !scan;
    ui.btnExc.disabled = busy || !scan;
    ui.btnStop.disabled = !busy;
    ui.btnResume.disabled = busy || !(q && q.items.length);
    ui.btnDiscard.disabled = busy || !(q && q.items.length);
  }

  function show() { if (ui.host) ui.host.style.display = ''; render(); }
  function hide() { if (ui.host) ui.host.style.display = 'none'; }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                            */
  /* ------------------------------------------------------------------ */

  // Si la pestana se cerro con un proceso en curso, el estado queda como detenido.
  var initial = getPState();
  if (initial.status === 'running' || initial.status === 'long_pause') {
    setPState({ status: 'stopped_user', reason: 'El proceso anterior se interrumpió. La cola quedo guardada.' });
  }
  reconcileQueue();

  buildUI();
  render();
  setInterval(function () { if (ui.host && ui.host.style.display !== 'none') render(); }, 1000);
  logMsg('Listo. Usuario: @' + (getMe() || 'no detectado') + '.');

  window.__XMS__ = { show: show, hide: hide, version: C.version };
})();
