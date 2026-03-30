// 进入世界互动动画 - 失色纪·修钟人
// 5幕动画，对应开篇序言语义，参考纪念碑谷镜头语言

class IntroAnimation {
    constructor() {
        this.canvas  = document.getElementById('intro-canvas');
        this.ctx     = this.canvas ? this.canvas.getContext('2d') : null;
        this._resolve = null;
        this._raf     = null;
        this._scene   = 0;
        this._t       = 0;          // 当前幕内时间(秒)
        this._lastTs  = null;
        this._interacted = false;   // 用户是否已点击/按键（用于某些幕的互动）

        // 打字机状态
        this._typewriterText = '';       // 当前正在打字的原文
        this._typewriterRevealed = 0;   // 已显示的字符数
        this._typewriterTimer = 0;      // 打字计时器
        this._typewriterSpeed = 0.10;   // 每个字符间隔(秒)
    }

    // ── 公共入口：返回 Promise，动画结束后 resolve ─────
    play() {
        if (!this.canvas || !this.ctx) return Promise.resolve();
        return new Promise(resolve => {
            this._resolve = resolve;
            this._scene   = 0;
            this._t       = 0;
            this._lastTs  = null;
            this._interacted = false;
            this._scene2ClickBound = false;
            this._tAfterInteract   = 0;

            this._resize();
            window.addEventListener('resize', this._onResize = () => this._resize());

            this.canvas.classList.remove('hidden');

            // 启动序言交互动画BGM（D小调，神秘/宿命）
            if (typeof GameAudio !== 'undefined' && GameAudio.initialized) {
                GameAudio.startIntroBGM(22);
            }

            // 开始渲染循环
            this._raf = requestAnimationFrame(ts => this._loop(ts));
        });
    }

    _resize() {
        if (!this.canvas) return;
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _end() {
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
        window.removeEventListener('resize', this._onResize);

        // 停止序言BGM
        if (typeof GameAudio !== 'undefined' && GameAudio.initialized) {
            GameAudio.stopIntroBGM();
        }

        // 快速淡出
        const cvs = this.canvas;
        if (!cvs) { if (this._resolve) { this._resolve(); this._resolve = null; } return; }

        let alpha = 1;
        const fadeOut = () => {
            alpha -= 0.05;
            if (alpha <= 0) {
                cvs.classList.add('hidden');
                if (this._resolve) { this._resolve(); this._resolve = null; }
                return;
            }
            const ctx = this.ctx;
            ctx.save();
            ctx.globalAlpha = 1 - alpha;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, cvs.width, cvs.height);
            ctx.restore();
            requestAnimationFrame(fadeOut);
        };
        requestAnimationFrame(fadeOut);
    }

    _loop(ts) {
        const dt = this._lastTs === null ? 0 : Math.min((ts - this._lastTs) / 1000, 0.1);
        this._lastTs = ts;
        this._t += dt;

        const ctx  = this.ctx;
        const W    = this.canvas.width;
        const H    = this.canvas.height;

        ctx.clearRect(0, 0, W, H);

        let advance = false;

        switch (this._scene) {
            case 0: advance = this._scene0(ctx, W, H, this._t); break;  // 钟停了
            case 1: advance = this._scene1(ctx, W, H, this._t); break;  // 颜色剥落
            case 2: advance = this._scene2(ctx, W, H, this._t, dt); break;  // 裂缝发光
            case 3: advance = this._scene3(ctx, W, H, this._t); break;  // 跌入
            case 4: advance = this._scene4(ctx, W, H, this._t); break;  // 水彩染开
            default:
                this._end();
                return;
        }

        if (advance) {
            this._scene++;
            this._t = 0;
            this._interacted = false;
            if (this._scene >= 5) {
                this._end();
                return;
            }
        }

        this._raf = requestAnimationFrame(ts2 => this._loop(ts2));
    }

