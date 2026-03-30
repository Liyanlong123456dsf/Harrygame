class MobileControls {
    constructor(game) {
        this.game = game;
        this._joystickActive = false;
        this._joystickId = null;
        this._origin = { x: 0, y: 0 };
        this._evBound = false;

        this.el     = document.getElementById('mobile-controls');
        this._base  = document.getElementById('joystick-base');
        this._thumb = document.getElementById('joystick-thumb');
    }

    _isTouch() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }

    show() {
        if (!this._isTouch() || !this.el) return;
        if (!this._evBound) {
            this._evBound = true;
            this._bindJoystick();
            this._bindActions();
        }
        this.el.classList.remove('hidden');
    }

    hide() {
        if (!this.el) return;
        this.el.classList.add('hidden');
        this._clearMovement();
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

    _onStart(e) {
        e.preventDefault();
        if (this._joystickActive) return;
        const touch = e.changedTouches[0];
        this._joystickActive = true;
        this._joystickId = touch.identifier;
        const r = this._base.getBoundingClientRect();
        this._origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
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
                this.game.input.joystickFactor = 1;
                return;
            }
        }
    }

    _applyThumb(cx, cy) {
        const MAX = 42;
        const DZ  = 8;
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

        // 模拟量速度因子：距离越小越慢，方便精准拾取
        const activeDist = Math.max(0, dist - DZ);
        const factor = Math.min(activeDist / (MAX - DZ), 1);
        this.game.input.joystickFactor = Math.max(0.18, factor);
    }
}
