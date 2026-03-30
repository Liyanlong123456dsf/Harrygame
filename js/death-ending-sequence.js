// 失败结局序列系统 - 失色纪·修钟人
// 8个节点，总时长18-20s
// 核心原则：失败不是"游戏结束"，而是"成为游戏世界的一部分"
// 所有交互无效或加速恶化，禁止任何正面反馈

class DeathEndingSequence {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.width = game.width;
        this.height = game.height;

        this.nodeIndex = 0;
        this.nodeTimer = 0;
        this.running = false;
        this._resolve = null;

        // 饱和度：从当前值单向趋零（颜色只会流失）
        this.saturation = 0.28;
        this.targetSaturation = 0;

        // 透明度（玩家形象从不透明到完全消失）
        this.playerAlpha = 1.0;

        // 灰化粒子（颜色从玩家身上流走）
        this._ashParticles = [];

        // 心跳BPM状态（60→0，渐弱停止）
        this._heartbeatBpm = 60;
        this._heartbeatTimer = null;

        // 钟摆状态（节奏错乱）
        this._pendulumAngle = 0;
        this._pendulumSpeed = 1.0;
        this._pendulumTimer = null;

        // 手部透明进度
        this._handTransparency = 0;

        // 群像（站成一圈仰头的透明人）
        this._ghostRing = this._buildGhostRing();

        // 玩家加入群像的进度
        this._joinGhostProgress = 0;

        // 最终淡白（消散入背景，非淡黑）
        this._finalFade = 0;

        // 节点列表
        this._nodes = this._buildNodes();

        // 事件绑定
        this._onMouseMove  = this._handleMouseMove.bind(this);
        this._onMouseDown  = this._handleMouseDown.bind(this);
        this._onMouseUp    = this._handleMouseUp.bind(this);
        this._onTouchStart = this._handleTouchStart.bind(this);
        this._onTouchMove  = this._handleTouchMove.bind(this);
        this._onTouchEnd   = this._handleTouchEnd.bind(this);

