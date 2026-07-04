package main

import (
	"fmt"
	"net/http"
)

// dashboardHandler serves the inline "control plane 2050" dashboard.
// No external assets: system-ui / ui-monospace stacks, inline CSS/SVG only.
func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, `<!DOCTYPE html>
<html lang="en">
<head>
<title>hello-otel-social · control plane</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
	:root {
		--bg: #05070f;
		--panel: #0b1020;
		--border: rgba(148,163,184,0.14);
		--grid-line: rgba(148,163,184,0.05);
		--text: #cbd5e1;
		--muted: #64748b;
		--accent: #a78bfa;
		--accent-dim: rgba(167,139,250,0.16);
		--ok: #34d399;
		--warn: #fbbf24;
		--err: #f87171;
		--mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		--sans: system-ui, -apple-system, "Segoe UI", sans-serif;
	}
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body {
		font-family: var(--sans);
		background: var(--bg);
		background-image:
			linear-gradient(var(--grid-line) 1px, transparent 1px),
			linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
		background-size: 48px 48px;
		color: var(--text);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		position: sticky; top: 0; z-index: 10;
		display: flex; align-items: center; gap: 14px;
		padding: 14px 28px;
		background: rgba(5,7,15,0.82);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.svc-name { font-family: var(--mono); font-size: 15px; font-weight: 600; color: #e2e8f0; letter-spacing: 0.02em; }
	.svc-name .dot-sep { color: var(--accent); }
	.badge {
		font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em;
		color: var(--accent); background: var(--accent-dim);
		border: 1px solid rgba(167,139,250,0.35);
		padding: 3px 9px; border-radius: 999px;
	}
	.spacer { flex: 1; }
	.status { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; color: var(--muted); }
	.status-dot {
		width: 9px; height: 9px; border-radius: 50%;
		background: var(--muted); transition: background 0.3s, box-shadow 0.3s;
	}
	.status-dot.up { background: var(--ok); box-shadow: 0 0 10px rgba(52,211,153,0.8); }
	.status-dot.down { background: var(--err); box-shadow: 0 0 10px rgba(248,113,113,0.8); }

	main { flex: 1; max-width: 1280px; width: 100%; margin: 0 auto; padding: 28px; }

	.section-label {
		font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em;
		color: var(--muted); margin: 4px 0 12px;
	}

	.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 28px; }
	.tile {
		background: linear-gradient(180deg, rgba(148,163,184,0.03), transparent 55%), var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 16px 16px 12px;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		position: relative;
		overflow: hidden;
	}
	.tile::after {
		content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
		background: linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent);
	}
	.tile-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; }
	.tile-value {
		font-family: var(--mono); font-size: 30px; font-weight: 600;
		color: var(--accent);
		text-shadow: 0 0 14px rgba(167,139,250,0.45);
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.tile-unit { font-size: 13px; color: var(--muted); text-shadow: none; margin-left: 3px; }
	.spark { display: flex; align-items: flex-end; gap: 2px; height: 26px; margin-top: 10px; }
	.spark span {
		flex: 1; min-height: 2px; border-radius: 1px 1px 0 0;
		background: linear-gradient(180deg, rgba(167,139,250,0.85), rgba(167,139,250,0.15));
		transition: height 0.4s ease;
	}

	.stream {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		overflow: hidden;
	}
	.stream-head {
		display: flex; align-items: center; gap: 10px;
		padding: 12px 16px; border-bottom: 1px solid var(--border);
		font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; color: var(--muted);
	}
	.pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
	@keyframes pulse { 0%,100% { opacity: 1; box-shadow: 0 0 6px rgba(167,139,250,0.9);} 50% { opacity: 0.35; box-shadow: none;} }
	.stream-body { height: 340px; overflow-y: auto; font-family: var(--mono); font-size: 12px; }
	.evt { display: flex; gap: 12px; padding: 7px 16px; border-bottom: 1px solid rgba(148,163,184,0.06); align-items: baseline; }
	.evt:hover { background: rgba(167,139,250,0.05); }
	.evt-time { color: var(--muted); flex: 0 0 96px; font-size: 11px; }
	.evt-level { flex: 0 0 44px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
	.evt-level.info { color: var(--ok); }
	.evt-level.warn { color: var(--warn); }
	.evt-level.error { color: var(--err); }
	.evt-name { color: var(--accent); flex: 0 0 160px; }
	.evt-fields { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
	.empty { padding: 24px 16px; color: var(--muted); font-size: 12px; }

	footer {
		border-top: 1px solid var(--border);
		padding: 14px 28px;
		display: flex; gap: 20px; align-items: center;
		font-family: var(--mono); font-size: 11px;
		background: rgba(5,7,15,0.6);
	}
	footer a { color: var(--muted); text-decoration: none; letter-spacing: 0.08em; }
	footer a:hover { color: var(--accent); }
	footer .sig { margin-left: auto; color: var(--muted); letter-spacing: 0.14em; }
	footer .sig b { color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
	<header>
		<span class="svc-name">hello-otel-social<span class="dot-sep"> ▪ </span>control plane</span>
		<span class="badge">HELLO-OTEL SUITE</span>
		<span class="spacer"></span>
		<span class="status"><span class="status-dot" id="statusDot"></span><span id="statusText">PROBING</span></span>
	</header>

	<main>
		<div class="section-label">BUSINESS SIGNALS · OTLP/GRPC · POLL 2.5S</div>
		<div class="tiles" id="tiles"></div>

		<div class="section-label">EVENT STREAM</div>
		<div class="stream">
			<div class="stream-head"><span class="pulse"></span> LIVE BUSINESS EVENTS · /api/events</div>
			<div class="stream-body" id="stream"><div class="empty">Waiting for events...</div></div>
		</div>
	</main>

	<footer>
		<a href="/api/metrics">/api/metrics</a>
		<a href="/api/agent">/api/agent</a>
		<a href="/llms.txt">/llms.txt</a>
		<a href="/health">/health</a>
		<span class="sig">TRACES <b>+</b> METRICS <b>+</b> LOGS · OTLP</span>
	</footer>

<script>
(function () {
	var TILES = [
		{ key: 'users.list',            label: 'users.list' },
		{ key: 'user.created',          label: 'user.created' },
		{ key: 'posts.list',            label: 'posts.list' },
		{ key: 'post.created',          label: 'post.created' },
		{ key: 'feed.fetched',          label: 'feed.fetched' },
		{ key: 'notification.sent',     label: 'notification.sent' },
		{ key: 'http.route.latency_ms', label: 'latency avg', unit: 'ms', avg: true }
	];
	var SPARK_N = 24;
	var state = {}; // key -> { shown, target, history: [] }

	var tilesEl = document.getElementById('tiles');
	TILES.forEach(function (t) {
		state[t.key] = { shown: 0, target: 0, history: [] };
		var el = document.createElement('div');
		el.className = 'tile';
		var spark = '<div class="spark" id="spark-' + cssId(t.key) + '">';
		for (var i = 0; i < SPARK_N; i++) spark += '<span style="height:2px"></span>';
		spark += '</div>';
		el.innerHTML =
			'<div class="tile-label">' + t.label + '</div>' +
			'<div class="tile-value"><span id="val-' + cssId(t.key) + '">0</span>' +
			(t.unit ? '<span class="tile-unit">' + t.unit + '</span>' : '') +
			'</div>' + spark;
		tilesEl.appendChild(el);
	});

	function cssId(k) { return k.replace(/[^a-z0-9]/gi, '-'); }

	function extractValue(metrics, t) {
		var m = metrics[t.key];
		if (!m) return 0;
		var entry = m.total !== undefined ? m.total : m[Object.keys(m)[0]];
		if (entry === undefined || entry === null) return 0;
		if (typeof entry === 'object') return t.avg ? (entry.avg || 0) : (entry.count || 0);
		return entry;
	}

	function setSpark(key, history) {
		var el = document.getElementById('spark-' + cssId(key));
		if (!el) return;
		var bars = el.children;
		var max = 1;
		for (var i = 0; i < history.length; i++) if (history[i] > max) max = history[i];
		var offset = SPARK_N - history.length;
		for (var j = 0; j < SPARK_N; j++) {
			var v = j < offset ? 0 : history[j - offset];
			var h = Math.max(2, Math.round((v / max) * 24));
			bars[j].style.height = h + 'px';
		}
	}

	function animate(key, decimals) {
		var s = state[key];
		var el = document.getElementById('val-' + cssId(key));
		var from = s.shown, to = s.target;
		if (from === to) { el.textContent = fmt(to, decimals); return; }
		var t0 = performance.now(), dur = 450;
		function step(now) {
			var p = Math.min(1, (now - t0) / dur);
			var eased = 1 - Math.pow(1 - p, 3);
			var v = from + (to - from) * eased;
			el.textContent = fmt(v, decimals);
			if (p < 1) requestAnimationFrame(step);
			else s.shown = to;
		}
		requestAnimationFrame(step);
	}

	function fmt(v, decimals) {
		return decimals ? v.toFixed(1) : Math.round(v).toLocaleString();
	}

	function pollMetrics() {
		fetch('/api/metrics').then(function (r) { return r.json(); }).then(function (metrics) {
			TILES.forEach(function (t) {
				var s = state[t.key];
				var v = extractValue(metrics, t);
				var delta = t.avg ? v : Math.max(0, v - s.target);
				s.history.push(delta);
				if (s.history.length > SPARK_N) s.history.shift();
				s.target = v;
				animate(t.key, t.avg);
				setSpark(t.key, s.history);
			});
		}).catch(function () {});
	}

	function pollHealth() {
		var dot = document.getElementById('statusDot');
		var txt = document.getElementById('statusText');
		fetch('/health').then(function (r) {
			var up = r.ok;
			dot.className = 'status-dot ' + (up ? 'up' : 'down');
			txt.textContent = up ? 'LIVE' : 'DEGRADED';
		}).catch(function () {
			dot.className = 'status-dot down';
			txt.textContent = 'OFFLINE';
		});
	}

	function pollEvents() {
		fetch('/api/events').then(function (r) { return r.json(); }).then(function (data) {
			var el = document.getElementById('stream');
			var events = data.events || [];
			if (!events.length) return;
			el.innerHTML = '';
			events.forEach(function (e) {
				var row = document.createElement('div');
				row.className = 'evt';
				var time = document.createElement('span');
				time.className = 'evt-time';
				time.textContent = (e.timestamp || '').slice(11, 23);
				var level = document.createElement('span');
				level.className = 'evt-level ' + (e.level || 'info').toLowerCase();
				level.textContent = e.level || 'info';
				var name = document.createElement('span');
				name.className = 'evt-name';
				name.textContent = e.event || '';
				var fields = document.createElement('span');
				fields.className = 'evt-fields';
				fields.textContent = e.fields ? JSON.stringify(e.fields) : '';
				row.appendChild(time); row.appendChild(level); row.appendChild(name); row.appendChild(fields);
				el.appendChild(row);
			});
		}).catch(function () {});
	}

	pollMetrics(); pollHealth(); pollEvents();
	setInterval(pollMetrics, 2500);
	setInterval(pollHealth, 3000);
	setInterval(pollEvents, 2500);
})();
</script>
</body>
</html>
`)
}
