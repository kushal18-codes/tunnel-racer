const cv = document.getElementById('tunnel');
	const ctx = cv.getContext('2d');
	const TAU = Math.PI * 2;
	const DEPTH = 14; // visible tunnel length, in ring spacings
	const SPOKES = 12;

	let w = 0;
	let h = 0;
	let R = 0;
	function resize() {
		const dpr = devicePixelRatio || 1;
		w = cv.clientWidth;
		h = cv.clientHeight;
		cv.width = w * dpr;
		cv.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		R = Math.min(w, h) * 0.42;
	}
	addEventListener('resize', resize);
	resize();

	// ---- audio ----
	let ac = null;
	let drone = null;
	function audioStart() {
		ac ??= new AudioContext();
		if (ac.state === 'suspended') ac.resume();
		drone = ac.createOscillator();
		const g = ac.createGain();
		drone.type = 'sawtooth';
		drone.frequency.value = 55;
		g.gain.value = 0.04;
		drone.connect(g).connect(ac.destination);
		drone.start();
	}
	function audioStop() {
		drone?.stop();
		drone = null;
	}
	function tone(from, to, dur, type, vol) {
		if (!ac) return;
		const o = ac.createOscillator();
		const g = ac.createGain();
		const t = ac.currentTime;
		o.type = type;
		o.frequency.setValueAtTime(from, t);
		o.frequency.exponentialRampToValueAtTime(to, t + dur);
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + dur);
		o.connect(g).connect(ac.destination);
		o.start(t);
		o.stop(t + dur);
	}

	// ---- state ----
		let state = 'menu';
	let walls = [];
	let speed = 0;
	let dist = 0;
	let score = 0;
	let best = Number(localStorage.getItem('tunnel-best') || 0);
	let ball = -Math.PI / 2;
	let target = ball;
	let nextSpawn = 0;
	let time = 0;
	let last = performance.now();

	const angDiff = (a, b) => ((((a - b) % TAU) + 3 * Math.PI) % TAU) - Math.PI;

	function start() {
		walls = [];
		speed = 3;
		dist = 0;
		score = 0;
		nextSpawn = 8;
		state = 'play';
		audioStart();
	}

	function crash() {
		state = 'dead';
		best = Math.max(best, score);
		localStorage.setItem('tunnel-best', String(best));
		audioStop();
		tone(160, 30, 0.6, 'square', 0.25);
	}

	function pointer(e) {
		const r = cv.getBoundingClientRect();
		target = Math.atan2(e.clientY - r.top - h / 2, e.clientX - r.left - w / 2);
	}
	cv.addEventListener('pointermove', pointer);
	cv.addEventListener('pointerdown', (e) => {
		pointer(e);
		if (state !== 'play') start();
	});

	// ---- projection ----
	// z = 0 is the player ring; larger z is further away and bends sideways
	function project(z) {
		const s = 1 / (1 + z * 0.45);
		const bend = z / (z + 4);
		return {
			s,
			x: w / 2 + Math.sin(time * 0.7 + z * 0.35) * w * 0.14 * bend,
			y: h / 2 + Math.cos(time * 0.5 + z * 0.3) * h * 0.1 * bend,
		};
	}

	function ring(z, from, to, width, color) {
		const p = project(z);
		ctx.beginPath();
		ctx.arc(p.x, p.y, R * p.s, from, to);
		ctx.lineWidth = Math.max(0.5, width * p.s);
		ctx.strokeStyle = color;
		ctx.stroke();
	}

	function update(dt) {
		time += dt;
		if (state !== 'play') return;
		speed += dt * 0.12;
		const dz = speed * dt;
		dist += dz;
		ball += angDiff(target, ball) * Math.min(1, dt * 14);
		nextSpawn -= dz;
		if (nextSpawn <= 0) {
			walls.push({ z: DEPTH, gap: Math.random() * TAU });
			nextSpawn = Math.max(3.5, 7 - speed * 0.25);
		}
		for (const wl of walls) {
			const prev = wl.z;
			wl.z -= dz;
			if (prev > 0 && wl.z <= 0) {
				// half-width of the gap shrinks slowly as the run goes on
				const half = Math.max(0.5, 0.95 - score * 0.02);
				if (Math.abs(angDiff(ball, wl.gap)) > half) return crash();
				score++;
				tone(500, 1000, 0.12, 'sine', 0.15);
			}
		}
		walls = walls.filter((wl) => wl.z > -1);
		drone?.frequency.setTargetAtTime(55 + speed * 12, ac.currentTime, 0.1);
	}

	function draw() {
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';

		// rings scroll toward the player
		const off = dist % 1;
		for (let i = 0; i < DEPTH; i++) {
			const z = i - off;
			if (z < 0) continue;
			const a = 1 - z / DEPTH;
			ring(z, 0, TAU, 2, `rgba(60,120,255,${a * 0.7})`);
		}
		// spokes
		ctx.lineWidth = 1;
		for (let k = 0; k < SPOKES; k++) {
			const a = (k / SPOKES) * TAU;
			ctx.beginPath();
			for (let i = 0; i <= DEPTH * 2; i++) {
				const z = i / 2;
				const p = project(z);
				const x = p.x + Math.cos(a) * R * p.s;
				const y = p.y + Math.sin(a) * R * p.s;
				if (i) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
			}
			ctx.strokeStyle = 'rgba(40,80,200,0.35)';
			ctx.stroke();
		}

		// walls, far to near
		for (const wl of [...walls].sort((a, b) => b.z - a.z)) {
			if (wl.z < 0) continue;
			const half = Math.max(0.5, 0.95 - score * 0.02);
			const a = 1 - wl.z / DEPTH;
			ring(wl.z, wl.gap + half, wl.gap - half + TAU, 14, `rgba(255,40,60,${0.25 + a * 0.75})`);
		}

		// ball sits just inside the wall at z = 0
		const p = project(0);
		const bx = p.x + Math.cos(ball) * R * 0.92;
		const by = p.y + Math.sin(ball) * R * 0.92;
		if (state !== 'dead') {
			const g = ctx.createRadialGradient(bx, by, 0, bx, by, 26);
			g.addColorStop(0, 'rgba(0,255,255,1)');
			g.addColorStop(1, 'rgba(0,255,255,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(bx, by, 26, 0, TAU);
			ctx.fill();
		}

		// HUD
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#fff';
		ctx.textAlign = 'center';
		ctx.font = '700 28px ui-monospace, monospace';
		ctx.fillText(String(score), w / 2, 48);
		if (state !== 'play') {
			ctx.font = '700 40px ui-monospace, monospace';
			ctx.fillText(state === 'menu' ? 'TUNNEL RACER' : 'CRASHED', w / 2, h / 2 - 20);
			ctx.font = '18px ui-monospace, monospace';
			ctx.fillText(
				state === 'menu' ? 'move to steer · click to start' : `score ${score} · best ${best} · click to retry`,
				w / 2,
				h / 2 + 20,
			);
		}
	}

	function frame(now) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		update(dt);
		draw();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
