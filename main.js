/*
    Ashar S. Ahmed - Main Script
*/

(() => {
    const qs = (sel, scope = document) => scope.querySelector(sel);
    const qsa = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

    const dom = {
        root: document.documentElement,
        themeToggle: qs('.theme-toggle'),
        themeIcon: qs('#themeIcon'),
        nav: qs('#nav'),
        navCmd: qs('.nav-cmd'),
        backToTop: qs('#backToTop'),
        scrollProgress: qs('#scrollProgress'),
        scrollIndicator: qs('#scrollIndicator'),
        loadingOverlay: qs('.loading-overlay'),
        typingText: qs('#typingText'),
        commandPalette: qs('#commandPalette'),
        commandInput: qs('#commandInput'),
        commandList: qs('#commandList'),
        mobileBtn: qs('#mobileMenuBtn'),
        mobileNav: qs('#mobileNav'),
        particlesCanvas: qs('#particles-canvas'),
        navScroller: qs('.nav-scroller'),
        copyEmailBtn: qs('[data-copy-email]'),
        copyToast: qs('#copyToast')
    };

    const media = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        prefersDark: window.matchMedia('(prefers-color-scheme: dark)')
    };

    const siteUtils = window.SiteUtils || {};

    const state = {
        scrollBehavior: media.reducedMotion.matches ? 'auto' : 'smooth',
        typing: {
            roles: [
                'Software Developer',
                'Cyber Security Professional',
                'AWS Certified Architect',
                'Published Researcher',
                'Public Sector Technologist'
            ],
            index: 0,
            charIndex: 0,
            deleting: false
        }
    };

    let particleController = null;
    let toastTimer = null;

    const copyToClipboard = async value => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    };

    const showToast = message => {
        if (!dom.copyToast) {
            return;
        }
        dom.copyToast.textContent = message;
        dom.copyToast.classList.add('is-visible');
        if (toastTimer) {
            window.clearTimeout(toastTimer);
        }
        toastTimer = window.setTimeout(() => {
            dom.copyToast.classList.remove('is-visible');
        }, 1800);
    };

    const handleCopyEmail = async () => {
        if (!dom.copyEmailBtn) {
            return;
        }
        const email = dom.copyEmailBtn.dataset.copyEmail;
        if (!email) {
            return;
        }
        try {
            await copyToClipboard(email);
            showToast('Email copied to clipboard');
        } catch (error) {
            showToast('Copy failed');
        }
    };

    const theme = {
        get() {
            const stored = siteUtils.getStoredTheme ? siteUtils.getStoredTheme() : null;
            return stored || (media.prefersDark.matches ? 'dark' : 'light');
        },
        set(value) {
            dom.root.setAttribute('data-theme', value);
            if (siteUtils.setStoredTheme) {
                siteUtils.setStoredTheme(value);
            }
            if (dom.themeIcon) {
                dom.themeIcon.innerHTML = value === 'dark' ? '&#9788;' : '&#9790;';
            }
            if (dom.themeToggle) {
                dom.themeToggle.setAttribute('aria-pressed', value === 'dark');
            }
            const themeMeta = qs('meta[name="theme-color"]');
            if (themeMeta) {
                themeMeta.setAttribute('content', value === 'dark' ? '#0f172a' : '#f8fafc');
            }
            if (particleController && particleController.syncColors) {
                particleController.syncColors();
            }
        },
        toggle() {
            const current = dom.root.getAttribute('data-theme');
            theme.set(current === 'dark' ? 'light' : 'dark');
        }
    };

    const scrollToSection = id => {
        const target = qs(`#${id}`);
        if (target) {
            target.scrollIntoView({ behavior: state.scrollBehavior });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: state.scrollBehavior });
    };

    const updateNavFade = () => {
        if (!dom.nav || !dom.navScroller) {
            return;
        }
        const maxScroll = dom.navScroller.scrollWidth - dom.navScroller.clientWidth;
        if (maxScroll <= 1) {
            dom.nav.classList.remove('nav--fade-left', 'nav--fade-right');
            return;
        }
        const scrolledLeft = dom.navScroller.scrollLeft > 4;
        const scrolledRight = dom.navScroller.scrollLeft < maxScroll - 4;
        dom.nav.classList.toggle('nav--fade-left', scrolledLeft);
        dom.nav.classList.toggle('nav--fade-right', scrolledRight);
    };

    let heroOutOfView = true;
    let hasHeroObserver = false;
    const hero = qs('header');

    const updateNavVisibility = () => {
        if (dom.nav) {
            dom.nav.classList.toggle('visible', heroOutOfView);
        }
    };

    const updateScroll = cache => {
        const st = window.scrollY;
        const dh = document.documentElement.scrollHeight - window.innerHeight;
        const progress = dh > 0 ? (st / dh) * 100 : 0;

        if (dom.scrollProgress) {
            dom.scrollProgress.style.width = `${progress}%`;
        }
        if (hero && !hasHeroObserver) {
            heroOutOfView = hero.getBoundingClientRect().bottom <= 0;
        }
        updateNavVisibility();
        if (dom.backToTop) {
            dom.backToTop.classList.toggle('visible', st > 500);
        }
        if (!cache.useObserver) {
            cache.sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 150 && rect.bottom >= 150) {
                    cache.navLinks.forEach(link => {
                        const active = link.getAttribute('href') === `#${section.id}`;
                        link.classList.toggle('active', active);
                        if (active) {
                            link.setAttribute('aria-current', 'page');
                            if (cache.lastActive !== link) {
                                cache.lastActive = link;
                                link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                window.requestAnimationFrame(updateNavFade);
                                window.setTimeout(updateNavFade, 220);
                            }
                        } else {
                            link.removeAttribute('aria-current');
                        }
                    });
                }
            });
        }
    };

    const initScrollTracking = () => {
        const cache = {
            navLinks: qsa('.nav a'),
            sections: qsa('section[id]'),
            sectionLinks: new Map(),
            lastActive: null,
            useObserver: false
        };
        let ticking = false;

        cache.navLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.startsWith('#')) {
                cache.sectionLinks.set(href.slice(1), link);
            }
        });

        const setActiveLink = link => {
            if (!link || cache.lastActive === link) {
                return;
            }
            cache.navLinks.forEach(navLink => {
                const active = navLink === link;
                navLink.classList.toggle('active', active);
                if (active) {
                    navLink.setAttribute('aria-current', 'page');
                } else {
                    navLink.removeAttribute('aria-current');
                }
            });
            cache.lastActive = link;
            link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            window.requestAnimationFrame(updateNavFade);
            window.setTimeout(updateNavFade, 220);
        };

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                const visible = entries.filter(entry => entry.isIntersecting);
                if (!visible.length) {
                    return;
                }
                visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                const entry = visible[0];
                const link = cache.sectionLinks.get(entry.target.id);
                setActiveLink(link);
            }, {
                rootMargin: '-35% 0px -55% 0px',
                threshold: [0.1, 0.25, 0.5, 0.75, 1]
            });
            cache.sections.forEach(section => observer.observe(section));
            cache.useObserver = true;
        }

        const onScroll = () => {
            if (ticking) {
                return;
            }
            ticking = true;
            window.requestAnimationFrame(() => {
                updateScroll(cache);
                ticking = false;
            });
        };

        if (hero && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                heroOutOfView = !entries[0].isIntersecting;
                updateNavVisibility();
            }, {
                threshold: 0.1
            });
            observer.observe(hero);
            hasHeroObserver = true;
        }

        updateScroll(cache);
        updateNavFade();
        window.addEventListener('scroll', onScroll, { passive: true });
        if (dom.navScroller) {
            dom.navScroller.addEventListener('scroll', updateNavFade, { passive: true });
        }
        window.addEventListener('resize', updateNavFade, { passive: true });
    };

    const initTyping = () => {
        if (!dom.typingText) {
            return;
        }

        if (media.reducedMotion.matches) {
            dom.typingText.textContent = state.typing.roles[0];
            return;
        }

        const type = () => {
            const role = state.typing.roles[state.typing.index];
            state.typing.charIndex += state.typing.deleting ? -1 : 1;
            dom.typingText.textContent = role.substring(0, state.typing.charIndex);

            let delay = state.typing.deleting ? 40 : 80;
            if (!state.typing.deleting && state.typing.charIndex === role.length) {
                delay = 2000;
                state.typing.deleting = true;
            } else if (state.typing.deleting && state.typing.charIndex === 0) {
                state.typing.deleting = false;
                state.typing.index = (state.typing.index + 1) % state.typing.roles.length;
                delay = 400;
            }

            setTimeout(type, delay);
        };

        type();
    };

    const initParticles = () => {
        if (!dom.particlesCanvas) {
            return null;
        }

        const ctx = dom.particlesCanvas.getContext('2d');
        let particles = [];
        let animationFrame = null;
        let running = false;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        const grid = new Map();
        const gridSize = 140;
        let lastTime = null;
        const pointer = { x: 0, y: 0, active: false };
        const bounds = { margin: 90, force: 0.00085 };
        const trail = [];
        const trailMax = 22;
        let burstTimer = null;
        let palette = {
            muted: '#94a3b8',
            accentPrimary: '#ef4444',
            accentSecondary: '#fb7185'
        };

        const readColor = (varName, fallback) => {
            const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return value || fallback;
        };

        const syncColors = () => {
            palette = {
                muted: readColor('--text-muted', palette.muted),
                accentPrimary: readColor('--accent-primary', palette.accentPrimary),
                accentSecondary: readColor('--accent-secondary', palette.accentSecondary)
            };
        };

        const resizeCanvas = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            dom.particlesCanvas.width = Math.floor(window.innerWidth * dpr);
            dom.particlesCanvas.height = Math.floor(window.innerHeight * dpr);
            dom.particlesCanvas.style.width = `${window.innerWidth}px`;
            dom.particlesCanvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const getParticleCount = () => {
            const baseCount = Math.floor((window.innerWidth * window.innerHeight) / 15000);
            const capped = Math.min(baseCount, 120);
            const scaled = window.innerWidth < 768 ? Math.floor(capped * 0.6) : capped;
            return Math.max(20, scaled);
        };

        const createParticles = () => {
            particles = [];
            const count = getParticleCount();
            for (let i = 0; i < count; i++) {
                const layer = Math.floor(Math.random() * 3);
                const speed = layer === 0 ? 0.6 : layer === 1 ? 0.9 : 1.15;
                const size = layer === 0 ? Math.random() * 1.6 + 0.6 : layer === 1 ? Math.random() * 1.6 + 0.9 : Math.random() * 1.8 + 1.2;
                const color = layer === 0 ? palette.muted : layer === 1 ? palette.accentSecondary : palette.accentPrimary;
                const baseAlpha = layer === 0 ? 0.2 : layer === 1 ? 0.32 : 0.45;
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: (Math.random() - 0.5) * 0.45,
                    size,
                    speed,
                    layer,
                    color,
                    baseAlpha,
                    linkRange: layer === 0 ? 140 : layer === 1 ? 130 : 110,
                    twinkleSpeed: Math.random() * 1.5 + 0.6,
                    twinkleOffset: Math.random() * Math.PI * 2
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
            const driftX = Math.sin(t * 0.6) * 0.004;
            const driftY = Math.cos(t * 0.5) * 0.004;
            const maxSpeed = 1.15;
            const friction = 0.986;
            particles.forEach(p => {
                if (pointer.active) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 36000 && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / 190) * 0.04;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        p.vx += nx * force;
                        p.vy += ny * force;
                        const swirl = (1 - dist / 190) * 0.05;
                        p.vx += -ny * swirl;
                        p.vy += nx * swirl;
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
            });
        };

        const renderParticles = now => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            particles.forEach(p => {
                const twinkle = 0.75 + Math.sin(now / 1000 * p.twinkleSpeed + p.twinkleOffset) * 0.25;
                ctx.globalAlpha = p.baseAlpha * twinkle;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            const lineGradient = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
            lineGradient.addColorStop(0, palette.accentSecondary);
            lineGradient.addColorStop(1, palette.accentPrimary);
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            resetGrid();
            particles.forEach((p, index) => addToGrid(p, index));
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const neighbors = getNeighborIndices(p);
                neighbors.forEach(j => {
                    if (j <= i) {
                        return;
                    }
                    const other = particles[j];
                    const dx = p.x - other.x;
                    const dy = p.y - other.y;
                    const range = Math.min(p.linkRange, other.linkRange);
                    const distSq = dx * dx + dy * dy;
                    if (distSq < range * range) {
                        const dist = Math.sqrt(distSq);
                        ctx.globalAlpha = (1 - dist / range) * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();
                    }
                });
            }

            if (trail.length > 1) {
                ctx.lineWidth = 2;
                for (let i = 0; i < trail.length - 1; i++) {
                    const a = trail[i];
                    const b = trail[i + 1];
                    const alpha = i / trail.length;
                    ctx.globalAlpha = alpha * 0.35;
                    ctx.strokeStyle = palette.accentSecondary;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            ctx.globalAlpha = 1;
        };

        const animate = now => {
            if (!running) {
                return;
            }
            if (lastTime === null) {
                lastTime = now;
            }
            const delta = Math.min(2, (now - lastTime) / 16.67);
            lastTime = now;
            stepParticles(delta, now);
            renderParticles(now);
            animationFrame = window.requestAnimationFrame(animate);
        };

        const start = () => {
            if (running || document.hidden) {
                return;
            }
            running = true;
            animate();
        };

        const stop = () => {
            running = false;
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            lastTime = null;
        };

        const renderStatic = () => {
            renderParticles();
        };

        const handleResize = () => {
            resizeCanvas();
            syncColors();
            createParticles();
            trail.length = 0;
            if (media.reducedMotion.matches) {
                renderStatic();
            }
        };

        window.addEventListener('pointermove', event => {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
            pointer.active = true;
            trail.push({ x: pointer.x, y: pointer.y });
            if (trail.length > trailMax) {
                trail.shift();
            }
        }, { passive: true });
        window.addEventListener('pointerleave', () => {
            pointer.active = false;
        });
        window.addEventListener('blur', () => {
            pointer.active = false;
        });
        window.addEventListener('click', event => {
            if (burstTimer) {
                window.clearTimeout(burstTimer);
            }
            particles.forEach(p => {
                const dx = p.x - event.clientX;
                const dy = p.y - event.clientY;
                const distSq = dx * dx + dy * dy;
                if (distSq < 65000 && distSq > 1) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / 255) * 0.35;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            });
            burstTimer = window.setTimeout(() => {
                burstTimer = null;
            }, 320);
        });

        syncColors();
        resizeCanvas();
        createParticles();

        if (media.reducedMotion.matches) {
            renderStatic();
        } else {
            start();
        }

        window.addEventListener('resize', handleResize, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stop();
            } else if (!media.reducedMotion.matches) {
                start();
            }
        });

        return { start, stop, renderStatic, refresh: handleResize, syncColors };
    };

    const initAnimations = () => {
        const animatedItems = qsa('.timeline-item, .education-card, .cert-card, .skill-category, .publication-card');
        const statNumbers = qsa('.stat-number');

        if (media.reducedMotion.matches) {
            animatedItems.forEach(el => el.classList.add('animate-in'));
            statNumbers.forEach(el => { el.textContent = el.dataset.target; });
            return;
        }

        const animateOnScroll = () => {
            const obs = new IntersectionObserver(entries => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => entry.target.classList.add('animate-in'), index * 60);
                    }
                });
            }, { threshold: 0.1 });

            animatedItems.forEach(el => obs.observe(el));
        };

        const animateCounters = () => {
            const obs = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = Number(entry.target.dataset.target || 0);
                        let current = 0;
                        const timer = setInterval(() => {
                            current += target / 30;
                            if (current >= target) {
                                entry.target.textContent = target;
                                clearInterval(timer);
                            } else {
                                entry.target.textContent = Math.floor(current);
                            }
                        }, 30);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            statNumbers.forEach(el => obs.observe(el));
        };

        animateOnScroll();
        animateCounters();
    };

    const buildCommands = handlers => [
        { icon: '&#128188;', title: 'Experience', desc: 'View work history', action: () => handlers.scrollToSection('experience') },
        { icon: '&#127891;', title: 'Education', desc: 'View academic background', action: () => handlers.scrollToSection('education') },
        { icon: '&#128272;', title: 'Certifications', desc: 'View credentials', action: () => handlers.scrollToSection('certifications') },
        { icon: '&#128736;', title: 'Skills', desc: 'View expertise', action: () => handlers.scrollToSection('skills') },
        { icon: '&#128214;', title: 'Publications', desc: 'View research', action: () => handlers.scrollToSection('publications') },
        { icon: '&#128231;', title: 'Contact', desc: 'Get in touch', action: () => handlers.scrollToSection('contact') },
        { icon: '&#128421;', title: 'Status', desc: 'View server status', action: () => { window.location.href = '/status/'; } },
        { icon: '&#127769;', title: 'Toggle Theme', desc: 'Switch light/dark mode', action: handlers.toggleTheme },
        { icon: '&#128196;', title: 'Download Resume', desc: 'Get PDF resume', action: () => handlers.openExternal('https://files.aahmed.ca/resume.pdf') },
        { icon: '&#128195;', title: 'Download CV', desc: 'Get full CV', action: () => handlers.openExternal('https://files.aahmed.ca/cv.pdf') }
    ];

    const filterCommands = (commands, filter) => {
        const normalized = filter.toLowerCase();
        return commands.filter(cmd =>
            cmd.title.toLowerCase().includes(normalized) || cmd.desc.toLowerCase().includes(normalized)
        );
    };

    const renderCommandList = (listEl, commands, selectedIndex, onSelect) => {
        if (!commands.length) {
            listEl.innerHTML = '<div class="command-empty">No matches</div>';
            return;
        }

        listEl.innerHTML = commands.map((cmd, index) => `
            <div class="command-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
                <div class="command-item-icon">${cmd.icon}</div>
                <div class="command-item-text">
                    <div class="command-item-title">${cmd.title}</div>
                    <div class="command-item-desc">${cmd.desc}</div>
                </div>
            </div>
        `).join('');

        qsa('.command-item', listEl).forEach((el, index) => {
            el.addEventListener('click', () => {
                onSelect(commands[index]);
            });
        });
    };

    const setPaletteState = (paletteEl, navCmd, open) => {
        paletteEl.classList.toggle('active', open);
        paletteEl.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (navCmd) {
            navCmd.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    };

    const renderCommands = (domRef, commands, state, filter = '') => {
        const filtered = filterCommands(commands, filter);
        renderCommandList(domRef.commandList, filtered, state.selectedCmd, cmd => {
            cmd.action();
            closeCommandPalette(domRef, state);
        });
    };

    const openCommandPalette = (domRef, state, commands) => {
        if (domRef.commandPalette.classList.contains('active')) {
            closeCommandPalette(domRef, state);
            return;
        }
        state.lastFocus = document.activeElement;
        setPaletteState(domRef.commandPalette, domRef.navCmd, true);
        domRef.commandInput.value = '';
        domRef.commandInput.focus();
        state.selectedCmd = 0;
        renderCommands(domRef, commands, state);
    };

    const closeCommandPalette = (domRef, state) => {
        if (!domRef.commandPalette.classList.contains('active')) {
            return;
        }
        setPaletteState(domRef.commandPalette, domRef.navCmd, false);
        if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
            state.lastFocus.focus();
        }
    };

    const handleCommandInput = (event, domRef, commands, state) => {
        state.selectedCmd = 0;
        renderCommands(domRef, commands, state, event.target.value);
    };

    const handleCommandInputKeydown = (event, domRef, commands, state) => {
        const items = qsa('.command-item', domRef.commandList);
        if (!items.length) {
            if (event.key === 'Escape') {
                closeCommandPalette(domRef, state);
            }
            return;
        }
        if (event.key === 'ArrowDown') {
            state.selectedCmd = (state.selectedCmd + 1) % items.length;
            renderCommands(domRef, commands, state, domRef.commandInput.value);
        } else if (event.key === 'ArrowUp') {
            state.selectedCmd = (state.selectedCmd - 1 + items.length) % items.length;
            renderCommands(domRef, commands, state, domRef.commandInput.value);
        } else if (event.key === 'Enter') {
            items[state.selectedCmd]?.click();
        } else if (event.key === 'Escape') {
            closeCommandPalette(domRef, state);
        }
    };

    const handlePaletteClick = (event, domRef, state) => {
        if (event.target === domRef.commandPalette) {
            closeCommandPalette(domRef, state);
        }
    };

    const handlePaletteKeydown = (event, domRef) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            domRef.commandInput.focus();
        }
    };

    const handleCommandGlobalKeydown = (event, domRef, state, commands) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openCommandPalette(domRef, state, commands);
            return;
        }
        if (domRef.commandPalette.classList.contains('active') && event.key === 'Escape') {
            event.preventDefault();
            closeCommandPalette(domRef, state);
        }
    };

    const initCommandPalette = () => {
        if (!dom.commandPalette || !dom.commandInput || !dom.commandList) {
            return;
        }

        const openExternal = url => {
            const win = window.open(url, '_blank', 'noopener');
            if (win) {
                win.opener = null;
            }
        };

        dom.commandInput.setAttribute('aria-controls', 'commandList');

        const commands = buildCommands({
            scrollToSection,
            handleCopyEmail,
            toggleTheme: theme.toggle,
            openExternal
        });

        const state = { selectedCmd: 0, lastFocus: null };

        dom.commandInput.addEventListener('input', event => {
            handleCommandInput(event, dom, commands, state);
        });
        dom.commandInput.addEventListener('keydown', event => {
            handleCommandInputKeydown(event, dom, commands, state);
        });
        dom.commandPalette.addEventListener('click', event => {
            handlePaletteClick(event, dom, state);
        });
        dom.commandPalette.addEventListener('keydown', event => {
            handlePaletteKeydown(event, dom);
        });
        document.addEventListener('keydown', event => {
            handleCommandGlobalKeydown(event, dom, state, commands);
        });

        if (dom.navCmd) {
            dom.navCmd.addEventListener('click', () => {
                openCommandPalette(dom, state, commands);
            });
        }
    };

    const initMobileMenu = () => {
        if (!dom.mobileBtn || !dom.mobileNav) {
            return;
        }

        const toggleMobileMenu = () => {
            dom.mobileBtn.classList.toggle('active');
            dom.mobileNav.classList.toggle('active');
            const open = dom.mobileNav.classList.contains('active');
            dom.mobileBtn.setAttribute('aria-expanded', open);
            dom.mobileNav.setAttribute('aria-hidden', !open);
            document.body.style.overflow = open ? 'hidden' : '';
        };

        const closeMobileMenu = () => {
            dom.mobileBtn.classList.remove('active');
            dom.mobileNav.classList.remove('active');
            dom.mobileBtn.setAttribute('aria-expanded', 'false');
            dom.mobileNav.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        dom.mobileBtn.addEventListener('click', toggleMobileMenu);
        dom.mobileNav.addEventListener('click', event => {
            if (event.target.tagName === 'A') {
                closeMobileMenu();
            }
        });
    };

    const bindActions = () => {
        if (dom.themeToggle) {
            dom.themeToggle.addEventListener('click', theme.toggle);
        }
        if (dom.backToTop) {
            dom.backToTop.addEventListener('click', scrollToTop);
        }
        if (dom.scrollIndicator) {
            dom.scrollIndicator.addEventListener('click', () => scrollToSection('main-content'));
        }
        if (dom.copyEmailBtn) {
            dom.copyEmailBtn.addEventListener('click', handleCopyEmail);
        }
    };

    const initMediaListeners = () => {
        media.reducedMotion.addEventListener('change', event => {
            state.scrollBehavior = event.matches ? 'auto' : 'smooth';
            if (particleController) {
                if (event.matches) {
                    particleController.stop();
                    particleController.renderStatic();
                } else if (!document.hidden) {
                    particleController.start();
                }
            }
        });

        media.prefersDark.addEventListener('change', event => {
            const stored = siteUtils.getStoredTheme ? siteUtils.getStoredTheme() : null;
            if (!stored) {
                theme.set(event.matches ? 'dark' : 'light');
            }
        });
    };

    const init = () => {
        theme.set(theme.get());
        initMediaListeners();

        particleController = initParticles();
        initScrollTracking();
        initCommandPalette();
        initMobileMenu();
        bindActions();

        window.addEventListener('load', () => {
            if (dom.loadingOverlay) {
                dom.loadingOverlay.classList.add('hidden');
            }
            initTyping();
            initAnimations();
        });
    };

    init();
})();
