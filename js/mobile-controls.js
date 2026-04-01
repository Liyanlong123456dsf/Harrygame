class MobileControls {
    constructor(game) {
        this.game = game;
        this._joystickActive = false;
        this._joystickId = null;
        this._origin = { x: 0, y: 0 };
        this._evBound = false;
        this._proximityFrame = 0;   // throttle: check every 3 frames

        this.el     = document.getElementById('mobile-controls');
        this._base  = document.getElementById('joystick-base');
        this._thumb = document.getElementById('joystick-thumb');

        // Context-sensitive collect button (created on show())
        this._collectBtn = null;
    }

    _isTouch() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }

    // Responsive joystick radius (px): phone → ~55-70, large phone → 70, tablet → 90
    _getJoystickRadius() {
        const w = window.innerWidth;
        if (w >= 900) return 90;
        if (w >= 600) return 70;
        return Math.min(70, Math.round(w * 0.11));
    }

    show() {
        if (!this._isTouch() || !this.el) return;
        if (!this._evBound) {
            this._evBound = true;
            this._applyJoystickSize();
            this._bindJoystick();
            this._bindActions();
            this._createCollectBtn();
            // Idle opacity
            if (this._base) this._base.style.opacity = '0.5';
        }
        this.el.classList.remove('hidden');
    }

    hide() {
        if (!this.el) return;
        this.el.classList.add('hidden');
        this._clearMovement();
        this._hideCollectBtn();
    }

    // Apply responsive dimensions to joystick DOM elements
    _applyJoystickSize() {
        const r = this._getJoystickRadius();
        const d = r * 2;
        if (this._base) {
            this._base.style.width  = d + 'px';
            this._base.style.height = d + 'px';
        }
        const thumbD = Math.round(d * 0.45);
        if (this._thumb) {
            this._thumb.style.width  = thumbD + 'px';
            this._thumb.style.height = thumbD + 'px';
        }
    }

    _clearMovement() {
        const keys = this.game.input.keys;
        keys['w'] = false;
        keys['a'] = false;
        keys['s'] = false;
        keys['d'] = false;
    }

    _bindJoystick() {
        const zone = document.getElementById('joystick-zone');
        zone.addEventListener('touchstart',  e => this._onStart(e),  { passive: false });
        zone.addEventListener('touchmove',   e => this._onMove(e),   { passive: false });
        zone.addEventListener('touchend',    e => this._onEnd(e),    { passive: false });
        zone.addEventListener('touchcancel', e => this._onEnd(e),    { passive: false });
    }

    _bindActions() {
        const tap = (id, fn) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', e => {
                e.preventDefault();
                e.stopPropagation();
                el.classList.add('mb-active');
                if (this.game.gameStarted && !this.game.gameEnded && !this.game.paused) fn();
            }, { passive: false });
            el.addEventListener('touchend', e => {
                e.preventDefault();
                el.classList.remove('mb-active');
            }, { passive: false });
            el.addEventListener('touchcancel', e => {
                el.classList.remove('mb-active');
            }, { passive: false });
        };

        tap('mb-attack',    () => this.game.attack());
        tap('mb-interact',  () => this.game.interact());
        tap('mb-inventory', () => this.game.ui.toggleInventory());
        tap('mb-craft',     () => this.game.ui.toggleCraftScreen());
        tap('mb-lantern',   () => this.game.placeOrUseLantern());

        // 冲刺（长按保持）
        const sprintBtn = document.getElementById('mb-sprint');
        if (sprintBtn) {
            sprintBtn.addEventListener('touchstart', e => {
                e.preventDefault();
                this.game.input.keys['shift'] = true;
                sprintBtn.classList.add('mb-active');
            }, { passive: false });
            sprintBtn.addEventListener('touchend', e => {
                e.preventDefault();
                this.game.input.keys['shift'] = false;
                sprintBtn.classList.remove('mb-active');
            }, { passive: false });
            sprintBtn.addEventListener('touchcancel', e => {
                this.game.input.keys['shift'] = false;
                sprintBtn.classList.remove('mb-active');
            }, { passive: false });
        }
    }

    // Create context-sensitive collect button (right-side floating)
    _createCollectBtn() {
        if (this._collectBtn) return;
        const btn = document.createElement('div');
        btn.id = 'mb-context-collect';
        btn.className = 'mb-context-btn hidden';
        btn.innerHTML = '<span class="ctx-icon">✦</span><span class="ctx-label">采集</span>';
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('mb-active');
            if (this.game.gameStarted && !this.game.gameEnded && !this.game.paused) {
                this.game.interact();
            }
        }, { passive: false });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            btn.classList.remove('mb-active');
        }, { passive: false });
        btn.addEventListener('touchcancel', () => btn.classList.remove('mb-active'));
        this.el.appendChild(btn);
        this._collectBtn = btn;
    }

    _showCollectBtn(name, color) {
        if (!this._collectBtn) return;
        const label = this._collectBtn.querySelector('.ctx-label');
        if (label) label.textContent = name || '采集';
        this._collectBtn.style.setProperty('--ctx-color', color || '#D4A373');
        this._collectBtn.classList.remove('hidden');
    }

    _hideCollectBtn() {
        if (this._collectBtn) this._collectBtn.classList.add('hidden');
    }

    _onStart(e) {
        e.preventDefault();
        if (this._joystickActive) return;
        const touch = e.changedTouches[0];
        this._joystickActive = true;
        this._joystickId = touch.identifier;
        const r = this._base.getBoundingClientRect();
        this._origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        // Active: full opacity
        if (this._base) this._base.style.opacity = '0.9';
        this._applyThumb(touch.clientX, touch.clientY);
    }

    _onMove(e) {
        e.preventDefault();
        if (!this._joystickActive) return;
        for (const t of e.changedTouches) {
            if (t.identifier === this._joystickId) {
                this._applyThumb(t.clientX, t.clientY);
                return;
            }
        }
    }

    _onEnd(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier === this._joystickId) {
                this._joystickActive = false;
                this._joystickId = null;
                this._thumb.style.transform = 'translate(-50%, -50%)';
                this._clearMovement();
                this.game.input.joystickFactor    = 1;
                this.game.input.joystickMagnitude = 0;
                // Idle opacity
                if (this._base) this._base.style.opacity = '0.5';
                this._setBaseColor(false);
                return;
            }
        }
    }

    _applyThumb(cx, cy) {
        const MAX = this._getJoystickRadius();
        const DZ  = Math.round(MAX * 0.12);   // 12% dead zone
        let dx = cx - this._origin.x;
        let dy = cy - this._origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX) { dx = dx / dist * MAX; dy = dy / dist * MAX; }

        this._thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        const keys = this.game.input.keys;
        keys['w'] = dy < -DZ;
        keys['s'] = dy >  DZ;
        keys['a'] = dx < -DZ;
        keys['d'] = dx >  DZ;

        // Raw magnitude [0,1]
        const rawMag = dist <= DZ ? 0 : Math.min((dist - DZ) / (MAX - DZ), 1);
        this.game.input.joystickMagnitude = rawMag;

        // Non-linear speed curve:
        //  0–30% input → 0–20% speed  (precision zone, fine positioning)
        // 30–100% input → 20–100% speed (normal zone)
        let speedFactor;
        if (rawMag < 0.30) {
            speedFactor = (rawMag / 0.30) * 0.20;
        } else {
            speedFactor = 0.20 + ((rawMag - 0.30) / 0.70) * 0.80;
        }
        this.game.input.joystickFactor = rawMag < 0.01 ? 0 : Math.max(0.06, speedFactor);

        // Throttled proximity check (every 3 frames)
        this._proximityFrame++;
        if (this._proximityFrame % 3 === 0) {
            this._checkProximity();
        }
    }

    // Check nearest collectible resource; update visuals accordingly
    _checkProximity() {
        if (!this.game.player || !this.game.world) return;
        const px = this.game.player.x;
        const py = this.game.player.y;
        const PROX_RANGE = 120;

        let nearest = null;
        let nearestDist = PROX_RANGE;

        for (const node of this.game.world.resourceNodes) {
            if (node.collected || !node.interactable) continue;
            const ddx = node.x - px;
            const ddy = node.y - py;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = node;
            }
        }

        const isNear = !!nearest;
        this._setBaseColor(isNear);

        if (isNear && nearest) {
            const name  = (nearest.data && nearest.data.name)  || '采集';
            const color = (nearest.data && nearest.data.color) || '#D4A373';
            this._showCollectBtn(name, color);
        } else {
            this._hideCollectBtn();
        }
    }

    // Gold highlight when near interactable, otherwise restore ink-water style
    _setBaseColor(isNear) {
        if (!this._base) return;
        this._base.classList.toggle('near-resource', isNear);
    }

    // Called every frame from game.update() so proximity is tracked even when joystick idle
    updateProximity() {
        if (this._joystickActive) return;  // _applyThumb handles it when active
        this._proximityFrame++;
        if (this._proximityFrame % 3 !== 0) return;
        this._checkProximity();
    }
}
