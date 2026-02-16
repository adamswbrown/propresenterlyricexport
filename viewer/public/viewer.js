/**
 * ProPresenter Service Viewer — iPad-first real-time slide viewer.
 *
 * Connects via SSE to receive slide changes. Shows the slide thumbnail
 * full-size. Fetches current state on load so it's never blank.
 *
 * Features:
 * - Real-time slide updates via SSE
 * - Heartbeat monitoring (auto-reconnects if server goes silent)
 * - Manual refresh button to force re-fetch current state
 * - Thumbnail preloading with retry
 * - Fullscreen support (button + double-tap)
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
  var textArea     = document.getElementById('textArea');
  var idleNotice   = document.getElementById('idleNotice');
  var overlay      = document.getElementById('overlay');
  var overlayMsg   = document.getElementById('overlayMsg');
  var btnRefresh   = document.getElementById('btnRefresh');
  var btnFullscreen = document.getElementById('btnFullscreen');

  var eventSource = null;
  var reconnectTimer = null;
  var isLive = false;
  var hasEverReceivedSlide = false;

  // ── Heartbeat monitoring ──
  // Server sends an SSE comment (": heartbeat") every 15s.
  // If we don't receive ANY SSE activity within 25s, the connection
  // is likely stale (mobile sleep, network proxy timeout, etc.)
  // and we force a reconnect.

  var HEARTBEAT_TIMEOUT = 25000; // 25s — generous margin over 15s server interval
  var heartbeatTimer = null;
  var lastActivity = Date.now();

  function resetHeartbeat() {
    lastActivity = Date.now();
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(onHeartbeatTimeout, HEARTBEAT_TIMEOUT);
  }

  function onHeartbeatTimeout() {
    // No SSE activity for 25s — connection is likely dead
    console.warn('Heartbeat timeout — reconnecting');
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    refreshState();
  }

  // ── SSE ──

  function connect() {
    if (eventSource) eventSource.close();

    var basePath = '/viewer';
    eventSource = new EventSource(basePath + '/events');

    eventSource.onopen = function () {
      resetHeartbeat();
    };

    eventSource.onmessage = function (e) {
      resetHeartbeat();
      try { handleEvent(JSON.parse(e.data)); }
      catch (err) { console.error('SSE parse error:', err); }
    };

    // SSE comments (heartbeats) don't trigger onmessage, but they DO
    // reset the browser's internal connection timeout. We listen for
    // the raw event stream via a periodic check instead — the heartbeat
    // timer above covers the stale-detection side. However, EventSource
    // doesn't expose comment events, so we rely on the fact that if the
    // connection IS alive, we'll get a real message within 15s (slide
    // poll) or the server heartbeat comment keeps TCP alive.

    eventSource.onerror = function () {
      showDisconnected('Connection lost. Reconnecting...');
      eventSource.close();
      eventSource = null;
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
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

    // Clear stale slide/lyrics so disconnected state is obvious
    pendingThumbUrl = null;
    slideImg.classList.remove('visible');
    slideEmpty.classList.remove('hidden');
    slideBadge.classList.remove('visible');
    lyrics.textContent = '';
    textArea.style.display = 'none';
    idleNotice.classList.remove('active');
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

  // ── Thumbnail preloading ──

  var pendingThumbUrl = null;

  function loadThumbnail(url, retries) {
    if (retries === undefined) retries = 2;
    pendingThumbUrl = url;
    var img = new Image();
    img.onload = function () {
      if (pendingThumbUrl !== url) return;
      slideImg.src = url;
      slideImg.classList.add('visible');
      slideEmpty.classList.add('hidden');
    };
    img.onerror = function () {
      if (pendingThumbUrl !== url) return;
      if (retries > 0) {
        setTimeout(function () {
          if (pendingThumbUrl !== url) return;
          loadThumbnail(url.replace(/[?&]t=\d+/, '?t=' + Date.now()), retries - 1);
        }, 500);
      }
    };
    img.src = url;
  }

  // ── Slide update ──

  function updateSlide(data) {
    hasEverReceivedSlide = true;

    var hasThumb = !!data.thumbnail;
    var hasText = !!(data.currentText && data.currentText.trim());

    setLive(hasThumb || hasText);

    // Thumbnail
    if (hasThumb) {
      loadThumbnail(data.thumbnail);
    } else {
      pendingThumbUrl = null;
      slideImg.classList.remove('visible');
      slideEmpty.classList.remove('hidden');
    }

    // Video/media badge
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
      lyrics.textContent = '';
      textArea.style.display = 'none';
      idleNotice.classList.remove('active');
    } else {
      lyrics.textContent = '';
      textArea.style.display = 'none';
      if (hasEverReceivedSlide) {
        idleNotice.classList.add('active');
      }
    }
  }

  // ── Refresh ──
  // Re-fetches current slide state from the server and reconnects SSE.
  // Useful after mobile sleep/wake, failed thumbnail loads, or any time
  // the viewer looks stale.

  function refreshState() {
    // Visual feedback — spin the refresh icon
    btnRefresh.classList.add('spinning');
    setTimeout(function () { btnRefresh.classList.remove('spinning'); }, 600);

    // Re-fetch current slide state
    fetch('/viewer/api/slide')
      .then(function (r) { return r.json(); })
      .then(function (slide) {
        if (slide.connected === false) {
          showDisconnected('ProPresenter disconnected');
          return;
        }
        showConnected({ version: null });
        if (slide.thumbnail) {
          // Force cache-bust on thumbnail
          slide.thumbnail = slide.thumbnail.replace(/[?&]t=\d+/, '?t=' + Date.now());
          updateSlide(slide);
        }
      })
      .catch(function () {
        // Server unreachable — will reconnect via SSE
      });

    // Also fetch status for version info
    fetch('/viewer/api/status')
      .then(function (r) { return r.json(); })
      .then(function (status) {
        if (status.connected) {
          showConnected(status);
        }
      })
      .catch(function () {});

    // Reconnect SSE to ensure we have a fresh stream
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    connect();
  }

  btnRefresh.addEventListener('click', refreshState);

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

  // ── Page visibility ──
  // When the user returns to the tab after it was backgrounded (phone
  // locked, switched apps), immediately refresh to catch up.

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      var elapsed = Date.now() - lastActivity;
      if (elapsed > HEARTBEAT_TIMEOUT) {
        // Been away long enough that the SSE is likely dead
        console.log('Page visible after ' + Math.round(elapsed / 1000) + 's — refreshing');
        refreshState();
      }
    }
  });

  // ── Startup ──

  // Immediately fetch current slide state so we're never blank on load
  fetch('/viewer/api/slide')
    .then(function (r) { return r.json(); })
    .then(function (slide) {
      if (slide.connected !== false) {
        showConnected({ version: null });
      }
      if (slide.thumbnail) {
        updateSlide(slide);
      }
    })
    .catch(function () {});

  // Check connection status
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

  // Connect SSE for real-time updates
  connect();

})();