    // ════════════════════════════════════════════════════
    // 幕 0：「钟停了。」
    // 黑幕中，钟楼剪影从屏幕底部缓慢升起，指针静止
    // 时长约 3.5 秒
    // ════════════════════════════════════════════════════
    _scene0(ctx, W, H, t) {
        const DUR = 3.5;

        // 背景 —— 深紫黑渐变
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#050312');
        bg.addColorStop(1, '#0d0820');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // 星点（慢慢出现）
        const starAlpha = Math.min(t / 1.5, 1);
        this._drawStars(ctx, W, H, starAlpha, 0);

        // 钟楼从底部升起
        const riseProgress = this._ease(Math.min(t / 2.2, 1));   // 0→1
        const offsetY = (1 - riseProgress) * H * 0.35;

        ctx.save();
        ctx.translate(0, offsetY);
        this._drawTowerSilhouette(ctx, W, H, 0.9);
        ctx.restore();

        // 文字：「钟停了。」渐入
        const textAlpha = Math.max(0, Math.min((t - 1.2) / 1.0, 1));
        this._drawCaption(ctx, W, H, '钟停了。', textAlpha, H * 0.26);

        return t >= DUR;
    }

    // ════════════════════════════════════════════════════
    // 幕 1：「颜色从指针上剥落」
    // 钟面彩色粒子向外飘散并褪色，饱和度骤降
    // 时长约 4 秒
    // ════════════════════════════════════════════════════
    _scene1(ctx, W, H, t) {
        const DUR = 4.0;

        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#050312');
        bg.addColorStop(1, '#0d0820');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        this._drawStars(ctx, W, H, 1, 0);

        // 钟楼（已在位）
        this._drawTowerSilhouette(ctx, W, H, 0.9);

        // 颜色粒子：随 t 增多并飘散，饱和度衰减
        const cx = W * 0.28;
        const towerH = H * 0.72;
        const clockY = H - towerH + towerH * 0.08;
        const clockR = W * 0.10 * 0.30;

        const COLORS = ['#C2452D','#C4A35A','#4A7FBF','#708238','#8B4A8B','#D4A060','#E8A87C'];
        const seed = 42;
        const count = 60;

        for (let i = 0; i < count; i++) {
            const prng = this._prng(seed + i);
            const angle = prng() * Math.PI * 2;
            const speed = 0.5 + prng() * 1.2;
            const delay = prng() * 0.8;
            const localT = Math.max(0, t - delay);

            const dist  = clockR + localT * speed * H * 0.12;
            const px    = cx + Math.cos(angle) * dist;
            const py    = clockY + Math.sin(angle) * dist * 0.85;
            const size  = (1.5 + prng() * 3) * (1 - localT / 3.5);

            if (size <= 0) continue;

            // 饱和度随时间衰减
            const sat   = Math.max(0, 1 - localT * 0.55);
            const alpha = Math.max(0, 1 - localT / 3.2) * 0.85;
            const color = COLORS[i % COLORS.length];

            ctx.save();
            ctx.filter = `saturate(${sat})`;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 文字
        const textAlpha = Math.min(t / 1.0, 1) * Math.max(0, 1 - (t - 3.0) / 0.8);
        this._drawCaption(ctx, W, H,
            '赭石、靛蓝、金箔——\n从钟面上剥落，在尘埃里枯死。',
            textAlpha, H * 0.22, 18);

        return t >= DUR;
    }

    // ════════════════════════════════════════════════════
    // 幕 2：「裂缝里渗出光来」+ 互动
    // 钟面出现裂缝，点击后裂缝发光向四周蔓延
    // 时长：用户点击后再 3 秒
    // ════════════════════════════════════════════════════
    _scene2(ctx, W, H, t, dt = 0.016) {
        const DUR_AFTER  = 3.0; // 点击后倒计时

        const cx = W * 0.28;
        const towerH = H * 0.72;
        const clockY = H - towerH + towerH * 0.08;
        const clockR = W * 0.10 * 0.30;

        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#050312');
        bg.addColorStop(1, '#0d0820');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        this._drawStars(ctx, W, H, 1, 0);
        this._drawTowerSilhouette(ctx, W, H, 0.9);

        if (!this._interacted) {
            // 裂缝（锯齿路径，缓慢出现）
            const crackAlpha = Math.min(t / 1.2, 0.9);
            this._drawClock(ctx, cx, clockY, clockR, 0.5);
            this._drawCrack(ctx, cx, clockY, clockR, crackAlpha);

            // 提示脉冲
            const pulseAlpha = 0.4 + 0.4 * Math.sin(t * 3);
            this._drawCaption(ctx, W, H, '点击触碰那道裂缝', pulseAlpha, H * 0.20, 32);

            if (!this._scene2ClickBound) {
                this._scene2ClickBound = true;
                const handler = (e) => {
                    e.stopPropagation();
                    this._interacted = true;
                    this._tAfterInteract = 0;
                    this.canvas.removeEventListener('click', handler);
                    this._scene2Handler = null;
                };
                this._scene2Handler = handler;
                this.canvas.addEventListener('click', handler);
            }
        } else {
            // 已点击：裂缝发光向外蔓延
            this._tAfterInteract = (this._tAfterInteract || 0) + dt;
            const lt = this._tAfterInteract;

            this._drawClock(ctx, cx, clockY, clockR, 0.5);
            this._drawCrack(ctx, cx, clockY, clockR, 0.9);

            // 光芒扩散
            const glowRadius = clockR + lt * H * 0.25;
            const glowAlpha  = Math.max(0, 1 - lt / 2.5) * 0.6;
            const grd = ctx.createRadialGradient(cx, clockY, 0, cx, clockY, glowRadius);
            grd.addColorStop(0,   `rgba(244,228,150,${glowAlpha})`);
            grd.addColorStop(0.3, `rgba(196,163,90,${glowAlpha * 0.5})`);
            grd.addColorStop(1,   'rgba(196,163,90,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, clockY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // 光缠住手腕（林渡的手轮廓，从钟面伸出）
            const handAlpha = Math.min(lt / 0.8, 1) * Math.max(0, 1 - (lt - 2.0) / 0.8);
            this._drawHand(ctx, cx, clockY, clockR, handAlpha, lt);

            const textAlpha = Math.max(0, 1 - (lt - 1.8) / 0.7);
            this._drawCaption(ctx, W, H,
                '裂缝里渗出光来——\n光缠住他的手腕，袖口的颜色正在褪去。',
                Math.min(lt / 0.8, 1) * textAlpha, H * 0.20, 16);

            if (lt >= DUR_AFTER) return true;
        }

        return false;
    }

    // ════════════════════════════════════════════════════
    // 幕 3：「他被吸了进去」
    // 人物被吸入钟面：从大变小 + 螺旋加速 + 径向拉扯线
    // 时长约 3.5 秒
    // ════════════════════════════════════════════════════
    _scene3(ctx, W, H, t) {
        const DUR = 3.5;

        const cx = W * 0.28;
        const towerH = H * 0.72;
        const clockY = H - towerH + towerH * 0.08;
        const clockR = W * 0.10 * 0.30;

        // 背景：随时间变亮的苍白光
        const bgIntensity = Math.min(t / 2.5, 1);
        const bg = ctx.createRadialGradient(cx, clockY, 0, cx, clockY, W * 0.8);
        bg.addColorStop(0,   `rgba(244,228,150,${0.35 * bgIntensity})`);
        bg.addColorStop(0.4, `rgba(55,35,80,${0.6 + 0.3 * bgIntensity})`);
        bg.addColorStop(1,   '#050312');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        this._drawStars(ctx, W, H, Math.max(0, 1 - t / 1.5), 0);

        // 钟楼：随主角坠入而镜头拉近
        const zoomT   = this._ease(Math.min(t / 2.0, 1));
        const zoom    = 1 + zoomT * 2.5;
        const rotAngle = zoomT * 0.15;

        ctx.save();
        ctx.translate(cx, clockY);
        ctx.rotate(rotAngle);
        ctx.scale(zoom, zoom);
        ctx.translate(-cx, -clockY);
        this._drawTowerSilhouette(ctx, W, H, 1 - zoomT * 0.5);
        ctx.restore();

        // 主角被吸入钟面：从大变小 + 螺旋加速
        const suckRaw = Math.min(Math.max(t - 0.2, 0) / 2.2, 1);
        const suckT   = suckRaw * suckRaw * suckRaw; // 立方缓动，越来越快
        const figX   = cx;
        const figY   = H * 0.18 + suckT * (clockY - H * 0.18);
        const figScale = 1.5 * (1 - suckT * 0.95); // 从1.5倍大缩小到0.075
        const figAlpha = Math.max(0, 1 - suckT * 1.1);
        const figSpin  = suckT * Math.PI * 2.5; // 螺旋2.5圈

        ctx.save();
        ctx.translate(figX, figY);
        ctx.rotate(figSpin);
        ctx.scale(figScale, figScale);
        ctx.globalAlpha = figAlpha;
        this._drawFigure(ctx, 0, 0, 28);
        ctx.restore();

        // 径向拉扯线（从四周向钟面中心汇聚）
        if (t > 0.3 && t < 2.8) {
            const pullP = Math.min((t - 0.3) / 0.6, 1) * Math.max(0, 1 - (t - 2.0) / 0.8);
            ctx.save();
            ctx.globalAlpha = pullP * 0.35;
            ctx.strokeStyle = 'rgba(244,228,150,0.5)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + t * 0.8;
                const outerR = W * 0.5 * (1 - suckT * 0.6);
                const innerR = clockR * 0.5;
                const ox = cx + Math.cos(angle) * outerR;
                const oy = clockY + Math.sin(angle) * outerR * 0.6;
                const ix = cx + Math.cos(angle) * innerR;
                const iy = clockY + Math.sin(angle) * innerR * 0.6;
                ctx.beginPath();
                ctx.moveTo(ox, oy);
                ctx.lineTo(ix, iy);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 文字
        const textAlpha = Math.max(0, Math.min((t - 0.5) / 0.8, 1)) * Math.max(0, 1 - (t - 2.8) / 0.5);
        this._drawCaption(ctx, W, H,
            '他被吸了进去。', textAlpha, H * 0.12, 22);

        // 最后闪白
        if (t > 2.8) {
            const flashA = Math.min((t - 2.8) / 0.7, 1);
            ctx.fillStyle = `rgba(230,220,180,${flashA * 0.9})`;
            ctx.fillRect(0, 0, W, H);
        }

        return t >= DUR;
    }

    // ════════════════════════════════════════════════════
    // 幕 4：「进入褪色界」
    // 纸张纹理 + 水彩颜色向外扩散然后褪色，最终淡出
    // 时长约 5 秒
    // ════════════════════════════════════════════════════
    _scene4(ctx, W, H, t) {
        const DUR = 5.0;

        // 先是一张宣纸白底
        const paperAlpha = Math.min(t / 0.4, 1);
        ctx.fillStyle = `rgba(245,238,220,${paperAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // 水彩色块从中心扩散
        const WCOLORS = [
            { c: 'rgba(194,69,45,0.55)',  delay: 0.0, speed: 1.2 },
            { c: 'rgba(74,127,191,0.50)', delay: 0.2, speed: 1.0 },
            { c: 'rgba(112,130,56,0.45)', delay: 0.4, speed: 0.9 },
            { c: 'rgba(196,163,90,0.50)', delay: 0.1, speed: 1.1 },
            { c: 'rgba(139,74,139,0.40)', delay: 0.3, speed: 0.85 },
        ];

        WCOLORS.forEach(({ c, delay, speed }, i) => {
            const lt = Math.max(0, t - delay);
            const r  = lt * speed * Math.max(W, H) * 0.55;
            if (r <= 0) return;

            // 随机偏移中心
            const prng = this._prng(i * 7 + 13);
            const ox = (prng() - 0.5) * W * 0.6;
            const oy = (prng() - 0.5) * H * 0.6;
            const bx = W / 2 + ox;
            const by = H / 2 + oy;

            // 整体褪色随时间推进
            const sat = Math.max(0, 1 - Math.max(0, t - 2.0) * 0.6);
            const alpha = Math.max(0, 1 - Math.max(0, t - 3.5) / 1.2);

            ctx.save();
            ctx.filter = `saturate(${sat})`;
            ctx.globalAlpha = alpha;

            const softR = r * 1.4;
            const grd = ctx.createRadialGradient(bx, by, 0, bx, by, softR);
            grd.addColorStop(0,    c);
            grd.addColorStop(0.3,  c.replace(/[\d.]+\)$/, '0.35)'));
            grd.addColorStop(0.6,  c.replace(/[\d.]+\)$/, '0.12)'));
            grd.addColorStop(1,    c.replace(/[\d.]+\)$/, '0)'));
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        });

        // 纸面纹理（简单细线模拟宣纸）
        if (t < 4.0) {
            ctx.save();
            ctx.globalAlpha = Math.min(t / 1.0, 1) * 0.06;
            ctx.strokeStyle = 'rgba(100,80,50,1)';
            ctx.lineWidth = 0.5;
            for (let y = 0; y < H; y += 4) {
                ctx.beginPath();
                ctx.moveTo(0, y + Math.sin(y * 0.3) * 1.5);
                ctx.lineTo(W, y + Math.sin(y * 0.3 + 1) * 1.5);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 褪色界入口光晕（柔和径向渐变暗示世界门扉）
        const worldAlpha = Math.max(0, Math.min((t - 1.5) / 1.5, 1));
        if (worldAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = worldAlpha * 0.25;
            const portalR = Math.min(W, H) * 0.35;
            const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, portalR);
            grd.addColorStop(0,   'rgba(55,35,80,0.35)');
            grd.addColorStop(0.5, 'rgba(45,28,68,0.15)');
            grd.addColorStop(1,   'rgba(45,28,68,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, portalR, 0, Math.PI * 2);
            ctx.fill();

            // 光晕内隐约的褪色世界剪影（无边框）
            ctx.globalAlpha = worldAlpha * 0.10;
            ctx.strokeStyle = 'rgba(55,35,80,0.7)';
            ctx.lineWidth = 0.8;
            ctx.lineCap = 'round';
            // 地平线
            const hlineY = H * 0.58;
            ctx.beginPath();
            ctx.moveTo(W * 0.3, hlineY);
            ctx.lineTo(W * 0.7, hlineY);
            ctx.stroke();
            // 枯树剪影
            [0.38, 0.52, 0.64].forEach(xf => {
                const tx = W * xf;
                ctx.beginPath();
                ctx.moveTo(tx, hlineY);
                ctx.lineTo(tx - 2, hlineY - H * 0.06);
                ctx.moveTo(tx, hlineY - H * 0.03);
                ctx.lineTo(tx + 6, hlineY - H * 0.045);
                ctx.stroke();
            });
            // 钟塔小剪影（三角尖顶 + 细柱身）
            const stx = W * 0.58, sty = hlineY;
            ctx.fillStyle = 'rgba(55,35,80,0.18)';
            ctx.beginPath();
            ctx.moveTo(stx, sty - H * 0.12);
            ctx.lineTo(stx - 6, sty - H * 0.06);
            ctx.lineTo(stx + 6, sty - H * 0.06);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(stx - 4, sty - H * 0.06, 8, H * 0.06);
            ctx.restore();
        }

        // 文字：「你来到了褪色界」
        const txt1Alpha = Math.max(0, Math.min((t - 1.0) / 1.0, 1)) * Math.max(0, 1 - (t - 4.0) / 0.8);
        if (txt1Alpha > 0) {
            this._drawCaption(ctx, W, H,
                '最后一眼，是满树铅粉的石榴。\n然后，他跌入了褪色界。',
                txt1Alpha, H * 0.30, 18, 'rgba(55,35,80,0.9)');
        }

        // 最终整体淡黑
        if (t > 3.8) {
            const fadeA = Math.min((t - 3.8) / 1.0, 1);
            ctx.fillStyle = `rgba(8,5,18,${fadeA})`;
            ctx.fillRect(0, 0, W, H);
        }

        return t >= DUR;
    }

    // ════════════════════════════════════════════════════
    // 辅助绘制方法
    // ════════════════════════════════════════════════════

    _drawStars(ctx, W, H, alpha, seed) {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        const count = 80;
        for (let i = 0; i < count; i++) {
            const p = this._prng(i * 3 + seed + 1);
            const x = p() * W;
            const y = p() * H * 0.65;
            const r = 0.5 + p() * 1.2;
            const a = 0.3 + p() * 0.7;
            ctx.globalAlpha = alpha * a * 0.55;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawTowerSilhouette(ctx, W, H, alpha) {
        if (alpha <= 0) return;
        const cx = W * 0.28;
        const bw = W * 0.10;
        const th = H * 0.72;
        const by = H - th;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 远景小塔
        [cx - bw * 1.35, cx + bw * 1.35].forEach(sx => {
            const smH = th * 0.42, smW = bw * 0.40, smBy = H - smH;
            ctx.fillStyle = 'rgba(30,18,50,0.85)';
            ctx.fillRect(sx - smW / 2, smBy, smW, smH);
            ctx.fillStyle = 'rgba(45,28,68,0.7)';
            ctx.beginPath();
            ctx.moveTo(sx, smBy - smH * 0.28);
            ctx.lineTo(sx - smW / 2, smBy);
            ctx.lineTo(sx + smW / 2, smBy);
            ctx.closePath();
            ctx.fill();
        });

        // 主塔
        const bodyGrad = ctx.createLinearGradient(cx - bw / 2, by, cx + bw / 2, H);
        bodyGrad.addColorStop(0,   'rgba(55,35,80,0.95)');
        bodyGrad.addColorStop(0.4, 'rgba(75,50,105,0.9)');
        bodyGrad.addColorStop(1,   'rgba(25,15,45,1)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(cx - bw / 2, H);
        ctx.lineTo(cx - bw / 2, by + th * 0.15);
        ctx.lineTo(cx - bw * 0.42, by + th * 0.12);
        ctx.lineTo(cx - bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by + th * 0.12);
        ctx.lineTo(cx + bw / 2, by + th * 0.15);
        ctx.lineTo(cx + bw / 2, H);
        ctx.closePath();
        ctx.fill();

        // 尖顶
        const spireH = th * 0.22;
        const spireGrad = ctx.createLinearGradient(cx, by - spireH, cx, by);
        spireGrad.addColorStop(0, 'rgba(196,163,90,0.75)');
        spireGrad.addColorStop(1, 'rgba(55,35,80,0.9)');
        ctx.fillStyle = spireGrad;
        ctx.beginPath();
        ctx.moveTo(cx, by - spireH);
        ctx.lineTo(cx - bw * 0.42, by);
        ctx.lineTo(cx + bw * 0.42, by);
        ctx.closePath();
        ctx.fill();

        // 钟面
        const clockY = by + th * 0.08;
        const clockR = bw * 0.30;
        this._drawClock(ctx, cx, clockY, clockR, 1.0);

        // 台阶
        [[1.10, 0.06],[1.22, 0.04],[1.36, 0.03]].forEach(([wM, hF]) => {
            ctx.fillStyle = 'rgba(30,18,50,0.85)';
            ctx.fillRect(cx - bw * wM / 2, H - th * hF, bw * wM, th * hF);
        });

        ctx.restore();
    }

    _drawClock(ctx, cx, cy, r, alpha) {
        // 外圈光晕
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
        glow.addColorStop(0,   `rgba(196,163,90,${0.25 * alpha})`);
        glow.addColorStop(1,   'rgba(196,163,90,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, Math.PI * 2); ctx.fill();

        // 钟面
        const face = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        face.addColorStop(0,   `rgba(240,220,160,${0.22 * alpha})`);
        face.addColorStop(1,   `rgba(45,28,68,0.9)`);
        ctx.fillStyle = face;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(196,163,90,${0.6 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 静止指针（固定角度，象征"停"）
        ctx.strokeStyle = `rgba(244,228,188,${0.7 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(-Math.PI * 0.5) * r * 0.6, cy + Math.sin(-Math.PI * 0.5) * r * 0.6);
        ctx.stroke();
        ctx.strokeStyle = `rgba(196,163,90,${0.55 * alpha})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(Math.PI * 0.2) * r * 0.42, cy + Math.sin(Math.PI * 0.2) * r * 0.42);
        ctx.stroke();
    }

    _drawCrack(ctx, cx, cy, r, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(244,228,150,0.9)';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(244,228,100,0.8)';
        ctx.shadowBlur  = 6;
        // 三条向外辐射的裂缝
        const cracks = [
            [[-r * 0.1, r * 0.05], [r * 0.55, -r * 0.35], [r * 0.8, -r * 0.55]],
            [[-r * 0.05, -r * 0.1], [-r * 0.4, r * 0.45], [-r * 0.65, r * 0.7]],
            [[r * 0.08, r * 0.12], [r * 0.1, r * 0.55], [r * 0.15, r * 0.8]],
        ];
        cracks.forEach(pts => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            pts.forEach(([dx, dy]) => ctx.lineTo(cx + dx, cy + dy));
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawHand(ctx, cx, cy, r, alpha, t) {
        if (alpha <= 0) return;
        // 从钟面向左下方伸出的手轮廓（简化线稿）
        const s = r * 1.4;
        const hx = cx - r * 0.5;
        const hy = cy + r * 0.8;
        const wave = Math.sin(t * 4) * 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(200,180,140,0.85)';
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        // 手腕
        ctx.beginPath();
        ctx.moveTo(hx, hy + wave);
        ctx.quadraticCurveTo(hx - s * 0.2, hy + s * 0.3 + wave, hx - s * 0.1, hy + s * 0.55 + wave);
        ctx.stroke();
        // 手指（3条）
        [[-0.15, 0], [0, -0.05], [0.15, 0.02]].forEach(([ox, oy]) => {
            ctx.beginPath();
            ctx.moveTo(hx + ox * s, hy + wave);
            ctx.quadraticCurveTo(
                hx + ox * s - 5, hy - s * 0.25 + oy * s + wave,
                hx + ox * s,     hy - s * 0.45 + oy * s + wave
            );
            ctx.stroke();
        });
        // 光绕手腕的细线
        ctx.strokeStyle = `rgba(244,228,100,${alpha * 0.55})`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(hx + i * 4 - 4, hy + wave - i * 8, r * 0.22 + i * 3, 0.5 + i * 0.4, 2.8 + i * 0.3);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawFigure(ctx, x, y, size) {
        // 角色剪影（林渡，下坠姿势，水彩哥特风）
        ctx.save();
        ctx.translate(x, y);

        // 披风（张开，下坠飘扬）
        const capeGrad = ctx.createLinearGradient(-size * 0.3, -size * 0.5, size * 0.3, size * 0.4);
        capeGrad.addColorStop(0, 'rgba(30,10,48,0.75)');
        capeGrad.addColorStop(1, 'rgba(16,8,26,0.6)');
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.55);
        ctx.lineTo(size * 0.12, -size * 0.55);
        ctx.quadraticCurveTo(size * 0.45, -size * 0.2, size * 0.40, size * 0.35);
        ctx.quadraticCurveTo(size * 0.05, size * 0.50, -size * 0.40, size * 0.35);
        ctx.quadraticCurveTo(-size * 0.45, -size * 0.2, -size * 0.12, -size * 0.55);
        ctx.closePath();
        ctx.fill();
        // 披风内衬
        ctx.strokeStyle = 'rgba(90,10,26,0.3)';
        ctx.lineWidth = size * 0.02;
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.55);
        ctx.quadraticCurveTo(-size * 0.45, -size * 0.2, -size * 0.40, size * 0.35);
        ctx.stroke();

        // 长衫主体
        const coatGrad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.15);
        coatGrad.addColorStop(0, 'rgba(45,27,78,0.85)');
        coatGrad.addColorStop(1, 'rgba(22,12,40,0.75)');
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.10, -size * 0.55);
        ctx.lineTo(size * 0.10, -size * 0.55);
        ctx.lineTo(size * 0.14, size * 0.12);
        ctx.quadraticCurveTo(0, size * 0.18, -size * 0.14, size * 0.12);
        ctx.closePath();
        ctx.fill();

        // 尖领
        ctx.fillStyle = 'rgba(36,21,64,0.8)';
        ctx.beginPath();
        ctx.moveTo(-size * 0.08, -size * 0.55);
        ctx.lineTo(-size * 0.03, -size * 0.68);
        ctx.lineTo(0, -size * 0.58);
        ctx.lineTo(size * 0.03, -size * 0.68);
        ctx.lineTo(size * 0.08, -size * 0.55);
        ctx.closePath();
        ctx.fill();

        // 双臂（张开，下坠感）
        ctx.fillStyle = 'rgba(45,27,78,0.7)';
        ctx.save();
        ctx.translate(-size * 0.12, -size * 0.35);
        ctx.rotate(0.5);
        ctx.fillRect(-size * 0.035, 0, size * 0.07, size * 0.30);
        ctx.restore();
        ctx.save();
        ctx.translate(size * 0.12, -size * 0.35);
        ctx.rotate(-0.4);
        ctx.fillRect(-size * 0.035, 0, size * 0.07, size * 0.30);
        ctx.restore();

        // 头部
        const headR = size * 0.14;
        const headY = -size * 0.85;
        // 苍白面容
        ctx.fillStyle = 'rgba(230,220,210,0.85)';
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        // 黑发
        ctx.fillStyle = 'rgba(13,13,26,0.9)';
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.25, headR, Math.PI, Math.PI * 2);
        ctx.fill();
        // 刘海
        ctx.beginPath();
        ctx.moveTo(-headR, headY - headR * 0.5);
        ctx.quadraticCurveTo(-headR * 0.3, headY + headR * 0.15, headR * 0.1, headY + headR * 0.05);
        ctx.quadraticCurveTo(-headR * 0.1, headY - headR * 0.3, -headR, headY - headR * 0.5);
        ctx.fill();

        // 双腿（下方，飘浮感）
        ctx.fillStyle = 'rgba(30,18,50,0.6)';
        ctx.save();
        ctx.translate(-size * 0.05, size * 0.12);
        ctx.rotate(-0.12);
        ctx.fillRect(-size * 0.03, 0, size * 0.06, size * 0.35);
        ctx.restore();
        ctx.save();
        ctx.translate(size * 0.05, size * 0.12);
        ctx.rotate(0.10);
        ctx.fillRect(-size * 0.03, 0, size * 0.06, size * 0.35);
        ctx.restore();

        ctx.restore();
    }

    _drawCaption(ctx, W, H, text, alpha, y, fontSize = 20, color = 'rgba(244,228,188,0.9)') {
        if (alpha <= 0) return;

        // 打字机状态管理：文本变化时重置
        if (text !== this._typewriterText) {
            this._typewriterText = text;
            this._typewriterRevealed = 0;
            this._typewriterTimer = 0;
        }

        // 推进打字计时（用场景dt近似，这里用固定帧率）
        this._typewriterTimer += 0.016;
        const plainText = text.replace(/\n/g, '');
        const totalChars = plainText.length;
        const targetRevealed = Math.min(
            Math.floor(this._typewriterTimer / this._typewriterSpeed),
            totalChars
        );

        // 新字符出现时播放打字音效
        if (targetRevealed > this._typewriterRevealed) {
            // 每2-3个字符播放一次声音，避免太密集
            const diff = targetRevealed - this._typewriterRevealed;
            if (diff >= 1 && targetRevealed % 3 === 0) {
                if (typeof GameAudio !== 'undefined' && GameAudio.initialized) {
                    GameAudio.playTypeClick();
                }
            }
            this._typewriterRevealed = targetRevealed;
        }

        const bigSize = Math.round(fontSize * 3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `${bigSize}px 'Ma Shan Zheng', serif`;
        ctx.fillStyle = color;
        ctx.textAlign  = 'right';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur  = 14;

        // 按行截取已显示的字符
        const lines = text.split('\n');
        const lineH  = bigSize * 1.6;
        const textX  = W * 0.95;
        const startY = H * 0.5 - (lines.length - 1) * lineH / 2;
        let charsLeft = this._typewriterRevealed;
        lines.forEach((line, i) => {
            if (charsLeft <= 0) return;
            const show = line.substring(0, charsLeft);
            charsLeft -= line.length;
            ctx.fillText(show, textX, startY + i * lineH);
        });

        // 光标闪烁（未打完时显示）
        if (this._typewriterRevealed < totalChars) {
            const cursorAlpha = (Math.sin(this._typewriterTimer * 6) + 1) * 0.5;
            ctx.globalAlpha = alpha * cursorAlpha;
            // 找到光标位置
            let cursorChars = this._typewriterRevealed;
            let cursorLine = 0;
            for (let i = 0; i < lines.length; i++) {
                if (cursorChars <= lines[i].length) { cursorLine = i; break; }
                cursorChars -= lines[i].length;
                cursorLine = i + 1;
            }
            if (cursorLine < lines.length) {
                const partial = lines[cursorLine].substring(0, cursorChars);
                const cursorX = textX - ctx.measureText(lines[cursorLine]).width + ctx.measureText(partial).width;
                ctx.fillRect(cursorX + 2, startY + cursorLine * lineH - bigSize * 0.4, bigSize * 0.08, bigSize * 0.8);
            }
        }
        ctx.restore();
    }

    // 简易确定性伪随机（mulberry32）
    _prng(seed) {
        return () => {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ease-out cubic
    _ease(t) {
        return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    }
}
