/**
 * ProPresenter Accessible Viewer - Setup Page
 */
(function () {
  'use strict';

  var hostInput = document.getElementById('host');
  var portInput = document.getElementById('port');
  var testBtn = document.getElementById('testBtn');
  var saveBtn = document.getElementById('saveBtn');
  var configForm = document.getElementById('configForm');
  var alertEl = document.getElementById('alert');
  var statusDot = document.getElementById('statusDot');
  var statusText = document.getElementById('statusText');

  function showAlert(message, type) {
    alertEl.textContent = message;
    alertEl.className = 'alert alert-' + type;
    alertEl.style.display = 'block';
  }

  function hideAlert() {
    alertEl.style.display = 'none';
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.textContent = 'Please wait...';
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
    }
  }

  // Load current config
  fetch('/api/config')
    .then(function (res) { return res.json(); })
    .then(function (config) {
      if (config.host) {
        hostInput.value = config.host;
      }
      if (config.port) {
        portInput.value = config.port;
      }
      if (config.configured) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Configured';
      }
    })
    .catch(function () { /* ignore */ });

  // Also check live connection status
  fetch('/api/status')
    .then(function (res) { return res.json(); })
    .then(function (status) {
      if (status.connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected' + (status.version ? ' (v' + status.version + ')' : '');
      }
    })
    .catch(function () { /* ignore */ });

  // Test connection
  testBtn.addEventListener('click', function () {
    var host = hostInput.value.trim();
    var port = parseInt(portInput.value, 10) || 61166;

    if (!host) {
      showAlert('Please enter a host address.', 'error');
      hostInput.focus();
      return;
    }

    hideAlert();
    setLoading(testBtn, true);

    fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: host, port: port }),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        setLoading(testBtn, false);
        if (result.success) {
          showAlert('Connection successful! ProPresenter v' + result.version, 'success');
          statusDot.className = 'status-dot connected';
          statusText.textContent = 'Reachable';
        } else {
          showAlert('Connection failed: ' + (result.error || 'Unknown error'), 'error');
          statusDot.className = 'status-dot';
          statusText.textContent = 'Unreachable';
        }
      })
      .catch(function (err) {
        setLoading(testBtn, false);
        showAlert('Request failed: ' + err.message, 'error');
      });
  });

  // Save config
  configForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var host = hostInput.value.trim();
    var port = parseInt(portInput.value, 10) || 61166;

    if (!host) {
      showAlert('Please enter a host address.', 'error');
      hostInput.focus();
      return;
    }

    hideAlert();
    setLoading(saveBtn, true);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: host, port: port }),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        setLoading(saveBtn, false);
        if (result.success) {
          showAlert('Connected and saved! Redirecting to viewer...', 'success');
          statusDot.className = 'status-dot connected';
          statusText.textContent = 'Connected';
          setTimeout(function () {
            window.location.href = '/';
          }, 1500);
        } else {
          showAlert('Failed: ' + (result.error || 'Could not save or connect'), 'error');
        }
      })
      .catch(function (err) {
        setLoading(saveBtn, false);
        showAlert('Request failed: ' + err.message, 'error');
      });
  });

})();
