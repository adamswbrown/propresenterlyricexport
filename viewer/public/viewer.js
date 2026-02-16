/**
 * ProPresenter Service Viewer — iPad-first real-time slide viewer.
 *
 * Connects via SSE to receive slide changes. Shows thumbnail, lyrics,
 * and "up next" info. Handles video content gracefully (thumbnail only).
 */
(function () {
  'use strict';

  // ── DOM ──
  var liveBadge    = document.getElementById('liveBadge');
  var connDot      = document.getElementById('connDot');
  var connText     = document.getElementById('connText');
  var slideFrame   = document.getElementById('slideFrame');
  var slideEmpty   = document.getElementById('slideEmpty');
  var slideImg     = document.getElementById('slideImg');
  var slideBadge   = document.getElementById('slideBadge');
  var lyrics       = document.getElementById('lyrics');
  var nextBar      = document.getElementById('nextBar');
  var nextTitle    = document.getElementById('nextTitle');
  var textArea     = document.getElementById('textArea');
  var idleNotice   = document.getElementById('idleNotice');
  var overlay      = document.getElementById('overlay');
  var overlayMsg   = document.getElementById('overlayMsg');
  var btnFullscreen = document.getElementById('btnFullscreen');

  var eventSource = null;
  var reconnectTimer = null;
  var isLive = false;
  var hasEverReceivedSlide = false;

  // ── SSE ──

  function connect() {
    if (eventSource) eventSource.close();

    // Use the base path from current location to support /viewer prefix
    var basePath = '/viewer';
    eventSource = new EventSource(basePath + '/events');

    eventSource.onmessage = function (e) {
      try { handleEvent(JSON.parse(e.data)); }
      catch (err) { console.error('SSE parse error:', err); }
    };

    eventSource.onerror = function () {
      showDisconnected('Connection lost. Reconnecting...');
      eventSource.close();
      eventSource = null;
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  // ── Event handling ──

  function handleEvent(data) {
    switch (data.type) {
      case 'connected':
        showConnected(data.status);
        break;
      case 'disconnected':
        showDisconnected('ProPresenter disconnected');
        break;
      case 'slideChange':
        showConnected();
        updateSlide(data);
        break;
    }
  }

  // ── Connection state ──

  function showConnected(status) {
    overlay.classList.remove('active');
    connDot.className = 'conn-dot ok';
    connText.textContent = status && status.version
      ? 'ProPresenter ' + status.version
      : 'Connected';
  }

  function showDisconnected(msg) {
    overlay.classList.add('active');
    overlayMsg.textContent = msg || 'Disconnected';
    connDot.className = 'conn-dot warn';
    connText.textContent = 'Reconnecting...';
    setLive(false);
  }

  // ── Live indicator ──

  function setLive(active) {
    isLive = active;
    if (active) {
      liveBadge.classList.add('active');
    } else {
      liveBadge.classList.remove('active');
    }
  }

  // ── Slide update ──

  function updateSlide(data) {
    hasEverReceivedSlide = true;

    var hasText = !!(data.currentText && data.currentText.trim());
    var hasThumb = !!data.thumbnail;
    var hasContent = hasText || hasThumb;

    // Go live when we have content
    setLive(hasContent);

    // Thumbnail
    if (hasThumb) {
      slideImg.src = data.thumbnail;
      slideImg.classList.add('visible');
      slideEmpty.classList.add('hidden');
    } else {
      slideImg.classList.remove('visible');
      slideEmpty.classList.remove('hidden');
    }

    // Video detection: if we have a thumbnail but no text, it might be a video
    if (hasThumb && !hasText) {
      slideBadge.textContent = 'Video / Media';
      slideBadge.classList.add('visible');
    } else {
      slideBadge.classList.remove('visible');
    }

    // Lyrics
    if (hasText) {
      lyrics.textContent = data.currentText;
      lyrics.classList.remove('empty');
      textArea.style.display = '';
      idleNotice.classList.remove('active');
    } else if (hasThumb) {
      // Media playing — no lyrics to show
      lyrics.textContent = '';
      textArea.style.display = '';
      idleNotice.classList.remove('active');
    } else {
      // Nothing active — show idle state
      lyrics.textContent = '';
      textArea.style.display = 'none';
      if (hasEverReceivedSlide) {
        idleNotice.classList.add('active');
      }
    }

    // Next
    if (data.nextTitle && data.nextTitle.trim()) {
      nextTitle.textContent = data.nextTitle;
      nextBar.classList.add('visible');
    } else {
      nextBar.classList.remove('visible');
    }
  }

  // ── Fullscreen ──

  btnFullscreen.addEventListener('click', function () {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      var el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(function () {
        document.body.classList.toggle('fullscreen');
      });
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  });

  function onFullscreenChange() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      document.body.classList.add('fullscreen');
    } else {
      document.body.classList.remove('fullscreen');
    }
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // Double-tap slide for fullscreen
  var lastTap = 0;
  slideFrame.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTap < 300) {
      e.preventDefault();
      btnFullscreen.click();
    }
    lastTap = now;
  });

  // ── Startup ──

  // Check initial status
  fetch('/viewer/api/status')
    .then(function (r) { return r.json(); })
    .then(function (status) {
      if (status.connected) {
        showConnected(status);
      } else {
        connDot.className = 'conn-dot off';
        connText.textContent = 'Waiting for ProPresenter';
      }
    })
    .catch(function () {
      connDot.className = 'conn-dot off';
      connText.textContent = 'Server unreachable';
    });

  // Connect SSE
  connect();

})();
