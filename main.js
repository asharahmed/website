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
    const particleHero = window.ParticleHero || {};
    const isStatusPage = () => document.body && document.body.classList.contains('status-page');
    const shouldInitParticles = () => {
        if (isStatusPage()) {
            return false;
        }
        if (media.reducedMotion.matches) {
            return false;
        }
        if (navigator.connection && navigator.connection.saveData) {
            return false;
        }
        if (navigator.deviceMemory && navigator.deviceMemory <= 4) {
            return false;
        }
        return true;
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

    const initAnimations = () => {
        if (isStatusPage()) {
            return;
        }
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
        document.documentElement.classList.add('js-enabled');
        theme.set(theme.get());
        initMediaListeners();

        initScrollTracking();
        initCommandPalette();
        initMobileMenu();
        bindActions();

        window.addEventListener('load', () => {
            if (dom.loadingOverlay) {
                dom.loadingOverlay.classList.add('hidden');
            }
            const startParticles = () => {
                if (!shouldInitParticles()) {
                    return;
                }
                if (!particleHero.initParticles) {
                    return;
                }
                particleController = particleHero.initParticles(dom.particlesCanvas, {
                    prefersReducedMotion: () => media.reducedMotion.matches
                });
            };
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(startParticles, { timeout: 1200 });
            } else {
                window.setTimeout(startParticles, 200);
            }
            initTyping();
            initAnimations();
        });
    };

    init();
})();
