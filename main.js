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
        copyEmailBtn: qs('[data-copy-email]'),
        copyToast: qs('#copyToast')
    };

    const media = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        prefersDark: window.matchMedia('(prefers-color-scheme: dark)')
    };

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
            return localStorage.getItem('theme') || (media.prefersDark.matches ? 'dark' : 'light');
        },
        set(value) {
            dom.root.setAttribute('data-theme', value);
            localStorage.setItem('theme', value);
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
        if (!dom.nav) {
            return;
        }
        const maxScroll = dom.nav.scrollWidth - dom.nav.clientWidth;
        if (maxScroll <= 1) {
            dom.nav.classList.remove('nav--fade-left', 'nav--fade-right');
            return;
        }
        const scrolledLeft = dom.nav.scrollLeft > 4;
        const scrolledRight = dom.nav.scrollLeft < maxScroll - 4;
        dom.nav.classList.toggle('nav--fade-left', scrolledLeft);
        dom.nav.classList.toggle('nav--fade-right', scrolledRight);
    };

    const updateScroll = cache => {
        const st = window.scrollY;
        const dh = document.documentElement.scrollHeight - window.innerHeight;
        const progress = dh > 0 ? (st / dh) * 100 : 0;

        if (dom.scrollProgress) {
            dom.scrollProgress.style.width = `${progress}%`;
        }
        if (dom.nav) {
            dom.nav.classList.toggle('visible', st > window.innerHeight * 0.8);
        }
        if (dom.backToTop) {
            dom.backToTop.classList.toggle('visible', st > 500);
        }

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
                        }
                    } else {
                        link.removeAttribute('aria-current');
                    }
                });
            }
        });
    };

    const initScrollTracking = () => {
        const cache = {
            navLinks: qsa('.nav a'),
            sections: qsa('section[id]'),
            lastActive: null
        };
        let ticking = false;

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

        updateScroll(cache);
        updateNavFade();
        window.addEventListener('scroll', onScroll, { passive: true });
        if (dom.nav) {
            dom.nav.addEventListener('scroll', updateNavFade, { passive: true });
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

        const resizeCanvas = () => {
            dom.particlesCanvas.width = window.innerWidth;
            dom.particlesCanvas.height = window.innerHeight;
        };

        const getParticleCount = () => {
            const baseCount = Math.floor((dom.particlesCanvas.width * dom.particlesCanvas.height) / 15000);
            const capped = Math.min(baseCount, 120);
            const scaled = window.innerWidth < 768 ? Math.floor(capped * 0.6) : capped;
            return Math.max(20, scaled);
        };

        const createParticles = () => {
            particles = [];
            const count = getParticleCount();
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * dom.particlesCanvas.width,
                    y: Math.random() * dom.particlesCanvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                });
            }
        };

        const renderParticles = () => {
            ctx.clearRect(0, 0, dom.particlesCanvas.width, dom.particlesCanvas.height);
            ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > dom.particlesCanvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > dom.particlesCanvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.globalAlpha = 1 - dist / 120;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            ctx.globalAlpha = 1;
        };

        const animate = () => {
            if (!running) {
                return;
            }
            renderParticles();
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
        };

        const renderStatic = () => {
            renderParticles();
        };

        const handleResize = () => {
            resizeCanvas();
            createParticles();
            if (media.reducedMotion.matches) {
                renderStatic();
            }
        };

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

        return { start, stop, renderStatic, refresh: handleResize };
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

    const initCommandPalette = () => {
        if (!dom.commandPalette || !dom.commandInput || !dom.commandList) {
            return;
        }

        let lastFocus = null;

        const openExternal = url => {
            const win = window.open(url, '_blank', 'noopener');
            if (win) {
                win.opener = null;
            }
        };

        dom.commandInput.setAttribute('aria-controls', 'commandList');

        const commands = [
            { icon: '&#128188;', title: 'Experience', desc: 'View work history', action: () => scrollToSection('experience') },
            { icon: '&#127891;', title: 'Education', desc: 'View academic background', action: () => scrollToSection('education') },
            { icon: '&#128272;', title: 'Certifications', desc: 'View credentials', action: () => scrollToSection('certifications') },
            { icon: '&#128736;', title: 'Skills', desc: 'View expertise', action: () => scrollToSection('skills') },
            { icon: '&#128214;', title: 'Publications', desc: 'View research', action: () => scrollToSection('publications') },
            { icon: '&#128231;', title: 'Contact', desc: 'Get in touch', action: () => scrollToSection('contact') },
            { icon: '&#128421;', title: 'Status', desc: 'View server status', action: () => { window.location.href = '/status'; } },
            { icon: '&#128203;', title: 'Copy Email', desc: 'Copy email address', action: handleCopyEmail },
            { icon: '&#127769;', title: 'Toggle Theme', desc: 'Switch light/dark mode', action: theme.toggle },
            { icon: '&#128196;', title: 'Download Resume', desc: 'Get PDF resume', action: () => openExternal('https://files.aahmed.ca/resume.pdf') },
            { icon: '&#128195;', title: 'Download CV', desc: 'Get full CV', action: () => openExternal('https://files.aahmed.ca/cv.pdf') }
        ];

        let selectedCmd = 0;

        const renderCommands = (filter = '') => {
            const normalized = filter.toLowerCase();
            const filtered = commands.filter(cmd =>
                cmd.title.toLowerCase().includes(normalized) || cmd.desc.toLowerCase().includes(normalized)
            );

            if (!filtered.length) {
                dom.commandList.innerHTML = '<div class="command-empty">No matches</div>';
                return;
            }

            dom.commandList.innerHTML = filtered.map((cmd, index) => `
                <div class="command-item ${index === selectedCmd ? 'selected' : ''}" data-index="${index}">
                    <div class="command-item-icon">${cmd.icon}</div>
                    <div class="command-item-text">
                        <div class="command-item-title">${cmd.title}</div>
                        <div class="command-item-desc">${cmd.desc}</div>
                    </div>
                </div>
            `).join('');

            qsa('.command-item', dom.commandList).forEach((el, index) => {
                el.addEventListener('click', () => {
                    filtered[index].action();
                    closeCommandPalette();
                });
            });
        };

        const setPaletteState = open => {
            dom.commandPalette.classList.toggle('active', open);
            dom.commandPalette.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (dom.navCmd) {
                dom.navCmd.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
        };

        const openCommandPalette = () => {
            if (dom.commandPalette.classList.contains('active')) {
                closeCommandPalette();
                return;
            }
            lastFocus = document.activeElement;
            setPaletteState(true);
            dom.commandInput.value = '';
            dom.commandInput.focus();
            selectedCmd = 0;
            renderCommands();
        };

        const closeCommandPalette = () => {
            if (!dom.commandPalette.classList.contains('active')) {
                return;
            }
            setPaletteState(false);
            if (lastFocus && typeof lastFocus.focus === 'function') {
                lastFocus.focus();
            }
        };

        dom.commandInput.addEventListener('input', event => {
            selectedCmd = 0;
            renderCommands(event.target.value);
        });

        dom.commandInput.addEventListener('keydown', event => {
            const items = qsa('.command-item', dom.commandList);
            if (!items.length) {
                if (event.key === 'Escape') {
                    closeCommandPalette();
                }
                return;
            }
            if (event.key === 'ArrowDown') {
                selectedCmd = (selectedCmd + 1) % items.length;
                renderCommands(dom.commandInput.value);
            } else if (event.key === 'ArrowUp') {
                selectedCmd = (selectedCmd - 1 + items.length) % items.length;
                renderCommands(dom.commandInput.value);
            } else if (event.key === 'Enter') {
                items[selectedCmd]?.click();
            } else if (event.key === 'Escape') {
                closeCommandPalette();
            }
        });

        dom.commandPalette.addEventListener('click', event => {
            if (event.target === dom.commandPalette) {
                closeCommandPalette();
            }
        });

        dom.commandPalette.addEventListener('keydown', event => {
            if (event.key === 'Tab') {
                event.preventDefault();
                dom.commandInput.focus();
            }
        });

        document.addEventListener('keydown', event => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openCommandPalette();
                return;
            }
            if (dom.commandPalette.classList.contains('active') && event.key === 'Escape') {
                event.preventDefault();
                closeCommandPalette();
            }
        });

        if (dom.navCmd) {
            dom.navCmd.addEventListener('click', openCommandPalette);
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
            if (!localStorage.getItem('theme')) {
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
