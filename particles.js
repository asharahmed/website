/*
    Hero particle system module.
*/

(() => {
    const initParticles = (canvas, options = {}) => {
        if (!canvas) {
            return null;
        }

        const prefersReducedMotion = typeof options.prefersReducedMotion === 'function'
            ? options.prefersReducedMotion
            : () => Boolean(options.prefersReducedMotion);

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationFrame = null;
        let running = false;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        const grid = new Map();
        const gridSize = 140;
        let lastTime = null;
        let accumulator = 0;
        const fixedStep = 1 / 60;
        const maxSteps = 3;
        let qualityLevel = 2;
        let qualityScale = 1;
        let frameCount = 0;
        let lastFpsSample = null;
        let lastQualityChange = 0;
        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false, velocity: { x: 0, y: 0 } };
        const bounds = { margin: 90, force: 0.00085 };
        const trail = [];
        const trailMax = 28;
        let burstTimer = null;
        let scrollUntil = 0;
        let frameSkip = false;
        let trailSuspendUntil = 0;
        let palette = {
            muted: '#94a3b8',
            accentPrimary: '#ef4444',
            accentSecondary: '#fb7185'
        };

        const cachedGradients = new Map();
        let lastWidth = 0;
        let lastHeight = 0;

        const nebulaState = {
            blobs: [],
            time: 0
        };

        const effects = {
            ripples: [],
            shootingStars: [],
            pulseWave: { active: false, radius: 0, alpha: 0, x: 0, y: 0 },
            lastPulse: 0,
            pulseInterval: 8000,
            lastShootingStar: 0,
            shootingStarInterval: 3000
        };
        const enablePulseWave = false;
        const enableShootingStars = false;

        const readColor = (varName, fallback) => {
            const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return value || fallback;
        };

        const hexToRgb = hex => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 148, g: 163, b: 184 };
        };

        const syncColors = () => {
            palette = {
                muted: readColor('--text-muted', palette.muted),
                accentPrimary: readColor('--accent-primary', palette.accentPrimary),
                accentSecondary: readColor('--accent-secondary', palette.accentSecondary)
            };
            palette.mutedRgb = hexToRgb(palette.muted);
            palette.primaryRgb = hexToRgb(palette.accentPrimary);
            palette.secondaryRgb = hexToRgb(palette.accentSecondary);
            cachedGradients.clear();
        };

        const createNebula = () => {
            nebulaState.blobs = [];
            const count = qualityLevel === 0 ? 2 : qualityLevel === 1 ? 3 : 4;
            for (let i = 0; i < count; i++) {
                nebulaState.blobs.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    radius: Math.random() * 300 + 200,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    hueShift: Math.random() * 30 - 15,
                    phase: Math.random() * Math.PI * 2
                });
            }
        };

        const resizeCanvas = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(window.innerWidth * dpr);
            canvas.height = Math.floor(window.innerHeight * dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            lastWidth = window.innerWidth;
            lastHeight = window.innerHeight;
            cachedGradients.clear();
        };

        const getOrCreateGradient = (key, creator) => {
            if (!cachedGradients.has(key) || lastWidth !== window.innerWidth || lastHeight !== window.innerHeight) {
                cachedGradients.set(key, creator());
            }
            return cachedGradients.get(key);
        };

        const getParticleCount = () => {
            const baseCount = Math.floor((window.innerWidth * window.innerHeight) / 14000);
            const capped = Math.min(baseCount, 140);
            const scaled = window.innerWidth < 768 ? Math.floor(capped * 0.55) : capped;
            return Math.max(20, Math.floor(scaled * qualityScale));
        };

        const createParticles = () => {
            particles = [];
            const count = getParticleCount();
            for (let i = 0; i < count; i++) {
                const layer = Math.floor(Math.random() * 3);
                const speed = layer === 0 ? 0.5 : layer === 1 ? 0.85 : 1.1;
                const size = layer === 0 ? Math.random() * 1.8 + 0.8 : layer === 1 ? Math.random() * 2 + 1.2 : Math.random() * 2.4 + 1.6;
                const color = layer === 0 ? palette.muted : layer === 1 ? palette.accentSecondary : palette.accentPrimary;
                const baseAlpha = layer === 0 ? 0.25 : layer === 1 ? 0.4 : 0.55;
                const rangeBase = layer === 0 ? 150 : layer === 1 ? 135 : 115;
                const glowSize = layer === 0 ? size * 2.5 : layer === 1 ? size * 3 : size * 3.5;
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size,
                    glowSize,
                    speed,
                    layer,
                    color,
                    baseAlpha,
                    linkRange: rangeBase * (qualityLevel === 0 ? 0.7 : qualityLevel === 1 ? 0.85 : 1),
                    flowOffset: Math.random() * Math.PI * 2,
                    flowStrength: layer === 0 ? 0.003 : layer === 1 ? 0.004 : 0.005,
                    twinkleSpeed: Math.random() * 1.2 + 0.5,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.5 + 0.3
                });
            }
        };

        const resetGrid = () => {
            grid.clear();
        };

        const addToGrid = (particle, index) => {
            const gx = Math.floor(particle.x / gridSize);
            const gy = Math.floor(particle.y / gridSize);
            const key = `${gx},${gy}`;
            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key).push(index);
        };

        const getNeighborIndices = particle => {
            const gx = Math.floor(particle.x / gridSize);
            const gy = Math.floor(particle.y / gridSize);
            const neighbors = [];
            for (let x = gx - 1; x <= gx + 1; x += 1) {
                for (let y = gy - 1; y <= gy + 1; y += 1) {
                    const key = `${x},${y}`;
                    const bucket = grid.get(key);
                    if (bucket) {
                        neighbors.push(...bucket);
                    }
                }
            }
            return neighbors;
        };

        const stepParticles = (delta, now) => {
            const t = now / 1000;
            nebulaState.time = t;
            const driftX = Math.sin(t * 0.5) * 0.003 + Math.sin(t * 0.23) * 0.002;
            const driftY = Math.cos(t * 0.4) * 0.003 + Math.cos(t * 0.31) * 0.002;
            const scrollActive = now < scrollUntil;
            const maxSpeed = scrollActive ? 0.85 : 1.1;
            const friction = scrollActive ? 0.972 : 0.984;
            const centerX = window.innerWidth * 0.5;
            const centerY = window.innerHeight * 0.5;

            if (pointer.active) {
                const ease = 1 - Math.pow(0.0008, delta);
                const prevX = pointer.x;
                const prevY = pointer.y;
                pointer.x += (pointer.targetX - pointer.x) * ease;
                pointer.y += (pointer.targetY - pointer.y) * ease;
                pointer.velocity.x = pointer.x - prevX;
                pointer.velocity.y = pointer.y - prevY;
            } else {
                pointer.velocity.x *= 0.95;
                pointer.velocity.y *= 0.95;
            }

            nebulaState.blobs.forEach(blob => {
                blob.x += blob.vx + Math.sin(t * 0.3 + blob.phase) * 0.2;
                blob.y += blob.vy + Math.cos(t * 0.25 + blob.phase) * 0.2;
                if (blob.x < -blob.radius) blob.x = window.innerWidth + blob.radius;
                if (blob.x > window.innerWidth + blob.radius) blob.x = -blob.radius;
                if (blob.y < -blob.radius) blob.y = window.innerHeight + blob.radius;
                if (blob.y > window.innerHeight + blob.radius) blob.y = -blob.radius;
            });

            particles.forEach(p => {
                const flowX = Math.sin((p.y + t * 50) / 160 + p.flowOffset) + Math.sin((p.x + t * 30) / 200) * 0.5;
                const flowY = Math.cos((p.x + t * 40) / 180 - p.flowOffset) + Math.cos((p.y + t * 25) / 220) * 0.5;
                p.vx += flowX * p.flowStrength;
                p.vy += flowY * p.flowStrength;

                if (pointer.active) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 50000 && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        const forceScale = scrollActive ? 0.02 : 0.035;
                        const force = (1 - dist / 224) * forceScale;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        p.vx += nx * force;
                        p.vy += ny * force;

                        const swirlScale = scrollActive ? 0.025 : 0.045;
                        const swirl = (1 - dist / 224) * swirlScale;
                        p.vx += -ny * swirl;
                        p.vy += nx * swirl;

                        const wakeForce = 0.015;
                        p.vx += pointer.velocity.x * wakeForce * (1 - dist / 224);
                        p.vy += pointer.velocity.y * wakeForce * (1 - dist / 224);
                    }
                } else {
                    const dx = centerX - p.x;
                    const dy = centerY - p.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 35000) {
                        const dist = Math.sqrt(distSq);
                        const pull = Math.min(0.006, dist / 60000);
                        p.vx += (dx / dist) * pull;
                        p.vy += (dy / dist) * pull;
                    }
                }

                p.vx += driftX;
                p.vy += driftY;
                p.vx *= friction;
                p.vy *= friction;

                if (p.x < bounds.margin) {
                    p.vx += (bounds.margin - p.x) * bounds.force;
                } else if (p.x > window.innerWidth - bounds.margin) {
                    p.vx -= (p.x - (window.innerWidth - bounds.margin)) * bounds.force;
                }
                if (p.y < bounds.margin) {
                    p.vy += (bounds.margin - p.y) * bounds.force;
                } else if (p.y > window.innerHeight - bounds.margin) {
                    p.vy -= (p.y - (window.innerHeight - bounds.margin)) * bounds.force;
                }

                const speedSq = p.vx * p.vx + p.vy * p.vy;
                if (speedSq > maxSpeed * maxSpeed) {
                    const scale = maxSpeed / Math.sqrt(speedSq);
                    p.vx *= scale;
                    p.vy *= scale;
                }

                p.x += p.vx * delta * p.speed;
                p.y += p.vy * delta * p.speed;
                if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
                if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
                if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                    p.x = Math.random() * window.innerWidth;
                    p.y = Math.random() * window.innerHeight;
                    p.vx = 0;
                    p.vy = 0;
                }
            });

            if (enablePulseWave && now - effects.lastPulse > effects.pulseInterval && !effects.pulseWave.active && qualityLevel >= 1) {
                effects.pulseWave = {
                    active: true,
                    radius: 0,
                    alpha: 0.4,
                    x: centerX,
                    y: centerY
                };
                effects.lastPulse = now;
            }

            if (enablePulseWave && effects.pulseWave.active) {
                effects.pulseWave.radius += 4;
                effects.pulseWave.alpha *= 0.985;
                if (effects.pulseWave.alpha < 0.01) {
                    effects.pulseWave.active = false;
                }

                particles.forEach(p => {
                    const dx = p.x - effects.pulseWave.x;
                    const dy = p.y - effects.pulseWave.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const waveRadius = effects.pulseWave.radius;
                    if (dist > 0.001 && Math.abs(dist - waveRadius) < 40) {
                        const force = 0.03 * effects.pulseWave.alpha;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                });
            }

            if (enableShootingStars && now - effects.lastShootingStar > effects.shootingStarInterval && qualityLevel === 2) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 8 + Math.random() * 6;
                effects.shootingStars.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight * 0.5,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed + 2,
                    life: 1,
                    tail: []
                });
                effects.lastShootingStar = now;
                effects.shootingStarInterval = 2000 + Math.random() * 4000;
            }

            effects.shootingStars = enableShootingStars ? effects.shootingStars.filter(star => {
                star.tail.unshift({ x: star.x, y: star.y });
                if (star.tail.length > 12) star.tail.pop();
                star.x += star.vx;
                star.y += star.vy;
                star.vy += 0.05;
                star.life -= 0.015;
                return star.life > 0 && star.x > -50 && star.x < window.innerWidth + 50 && star.y < window.innerHeight + 50;
            }) : [];

            effects.ripples = effects.ripples.filter(ripple => {
                ripple.radius += 3;
                ripple.alpha *= 0.96;
                return ripple.alpha > 0.01;
            });
        };

        const createRipple = (x, y) => {
            effects.ripples.push({ x, y, radius: 10, alpha: 0.5 });
            if (effects.ripples.length > 5) effects.ripples.shift();
        };

        const renderNebula = () => {
            if (qualityLevel === 0) return;

            const t = nebulaState.time;
            nebulaState.blobs.forEach((blob, i) => {
                const breathe = 1 + Math.sin(t * 0.4 + blob.phase) * 0.15;
                const radius = blob.radius * breathe;
                const rgb = i % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb;
                const alpha = qualityLevel === 2 ? 0.04 : 0.025;

                const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, radius);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
                gradient.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        const renderEffects = () => {
            if (enablePulseWave && effects.pulseWave.active && qualityLevel >= 1) {
                const { x, y, radius, alpha } = effects.pulseWave;
                const rgb = palette.primaryRgb;
                ctx.globalAlpha = alpha * 0.6;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();

                if (qualityLevel === 2) {
                    ctx.globalAlpha = alpha * 0.2;
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            effects.ripples.forEach(ripple => {
                const rgb = palette.secondaryRgb;
                ctx.globalAlpha = ripple.alpha * 0.8;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                ctx.stroke();

                if (qualityLevel === 2) {
                    ctx.globalAlpha = ripple.alpha * 0.3;
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            effects.shootingStars.forEach(star => {
                if (star.tail.length < 2) return;

                ctx.lineCap = 'round';
                for (let i = 0; i < star.tail.length - 1; i++) {
                    const a = star.tail[i];
                    const b = star.tail[i + 1];
                    const progress = 1 - i / star.tail.length;
                    const alpha = progress * star.life * 0.8;
                    const width = progress * 3;

                    ctx.globalAlpha = alpha * 0.5;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = width + 2;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();

                    ctx.globalAlpha = alpha;
                    const rgb = palette.secondaryRgb;
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
                    ctx.lineWidth = width;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }

                ctx.globalAlpha = star.life;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
                ctx.fill();

                const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 8);
                glow.addColorStop(0, `rgba(255, 255, 255, ${star.life * 0.6})`);
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(star.x, star.y, 8, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;
        };

        const renderParticles = (now, lowQuality) => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            renderNebula();
            if (!lowQuality) renderEffects();

            const t = now / 1000;

            particles.forEach(p => {
                const twinkle = 0.7 + Math.sin(t * p.twinkleSpeed + p.twinkleOffset) * 0.3;
                const pulse = 1 + Math.sin(t * p.pulseSpeed + p.pulsePhase) * 0.15;
                const alpha = p.baseAlpha * twinkle;
                const currentSize = p.size * pulse;

                if (!lowQuality && qualityLevel >= 1) {
                    const rgb = p.layer === 0 ? palette.mutedRgb : p.layer === 1 ? palette.secondaryRgb : palette.primaryRgb;
                    const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowSize * pulse);
                    glowGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})`);
                    glowGradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.2})`);
                    glowGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.glowSize * pulse, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fill();

                if (!lowQuality && qualityLevel === 2 && p.layer === 2) {
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x - currentSize * 0.25, p.y - currentSize * 0.25, currentSize * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            if (lowQuality) {
                ctx.globalAlpha = 1;
                return;
            }

            const lineGradient = getOrCreateGradient('mainLine', () => {
                const grad = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
                grad.addColorStop(0, palette.accentSecondary);
                grad.addColorStop(0.5, palette.accentPrimary);
                grad.addColorStop(1, palette.accentSecondary);
                return grad;
            });

            resetGrid();
            particles.forEach((p, index) => addToGrid(p, index));
            const stride = qualityLevel === 2 ? 1 : 2;

            ctx.lineCap = 'round';

            for (let i = 0; i < particles.length; i += stride) {
                const p = particles[i];
                const neighbors = getNeighborIndices(p);
                neighbors.forEach(j => {
                    if (j <= i) return;
                    const other = particles[j];
                    const dx = p.x - other.x;
                    const dy = p.y - other.y;
                    const range = Math.min(p.linkRange, other.linkRange);
                    const distSq = dx * dx + dy * dy;
                    if (distSq < range * range) {
                        const dist = Math.sqrt(distSq);
                        const strength = 1 - dist / range;
                        const alpha = strength * (qualityLevel === 2 ? 0.4 : 0.28);
                        const lineWidth = 0.5 + strength * 1.5;

                        ctx.globalAlpha = alpha;
                        ctx.strokeStyle = lineGradient;
                        ctx.lineWidth = lineWidth;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();

                        if (qualityLevel === 2 && strength > 0.6) {
                            const rgb = palette.primaryRgb;
                            ctx.globalAlpha = alpha * 0.3;
                            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
                            ctx.lineWidth = lineWidth + 2;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(other.x, other.y);
                            ctx.stroke();
                        }
                    }
                });
            }

            if (qualityLevel > 0 && trail.length > 2) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let i = 0; i < trail.length - 1; i++) {
                    const a = trail[i];
                    const b = trail[i + 1];
                    const progress = i / trail.length;
                    const alpha = progress * 0.5;
                    const width = 1 + progress * 3;

                    const rgb = palette.secondaryRgb;
                    ctx.globalAlpha = alpha * 0.4;
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
                    ctx.lineWidth = width + 4;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();

                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = palette.accentSecondary;
                    ctx.lineWidth = width;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }

                if (trail.length > 0) {
                    const last = trail[trail.length - 1];
                    const rgb = palette.primaryRgb;
                    const cursorGlow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 20);
                    cursorGlow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
                    cursorGlow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                    ctx.fillStyle = cursorGlow;
                    ctx.beginPath();
                    ctx.arc(last.x, last.y, 20, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.globalAlpha = 1;
        };

        const updateQuality = now => {
            frameCount += 1;
            if (lastFpsSample === null) {
                lastFpsSample = now;
                return;
            }
            if (now - lastFpsSample < 1200) {
                return;
            }
            const fps = frameCount / ((now - lastFpsSample) / 1000);
            frameCount = 0;
            lastFpsSample = now;
            if (now - lastQualityChange < 2000) {
                return;
            }
            if (fps < 45 && qualityLevel > 0) {
                qualityLevel -= 1;
            } else if (fps > 58 && qualityLevel < 2 && now > scrollUntil) {
                qualityLevel += 1;
            } else {
                return;
            }
            lastQualityChange = now;
            qualityScale = qualityLevel === 0 ? 0.6 : qualityLevel === 1 ? 0.8 : 1;
            createParticles();
            trail.length = 0;
        };

        const animate = now => {
            if (!running) {
                return;
            }
            if (lastTime === null) {
                lastTime = now;
            }
            const frameDelta = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            accumulator += frameDelta;
            let steps = 0;
            while (accumulator >= fixedStep && steps < maxSteps) {
                stepParticles(1, now);
                accumulator -= fixedStep;
                steps += 1;
            }
            if (steps === 0) {
                stepParticles(frameDelta / fixedStep, now);
            }
            if (steps === maxSteps) {
                accumulator = 0;
            }
            const lowQuality = now < scrollUntil;
            updateQuality(now);
            if (lowQuality) {
                frameSkip = !frameSkip;
                if (frameSkip) {
                    animationFrame = window.requestAnimationFrame(animate);
                    return;
                }
            }
            renderParticles(now, lowQuality);
            animationFrame = window.requestAnimationFrame(animate);
        };

        const start = () => {
            if (running || document.hidden) {
                return;
            }
            running = true;
            animationFrame = window.requestAnimationFrame(animate);
        };

        const stop = () => {
            running = false;
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            lastTime = null;
            accumulator = 0;
        };

        const renderStatic = () => {
            renderParticles(performance.now(), false);
        };

        const handleResize = () => {
            resizeCanvas();
            syncColors();
            createParticles();
            createNebula();
            trail.length = 0;
            if (prefersReducedMotion()) {
                renderStatic();
            }
        };

        const updatePointer = (x, y) => {
            if (!pointer.active) {
                pointer.x = x;
                pointer.y = y;
            }
            pointer.targetX = x;
            pointer.targetY = y;
            pointer.active = true;
            if (performance.now() >= trailSuspendUntil) {
                trail.push({ x, y });
                if (trail.length > trailMax) {
                    trail.shift();
                }
            }
        };

        const deactivatePointer = () => {
            pointer.active = false;
        };

        let pointerQueued = false;
        let pointerQueuedX = 0;
        let pointerQueuedY = 0;

        const schedulePointerUpdate = (x, y) => {
            pointerQueuedX = x;
            pointerQueuedY = y;
            if (pointerQueued) {
                return;
            }
            pointerQueued = true;
            window.requestAnimationFrame(() => {
                pointerQueued = false;
                updatePointer(pointerQueuedX, pointerQueuedY);
            });
        };

        window.addEventListener('pointermove', event => {
            schedulePointerUpdate(event.clientX, event.clientY);
        }, { passive: true });
        window.addEventListener('pointerleave', deactivatePointer);
        window.addEventListener('blur', deactivatePointer);
        window.addEventListener('touchstart', event => {
            const touch = event.touches[0];
            if (touch) {
                schedulePointerUpdate(touch.clientX, touch.clientY);
            }
        }, { passive: true });
        window.addEventListener('touchmove', event => {
            const touch = event.touches[0];
            if (touch) {
                schedulePointerUpdate(touch.clientX, touch.clientY);
            }
        }, { passive: true });
        window.addEventListener('touchend', deactivatePointer);
        window.addEventListener('touchcancel', deactivatePointer);
        window.addEventListener('click', event => {
            if (burstTimer) {
                window.clearTimeout(burstTimer);
            }

            createRipple(event.clientX, event.clientY);

            const burstRadius = 280;
            const burstForce = 0.5;
            particles.forEach(p => {
                const dx = p.x - event.clientX;
                const dy = p.y - event.clientY;
                const distSq = dx * dx + dy * dy;
                if (distSq < burstRadius * burstRadius && distSq > 1) {
                    const dist = Math.sqrt(distSq);
                    const strength = 1 - dist / burstRadius;
                    const force = strength * strength * burstForce;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;

                    if (qualityLevel === 2 && strength > 0.5) {
                        const spin = strength * 0.2;
                        p.vx += -dy / dist * spin;
                        p.vy += dx / dist * spin;
                    }
                }
            });

            burstTimer = window.setTimeout(() => {
                burstTimer = null;
            }, 320);
        });
        window.addEventListener('scroll', () => {
            scrollUntil = performance.now() + 200;
            trailSuspendUntil = scrollUntil;
            trail.length = 0;
        }, { passive: true });

        if ('IntersectionObserver' in window) {
            const headerEl = document.querySelector('header');
            if (headerEl) {
                const observer = new IntersectionObserver(entries => {
                    const visible = entries[0]?.isIntersecting;
                    if (visible) {
                        if (!prefersReducedMotion()) {
                            start();
                        }
                    } else {
                        stop();
                    }
                }, { threshold: 0.05 });
                observer.observe(headerEl);
            }
        }

        syncColors();
        resizeCanvas();
        createParticles();
        createNebula();

        if (prefersReducedMotion()) {
            renderStatic();
        } else {
            start();
        }

        window.addEventListener('resize', handleResize, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stop();
            } else if (!prefersReducedMotion()) {
                start();
            }
        });

        return { start, stop, renderStatic, refresh: handleResize, syncColors };
    };

    window.ParticleHero = { initParticles };
})();
