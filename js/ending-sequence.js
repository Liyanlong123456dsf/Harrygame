// 真结局序列系统 - 失色纪·修钟人
// 17个节点，逐句绑定结束语与画面/交互

class EndingSequence {
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

        // 饱和度状态（0=全灰，1=全彩）
        this.saturation = 0.30; // 游戏结束时约30%色彩
        this.targetSaturation = 0.30;

        // 持久化状态
        this._fingerprintLeft = !!localStorage.getItem('shiseji_fingerprint');

        // 画面层状态
        this._layers = {
            clockGlow: 0,           // 钟塔光晕
            indigoFlow: 0,          // 靛蓝流动进度
            ochreCloth: 0,          // 赭石染衣进度
            collarIndigo: 0,        // 领口靛蓝
            shadowAlpha: 0,         // 影子透明度
            shadowLookUp: 0,        // 影子"抬头"形变
            worldReveal: 0,         // 世界浮现（0-3：墨线/底色/高光/完成）
            worldRevealProgress: 0,
            pomegranateOpen: 0,     // 石榴裂开
            brushVisible: true,
            ghostsAlpha: 0,         // 群像透明度
            clockFlowersProgress: 0,// 钟盘花纹进度
            playerWalkX: 0,         // 玩家走向光的位移
            footprintsCount: 0,     // 脚印数量
            fingerprint: false,     // 指纹是否显示
            finalFade: 0,           // 最终淡黑
            lightRight: 0,          // 右侧光源强度
        };

        // 手部特写坐标
        this._handCenter = { x: 0, y: 0 };

        // 钟盘用户笔触
        this._clockStrokes = [];
        this._isDrawingOnClock = false;
        this._lastClockPos = null;

        // 鸣蛹粒子列表（复用粒子系统）
        this._particles = [];

        // 节点定义
        this._nodes = this._buildNodes();

        // 绑定事件
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseUp   = this._handleMouseUp.bind(this);
        this._onTouchStart = this._handleTouchStart.bind(this);
        this._onTouchMove  = this._handleTouchMove.bind(this);
        this._onTouchEnd   = this._handleTouchEnd.bind(this);