        this._interactState = {};
        this._clickCount = 0;
    }

    // ─────────────────────────────────────────
    // 群像预计算（固定种子，仰头站成一圈）
    // ─────────────────────────────────────────
    _buildGhostRing() {
        const count = 11;
        const ghosts = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI * 0.5;
            ghosts.push({
                angle,
                radiusFactor: 0.28 + (i % 3) * 0.02,
                alpha: 0.12 + (i % 4) * 0.04,
                sizeFactor: 0.85 + (i % 3) * 0.10,
                headTilt: (i % 2 === 0) ? -0.15 : 0.10,
            });
        }
        return ghosts;
    }

    // ─────────────────────────────────────────
    // 节点定义
    // ─────────────────────────────────────────
    _buildNodes() {
        return [
            // D01 ── 0s ──────────────────────────────
            {
                id: 'D01', duration: 2.5,
                text: '钟没有响。',
                autoAdvance: true,
                targetSat: 0.22,
                onEnter: () => {
                    this._interactState.pendulumSwing = 0;
                    this._interactState.clickDead = false;
                    // 音效：C4触发后立即切断（100ms），余韵0.3s
                    if (GameAudio.initialized) {
                        const ctx = GameAudio.audioContext;
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.value = GameAudio.notes.C4;
                        const g = ctx.createGain();
                        g.gain.setValueAtTime(0.22, now);
                        g.gain.setValueAtTime(0.22, now + 0.08);
                        g.gain.linearRampToValueAtTime(0, now + 0.42); // 切断+短尾
                        osc.connect(g); g.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.5);
                    }
                    // 心跳启动（60BPM，将渐弱）
                    this._startHeartbeat();
                },
                onUpdate: (t, dt) => {
                    // 钟摆静止，偶尔微晃1帧后归零（点击触发）
                    if (this._interactState.pendulumSwing > 0) {
                        this._interactState.pendulumSwing = Math.max(
                            0, this._interactState.pendulumSwing - dt * 8
                        );
                    }
                },
                // 交互：点击触发钟摆晃动1帧后更死
                onInteract: () => {
                    if (!this._interactState.clickDead) {
                        this._interactState.pendulumSwing = 0.12;
                        // 震动100ms后骤停
                        if (navigator.vibrate) navigator.vibrate([100]);
                    }
                },
            },
            // D02 ── 2.5s ────────────────────────────
            {
                id: 'D02', duration: 3.0,
                text: '你低头看手，已经透明了。',
                autoAdvance: true,
                targetSat: 0.16,
                onEnter: () => {
                    this._handTransparency = 0;
                    this._interactState.longPressDur = 0;
                    this._interactState.longPressActive = false;
                    // （音效已移除，由BGM承载情绪）
                },
                onUpdate: (t, dt) => {
                    // 长按加速透明化（努力即伤害）
                    if (this._interactState.longPressActive) {
                        this._interactState.longPressDur += dt;
                        this._handTransparency = Math.min(
                            this._handTransparency + dt * 0.55, 1
                        );
                    } else {
                        // 自然也在透明化，只是更慢
                        this._handTransparency = Math.min(
                            this._handTransparency + dt * 0.18, 1
                        );
                    }
                },
                onMouseDown: () => { this._interactState.longPressActive = true; },
                onMouseUp:   () => { this._interactState.longPressActive = false; },
                onTouchStart: () => { this._interactState.longPressActive = true; },
                onTouchEnd:   () => { this._interactState.longPressActive = false; },
            },
            // D03 ── 5.5s ────────────────────────────
            {
                id: 'D03', duration: 2.5,
                text: '你想起那些站成一圈的人。',
                autoAdvance: true,
                targetSat: 0.11,
                onEnter: () => {
                    this._interactState.ghostReveal = 0;
                    // 低沉A2单音，无旋律
                    if (GameAudio.initialized) {
                        GameAudio.playMusicBoxNote(110.00, 2.2);
                    }
                },
                onUpdate: (t, dt) => {
                    this._interactState.ghostReveal = Math.min(t / 2.0, 1);
                    // 6秒处启动悠长钟声（D03起5.5s + 0.5s = 6s）
                    if (t >= 0.5 && !this._deathBellStarted) {
                        this._deathBellStarted = true;
                        if (GameAudio.initialized) GameAudio.startDeathBell();
                    }
                },
            },
            // D04 ── 8s ──────────────────────────────
            {
                id: 'D04', duration: 2.5,
                text: '现在你也站在里面，仰着头，等。',
                autoAdvance: true,
                targetSat: 0.07,
                onEnter: () => {
                    this._joinGhostProgress = 0;
                },
                onUpdate: (t, dt) => {
                    this._joinGhostProgress = Math.min(t / 2.0, 1);
                    // 玩家形象开始缓慢透明化（从加入群像开始渐变）
                    this.playerAlpha = Math.max(0.6, this.playerAlpha - dt * 0.08);
                    if (Math.random() < 0.4) this._spawnAshParticle();
                },
            },
            // D05 ── 10.5s ───────────────────────────
            {
                id: 'D05', duration: 2.8,
                text: '颜色还在逃。从你身上，流到地上，渗进土里。',
                autoAdvance: true,
                targetSat: 0.04,
                onEnter: () => {
                    this._interactState.swipeDir = 0;
                    this._interactState.swipeLocked = true; // 滑动被锁，只有轻微晃动
                    this._interactState.viewShake = 0;
                    // 低频嗡鸣，像被抽空
                    if (GameAudio.initialized) {
                        const ctx = GameAudio.audioContext;
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(55, now);
                        osc.frequency.exponentialRampToValueAtTime(28, now + 2.5);
                        const g = ctx.createGain();
                        g.gain.setValueAtTime(0.18, now);
                        g.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
                        osc.connect(g); g.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 2.6);
                    }
                },
                onUpdate: (t, dt) => {
                    // 视角晃动衰减（自由是幻觉）
                    if (this._interactState.viewShake > 0) {
                        this._interactState.viewShake = Math.max(
                            0, this._interactState.viewShake - dt * 6
                        );
                    }
                    // 玩家继续透明化
                    this.playerAlpha = Math.max(0.3, this.playerAlpha - dt * 0.10);
                    // 灰化粒子持续流出
                    if (Math.random() < 0.55) this._spawnAshParticle();
                },
                onMouseMove: (x, y) => {
                    // 滑动但视角被锁，只有极轻微晃动
                    this._interactState.viewShake = 0.04;
                },
            },
            // D06 ── 13s ─────────────────────────────
            {
                id: 'D06', duration: 2.8,
                text: '你变成一粒灰。',
                autoAdvance: true,
                targetSat: 0.01,
                onEnter: () => {
                    this._interactState.pinchScale = 1.0;
                },
                onUpdate: (t, dt) => {
                    // 玩家形象最终消散（从已有的透明度继续下降）
                    this.playerAlpha = Math.max(0, this.playerAlpha - dt * 0.35);
                    // 双指放大反而加速碎裂（亲近即毁灭）
                    if (this._interactState.pinching) {
                        this._interactState.pinchScale = Math.max(
                            0, this._interactState.pinchScale - dt * 1.5
                        );
                        if (Math.random() < 0.6) this._spawnAshParticle();
                    }
                    if (Math.random() < 0.7) this._spawnAshParticle();
                },
            },
            // D07 ── 15.5s ───────────────────────────
            {
                id: 'D07', duration: 2.5,
                text: '钟停着。滴答。滴答。是别人的钟了。',
                autoAdvance: true,
                targetSat: 0.0,
                onEnter: () => {
                    // 心跳停止
                    this._stopHeartbeat();
                    // 钟摆节奏错乱：两声后卡顿，像机械故障
                    if (GameAudio.initialized) {
                        const ctx = GameAudio.audioContext;
                        const now = ctx.currentTime;
                        // 第一声：正常
                        this._playTick(now,        130.81, 0.06);
                        // 第二声：稍快
                        this._playTick(now + 0.75, 130.81, 0.05);
                        // 第三声：错位延迟，音调下偏
                        this._playTick(now + 1.25, 123.47, 0.035); // B2，微降
                        // 后续：沉默
                    }
                },
                onUpdate: (t, dt) => {
                    this._finalFade = Math.min(t / 2.2, 1);
                },
            },
            // D08 ── 最终淡黑（强制返回，无选择）──────
            {
                id: 'D08', duration: 1.5,
                text: '',
                autoAdvance: true,
                targetSat: 0.0,
                onEnter: () => {
                    // 完全静默
                    if (GameAudio.initialized) {
                        GameAudio.stopBackgroundMusic(0.3);
                    }
                },
                onUpdate: (t, dt) => {
                    this._finalFade = 1.0;
                },
            },
        ];
    }

    // ─────────────────────────────────────────
    // 心跳系统（60BPM渐弱至停）
    // ─────────────────────────────────────────
    _startHeartbeat() {
        if (!GameAudio.initialized) return;
        this._heartbeatBpm = 60;
        this._heartbeatActive = true;
        const beat = () => {
            if (!this._heartbeatActive) return;
            const ctx = GameAudio.audioContext;
            const now = ctx.currentTime;
            // 低频心跳脉冲（52Hz下行到28Hz）
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(52, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);
            const vol = Math.max(0.05, 0.38 * (this._heartbeatBpm / 60));
            const g = ctx.createGain();
            g.gain.setValueAtTime(vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.45);

            // BPM每次衰减（60→0，共约8拍走完18s）
            this._heartbeatBpm = Math.max(0, this._heartbeatBpm - 7.5);
            if (this._heartbeatBpm <= 0) {
                this._heartbeatActive = false;
                return;
            }
            const interval = (60 / this._heartbeatBpm) * 1000;
            this._heartbeatTimer = setTimeout(beat, interval);
        };
        // 首次1s后出现
        this._heartbeatTimer = setTimeout(beat, 1000);
    }

    _stopHeartbeat() {
        this._heartbeatActive = false;
        clearTimeout(this._heartbeatTimer);
    }

    // 单次钟摆滴答
    _playTick(when, freq, vol) {
        if (!GameAudio.initialized) return;
        const ctx = GameAudio.audioContext;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(when); osc.stop(when + 0.3);
    }

    // ─────────────────────────────────────────
    // 灰化粒子（颜色从玩家流走）
    // ─────────────────────────────────────────
    _spawnAshParticle() {
        const cx = this.width * 0.5;
        const cy = this.height * 0.58;
        this._ashParticles.push({
            x: cx + (Math.random() - 0.5) * 30,
            y: cy + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.3 + Math.random() * 0.6,   // 向下流落（颜色渗进土里）
            r: 1 + Math.random() * 2.5,
            life: 0.6 + Math.random() * 0.8,
            maxLife: 1.0,
            gray: Math.floor(90 + Math.random() * 60),
        });
    }

    // ─────────────────────────────────────────
    // 启动
    // ─────────────────────────────────────────
    async play() {
        return new Promise((resolve) => {
            this._resolve = resolve;
            this.running = true;
            this.nodeIndex = 0;
            this.nodeTimer = 0;
            this._enterNode(0);

            // 屏蔽游戏音效 + 启动压抑绝望drone + 失败结局旋律BGM
            if (GameAudio.initialized) {
                // 静音游戏sfx通道，避免怪物攻击声残留
                this._prevSfxVol = GameAudio.sfxGain ? GameAudio.sfxGain.gain.value : 1;
                if (GameAudio.sfxGain) GameAudio.sfxGain.gain.value = 0;
                // 启动绝望drone（持续整个动画约20s）
                GameAudio.startDespairDrone(20);
                // 启动失败结局旋律BGM（Am下行碎片，叠加在drone之上）
                GameAudio.startDeathEndingBGM(20);
            }

            this.canvas.addEventListener('mousemove',  this._onMouseMove);
            this.canvas.addEventListener('mousedown',  this._onMouseDown);
            this.canvas.addEventListener('mouseup',    this._onMouseUp);
            this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
            this.canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: true });
            this.canvas.addEventListener('touchend',   this._onTouchEnd,   { passive: true });

            this._lastTs = performance.now();
            this._loop(performance.now());
        });
    }

    _loop(ts) {
        if (!this.running) return;
        const dt = Math.min((ts - this._lastTs) / 1000, 0.1);
        this._lastTs = ts;
        this._update(dt);
        this._render();
        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        this.nodeTimer += dt;
        const node = this._nodes[this.nodeIndex];
        if (!node) return;

        // 饱和度只降不升
        const tSat = node.targetSat ?? this.saturation;
        if (tSat < this.saturation) {
            this.saturation = Math.max(tSat, this.saturation - dt * 0.45);
        }

        node.onUpdate && node.onUpdate(this.nodeTimer, dt);

        if (this.nodeTimer >= node.duration) this._advance();
    }

    _advance() {
        if (!this.running) return;
        this.nodeIndex++;
        this.nodeTimer = 0;
        if (this.nodeIndex >= this._nodes.length) {
            this._finish();
            return;
        }
        this._enterNode(this.nodeIndex);
    }

    _enterNode(idx) {
        const node = this._nodes[idx];
        if (!node) return;
        this._interactState = {};
        node.onEnter && node.onEnter();
    }

    _finish() {
        this.running = false;
        this._stopHeartbeat();
        // 恢复sfx音量 + 停止drone + 停止失败结局BGM
        if (GameAudio.initialized) {
            if (GameAudio.sfxGain && this._prevSfxVol !== undefined) {
                GameAudio.sfxGain.gain.value = this._prevSfxVol;
            }
            GameAudio.stopDespairDrone();
            GameAudio.stopDeathEndingBGM();
        }
        this.canvas.removeEventListener('mousemove',  this._onMouseMove);
        this.canvas.removeEventListener('mousedown',  this._onMouseDown);
        this.canvas.removeEventListener('mouseup',    this._onMouseUp);
        this.canvas.removeEventListener('touchstart', this._onTouchStart);
        this.canvas.removeEventListener('touchmove',  this._onTouchMove);
        this.canvas.removeEventListener('touchend',   this._onTouchEnd);
        if (this._resolve) this._resolve();
    }

    // ─────────────────────────────────────────
    // 事件处理
    // ─────────────────────────────────────────
    _handleMouseMove(e) {
        const r = this.canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const node = this._nodes[this.nodeIndex];
        node?.onMouseMove && node.onMouseMove(x, y);
    }
    _handleMouseDown(e) {
        const r = this.canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const node = this._nodes[this.nodeIndex];
        node?.onMouseDown && node.onMouseDown(x, y);
        node?.onInteract && node.onInteract(x, y);
    }
    _handleMouseUp(e) {
        const node = this._nodes[this.nodeIndex];
        node?.onMouseUp && node.onMouseUp();
    }
    _handleTouchStart(e) {
        const node = this._nodes[this.nodeIndex];
        if (e.touches.length === 2) {
            this._interactState.pinching = true;
        }
        const r = this.canvas.getBoundingClientRect();
        const t = e.touches[0];
        const x = t.clientX - r.left;
        const y = t.clientY - r.top;
        node?.onTouchStart && node.onTouchStart(x, y);
        node?.onInteract && node.onInteract(x, y);
    }
    _handleTouchMove(e) {
        const r = this.canvas.getBoundingClientRect();
        const t = e.touches[0];
        const x = t.clientX - r.left;
        const y = t.clientY - r.top;
        const node = this._nodes[this.nodeIndex];
        node?.onMouseMove && node.onMouseMove(x, y);
    }
    _handleTouchEnd(e) {
        this._interactState.pinching = false;
        const node = this._nodes[this.nodeIndex];
        node?.onTouchEnd && node.onTouchEnd();
        node?.onMouseUp && node.onMouseUp();
    }

    // ─────────────────────────────────────────
    // 渲染主函数
    // ─────────────────────────────────────────
    _render() {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;
        const node = this._nodes[this.nodeIndex];
        if (!node) return;

        ctx.clearRect(0, 0, W, H);

        // 视角晃动偏移（D05：滑动无效的微颤）
        const shakeX = this._interactState.viewShake
            ? (Math.random() - 0.5) * this._interactState.viewShake * W * 0.012
            : 0;

        ctx.save();
        if (shakeX !== 0) ctx.translate(shakeX, 0);

        // 饱和度滤镜（单向趋零）
        ctx.filter = `saturate(${this.saturation * 100}%) brightness(${0.85 + this.saturation * 0.15})`;

        // 背景
        this._drawBackground(ctx, W, H);

        // 钟塔（全程可见，越来越灰）
        this._drawClockTowerDead(ctx, W, H, node.id);

        // 灰化粒子（颜色流走）
        this._drawAshParticles(ctx, W, H);

        // D01-D05：玩家形象（逐渐透明）
        if (this.nodeIndex <= 5) {
            this._drawPlayerFigureDead(ctx, W, H);
        }

        // D02：手部特写（透明化进度）
        if (node.id === 'D02') {
            this._drawTransparentHands(ctx, W, H, this._handTransparency);
        }

        // D03+：群像浮现
        if (this.nodeIndex >= 2) {
            const reveal = this._interactState.ghostReveal ?? 1.0;
            this._drawGhostRing(ctx, W, H, reveal);
        }

        // D04：玩家加入群像
        if (node.id === 'D04') {
            this._drawPlayerJoiningRing(ctx, W, H, this._joinGhostProgress);
        }

        ctx.restore(); // 结束饱和度+位移

        // 动画降为背景：叠加半透明暗层，让文字成为主角
        // 避免与finalFade双重叠加变暗
        if (node.text && this._finalFade < 0.3) {
            ctx.save();
            ctx.globalAlpha = 0.35 * (1 - this._finalFade / 0.3);
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // 最终淡白（D07-D08，不受饱和度影响）
        if (this._finalFade > 0) {
            ctx.save();
            ctx.globalAlpha = this._finalFade * 0.92;
            ctx.fillStyle = '#0a0a12'; // 淡黑，不是淡白——消散入暗，非化为光
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // 文字（最后绘制，在淡黑之上）
        if (node.text && this._finalFade < 0.85) {
            this._drawText(ctx, W, H, node);
        }

        // D08：强制返回提示（无"再试一次"，只有黑屏）
        if (node.id === 'D08' && this._finalFade >= 0.98) {
            // 不显示任何UI，纯黑屏等待 game.js 调用 showEndScreen
        }
    }

    // ─────────────────────────────────────────
    // 绘制子函数
    // ─────────────────────────────────────────

    _drawBackground(ctx, W, H) {
        // 失败结局：背景从深灰趋向纯灰，无暖色
        const s = this.saturation;
        const v = Math.round(Utils.lerp(12, 28, s));
        ctx.fillStyle = `rgb(${v},${v},${Math.round(v * 1.1)})`;
        ctx.fillRect(0, 0, W, H);
        // 地面更深
        ctx.fillStyle = `rgba(${Math.round(v * 0.8)},${Math.round(v * 0.8)},${Math.round(v * 0.9)},0.8)`;
        ctx.fillRect(0, H * 0.72, W, H * 0.28);
    }

    _drawClockTowerDead(ctx, W, H, nodeId) {
        const cx = W * 0.5;
        const bw = W * 0.10;
        const th = H * 0.65;
        const by = H - th;

        ctx.save();
        ctx.globalAlpha = 0.70;

        // 塔身：纯灰，越来越深
        const gv = Math.round(Utils.lerp(35, 55, this.saturation));
        ctx.fillStyle = `rgba(${gv},${gv},${Math.round(gv * 1.15)},0.88)`;
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.5, H);
        ctx.lineTo(cx - bw * 0.5, by + th * 0.15);
        ctx.lineTo(cx - bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.5, by + th * 0.15);
        ctx.lineTo(cx + bw * 0.5, H);
        ctx.closePath();
        ctx.fill();

        // 尖顶
        ctx.fillStyle = `rgba(${gv + 10},${gv + 8},${gv + 5},0.65)`;
        ctx.beginPath();
        ctx.moveTo(cx, by - th * 0.18);
        ctx.lineTo(cx - bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by);
        ctx.closePath();
        ctx.fill();

        // 钟摆（D01：点击后微晃1帧即归零）
        const swing = this._interactState.pendulumSwing ?? 0;
        const pendY = by + th * 0.12;
        const pendLen = H * 0.06;
        const pendAngle = swing * Math.PI * 0.08;
        ctx.save();
        ctx.translate(cx, pendY);
        ctx.rotate(pendAngle);
        ctx.strokeStyle = `rgba(${gv + 15},${gv + 12},${gv + 8},0.7)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, pendLen);
        ctx.stroke();
        ctx.fillStyle = `rgba(${gv + 15},${gv + 12},${gv + 8},0.6)`;
        ctx.beginPath();
        ctx.arc(0, pendLen, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawAshParticles(ctx, W, H) {
        for (let i = this._ashParticles.length - 1; i >= 0; i--) {
            const p = this._ashParticles[i];
            p.life -= (1/60);
            p.x += p.vx;
            p.y += p.vy;
            if (p.life <= 0) { this._ashParticles.splice(i, 1); continue; }
            const alpha = (p.life / p.maxLife) * 0.45;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${p.gray},${p.gray},${p.gray})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawPlayerFigureDead(ctx, W, H) {
        const cx = W * 0.5;
        const cy = H * 0.62;
        const s = H * 0.22;
        const alpha = Math.max(0, this.playerAlpha - this._handTransparency * 0.3);
        // 灰化系数（越透明越灰）
        const grayMix = 1 - alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);

        // 脚部阴影
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.beginPath();
        ctx.ellipse(0, s * 0.46, s * 0.16, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();

        // 披风（灰化版）
        const capeV = Math.round(Utils.lerp(28, 60, grayMix));
        ctx.fillStyle = `rgba(${capeV},${capeV - 8|0},${capeV + 6|0},0.75)`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.11, -s * 0.40);
        ctx.lineTo(s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.26, -s * 0.05, s * 0.22, s * 0.42);
        ctx.quadraticCurveTo(0, s * 0.50, -s * 0.22, s * 0.42);
        ctx.quadraticCurveTo(-s * 0.26, -s * 0.05, -s * 0.11, -s * 0.40);
        ctx.closePath();
        ctx.fill();
        // 披风内衬
        ctx.strokeStyle = `rgba(${Math.round(Utils.lerp(90, 55, grayMix))},10,${Math.round(Utils.lerp(26, 22, grayMix))},0.35)`;
        ctx.lineWidth = s * 0.012;
        ctx.beginPath();
        ctx.moveTo(-s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(-s * 0.26, -s * 0.05, -s * 0.22, s * 0.42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.26, -s * 0.05, s * 0.22, s * 0.42);
        ctx.stroke();

        // 长衫主体（灰化版）
        const coatV = Math.round(Utils.lerp(45, 55, grayMix));
        const coatGrad = ctx.createLinearGradient(-s * 0.12, -s * 0.40, s * 0.12, s * 0.30);
        coatGrad.addColorStop(0, `rgb(${coatV},${coatV - 10|0},${coatV + 15|0})`);
        coatGrad.addColorStop(0.6, `rgb(${coatV - 8|0},${coatV - 14|0},${coatV + 8|0})`);
        coatGrad.addColorStop(1, `rgb(${coatV - 15|0},${coatV - 18|0},${coatV})`);
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, -s * 0.40);
        ctx.lineTo(s * 0.12, -s * 0.40);
        ctx.lineTo(s * 0.15, s * 0.30);
        ctx.quadraticCurveTo(0, s * 0.35, -s * 0.15, s * 0.30);
        ctx.closePath();
        ctx.fill();

        // 尖领
        ctx.fillStyle = `rgb(${coatV - 8|0},${coatV - 15|0},${coatV + 8|0})`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.40);
        ctx.lineTo(-s * 0.04, -s * 0.52);
        ctx.lineTo(0, -s * 0.44);
        ctx.lineTo(s * 0.04, -s * 0.52);
        ctx.lineTo(s * 0.10, -s * 0.40);
        ctx.closePath();
        ctx.fill();

        // 双臂（低垂，无力感）
        ctx.fillStyle = `rgb(${coatV},${coatV - 10|0},${coatV + 15|0})`;
        ctx.save();
        ctx.translate(-s * 0.14, -s * 0.22);
        ctx.rotate(0.15);
        ctx.fillRect(-s * 0.035, 0, s * 0.07, s * 0.26);
        const skinV = Math.round(Utils.lerp(220, 160, grayMix));
        ctx.fillStyle = `rgb(${skinV},${skinV - 10|0},${skinV - 18|0})`;
        ctx.fillRect(-s * 0.035, s * 0.24, s * 0.07, s * 0.04);
        ctx.restore();
        ctx.save();
        ctx.translate(s * 0.14, -s * 0.22);
        ctx.rotate(-0.15);
        ctx.fillStyle = `rgb(${coatV},${coatV - 10|0},${coatV + 15|0})`;
        ctx.fillRect(-s * 0.035, 0, s * 0.07, s * 0.26);
        ctx.fillStyle = `rgb(${skinV},${skinV - 10|0},${skinV - 18|0})`;
        ctx.fillRect(-s * 0.035, s * 0.24, s * 0.07, s * 0.04);
        ctx.restore();

        // 黄铜纽扣（暗淡）
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(184, 100, grayMix))},${Math.round(Utils.lerp(134, 95, grayMix))},${Math.round(Utils.lerp(11, 8, grayMix))},${0.3 + alpha * 0.4})`;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -s * 0.28 + i * s * 0.10, s * 0.016, 0, Math.PI * 2);
            ctx.fill();
        }

        // 齿轮徽章（暗淡）
        const badgeX = -s * 0.07, badgeY2 = -s * 0.22;
        ctx.strokeStyle = `rgba(${Math.round(Utils.lerp(184, 100, grayMix))},${Math.round(Utils.lerp(134, 95, grayMix))},11,${0.2 + alpha * 0.3})`;
        ctx.lineWidth = s * 0.007;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY2, s * 0.035, 0, Math.PI * 2);
        ctx.stroke();

        // 头部
        const headR = s * 0.12;
        const headY = -s * 0.62;
        const headSkinGrad = ctx.createRadialGradient(0, headY, 0, 0, headY + s * 0.01, headR);
        headSkinGrad.addColorStop(0, `rgb(${skinV},${skinV - 8|0},${skinV - 15|0})`);
        headSkinGrad.addColorStop(1, `rgb(${skinV - 25|0},${skinV - 28|0},${skinV - 30|0})`);
        ctx.fillStyle = headSkinGrad;
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // 黑发
        const hairV = Math.round(Utils.lerp(13, 35, grayMix));
        ctx.fillStyle = `rgb(${hairV},${hairV},${hairV + 5|0})`;
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.25, headR, Math.PI, Math.PI * 2);
        ctx.fill();
        // 左侧垂发
        ctx.beginPath();
        ctx.moveTo(-headR * 0.82, headY - headR * 0.1);
        ctx.quadraticCurveTo(-headR * 1.35, headY + headR * 0.5, -headR * 1.15, headY + headR * 1.1);
        ctx.quadraticCurveTo(-headR * 0.90, headY + headR * 1.3, -headR * 0.72, headY + headR * 0.6);
        ctx.quadraticCurveTo(-headR * 1.0, headY + headR * 0.1, -headR * 0.82, headY - headR * 0.1);
        ctx.fill();
        // 刘海
        ctx.beginPath();
        ctx.moveTo(-headR, headY - headR * 0.5);
        ctx.quadraticCurveTo(-headR * 0.35, headY + headR * 0.12, headR * 0.1, headY + headR * 0.05);
        ctx.quadraticCurveTo(-headR * 0.1, headY - headR * 0.35, -headR, headY - headR * 0.5);
        ctx.fill();

        // 眼睛（灰化，失神）
        const eyeY = headY + headR * 0.05;
        const eyeSpacing = headR * 0.38;
        [-1, 1].forEach(side => {
            const ex = side * eyeSpacing;
            // 黑眼圈加重
            ctx.fillStyle = `rgba(50,30,55,${0.25 + grayMix * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY + headR * 0.12, headR * 0.28, headR * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            // 眼白（灰化）
            const ewV = Math.round(Utils.lerp(230, 165, grayMix));
            ctx.fillStyle = `rgb(${ewV},${ewV - 8|0},${ewV - 5|0})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.22, headR * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // 虹膜（褪色）
            const irisV = Math.round(Utils.lerp(107, 70, grayMix));
            ctx.fillStyle = `rgb(${irisV - 20|0},${Math.round(Utils.lerp(30, 25, grayMix))},${irisV})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.16, headR * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            // 瞳孔
            ctx.fillStyle = `rgb(${Math.round(Utils.lerp(26, 40, grayMix))},${Math.round(Utils.lerp(10, 20, grayMix))},${Math.round(Utils.lerp(46, 40, grayMix))})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.09, headR * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // 怀表（暗淡，快停了）
        ctx.strokeStyle = `rgba(${Math.round(Utils.lerp(184, 100, grayMix))},${Math.round(Utils.lerp(134, 95, grayMix))},11,${0.2 + alpha * 0.3})`;
        ctx.lineWidth = s * 0.006;
        ctx.beginPath();
        ctx.moveTo(s * 0.04, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.06, -s * 0.34, s * 0.05, -s * 0.26);
        ctx.stroke();
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(184, 100, grayMix))},${Math.round(Utils.lerp(134, 95, grayMix))},11,${0.2 + alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(s * 0.05, -s * 0.26, s * 0.025, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawTransparentHands(ctx, W, H, transparency) {
        const cx = W * 0.5;
        const cy = H * 0.55;
        const s = H * 0.16;
        const alpha = Math.max(0, (1 - transparency) * 0.85);
        const grayMix = transparency;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 袖口颜色（灰化长衫色）
        const coatV = Math.round(Utils.lerp(45, 65, grayMix));
        const skinV = Math.round(Utils.lerp(220, 150, grayMix));

        // 左手
        const lx = cx - s * 0.30;
        // 袖口
        ctx.fillStyle = `rgb(${coatV},${coatV - 10|0},${coatV + 12|0})`;
        ctx.fillRect(lx - s * 0.12, cy - s * 0.08, s * 0.24, s * 0.15);
        // 手掌
        ctx.fillStyle = `rgb(${skinV},${skinV - 12|0},${skinV - 20|0})`;
        ctx.fillRect(lx - s * 0.10, cy - s * 0.30, s * 0.20, s * 0.24);
        // 手指
        const fingerOffsets = [-0.07, -0.035, 0, 0.035, 0.07];
        fingerOffsets.forEach((ox, i) => {
            const fh = (i === 2) ? s * 0.16 : s * 0.13;
            ctx.fillStyle = `rgb(${skinV},${skinV - 12|0},${skinV - 20|0})`;
            ctx.fillRect(lx + ox * s - s * 0.02, cy - s * 0.30 - fh, s * 0.04, fh);
        });

        // 右手
        const rx = cx + s * 0.30;
        ctx.fillStyle = `rgb(${coatV},${coatV - 10|0},${coatV + 12|0})`;
        ctx.fillRect(rx - s * 0.12, cy - s * 0.08, s * 0.24, s * 0.15);
        ctx.fillStyle = `rgb(${skinV},${skinV - 12|0},${skinV - 20|0})`;
        ctx.fillRect(rx - s * 0.10, cy - s * 0.30, s * 0.20, s * 0.24);
        fingerOffsets.forEach((ox, i) => {
            const fh = (i === 2) ? s * 0.16 : s * 0.13;
            ctx.fillStyle = `rgb(${skinV},${skinV - 12|0},${skinV - 20|0})`;
            ctx.fillRect(rx + ox * s - s * 0.02, cy - s * 0.30 - fh, s * 0.04, fh);
        });

        // 透明化效果：网格虚线覆盖（硫酸纸质感）
        if (transparency > 0.3) {
            ctx.globalAlpha = transparency * 0.25;
            ctx.strokeStyle = 'rgba(200,200,200,0.4)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2, 4]);
            for (let i = 0; i < 6; i++) {
                const ly = cy - s * 0.50 + i * s * 0.14;
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.55, ly);
                ctx.lineTo(cx + s * 0.55, ly);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    _drawGhostRing(ctx, W, H, reveal) {
        if (reveal <= 0) return;
        const cx = W * 0.5;
        const cy = H * 0.52;
        const baseR = Math.min(W, H) * 0.26;

        ctx.save();
        this._ghostRing.forEach((g) => {
            const rx = cx + Math.cos(g.angle) * baseR * g.radiusFactor * (W / H * 1.2);
            const ry = cy + Math.sin(g.angle) * baseR * g.radiusFactor;
            const s = H * 0.12 * g.sizeFactor;
            const alpha = g.alpha * reveal;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(rx, ry);

            // 披风虚影
            ctx.fillStyle = `rgba(120,115,135,0.22)`;
            ctx.beginPath();
            ctx.moveTo(-s * 0.09, -s * 0.36);
            ctx.lineTo(s * 0.09, -s * 0.36);
            ctx.quadraticCurveTo(s * 0.20, -s * 0.02, s * 0.18, s * 0.32);
            ctx.quadraticCurveTo(0, s * 0.38, -s * 0.18, s * 0.32);
            ctx.quadraticCurveTo(-s * 0.20, -s * 0.02, -s * 0.09, -s * 0.36);
            ctx.closePath();
            ctx.fill();

            // 长衫虚影
            ctx.fillStyle = `rgba(130,125,145,0.25)`;
            ctx.beginPath();
            ctx.moveTo(-s * 0.07, -s * 0.36);
            ctx.lineTo(s * 0.07, -s * 0.36);
            ctx.lineTo(s * 0.09, s * 0.22);
            ctx.quadraticCurveTo(0, s * 0.26, -s * 0.09, s * 0.22);
            ctx.closePath();
            ctx.fill();

            // 头部（仰起）
            ctx.fillStyle = `rgba(140,135,155,0.25)`;
            ctx.beginPath();
            ctx.arc(0, -s * 0.50, s * 0.09, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
        ctx.restore();
    }

    _drawPlayerJoiningRing(ctx, W, H, progress) {
        if (progress <= 0) return;
        const cx = W * 0.5;
        const cy = H * 0.62;
        const targetX = W * 0.5 + Math.cos(-Math.PI * 0.5) * Math.min(W, H) * 0.26 * 0.30;
        const targetY = H * 0.52 + Math.sin(-Math.PI * 0.5) * Math.min(W, H) * 0.26 * 0.30;
        const px = Utils.lerp(cx, targetX, progress);
        const py = Utils.lerp(cy, targetY, progress);
        const s = H * 0.22 * (1 - progress * 0.35);
        const alpha = (1 - progress * 0.5) * this.playerAlpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);

        // 披风虚影
        ctx.fillStyle = `rgba(120,115,135,0.30)`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.38);
        ctx.lineTo(s * 0.10, -s * 0.38);
        ctx.quadraticCurveTo(s * 0.24, -s * 0.04, s * 0.20, s * 0.38);
        ctx.quadraticCurveTo(0, s * 0.44, -s * 0.20, s * 0.38);
        ctx.quadraticCurveTo(-s * 0.24, -s * 0.04, -s * 0.10, -s * 0.38);
        ctx.closePath();
        ctx.fill();

        // 长衫虚影
        ctx.fillStyle = `rgba(130,125,140,0.35)`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.08, -s * 0.38);
        ctx.lineTo(s * 0.08, -s * 0.38);
        ctx.lineTo(s * 0.10, s * 0.26);
        ctx.quadraticCurveTo(0, s * 0.30, -s * 0.10, s * 0.26);
        ctx.closePath();
        ctx.fill();

        // 头部
        ctx.fillStyle = `rgba(140,135,150,0.35)`;
        ctx.beginPath();
        ctx.arc(0, -s * 0.55, s * 0.10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawText(ctx, W, H, node) {
        if (!node.text) return;
        const fadeIn = Math.min(this.nodeTimer / 0.5, 1);
        const dur = node.duration;
        const fadeOut = node.autoAdvance ? Math.max(0, 1 - (this.nodeTimer - (dur - 0.8)) / 0.8) : 1;
        const alpha = fadeIn * fadeOut;
        if (alpha <= 0) return;

        const fontSize = Math.round(Math.max(18, Math.min(W * 0.038, 36)));
        const maxW = W * 0.82;
        ctx.font = `${fontSize}px 'Ma Shan Zheng', 'Noto Serif SC', serif`;

        // 换行：按字逐个测量，超出maxW则折行
        const lines = [];
        for (const raw of node.text.split('\n')) {
            if (ctx.measureText(raw).width <= maxW) {
                lines.push(raw);
            } else {
                let cur = '';
                for (const ch of [...raw]) {
                    if (ctx.measureText(cur + ch).width > maxW) {
                        if (cur) lines.push(cur);
                        cur = ch;
                    } else {
                        cur += ch;
                    }
                }
                if (cur) lines.push(cur);
            }
        }

        const lineH = fontSize * 1.7;
        const totalH = lines.length * lineH;
        const baseY = H - totalH - Math.max(H * 0.06, 22);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `${fontSize}px 'Ma Shan Zheng', 'Noto Serif SC', serif`;
        ctx.fillStyle = 'rgba(225,220,235,0.97)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.98)';
        ctx.shadowBlur = 20;
        lines.forEach((line, i) => {
            ctx.fillText(line, W * 0.5, baseY + lineH * 0.5 + i * lineH);
        });
        ctx.restore();
    }

    // 伪随机（与成功结局同款，确保粒子稳定）
    _prng(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            return (s >>> 0) / 0xffffffff;
        };
    }
}