        // 当前节点的交互状态
        this._interactState = {};
    }

    // ─────────────────────────────────────────
    // 节点定义
    // ─────────────────────────────────────────
    _buildNodes() {
        return [
            // N01 (0-3s) 钟响 + 光晕
            {
                id: 'N01', duration: 3,
                text: '钟响了。不是吞吃什么的响，是放还。',
                autoAdvance: true,
                targetSat: 0.35,
                onEnter: () => {
                    this._layers.clockGlow = 0;
                    if (GameAudio.initialized) {
                        setTimeout(() => GameAudio.playMusicBoxNote(GameAudio.notes.C4, 3.5), 400);
                    }
                },
                onUpdate: (t, dt) => {
                    const raw = Math.min(t / 2, 1);
                    this._layers.clockGlow = raw * raw * (3 - 2 * raw); // smoothstep
                    if (Utils.chance(0.10)) this._spawnReleaseParticle();
                },
            },
            // N02 (3-7s) 靛蓝渗出 + 赭石染衣
            {
                id: 'N02', duration: 4,
                text: '靛蓝从钟盘裂缝里渗出来，赭石漫上袖口，把长衫染回原来的样子。',
                autoAdvance: true,
                targetSat: 0.52,
                onEnter: () => {
                    this._layers.indigoFlow = 0;
                    this._layers.ochreCloth = 0;
                    this._layers.collarIndigo = 0;
                    if (GameAudio.initialized) {
                        GameAudio.playWaterDrop();
                        setTimeout(() => GameAudio.playMusicBoxNote(155.56, 1.5), 600);
                        setTimeout(() => GameAudio.playMusicBoxNote(196.00, 1.8), 1200);
                    }
                },
                onUpdate: (t, dt) => {
                    const ease = v => v * v * (3 - 2 * v);
                    this._layers.indigoFlow = ease(Math.min(t / 2.5, 1));
                    this._layers.ochreCloth = ease(Math.min(t / 4, 1));
                    this._layers.collarIndigo = ease(Math.min(Math.max(t - 2, 0) / 2, 1));
                },
            },
            // N03 (7-12s) 影子 + 幽灵闪现 + 世界浮现
            {
                id: 'N03', duration: 5,
                text: '你有影子了。世界从灰底上浮现——先起墨线，再铺底色，最后点高光。',
                autoAdvance: true,
                targetSat: 0.72,
                onEnter: () => {
                    this._layers.shadowAlpha = 0;
                    this._layers.shadowLookUp = 0;
                    this._layers.worldReveal = 0;
                    this._layers.worldRevealProgress = 0;
                    this._interactState.ghostOffset = 0;
                    this._interactState.ghostAlpha = 0.15;
                    if (GameAudio.initialized) {
                        setTimeout(() => GameAudio.playMusicBoxNote(GameAudio.notes.C4, 2.0), 200);
                        setTimeout(() => GameAudio.playMusicBoxNote(311.13, 1.2), 600);
                    }
                },
                onUpdate: (t, dt) => {
                    const ease = v => v * v * (3 - 2 * v);
                    this._layers.shadowAlpha = ease(Math.min(t / 2, 1)) * 0.55;
                    this._layers.shadowLookUp = ease(Math.min(t / 3, 1));
                    this._layers.worldRevealProgress = ease(Math.min(t / 5, 1));
                    this._layers.worldReveal = t < 1.5 ? 0 : t < 3 ? 1 : 2;
                    if (t > 3) {
                        this._interactState.ghostAlpha = Math.max(0, 0.15 - (t - 3) / 2 * 0.15);
                    }
                },
            },
            // N04 (12-17s) 石榴树 + 钟盘彩绘
            {
                id: 'N04', duration: 5,
                text: '石榴树裂开灰白的壳。钟盘上的彩绘重新生长——墨梅、桃夭、石榴、菊。花在开。',
                autoAdvance: true,
                targetSat: 0.88,
                onEnter: () => {
                    this._layers.pomegranateOpen = 0;
                    this._layers.clockFlowersProgress = 0;
                    this._clockStrokes = [];
                    if (GameAudio.initialized) {
                        GameAudio.playWaterDrop();
                        setTimeout(() => GameAudio.playMusicBoxNote(196.00, 1.5), 400);
                        setTimeout(() => {
                            if (typeof GameAudio.playChrysalisSong === 'function') GameAudio.playChrysalisSong();
                        }, 1500);
                    }
                },
                onUpdate: (t, dt) => {
                    const ease = v => v * v * (3 - 2 * v);
                    this._layers.pomegranateOpen = ease(Math.min(t / 3, 1));
                    this._layers.clockFlowersProgress = ease(Math.min(t / 4.5, 1));
                },
            },
            // N05 (17-22s) 手部特写
            {
                id: 'N05', duration: 4,
                text: '你低头看手。指甲粉白，有月牙，是活人的手。指缝间嵌着褪色界的土，洗不掉了。',
                autoAdvance: true,
                targetSat: 0.93,
                onEnter: () => {
                    this._interactState.dirtClicks = 0;
                    this._interactState.dirtPulse = 0;
                    this._interactState.dashAlpha = 0;
                    this._interactState.handAngle = Math.PI * 1.15;
                },
                onUpdate: (t, dt) => {
                    if (this._interactState.dirtPulse > 0) {
                        this._interactState.dirtPulse = Math.max(0, this._interactState.dirtPulse - dt * 2);
                    }
                },
                onInteract: (x, y) => {
                    const hx = this.width * 0.5;
                    const hy = this.height * 0.5;
                    const dist = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
                    if (dist < 80) {
                        this._interactState.dirtClicks++;
                        this._interactState.dirtPulse = 1.0;
                        if (GameAudio.initialized) GameAudio.playWaterDrop();
                    }
                },
            },
            // N06 ── 钟还在走
            {
                id: 'N06', duration: 3.5,
                text: '钟还在走。滴答。滴答。',
                autoAdvance: true,
                targetSat: 0.95,
                onEnter: () => {
                    this._interactState.tickCount = 0;
                    this._interactState.handAngle = Math.PI * 1.15;
                    this._interactState._n06BaseAngle = Math.PI * 1.15;
                    this._interactState._n06TickExtra = 0;
                    if (GameAudio.initialized) {
                        [0.8, 1.8].forEach(delay => {
                            setTimeout(() => {
                                GameAudio.playMusicBoxNote(130.81, 0.3);
                                this._interactState._n06TickExtra += Math.PI / 30;
                                this._interactState.tickCount++;
                            }, delay * 1000);
                        });
                    }
                },
                onUpdate: (t, dt) => {
                    // 指针平滑转动 + 保留滴答跳动叠加
                    const ease = v => v * v * (3 - 2 * v);
                    const tickProg = ease(Math.min(t / 3.0, 1));
                    const base = this._interactState._n06BaseAngle || Math.PI * 1.15;
                    const extra = this._interactState._n06TickExtra || 0;
                    this._interactState.handAngle = base + tickProg * (Math.PI / 15) + extra;
                },
            },
            // N07 ── 迈步向光走去
            {
                id: 'N07', duration: 15,
                text: '你迈步向光里走去。\n身后有脚印了，实实在在印在泥里。',
                autoAdvance: true,
                targetSat: 1.0,
                onEnter: () => {
                    this._layers.playerWalkX = 0;
                    this._layers.lightRight = 0;
                    this._layers.finalFade = 0;
                    this._layers.footprintsCount = 0;
                    this._interactState.fingerprintHoverTime = 0;
                    this._interactState.fingerprintShown = false;
                    this._fingerprintLeft = localStorage.getItem('shiseji_fingerprint') === '1';
                    if (GameAudio.initialized) {
                        setTimeout(() => GameAudio.playMusicBoxNote(GameAudio.notes.G4, 1.5), 1000);
                        setTimeout(() => GameAudio.playMusicBoxNote(GameAudio.notes.C4, 1.5), 4000);
                    }
                },
                onUpdate: (t, dt) => {
                    const walkDur = 6;
                    const ease = v => v * v * (3 - 2 * v);
                    if (t < walkDur) {
                        const raw = t / walkDur;
                        this._layers.playerWalkX = ease(raw) * this.width * 0.35;
                        this._layers.lightRight = ease(raw);
                    }
                    this._layers.footprintsCount = Math.floor(Math.min(t / walkDur, 1) * 8);
                    if (t > walkDur) {
                        this._layers.finalFade = ease(Math.min((t - walkDur) / 4, 1));
                    }
                },
                onMouseMove: (x, y) => {
                    const fp = this._getLastFootprintPos();
                    if (!fp) return;
                    const dist = Math.sqrt((x - fp.x) ** 2 + (y - fp.y) ** 2);
                    if (dist < 40) {
                        this._interactState.fingerprintHoverTime += 0.016;
                        if (this._interactState.fingerprintHoverTime >= 2 && !this._interactState.fingerprintShown) {
                            this._interactState.fingerprintShown = true;
                            this._layers.fingerprint = true;
                            localStorage.setItem('shiseji_fingerprint', '1');
                            if (GameAudio.initialized) GameAudio.playPlayerImprint();
                        }
                    } else {
                        this._interactState.fingerprintHoverTime = 0;
                    }
                },
            },
        ];
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

            // 启动胜利结局BGM（C小调→微暖，苦涩重生，37秒）
            if (typeof GameAudio !== 'undefined' && GameAudio.initialized) {
                GameAudio.startVictoryEndingBGM(37);
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

        // 饱和度插值
        const tSat = node.targetSat ?? this.saturation;
        this.saturation = Utils.lerp(this.saturation, tSat, dt * 0.8);

        node.onUpdate && node.onUpdate(this.nodeTimer, dt);

        // N07 鼠标hover（在update中处理时间累积）
        if (node.id === 'N07' && this._interactState.fingerprintHoverTime !== undefined) {
            // hover处理在mousemove事件中，这里不重复
        }

        // 自动推进
        const maxDur = node.autoAdvanceAfter ?? node.duration;
        if (node.autoAdvance && this.nodeTimer >= node.duration) {
            this._advance();
        } else if (!node.autoAdvance && this.nodeTimer >= maxDur) {
            this._advance();
        }
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
        // 停止胜利结局BGM
        if (typeof GameAudio !== 'undefined' && GameAudio.initialized) {
            GameAudio.stopVictoryEndingBGM();
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
    // 渲染主函数
    // ─────────────────────────────────────────
    _render() {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;
        const node = this._nodes[this.nodeIndex];
        if (!node) return;

        ctx.clearRect(0, 0, W, H);

        // 饱和度滤镜应用在 save/restore 内
        ctx.save();
        ctx.filter = `saturate(${this.saturation * 100}%)`;

        // 背景
        this._drawBackground(ctx, W, H);

        // 按节点阶段绘制特定内容
        const id = node.id;
        const ni = this.nodeIndex;

        // 释放粒子（N01+）
        if (ni >= 0) this._drawReleaseParticles(ctx, W, H);

        // 靛蓝渗出（N02+）
        if (ni >= 1) this._drawIndigoFlow(ctx, W, H);

        // 玩家身后幽灵（N03）
        if (id === 'N03' && (this._interactState.ghostAlpha || 0) > 0) {
            this._drawGhostBehind(ctx, W, H,
                this._interactState.ghostAlpha,
                this._interactState.ghostOffset || 0
            );
        }

        // 玩家形象（N02-N06）
        if (ni >= 1 && ni <= 5) {
            this._drawPlayerFigure(ctx, W, H);
        }

        // 影子（N03+）
        if (ni >= 2) this._drawShadow(ctx, W, H);

        // 世界浮现层（N03+）
        if (ni >= 2) this._drawWorldReveal(ctx, W, H);

        // 石榴树（N04+）
        if (ni >= 3) this._drawPomegranateTree(ctx, W, H);

        // 钟盘花纹（N04+）
        if (ni >= 3) this._drawClockFace(ctx, W, H);

        // 手特写（N05）
        if (id === 'N05') this._drawHandCloseup(ctx, W, H);

        // 指针走动（N06+）
        if (ni >= 5) this._drawClockHand(ctx, W, H,
            this._interactState.handAngle ?? Math.PI * 1.15
        );

        // N07：玩家走向光
        if (id === 'N07') this._drawVictoryWalk(ctx, W, H);

        ctx.restore(); // 结束饱和度滤镜

        // 右侧光源（N07，不受饱和度影响）
        if (id === 'N07') this._drawRightLight(ctx, W, H);

        // 文字
        this._drawText(ctx, W, H, node);

        // 最终淡黑（N07）
        if (id === 'N07' && this._layers.finalFade > 0) {
            ctx.save();
            ctx.globalAlpha = this._layers.finalFade;
            ctx.fillStyle = '#080512';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();

            // 淡黑完成后显示标题
            if (this._layers.finalFade >= 0.98) {
                this._drawFinalTitle(ctx, W, H);
            }
        }
    }

    // ─────────────────────────────────────────
    // 绘制子函数
    // ─────────────────────────────────────────

    _drawBackground(ctx, W, H) {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        const sat = this.saturation;
        // 从深灰逐渐过渡到暖色调
        const r1 = Math.round(Utils.lerp(18, 45, sat));
        const g1 = Math.round(Utils.lerp(15, 35, sat));
        const b1 = Math.round(Utils.lerp(28, 55, sat));
        const r2 = Math.round(Utils.lerp(35, 80, sat));
        const g2 = Math.round(Utils.lerp(28, 65, sat));
        const b2 = Math.round(Utils.lerp(50, 100, sat));
        grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
        grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 地面
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(40,90,this.saturation))},${Math.round(Utils.lerp(35,75,this.saturation))},${Math.round(Utils.lerp(55,100,this.saturation))},0.6)`;
        ctx.fillRect(0, H * 0.72, W, H * 0.28);

        // 钟塔轮廓（简化）
        this._drawClockTowerBg(ctx, W, H);
    }

    _drawClockTowerBg(ctx, W, H) {
        const cx = W * 0.5;
        const bw = W * 0.10;
        const th = H * 0.65;
        const by = H - th;

        ctx.save();
        ctx.globalAlpha = 0.85;

        // 塔身
        const sat = this.saturation;
        const bodyColor = `rgba(${Math.round(Utils.lerp(55,80,sat))},${Math.round(Utils.lerp(35,55,sat))},${Math.round(Utils.lerp(80,110,sat))},0.90)`;
        ctx.fillStyle = bodyColor;
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
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(196,220,sat))},${Math.round(Utils.lerp(163,185,sat))},${Math.round(Utils.lerp(90,120,sat))},0.70)`;
        ctx.beginPath();
        ctx.moveTo(cx, by - th * 0.18);
        ctx.lineTo(cx - bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _drawReleaseParticles(ctx, W, H) {
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= (1/60);
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.02;
            if (p.life <= 0) { this._particles.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = p.life * 0.5;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _spawnReleaseParticle() {
        const cx = this.width * 0.5;
        const cy = this.height * 0.35;
        const colors = ['rgba(74,127,191,0.6)', 'rgba(194,69,45,0.5)', 'rgba(196,163,90,0.5)'];
        this._particles.push({
            x: cx + (Math.random() - 0.5) * 60,
            y: cy + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(0.4 + Math.random() * 0.8),
            r: 2 + Math.random() * 4,
            life: 0.8 + Math.random() * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }

    _spawnClockRipple(t) {
        if (Math.floor(t * 5) % 3 !== 0) return;
    }

    _drawIndigoFlow(ctx, W, H) {
        const prog = this._layers.indigoFlow;
        if (prog <= 0) return;
        const cx = W * 0.5;
        const cy = H * 0.35;
        const r = H * 0.12 * prog;

        ctx.save();
        ctx.globalAlpha = prog * 0.7;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, 'rgba(74,127,191,0.8)');
        grd.addColorStop(0.5, 'rgba(74,127,191,0.3)');
        grd.addColorStop(1, 'rgba(74,127,191,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawHands(ctx, W, H, indigoAmt, ochreAmt) {
        const cx = W * 0.5;
        const cy = H * 0.52;
        const s = H * 0.18;

        ctx.save();

        // 左手
        const lx = cx - s * 0.30;
        // 袖口
        ctx.fillStyle = 'rgba(45,27,78,0.85)';
        ctx.fillRect(lx - s * 0.12, cy + s * 0.08, s * 0.24, s * 0.14);
        // 手掌
        ctx.fillStyle = 'rgba(230,220,210,0.85)';
        ctx.fillRect(lx - s * 0.10, cy - s * 0.15, s * 0.20, s * 0.25);
        // 手指（向上弯曲，捧状）
        [-0.06, -0.03, 0, 0.03, 0.06].forEach((ox, i) => {
            const fh = (i === 2) ? s * 0.14 : s * 0.11;
            ctx.fillStyle = 'rgba(225,215,205,0.85)';
            ctx.save();
            ctx.translate(lx + ox * s, cy - s * 0.15 - fh);
            ctx.rotate((-2 + i) * 0.06);
            ctx.fillRect(-s * 0.018, 0, s * 0.036, fh);
            ctx.restore();
        });

        // 右手
        const rx = cx + s * 0.30;
        ctx.fillStyle = 'rgba(45,27,78,0.85)';
        ctx.fillRect(rx - s * 0.12, cy + s * 0.08, s * 0.24, s * 0.14);
        ctx.fillStyle = 'rgba(230,220,210,0.85)';
        ctx.fillRect(rx - s * 0.10, cy - s * 0.15, s * 0.20, s * 0.25);
        [-0.06, -0.03, 0, 0.03, 0.06].forEach((ox, i) => {
            const fh = (i === 2) ? s * 0.14 : s * 0.11;
            ctx.fillStyle = 'rgba(225,215,205,0.85)';
            ctx.save();
            ctx.translate(rx + ox * s, cy - s * 0.15 - fh);
            ctx.rotate((-2 + i) * 0.06);
            ctx.fillRect(-s * 0.018, 0, s * 0.036, fh);
            ctx.restore();
        });

        // 靛蓝渗入
        if (indigoAmt > 0) {
            ctx.globalAlpha = indigoAmt * 0.6;
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
            grd.addColorStop(0, 'rgba(74,127,191,0.5)');
            grd.addColorStop(1, 'rgba(74,127,191,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // 母亲染缸光晕
            ctx.globalAlpha = indigoAmt * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(74,100,180,0.3)';
            ctx.fill();
        }

        ctx.restore();
    }

    _drawPlayerFigure(ctx, W, H) {
        const cx = W * 0.5 + (this.nodeIndex >= 6 ? this._layers.playerWalkX : 0);
        const cy = H * 0.62;
        const s = H * 0.22;
        const ochre = this._layers.ochreCloth;
        const collarIndigo = this._layers.collarIndigo;
        // 灰度系数：ochre=0全灰，ochre=1全彩
        const gray = 1 - ochre;

        ctx.save();
        ctx.translate(cx, cy);

        // ── 脚部阴影 ──
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, s * 0.48, s * 0.18, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── 披风（身体后层）──
        const capeC1 = gray > 0.5 ? 'rgba(28,14,44,0.85)' : `rgba(${30 + 14 * ochre|0},${10 + 4 * ochre|0},${30 + 18 * ochre|0},0.85)`;
        const capeC2 = gray > 0.5 ? 'rgba(16,8,26,0.8)' : `rgba(${18 + 12 * ochre|0},${8 + 4 * ochre|0},${18 + 14 * ochre|0},0.8)`;
        const capeGrad = ctx.createLinearGradient(-s * 0.28, -s * 0.35, s * 0.28, s * 0.45);
        capeGrad.addColorStop(0, capeC1);
        capeGrad.addColorStop(1, capeC2);
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.11, -s * 0.40);
        ctx.lineTo(s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.28, -s * 0.05, s * 0.24, s * 0.42);
        ctx.quadraticCurveTo(0, s * 0.50, -s * 0.24, s * 0.42);
        ctx.quadraticCurveTo(-s * 0.28, -s * 0.05, -s * 0.11, -s * 0.40);
        ctx.closePath();
        ctx.fill();
        // 披风内衬
        ctx.strokeStyle = `rgba(${90 * ochre|0},10,${26 + 20 * ochre|0},0.45)`;
        ctx.lineWidth = s * 0.015;
        ctx.beginPath();
        ctx.moveTo(-s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(-s * 0.28, -s * 0.05, -s * 0.24, s * 0.42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.28, -s * 0.05, s * 0.24, s * 0.42);
        ctx.stroke();

        // ── 长衫主体 ──
        const coatR = Math.round(Utils.lerp(38, 45, ochre));
        const coatG = Math.round(Utils.lerp(30, 27, ochre));
        const coatB = Math.round(Utils.lerp(48, 78, ochre));
        const coatGrad = ctx.createLinearGradient(-s * 0.14, -s * 0.40, s * 0.14, s * 0.30);
        coatGrad.addColorStop(0, `rgb(${coatR},${coatG},${coatB})`);
        coatGrad.addColorStop(0.6, `rgb(${coatR - 8|0},${coatG - 6|0},${coatB - 12|0})`);
        coatGrad.addColorStop(1, `rgb(${coatR - 15|0},${coatG - 12|0},${coatB - 20|0})`);
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, -s * 0.40);
        ctx.lineTo(s * 0.12, -s * 0.40);
        ctx.lineTo(s * 0.15, s * 0.30);
        ctx.quadraticCurveTo(0, s * 0.35, -s * 0.15, s * 0.30);
        ctx.closePath();
        ctx.fill();

        // 赭石染衣（从下往上浮现）
        if (ochre > 0) {
            ctx.save();
            ctx.globalAlpha = ochre * 0.35;
            ctx.beginPath();
            ctx.rect(-s * 0.15, s * 0.30 - s * 0.70 * ochre, s * 0.30, s * 0.70 * ochre);
            ctx.clip();
            ctx.fillStyle = 'rgba(194,100,45,0.6)';
            ctx.fillRect(-s * 0.15, -s * 0.40, s * 0.30, s * 0.70);
            ctx.restore();
        }

        // ── 尖领（哥特式高领）──
        const collarV = Math.round(Utils.lerp(30, 36, ochre));
        ctx.fillStyle = `rgb(${collarV},${collarV - 10|0},${collarV + 16|0})`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.40);
        ctx.lineTo(-s * 0.04, -s * 0.52);
        ctx.lineTo(0, -s * 0.44);
        ctx.lineTo(s * 0.04, -s * 0.52);
        ctx.lineTo(s * 0.10, -s * 0.40);
        ctx.closePath();
        ctx.fill();

        // ── 领口靛蓝 ──
        if (collarIndigo > 0) {
            ctx.save();
            ctx.globalAlpha = collarIndigo * 0.65;
            ctx.fillStyle = 'rgba(74,127,191,0.55)';
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.43, s * 0.06, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── 双臂 ──
        // 左臂
        ctx.fillStyle = `rgb(${coatR},${coatG},${coatB})`;
        ctx.fillRect(-s * 0.18, -s * 0.28, s * 0.08, s * 0.28);
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(180,240,ochre))},${Math.round(Utils.lerp(170,224,ochre))},${Math.round(Utils.lerp(160,212,ochre))},0.9)`;
        ctx.fillRect(-s * 0.18, -s * 0.02, s * 0.08, s * 0.05);
        // 右臂
        ctx.fillStyle = `rgb(${coatR},${coatG},${coatB})`;
        ctx.fillRect(s * 0.10, -s * 0.28, s * 0.08, s * 0.28);
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(180,240,ochre))},${Math.round(Utils.lerp(170,224,ochre))},${Math.round(Utils.lerp(160,212,ochre))},0.9)`;
        ctx.fillRect(s * 0.10, -s * 0.02, s * 0.08, s * 0.05);

        // ── 黄铜纽扣 ──
        ctx.fillStyle = `rgba(184,134,11,${0.4 + ochre * 0.5})`;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -s * 0.28 + i * s * 0.10, s * 0.018, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── 齿轮徽章 ──
        const badgeX = -s * 0.07, badgeY = -s * 0.22;
        const badgeR = s * 0.04;
        ctx.strokeStyle = `rgba(184,134,11,${0.35 + ochre * 0.45})`;
        ctx.lineWidth = s * 0.008;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(badgeX + Math.cos(a) * badgeR * 0.80, badgeY + Math.sin(a) * badgeR * 0.80);
            ctx.lineTo(badgeX + Math.cos(a) * badgeR * 1.35, badgeY + Math.sin(a) * badgeR * 1.35);
            ctx.stroke();
        }

        // ── 头部 ──
        const headR = s * 0.12;
        const headY = -s * 0.62;
        // 苍白面容
        const skinR = Math.round(Utils.lerp(200, 240, ochre));
        const skinG = Math.round(Utils.lerp(190, 230, ochre));
        const skinB = Math.round(Utils.lerp(180, 220, ochre));
        const skinGrad = ctx.createRadialGradient(-s * 0.01, headY, 0, 0, headY + s * 0.02, headR);
        skinGrad.addColorStop(0, `rgb(${skinR},${skinG},${skinB})`);
        skinGrad.addColorStop(1, `rgb(${skinR - 20|0},${skinG - 18|0},${skinB - 15|0})`);
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // 黑发
        ctx.fillStyle = `rgb(${13 + 5 * ochre|0},${13 + 3 * ochre|0},${26 + 5 * ochre|0})`;
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

        // 眼睛
        const eyeY = headY + headR * 0.05;
        const eyeSpacing = headR * 0.38;
        [-1, 1].forEach(side => {
            const ex = side * eyeSpacing;
            // 黑眼圈
            ctx.fillStyle = `rgba(50,20,80,0.2)`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY + headR * 0.12, headR * 0.28, headR * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
            // 眼白
            ctx.fillStyle = `rgb(${Math.round(Utils.lerp(200,232,ochre))},${Math.round(Utils.lerp(185,208,ochre))},${Math.round(Utils.lerp(200,232,ochre))})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.22, headR * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // 虹膜
            ctx.fillStyle = `rgb(${Math.round(Utils.lerp(80,107,ochre))},${Math.round(Utils.lerp(22,30,ochre))},${Math.round(Utils.lerp(100,138,ochre))})`;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.16, headR * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            // 瞳孔
            ctx.fillStyle = '#1A0A2E';
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, headR * 0.09, headR * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();
            // 高光
            ctx.fillStyle = `rgba(240,200,255,${0.4 + ochre * 0.45})`;
            ctx.beginPath();
            ctx.arc(ex + headR * 0.06 * side, eyeY - headR * 0.08, headR * 0.055, 0, Math.PI * 2);
            ctx.fill();
        });

        // 眉
        ctx.strokeStyle = `rgb(${13 + 5 * ochre|0},${13 + 3 * ochre|0},26)`;
        ctx.lineWidth = s * 0.012;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-eyeSpacing - headR * 0.18, eyeY - headR * 0.28);
        ctx.lineTo(-eyeSpacing + headR * 0.18, eyeY - headR * 0.20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eyeSpacing - headR * 0.18, eyeY - headR * 0.20);
        ctx.lineTo(eyeSpacing + headR * 0.18, eyeY - headR * 0.28);
        ctx.stroke();

        // 嘴
        ctx.strokeStyle = `rgba(${Math.round(Utils.lerp(140,180,ochre))},${Math.round(Utils.lerp(110,140,ochre))},${Math.round(Utils.lerp(120,160,ochre))},0.5)`;
        ctx.lineWidth = s * 0.008;
        ctx.beginPath();
        ctx.moveTo(-headR * 0.2, headY + headR * 0.55);
        ctx.quadraticCurveTo(0, headY + headR * 0.48, headR * 0.2, headY + headR * 0.55);
        ctx.stroke();

        // ── 怀表链 + 怀表 ──
        const watchR = s * 0.028;
        ctx.strokeStyle = `rgba(184,134,11,${0.35 + ochre * 0.5})`;
        ctx.lineWidth = s * 0.007;
        ctx.beginPath();
        ctx.moveTo(s * 0.04, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.07, -s * 0.32, s * 0.05, -s * 0.25);
        ctx.stroke();
        ctx.fillStyle = `rgba(184,134,11,${0.4 + ochre * 0.5})`;
        ctx.beginPath();
        ctx.arc(s * 0.05, -s * 0.25, watchR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${skinR},${skinG},${skinB},0.9)`;
        ctx.beginPath();
        ctx.arc(s * 0.05, -s * 0.25, watchR * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // ── 发间画笔 ──
        ctx.save();
        ctx.globalAlpha = 0.75 + ochre * 0.2;
        ctx.strokeStyle = `rgba(${Math.round(Utils.lerp(120,180,ochre))},${Math.round(Utils.lerp(100,145,ochre))},${Math.round(Utils.lerp(65,100,ochre))},0.85)`;
        ctx.lineWidth = s * 0.014;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(headR * 0.5, headY - headR * 0.65);
        ctx.lineTo(headR * 0.85, headY - headR * 1.55);
        ctx.stroke();
        // 笔尖
        ctx.fillStyle = `rgba(${Math.round(Utils.lerp(120,194,ochre))},${Math.round(Utils.lerp(80,100,ochre))},${Math.round(Utils.lerp(50,45,ochre))},0.7)`;
        ctx.beginPath();
        ctx.arc(headR * 0.85, headY - headR * 1.55, s * 0.015, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── 外套轮廓光泽 ──
        ctx.strokeStyle = `rgba(100,60,150,${0.15 + ochre * 0.2})`;
        ctx.lineWidth = s * 0.008;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, -s * 0.40);
        ctx.lineTo(-s * 0.15, s * 0.30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.12, -s * 0.40);
        ctx.lineTo(s * 0.15, s * 0.30);
        ctx.stroke();

        ctx.restore();
    }

    _drawGhostBehind(ctx, W, H, alpha, offset) {
        if (alpha <= 0) return;
        const cx = W * 0.5 - W * 0.08 - offset;
        const cy = H * 0.62;
        const s = H * 0.22;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);

        // 披风虚影
        ctx.fillStyle = 'rgba(140,120,170,0.25)';
        ctx.beginPath();
        ctx.moveTo(-s * 0.11, -s * 0.40);
        ctx.lineTo(s * 0.11, -s * 0.40);
        ctx.quadraticCurveTo(s * 0.25, -s * 0.05, s * 0.22, s * 0.40);
        ctx.quadraticCurveTo(0, s * 0.48, -s * 0.22, s * 0.40);
        ctx.quadraticCurveTo(-s * 0.25, -s * 0.05, -s * 0.11, -s * 0.40);
        ctx.closePath();
        ctx.fill();

        // 长衫虚影
        ctx.fillStyle = 'rgba(140,120,170,0.30)';
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.40);
        ctx.lineTo(s * 0.10, -s * 0.40);
        ctx.lineTo(s * 0.12, s * 0.28);
        ctx.quadraticCurveTo(0, s * 0.32, -s * 0.12, s * 0.28);
        ctx.closePath();
        ctx.fill();

        // 头部虚影
        ctx.fillStyle = 'rgba(160,140,180,0.30)';
        ctx.beginPath();
        ctx.arc(0, -s * 0.62, s * 0.11, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawShadow(ctx, W, H) {
        const alpha = this._layers.shadowAlpha;
        if (alpha <= 0) return;
        const cx = W * 0.5;
        const groundY = H * 0.72;
        const lookUp = this._layers.shadowLookUp;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 影子形状（椭圆拉伸，随光轻晃）
        const wobble = Math.sin(performance.now() * 0.001) * 3;
        ctx.fillStyle = 'rgba(30,25,45,0.6)';
        ctx.beginPath();
        ctx.ellipse(cx + wobble, groundY + 10, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 影子人形（竖向拉伸）
        const shadowH = 35 + lookUp * 15;
        ctx.fillStyle = 'rgba(30,25,45,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx + wobble * 0.5, groundY - shadowH * 0.5, 8, shadowH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawWorldReveal(ctx, W, H) {
        const prog = this._layers.worldRevealProgress;
        const stage = this._layers.worldReveal;
        if (prog <= 0) return;

        ctx.save();

        if (stage >= 0) {
            // 墨线：地平线、树木轮廓
            ctx.globalAlpha = Math.min(prog / 0.33, 1) * 0.7;
            ctx.strokeStyle = 'rgba(40,30,55,0.8)';
            ctx.lineWidth = 0.8;

            // 地平线
            ctx.beginPath();
            ctx.moveTo(0, H * 0.72);
            ctx.lineTo(W, H * 0.72);
            ctx.stroke();

            // 树木线稿
            [[0.2, 0.72], [0.35, 0.70], [0.65, 0.72], [0.80, 0.71]].forEach(([xf, yf]) => {
                const tx = W * xf, ty = H * yf;
                const th = H * 0.12;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx, ty - th);
                ctx.moveTo(tx - 12, ty - th * 0.5);
                ctx.lineTo(tx + 12, ty - th * 0.5);
                ctx.stroke();
            });
        }

        if (stage >= 1) {
            // 底色：水彩平涂
            ctx.globalAlpha = Math.min((prog - 0.33) / 0.33, 1) * 0.35;
            const sat = this.saturation;
            // 天空底色
            ctx.fillStyle = `rgba(${Math.round(Utils.lerp(55,120,sat))},${Math.round(Utils.lerp(45,100,sat))},${Math.round(Utils.lerp(80,150,sat))},0.4)`;
            ctx.fillRect(0, 0, W, H * 0.72);
            // 地面底色
            ctx.fillStyle = `rgba(${Math.round(Utils.lerp(60,110,sat))},${Math.round(Utils.lerp(55,100,sat))},${Math.round(Utils.lerp(70,90,sat))},0.4)`;
            ctx.fillRect(0, H * 0.72, W, H * 0.28);
        }

        if (stage >= 2) {
            // 高光：细小亮点
            ctx.globalAlpha = Math.min((prog - 0.67) / 0.33, 1) * 0.5;
            for (let i = 0; i < 12; i++) {
                const prng = this._prng(i * 7 + 3);
                const x = prng() * W;
                const y = prng() * H * 0.72;
                const r = 1 + prng() * 2;
                ctx.fillStyle = 'rgba(244,228,188,0.8)';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawPomegranateTree(ctx, W, H) {
        const prog = this._layers.pomegranateOpen;
        const tx = W * 0.82;
        const ty = H * 0.72;
        const th = H * 0.20;

        ctx.save();
        ctx.globalAlpha = Math.min(this.nodeTimer / 2, 1) * 0.85;
        ctx.strokeStyle = 'rgba(80,55,40,0.8)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // 树干
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx - 5, ty - th * 0.5, tx - 8, ty - th);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, ty - th * 0.4);
        ctx.quadraticCurveTo(tx + 15, ty - th * 0.65, tx + 22, ty - th * 0.85);
        ctx.stroke();

        // 石榴（裂开效果）
        const pomX = tx - 5, pomY = ty - th * 0.85;
        const pomR = 14;

        // 灰白壳
        ctx.globalAlpha = (1 - prog * 0.8) * 0.7;
        ctx.fillStyle = 'rgba(180,170,160,0.6)';
        ctx.beginPath();
        ctx.arc(pomX, pomY, pomR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(130,120,110,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 裂开的猩红内里（向内收拢，像愈合）
        if (prog > 0) {
            ctx.globalAlpha = prog * 0.85;
            const crackWidth = pomR * 0.6 * (1 - prog * 0.3);
            ctx.fillStyle = '#C2452D';
            ctx.beginPath();
            ctx.ellipse(pomX, pomY, crackWidth, pomR * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // 裂缝边缘（向内收）
            ctx.strokeStyle = 'rgba(160,40,30,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pomX - crackWidth, pomY);
            ctx.lineTo(pomX + crackWidth, pomY);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawGhostGroup(ctx, W, H, alpha) {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;

        const count = 8;
        const cx = W * 0.5;
        const cy = H * 0.65;
        const r = H * 0.18;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const gx = cx + Math.cos(angle) * r;
            const gy = cy + Math.sin(angle) * r * 0.4;
            const s = H * 0.08;

            ctx.save();
            ctx.translate(gx, gy);
            // 披风虚影
            ctx.fillStyle = 'rgba(130,120,160,0.20)';
            ctx.beginPath();
            ctx.moveTo(-s * 0.10, -s * 0.38);
            ctx.lineTo(s * 0.10, -s * 0.38);
            ctx.quadraticCurveTo(s * 0.22, 0, s * 0.20, s * 0.35);
            ctx.quadraticCurveTo(0, s * 0.42, -s * 0.20, s * 0.35);
            ctx.quadraticCurveTo(-s * 0.22, 0, -s * 0.10, -s * 0.38);
            ctx.closePath();
            ctx.fill();
            // 长衫虚影
            ctx.fillStyle = 'rgba(140,130,170,0.25)';
            ctx.beginPath();
            ctx.moveTo(-s * 0.08, -s * 0.38);
            ctx.lineTo(s * 0.08, -s * 0.38);
            ctx.lineTo(s * 0.10, s * 0.25);
            ctx.quadraticCurveTo(0, s * 0.30, -s * 0.10, s * 0.25);
            ctx.closePath();
            ctx.fill();
            // 头部（仰头，位置稍偏上）
            ctx.fillStyle = 'rgba(150,140,175,0.25)';
            ctx.beginPath();
            ctx.arc(0, -s * 0.55, s * 0.10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    _drawClockFace(ctx, W, H) {
        const cx = W * 0.5;
        const cy = H * 0.42;
        const r = H * 0.22;
        const prog = this._layers.clockFlowersProgress;

        ctx.save();

        // 钟面底圆
        ctx.globalAlpha = 0.55;
        const face = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        face.addColorStop(0, 'rgba(244,228,188,0.18)');
        face.addColorStop(1, 'rgba(55,35,80,0.55)');
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 边框
        ctx.strokeStyle = `rgba(196,163,90,0.55)`;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.stroke();

        ctx.globalAlpha = 1;

        // 四朵花（随进度依次浮现）
        const flowers = [
            { name: 'plum',        angle: Math.PI * 1.5,  color: 'rgba(40,35,50,0.85)',   bloom: 0.00 }, // 子时 墨梅
            { name: 'peach',       angle: Math.PI * 0.0,  color: 'rgba(220,160,170,0.75)',bloom: 0.25 }, // 寅时 桃夭
            { name: 'pomegranate', angle: Math.PI * 0.5,  color: 'rgba(194,69,45,0.80)',  bloom: 0.50 }, // 午时 石榴
            { name: 'chrysanth',   angle: Math.PI * 1.0,  color: 'rgba(196,163,90,0.80)', bloom: 0.75 }, // 戌时 菊
        ];

        flowers.forEach(({ angle, color, bloom }) => {
            const flowerProg = Math.max(0, Math.min((prog - bloom) / 0.25, 1));
            if (flowerProg <= 0) return;

            const fx = cx + Math.cos(angle) * r * 0.62;
            const fy = cy + Math.sin(angle) * r * 0.62;
            const petalR = r * 0.10 * flowerProg;

            ctx.save();
            ctx.globalAlpha = flowerProg * 0.85;

            // 花瓣
            const petalCount = 5;
            ctx.fillStyle = color;
            for (let i = 0; i < petalCount; i++) {
                const pa = (i / petalCount) * Math.PI * 2 + (prog * Math.PI * 0.1);
                ctx.beginPath();
                ctx.ellipse(
                    fx + Math.cos(pa) * petalR * 0.8,
                    fy + Math.sin(pa) * petalR * 0.8,
                    petalR * 0.6, petalR * 0.35, pa, 0, Math.PI * 2
                );
                ctx.fill();
            }

            // 花心
            ctx.fillStyle = 'rgba(244,228,188,0.6)';
            ctx.beginPath();
            ctx.arc(fx, fy, petalR * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        ctx.restore();
    }

    _drawClockHand(ctx, W, H, angle) {
        const cx = W * 0.5;
        const cy = H * 0.42;
        const r = H * 0.22;

        ctx.save();
        ctx.strokeStyle = 'rgba(244,228,188,0.7)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.6, cy + Math.sin(angle) * r * 0.6);
        ctx.stroke();
        ctx.restore();
    }

    _drawHandCloseup(ctx, W, H) {
        const cx = W * 0.5;
        const cy = H * 0.5;
        const s = H * 0.22;
        const ochre = this._layers.ochreCloth;

        ctx.save();

        // 袖口（深紫长衫色）
        const coatR = Math.round(Utils.lerp(38, 45, ochre));
        const coatG = Math.round(Utils.lerp(30, 27, ochre));
        const coatB = Math.round(Utils.lerp(48, 78, ochre));
        ctx.fillStyle = `rgb(${coatR},${coatG},${coatB})`;
        ctx.fillRect(cx - s * 0.32, cy + s * 0.18, s * 0.64, s * 0.22);
        // 袖口边缘（紫色光泽）
        ctx.strokeStyle = `rgba(100,60,150,0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.32, cy + s * 0.18);
        ctx.lineTo(cx + s * 0.32, cy + s * 0.18);
        ctx.stroke();

        // 手掌（苍白肤色）
        const skinR = Math.round(Utils.lerp(200, 240, ochre));
        const skinG = Math.round(Utils.lerp(190, 224, ochre));
        const skinB = Math.round(Utils.lerp(180, 212, ochre));
        const palmGrad = ctx.createLinearGradient(cx, cy - s * 0.15, cx, cy + s * 0.20);
        palmGrad.addColorStop(0, `rgb(${skinR},${skinG},${skinB})`);
        palmGrad.addColorStop(1, `rgb(${skinR - 15|0},${skinG - 12|0},${skinB - 10|0})`);
        ctx.fillStyle = palmGrad;
        ctx.fillRect(cx - s * 0.26, cy - s * 0.15, s * 0.52, s * 0.35);

        // 五根手指
        const fingers = [-0.20, -0.10, 0, 0.10, 0.20];
        fingers.forEach((ox, i) => {
            const fh = (i === 2) ? s * 0.30 : (i === 0 || i === 4) ? s * 0.22 : s * 0.26;
            const fw = s * 0.08;
            const fx = cx + ox * s - fw * 0.5;
            const fy = cy - s * 0.15 - fh;

            // 手指本体
            ctx.fillStyle = `rgb(${skinR - 5|0},${skinG - 5|0},${skinB - 3|0})`;
            ctx.fillRect(fx, fy, fw, fh + s * 0.02);

            // 指甲
            ctx.save();
            ctx.globalAlpha = 0.6;
            const nailGrad = ctx.createLinearGradient(fx, fy, fx, fy + fw * 0.8);
            nailGrad.addColorStop(0, 'rgba(255,245,235,0.8)');
            nailGrad.addColorStop(1, `rgba(${skinR},${skinG},${skinB},0.5)`);
            ctx.fillStyle = nailGrad;
            ctx.fillRect(fx + fw * 0.12, fy + 1, fw * 0.76, fw * 0.7);
            // 月牙
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(255,250,245,0.7)';
            ctx.beginPath();
            ctx.ellipse(fx + fw * 0.5, fy + fw * 0.55, fw * 0.25, fw * 0.18, 0, Math.PI, 0);
            ctx.fill();
            ctx.restore();
        });

        // 指缝灰土
        const pulse = this._interactState.dirtPulse || 0;
        const dirtAlpha = 0.55 + pulse * 0.25;
        const dirtExpand = 1 + pulse * 0.3;
        ctx.save();
        ctx.globalAlpha = dirtAlpha;
        fingers.slice(0, 4).forEach((ox, i) => {
            const gx = cx + (ox + fingers[i + 1]) * s * 0.5;
            const gy = cy - s * 0.12;
            ctx.fillStyle = 'rgba(100,90,75,0.65)';
            for (let d = 0; d < 5; d++) {
                const dx = (Math.random() - 0.5) * 7 * dirtExpand;
                const dy = (Math.random() - 0.5) * 4 * dirtExpand;
                ctx.beginPath();
                ctx.arc(gx + dx, gy + dy, 1.3 * dirtExpand, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        ctx.restore();
    }

    _drawVictoryWalk(ctx, W, H) {
        const walkX = this._layers.playerWalkX;
        const cx = W * 0.5 + walkX;
        const cy = H * 0.62;
        const s = H * 0.22;
        const walkPhase = walkX / (this.width * 0.35) * Math.PI * 4;
        const bob = Math.sin(walkPhase) * s * 0.02;

        ctx.save();
        ctx.translate(cx, cy + bob);

        // 脚部阴影
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(0, s * 0.46, s * 0.16, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();

        // 披风（随走路微摆）
        const capeSwing = Math.sin(walkPhase) * s * 0.02;
        ctx.fillStyle = 'rgba(30,14,48,0.80)';
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.38);
        ctx.lineTo(s * 0.10, -s * 0.38);
        ctx.quadraticCurveTo(s * 0.26 + capeSwing, -s * 0.03, s * 0.22 + capeSwing, s * 0.40);
        ctx.quadraticCurveTo(0, s * 0.48, -s * 0.22 - capeSwing, s * 0.40);
        ctx.quadraticCurveTo(-s * 0.26 - capeSwing, -s * 0.03, -s * 0.10, -s * 0.38);
        ctx.closePath();
        ctx.fill();

        // 长衫
        const coatGrad = ctx.createLinearGradient(-s * 0.12, -s * 0.38, s * 0.12, s * 0.28);
        coatGrad.addColorStop(0, '#2D1B4E');
        coatGrad.addColorStop(0.6, '#1E1035');
        coatGrad.addColorStop(1, '#160C28');
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.10, -s * 0.38);
        ctx.lineTo(s * 0.10, -s * 0.38);
        ctx.lineTo(s * 0.13, s * 0.28);
        ctx.quadraticCurveTo(0, s * 0.32, -s * 0.13, s * 0.28);
        ctx.closePath();
        ctx.fill();

        // 尖领
        ctx.fillStyle = '#241540';
        ctx.beginPath();
        ctx.moveTo(-s * 0.08, -s * 0.38);
        ctx.lineTo(-s * 0.03, -s * 0.48);
        ctx.lineTo(0, -s * 0.41);
        ctx.lineTo(s * 0.03, -s * 0.48);
        ctx.lineTo(s * 0.08, -s * 0.38);
        ctx.closePath();
        ctx.fill();

        // 双臂（摆动）
        const armSwing = Math.sin(walkPhase) * 0.12;
        ctx.save();
        ctx.translate(-s * 0.13, -s * 0.18);
        ctx.rotate(-armSwing);
        ctx.fillStyle = '#2D1B4E';
        ctx.fillRect(-s * 0.04, 0, s * 0.07, s * 0.22);
        ctx.fillStyle = '#EDE0D4';
        ctx.fillRect(-s * 0.04, s * 0.20, s * 0.07, s * 0.04);
        ctx.restore();
        ctx.save();
        ctx.translate(s * 0.13, -s * 0.18);
        ctx.rotate(armSwing);
        ctx.fillStyle = '#2D1B4E';
        ctx.fillRect(-s * 0.03, 0, s * 0.07, s * 0.22);
        ctx.fillStyle = '#EDE0D4';
        ctx.fillRect(-s * 0.03, s * 0.20, s * 0.07, s * 0.04);
        ctx.restore();

        // 黄铜纽扣
        ctx.fillStyle = 'rgba(184,134,11,0.8)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -s * 0.26 + i * s * 0.09, s * 0.015, 0, Math.PI * 2);
            ctx.fill();
        }

        // 头部
        const headR = s * 0.11;
        const headY = -s * 0.58;
        ctx.fillStyle = '#F0E6DC';
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        // 黑发
        ctx.fillStyle = '#0D0D1A';
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.25, headR, Math.PI, Math.PI * 2);
        ctx.fill();
        // 刘海
        ctx.beginPath();
        ctx.moveTo(-headR, headY - headR * 0.5);
        ctx.quadraticCurveTo(-headR * 0.35, headY + headR * 0.12, headR * 0.1, headY + headR * 0.05);
        ctx.quadraticCurveTo(-headR * 0.1, headY - headR * 0.35, -headR, headY - headR * 0.5);
        ctx.fill();
        // 眼睛（简化）
        [-1, 1].forEach(side => {
            const ex = side * headR * 0.35;
            ctx.fillStyle = '#6B1E8A';
            ctx.beginPath();
            ctx.ellipse(ex, headY + headR * 0.05, headR * 0.14, headR * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(240,200,255,0.8)';
            ctx.beginPath();
            ctx.arc(ex + headR * 0.05 * side, headY - headR * 0.02, headR * 0.05, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        // 脚印
        this._drawFootprints(ctx, W, H, cx);

        // 指纹（彩蛋）
        if (this._layers.fingerprint || this._fingerprintLeft) {
            const fp = this._getLastFootprintPos();
            if (fp) {
                this._drawFingerprint(ctx, fp.x, fp.y + 5);
            }
        }
    }

    _drawFootprints(ctx, W, H, currentX) {
        const count = this._layers.footprintsCount;
        const startX = W * 0.5;
        const groundY = H * 0.73;

        ctx.save();
        ctx.fillStyle = 'rgba(100,92,82,0.45)';

        for (let i = 0; i < Math.min(count, 8); i++) {
            const t = i / 8;
            const fx = startX + t * (currentX - startX);
            const side = i % 2 === 0 ? -6 : 6;
            ctx.beginPath();
            ctx.ellipse(fx + side, groundY + 3, 5, 9, 0.1 * side, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _getLastFootprintPos() {
        const count = this._layers.footprintsCount;
        if (count <= 0) return null;
        const W = this.width;
        const H = this.height;
        const walkX = this._layers.playerWalkX;
        const startX = W * 0.5;
        const currentX = W * 0.5 + walkX;
        const t = Math.min(count - 1, 7) / 8;
        const fx = startX + t * (currentX - startX);
        const side = (count - 1) % 2 === 0 ? -6 : 6;
        return { x: fx + side, y: H * 0.73 + 3 };
    }

    _drawFingerprint(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(80,70,60,0.6)';
        ctx.lineWidth = 0.5;

        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.ellipse(x, y, i * 2.2, i * 1.4, 0.15, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawRightLight(ctx, W, H) {
        const intensity = this._layers.lightRight;
        if (intensity <= 0) return;

        ctx.save();
        const grd = ctx.createLinearGradient(W * 0.6, 0, W, 0);
        grd.addColorStop(0, 'rgba(244,228,188,0)');
        grd.addColorStop(1, `rgba(244,228,188,${intensity * 0.45})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    _drawText(ctx, W, H, node) {
        const t = this.nodeTimer;
        const fadeIn = Math.min(t / 0.8, 1);
        const dur = node.duration;
        const fadeOut = node.autoAdvance ? Math.max(0, 1 - (t - (dur - 0.8)) / 0.8) : 1;
        const alpha = fadeIn * fadeOut;
        if (alpha <= 0) return;

        const fontSize = Math.round(Math.max(18, Math.min(W * 0.038, 36)));
        const maxW = W * 0.82;
        ctx.font = `${fontSize}px 'Ma Shan Zheng', serif`;

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
        ctx.font = `${fontSize}px 'Ma Shan Zheng', serif`;
        ctx.fillStyle = 'rgba(244,228,188,0.96)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.98)';
        ctx.shadowBlur = 20;
        lines.forEach((line, i) => {
            ctx.fillText(line, W * 0.5, baseY + lineH * 0.5 + i * lineH);
        });
        ctx.restore();
    }

    _drawClockStrokes(ctx, W, H) {
        if (this._clockStrokes.length === 0) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(196,163,90,0.5)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;
        this._clockStrokes.forEach(({ x1, y1, x2, y2 }) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawPromptDot(ctx, W, H) {
        const pulse = 0.4 + 0.4 * Math.sin(performance.now() * 0.003);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(244,228,188,0.7)';
        ctx.beginPath();
        ctx.arc(W * 0.5, H * 0.82, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawFinalTitle(ctx, W, H) {
        const elapsed = Math.max(0, this._layers.finalFade - 0.85) / 0.15;
        const alpha = Math.min(elapsed, 1) * 0.92;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `36px 'Ma Shan Zheng', serif`;
        ctx.fillStyle = 'rgba(244,228,188,0.95)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText('失色纪·修钟人', W * 0.5, H * 0.45);
        ctx.restore();
    }

    // ─────────────────────────────────────────
    // 事件处理
    // ─────────────────────────────────────────

    _handleMouseMove(e) {
        const node = this._nodes[this.nodeIndex];
        if (!node) return;
        const r = this.canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        node.onMouseMove && node.onMouseMove(x, y);
    }

    _handleMouseDown(e) {
        const node = this._nodes[this.nodeIndex];
        if (!node) return;
        const r = this.canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;

        node.onMouseDown && node.onMouseDown(x, y);

        // 通用点击区域
        if (node.clickZone) {
            const zone = node.clickZone();
            const dist = Math.sqrt((x - zone.x) ** 2 + (y - zone.y) ** 2);
            if (dist < zone.r) {
                node.onInteract && node.onInteract(x, y);
                return;
            }
        }
        if (node.onInteract) node.onInteract(x, y);
    }

    _handleMouseUp(e) {
        const node = this._nodes[this.nodeIndex];
        if (!node) return;
        node.onMouseUp && node.onMouseUp();
    }

    _handleTouchStart(e) {
        const t = e.touches[0];
        this._handleMouseDown({ clientX: t.clientX, clientY: t.clientY });
    }

    _handleTouchMove(e) {
        const t = e.touches[0];
        this._handleMouseMove({ clientX: t.clientX, clientY: t.clientY });
    }

    _handleTouchEnd() {
        this._handleMouseUp();
    }

    // ─────────────────────────────────────────
    // 工具函数
    // ─────────────────────────────────────────

    _prng(seed) {
        return () => {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
}
