// 引言叙事系统 - 失色纪

const NARRATION_OPENING = [
    { text: '钟停了。', pause: 1200 },
    { text: '不是那种发条松尽的停，是颜色从指针上剥落后的停。赭石、靛蓝、金箔——它们曾经怎样在钟面上流淌，如今就怎样在尘埃里枯死。', pause: 900 },
    { text: '林渡伸手去擦钟盘上的灰，指腹触到一处剥落的彩绘。那是画工最后收笔的地方，颜料堆得厚，裂得也狠，像一道结痂多年的伤。', pause: 900 },
    { text: '他用力按了按。', pause: 1400 },
    { text: '裂缝里渗出光来。不是暖光，是洗过太多遍的布那种苍白，是纸钱燃尽后飘起来的那种灰。光缠住他的手腕，他看见自己袖口的水彩渍正在褪色，赭石变成褐，褐变成灰，灰变成——', pause: 1000 },
    { text: '钟响了。', pause: 1600 },
    { text: '不是报时的响。是吞吃什么的响。', pause: 1000 },
    { text: '他跌进去的时候，最后一眼看见工作室的窗。窗外有棵石榴树，五月本该是猩红的，可他只看见满树铅粉，像谁把一整个春天的血都放干了。', pause: 0 },
];

const NARRATION_DEATH = [
    { text: '画笔从指间滑出去。', pause: 1400 },
    { text: '很轻的一声，比一片叶子落地还轻。他想去抓，手臂却先一步灰化了——从指尖开始，皮肤变成素描纸的质地，再变成被雨水泡过的纸浆，最后连纸浆也撑不住，碎成极细的灰，被风里什么吸走了。', pause: 900 },
    { text: '他低头看自己的胸口。赭石色的长衫还在，只是那颜色正在逃。它们不是褪，是逃，像被火燎着的蛾子，争先恐后地往空气里钻，留下越来越淡的渍印，像谁用橡皮擦过又擦过。', pause: 900 },
    { text: '最后消失的是领边那抹靛蓝。', pause: 1200 },
    { text: '他记得那是去年冬天调的色。画室没有暖气，颜料冻出冰碴，他呵着白气一笔一笔染上去，染完发现袖口沾了雪，雪化在水里，倒让那蓝更深了些。', pause: 900 },
    { text: '现在它没了。', pause: 1400 },
    { text: '连"没"这个字也没了。语言是先于颜色离开的，他发现自己想不起"蓝"是什么，想不起长衫原本是什么颜色，想不起自己为什么伸出手，想不起伸手的方向曾经有什么。', pause: 900 },
    { text: '钟还在远处走。滴答。滴答。', pause: 1400 },
    { text: '他听了一会儿，发现自己也听不见了。', pause: 1000 },
    { text: '只剩一具轮廓，保持着跌倒的姿势，线条越来越淡，像被水洇开的铅笔稿。有风穿过他胸腔的空洞，发出吹过空瓶子的那种呜咽。', pause: 900 },
    { text: '然后连那呜咽也停了。', pause: 1600 },
    { text: '地上只剩几粒金箔碎屑，是画笔杆上剥落的。它们亮了一下，像眨了最后一次眼，也暗了。', pause: 0 },
];

// ══════════════════════════════════════════════════
//  开场序言拼贴系统 —— 哥特剪报逐字落入 + 分阶段消散
// ══════════════════════════════════════════════════
class CollageOpening {
    constructor(overlay, promptEl, onDone) {
        this.overlay   = overlay;
        this.promptEl  = promptEl;
        this.onDone    = onDone;
        this._chars    = [];
        this._active   = false;
        this._skipFlag = false;

        // 滚动状态
        this._scrollActive       = false;
        this._scrollY            = 0;
        this._scrollEl           = null;
        this._wheelHandler       = null;
        // 继续信号
        this._waitingForContinue = false;
        this._fadeOutResolver    = null;
        this._onFadeComplete     = null;

        // 字体池：中文可读字体为主，哥特体仅作首字装饰
        this._fonts = [
            '"ZCOOL XiaoWei", "STKaiti", serif',
            '"Ma Shan Zheng", cursive',
            '"Cinzel Decorative", "Palatino Linotype", serif',
        ];
        // 颜色池：羊皮黄（主）+ 深墨棕（偶尔）
        this._colors = [
            '#D4C9A8', '#D4C9A8', '#D4C9A8',
            '#D4C9A8', '#C8B89A',
            '#7A5C3A',
        ];
        // 跳过仅在"逐字展示"阶段有效，等待继续阶段不响应
        this._onKeyDown      = () => { if (this._active && !this._waitingForContinue) this._triggerSkip(); };
        this._onClickOverlay = () => { if (this._active && !this._waitingForContinue) this._triggerSkip(); };
    }

    // 构建全文字符列表，标注每字是否为段落/句子首字
    _buildFullText() {
        const chars = [];
        const sentenceStarters = new Set(['。', '？', '！', '……']);
        NARRATION_OPENING.forEach((line, paraIdx) => {
            [...line.text].forEach((ch, ci) => {
                // 段落第一字 or 句子开头（前一字是句末标点）
                const isParaFirst = ci === 0;
                const isPrevSentenceEnd = ci > 0 && sentenceStarters.has(line.text[ci - 1]);
                chars.push({ ch, isKey: isParaFirst || isPrevSentenceEnd, paraIdx });
            });
        });
        return chars;
    }

    // 伪随机数（种子）
    _rng(seed) {
        let s = seed * 9301 + 49297;
        return ((s % 233280) / 233280);
    }

    // 为每个字符生成样式参数
    // isKey: 段落首字或句首 → 大字哥特体
    _charStyle(charIdx, isKey) {
        const r = (n) => this._rng(charIdx * 7 + n * 31);

        // 手机横屏：缩小字号，保证内容高度与CSS一致（不用zoom）
        const isMobile = typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(hover: none) and (orientation: landscape)').matches;
        const scale = isMobile ? 0.62 : 1.0;

        // 字体大小：重点字3.6rem，其余2.8rem，仅±6%微浮动
        const baseSize = (isKey ? 3.6 : 2.8) * scale;
        const fontSize = baseSize + (r(1) - 0.5) * baseSize * 0.06;

        // 旋转：±3度，水平微偏移±4px
        const rot  = (r(2) - 0.5) * 6;
        const offX = (r(8) - 0.5) * 8;

        // 颜色：重点字亮黄，普通字主要羊皮黄偶尔深棕
        const color = isKey
            ? '#EDE0C4'
            : this._colors[Math.floor(r(3) * this._colors.length)];

        // 字体：重点字哥特装饰体，普通字中文字体
        const font = isKey
            ? this._fonts[2]
            : this._fonts[Math.floor(r(4) * 2)];

        const bold = isKey ? 'bold' : (r(5) > 0.82 ? 'bold' : 'normal');
        const shadowAlpha = isKey ? 0.55 : 0.22 + r(7) * 0.2;
        return { fontSize, rot, offX, color, font, bold, shadowAlpha };
    }

    // 构建分段DOM（inline-block流式布局 + 滚动容器）
    _buildParagraphDOM(stage, charInfos) {
        const H = this.overlay.clientHeight;

        // 滚动容器，初始在屏幕底部
        const scrollEl = document.createElement('div');
        scrollEl.id = 'collage-scroll';
        scrollEl.style.top = H + 'px';
        stage.appendChild(scrollEl);
        this._scrollEl = scrollEl;

        const elements = [];
        let currentParaIdx = -1;
        let currentPara = null;

        charInfos.forEach((info, i) => {
            const { ch, isKey, paraIdx } = info;

            if (paraIdx !== currentParaIdx) {
                currentParaIdx = paraIdx;
                currentPara = document.createElement('p');
                currentPara.className = 'collage-para';
                scrollEl.appendChild(currentPara);
            }

            const st = this._charStyle(i, isKey);
            const span = document.createElement('span');
            span.className = 'collage-char';
            span.textContent = ch;
            span.style.cssText = [
                `font-size:${st.fontSize}rem`,
                `font-family:${st.font}`,
                `font-weight:${st.bold}`,
                `color:${st.color}`,
                `--char-transform:rotate(${st.rot}deg) translateX(${st.offX}px)`,
                `text-shadow:1px 2px 5px rgba(0,0,0,${st.shadowAlpha})`,
            ].join(';');

            currentPara.appendChild(span);
            elements.push(span);
        });

        return elements;
    }

    // ── 滚动控制 ─────────────────────────────────────────────
    _startScroll() {
        this._scrollActive = true;
        const H = this.overlay.clientHeight;
        const isMobileL = typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(hover: none) and (orientation: landscape)').matches;
        // 手机起始位置稍高，保证第4段在打字时已滚入屏幕
        this._scrollY = H * (isMobileL ? 0.45 : 0.52);
        this._scrollEl.style.top = this._scrollY + 'px';

        const SPEED = 57; // px/s（统一速度，由提前停止而非加速保证可见性）
        // 手机上：当最后一字到达60%高度时提前停止，防止内容过度滚出屏幕
        const earlyStopTarget = isMobileL ? H * 0.60 : -Infinity;
        let lastTs = performance.now();
        const tick = (now) => {
            if (!this._scrollActive) return;
            const dt = (now - lastTs) / 1000;
            lastTs = now;
            // 检查最后一字是否已到达停止目标
            if (isMobileL && this._chars && this._chars.length > 0) {
                const overlayTop = this.overlay.getBoundingClientRect().top;
                const lastBottom = this._chars[this._chars.length - 1]
                    .getBoundingClientRect().bottom - overlayTop;
                if (lastBottom <= earlyStopTarget) {
                    this._scrollActive = false;
                    return;
                }
            }
            this._scrollY -= SPEED * dt;
            this._scrollEl.style.top = this._scrollY + 'px';
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    _stopAutoScroll() { this._scrollActive = false; }

    // 等待最后一字底边滚入屏幕内，手机上停在52%高度留出下方空白
    _scrollUntilVisible() {
        return new Promise(resolve => {
            if (!this._chars || !this._chars.length) { resolve(); return; }
            const H        = this.overlay.clientHeight;
            const isMobileL = typeof window !== 'undefined' && window.matchMedia
                && window.matchMedia('(hover: none) and (orientation: landscape)').matches;
            const targetY  = H * (isMobileL ? 0.52 : 0.72);
            const deadline = performance.now() + 4000;

            const check = (now) => {
                if (this._skipFlag || now >= deadline) { resolve(); return; }
                const lastChar    = this._chars[this._chars.length - 1];
                const overlayTop  = this.overlay.getBoundingClientRect().top;
                const charBottom  = lastChar.getBoundingClientRect().bottom - overlayTop;
                if (charBottom <= targetY) {
                    resolve();
                } else {
                    requestAnimationFrame(check);
                }
            };
            requestAnimationFrame(check);
        });
    }

    _enableManualScroll() {
        const onWheel = (e) => {
            if (!this._scrollEl) return;
            this._scrollY -= e.deltaY * 0.65;
            this._scrollEl.style.top = this._scrollY + 'px';
        };
        this.overlay.addEventListener('wheel', onWheel, { passive: true });
        this._wheelHandler = onWheel;
    }

    _disableManualScroll() {
        if (this._wheelHandler) {
            this.overlay.removeEventListener('wheel', this._wheelHandler);
            this._wheelHandler = null;
        }
    }

    // ── 主流程 ────────────────────────────────────────────────
    async play() {
        this._active = true;
        this._skipFlag = false;
        this._waitingForContinue = false;

        let stage = document.getElementById('collage-stage');
        if (!stage) {
            stage = document.createElement('div');
            stage.id = 'collage-stage';
            this.overlay.appendChild(stage);
        }
        stage.innerHTML = '';

        const charInfos = this._buildFullText();
        this._chars = this._buildParagraphDOM(stage, charInfos);
        requestAnimationFrame(() => this._startScroll());

        const punct = new Set(['。', '，', '——', '、', '？', '！', '…', ' ']);
        const BASE_DELAY  = 52;
        const PUNCT_EXTRA = 164;

        // 时间线：t 从 420ms 开始，留出滚动容器进入屏幕的时间
        let t = 420;
        const timeline = [];
        let charIdx = 0;
        for (let p = 0; p < NARRATION_OPENING.length; p++) {
            const line = NARRATION_OPENING[p].text;
            for (let c = 0; c < line.length; c++) {
                const ch = line[c];
                timeline.push({ idx: charIdx, t, ch });
                const isPunct    = punct.has(ch);
                const isParaFirst = c === 0;
                t += isPunct ? BASE_DELAY + PUNCT_EXTRA : (isParaFirst ? BASE_DELAY * 3 : BASE_DELAY);
                charIdx++;
            }
            t += NARRATION_OPENING[p].pause > 0 ? Math.min(NARRATION_OPENING[p].pause * 0.6, 480) : 120;
        }

        // 找到「钟响了」(NARRATION_OPENING[5]) 第一字的时间戳，提前3s渐入钟声
        let bellCharOffset = 0;
        for (let i = 0; i < 5; i++) bellCharOffset += [...NARRATION_OPENING[i].text].length;
        const bellEntry = timeline[bellCharOffset];
        if (bellEntry && bellEntry.t > 3000) {
            this._bellScheduleTimer = setTimeout(() => {
                this._bellScheduleTimer = null;
                if (!this._skipFlag && typeof GameAudio !== 'undefined') GameAudio.startOpeningBell();
            }, bellEntry.t - 3000);
        }

        await this._playTimeline(timeline);

        // 打字完成后通知外部（用于显示跳过按钮）
        if (!this._skipFlag && this._onTypingComplete) this._onTypingComplete();

        // 跳过逐字展示：全部立即显示
        if (this._skipFlag) {
            this._skipFlag = false;
            this._chars.forEach(el => {
                el.style.animation = 'none';
                el.style.opacity   = '1';
                el.style.transform = el.style.getPropertyValue('--char-transform') || 'none';
            });
        }

        // 继续滚动直到最后一字进入可视区（最多等3秒），再停止
        if (!this._skipFlag) await this._scrollUntilVisible();

        // 停止自动滚动，允许用户滚轮翻阅
        this._stopAutoScroll();
        this._enableManualScroll();

        // 等待1.8秒后自动开始褪色（用户可在此期间滚轮翻阅）
        if (!this._skipFlag) await this._wait(1800);
        this._disableManualScroll();

        // Phase 1: 褪色（所有字同步灰化）
        if (!this._skipFlag) await this._desaturatePhase();
        // 褪色完成后等待1.8秒
        if (!this._skipFlag) await this._wait(1800);
        // Phase 2: 沙粒吹散
        if (!this._skipFlag) await this._sandBlowPhase();

        // 沙粒吹散结束后等0.6s，再显示继续提示
        await this._wait(360);
        this._waitingForContinue = true;
        this.onDone();

        // 等待 NarrationSystem 调用 _startFadeOut()（用户按键触发）
        await new Promise(r => { this._fadeOutResolver = r; });
        this._waitingForContinue = false;

        this._active = false;
        if (this._onFadeComplete) {
            const cb = this._onFadeComplete;
            this._onFadeComplete = null;
            cb();
        }
    }

    _playTimeline(timeline) {
        return new Promise(resolve => {
            if (this._skipFlag) { resolve(); return; }
            let i = 0;
            const run = () => {
                if (this._skipFlag) { resolve(); return; }
                if (i >= timeline.length) { resolve(); return; }
                const entry = timeline[i++];
                const el = this._chars[entry.idx];
                el.classList.add('dropping');
                if (entry.idx % 5 === 0 && typeof GameAudio !== 'undefined') {
                    GameAudio.playNarrationTyping();
                }
                const next  = timeline[i];
                const delay = next ? (next.t - entry.t) : 0;
                setTimeout(run, delay);
            };
            const first = timeline[0];
            setTimeout(run, first ? first.t : 0);
        });
    }

    // ── Phase 1：褪色 ─────────────────────────────────────────
    async _desaturatePhase() {
        // 规范化状态：停止 dropping 动画，锁定当前可见位置
        this._chars.forEach(el => {
            // 用 getComputedStyle 取动画结束后的实际 transform，避免清空后跳位
            const computed = window.getComputedStyle(el).transform;
            el.style.animation  = 'none';
            el.style.opacity    = '1';
            el.style.transform  = computed && computed !== 'none'
                ? computed
                : (el.style.getPropertyValue('--char-transform') || 'none');
        });
        // 双 RAF 确保浏览器已绘制当前帧
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (this._skipFlag) return;

        this._chars.forEach(el => {
            el.style.transition = 'filter 1.3s ease';
            el.style.filter     = 'grayscale(1) brightness(0.5)';
        });
        // 等待过渡完成，每 80ms 检查一次 skipFlag
        for (let i = 0; i < 30 && !this._skipFlag; i++) await this._wait(80);
    }

    // ── Phase 2：沙粒吹散 ─────────────────────────────────────
    _sandBlowPhase() {
        return new Promise(resolve => {
            if (this._skipFlag) { resolve(); return; }
            let maxDelay = 0;
            this._chars.forEach((el, idx) => {
                const r = (n) => this._rng(idx * 13 + n * 47 + 999);
                // 风向：主要向右上方吹散
                const blowX   = (40 + r(1) * 130) * (r(5) > 0.2 ? 1 : -0.6);
                const blowY   = -(20 + r(2) * 90);
                const blowRot = (r(3) - 0.15) * 380;
                el.style.setProperty('--blow-x',   blowX   + 'px');
                el.style.setProperty('--blow-y',   blowY   + 'px');
                el.style.setProperty('--blow-rot', blowRot + 'deg');

                const delay = r(4) * 660; // 0~660ms 随机错开
                if (delay > maxDelay) maxDelay = delay;

                setTimeout(() => {
                    if (this._skipFlag) return;
                    // 关键：清除所有 inline 样式，让 CSS 动画完全接管
                    el.style.animation  = '';   // 解除 'none' 阻断
                    el.style.transition = 'none';
                    el.style.transform  = '';   // 动画关键帧接管 transform
                    el.style.opacity    = '';   // 动画关键帧接管 opacity
                    el.style.filter     = '';   // 动画关键帧接管 filter
                    el.classList.add('sandblowing');
                }, delay);
            });
            setTimeout(resolve, maxDelay + 570); // 比动画时长(540ms)多30ms余量
        });
    }

    // ── 外部信号：NarrationSystem 通知开始淡出 ────────────────
    _startFadeOut(onComplete) {
        this._onFadeComplete = onComplete || null;
        if (this._waitingForContinue && this._fadeOutResolver) {
            // 正在等待用户继续 → 触发 play() 协程继续执行 Phase1+2
            this._fadeOutResolver();
            this._fadeOutResolver = null;
        } else if (this._active) {
            // 正在执行 Phase1 或 Phase2 → 强制跳过，play() 完成后调用 onFadeComplete
            this._skipFlag = true;
        } else {
            // 已经全部完成
            if (onComplete) { onComplete(); this._onFadeComplete = null; }
        }
    }

    _triggerSkip() {
        this._skipFlag = true;
        this._stopAutoScroll();
        this._disableManualScroll();
        if (this._bellScheduleTimer) {
            clearTimeout(this._bellScheduleTimer);
            this._bellScheduleTimer = null;
        }
        this._chars.forEach(el => {
            el.style.animation  = 'none';
            el.style.transition = 'none';
            el.style.opacity    = '0';
        });
        if (this._fadeOutResolver) {
            this._fadeOutResolver();
            this._fadeOutResolver = null;
        }
    }

    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ══════════════════════════════════════════════════
//  主叙事系统
// ══════════════════════════════════════════════════
class NarrationSystem {
    constructor() {
        this.overlay  = document.getElementById('narration-overlay');
        this.textEl   = document.getElementById('narration-text');
        this.skipEl   = document.getElementById('narration-skip');
        this.promptEl = document.getElementById('narration-prompt');

        // 状态机：idle | typing | collage | prompt | finishing
        this._phase   = 'idle';
        this._lines   = null;
        this._resolve = null;

        this._onSkipKey   = () => this._handleSkipKey();
        this._onSkipClick = () => this._handleSkipClick();
        this._onContinue  = () => this._finish();
    }

    // ── 公共入口 ──────────────────────────────────────────────
    play(type) {
        this._lines = type === 'death' ? NARRATION_DEATH : NARRATION_OPENING;
        this._narType = type;
        this.overlay.className = `narration-overlay narration-${type}`;
        this.overlay.classList.remove('hidden');
        this.overlay.style.opacity = '0';
        this.textEl.innerHTML = '';
        this.promptEl.classList.add('hidden');

        return new Promise(resolve => {
            this._resolve = resolve;

            // 跳过按钮：初始隐藏，打字完成后再显示
            this.skipEl.style.display = 'none';
            if (type !== 'opening') {
                this.skipEl.addEventListener('click', this._onSkipClick);
                document.addEventListener('keydown', this._onSkipKey);
            }

            requestAnimationFrame(() => {
                this.overlay.style.transition = 'opacity 1.2s ease';
                this.overlay.style.opacity = '1';
            });

            // 启动背景音乐
            if (typeof GameAudio !== 'undefined') GameAudio.startNarrationBGM(type);
            if (type === 'death' && typeof GameAudio !== 'undefined') GameAudio.startDeathSob();

            if (type === 'opening') {
                // 拼贴剪报模式
                this._phase = 'collage';
                setTimeout(() => this._runCollage(), 360);
            } else {
                // 打字机模式（死亡叙事）
                this._phase = 'typing';
                setTimeout(() => this._runLines(0), 360);
            }
        });
    }

    // ── 拼贴剪报模式 ─────────────────────────────────────────
    async _runCollage() {
        this._collage = new CollageOpening(this.overlay, this.promptEl, () => {
            this._showPrompt();
        });
        this._collage._onTypingComplete = () => this._afterOpeningTyping();
        await this._collage.play();
        this._collage = null;
    }

    // 开场序言打字完成后：显示跳过按钮
    _afterOpeningTyping() {
        this.skipEl.style.display = '';
        this.skipEl.textContent = '跳过';
        const onSkip = () => {
            this.skipEl.removeEventListener('click', onSkip);
            this.skipEl.style.display = 'none';
            if (this._collage && this._collage._active) this._collage._triggerSkip();
        };
        this.skipEl.addEventListener('click', onSkip);
        // 触屏手机支持
        const onSkipTouch = (e) => {
            e.preventDefault();
            this.skipEl.removeEventListener('touchstart', onSkipTouch);
            if (this._collage && this._collage._active) {
                this.skipEl.style.display = 'none';
                this._collage._triggerSkip();
            }
        };
        this.skipEl.addEventListener('touchstart', onSkipTouch, { passive: false });
    }

    // ── 键盘路由 ──────────────────────────────────────────────
    _handleSkipKey() {
        if (this._narType === 'opening') return;
        // 打字阶段禁止跳过，只允许在prompt阶段操作
        if (this._phase === 'prompt') this._finish();
    }
    _handleSkipClick() {
        if (this._narType === 'opening') return;
        if (this._phase === 'prompt') this._finish();
    }

    // ── 逐段打字（死亡叙事） ─────────────────────────────────
    async _runLines(idx) {
        if (this._phase !== 'typing') return;
        if (idx >= this._lines.length) {
            this.skipEl.style.display = '';
            this.skipEl.textContent = '点击继续';
            this._showPrompt();
            return;
        }

        const { text, pause } = this._lines[idx];

        if (this._narType === 'death' && typeof GameAudio !== 'undefined') {
            GameAudio.escalateDeathSob(idx);
        }

        await this._typewriteParagraph(text);
        if (this._phase !== 'typing') return;
        if (idx < this._lines.length - 1) await this._wait(pause);
        this._runLines(idx + 1);
    }

    _typewriteParagraph(text) {
        return new Promise(resolve => {
            const p = document.createElement('p');
            p.className = 'narration-para';
            p.style.opacity = '0';
            this.textEl.appendChild(p);

            requestAnimationFrame(() => {
                p.style.transition = 'opacity 0.6s ease';
                p.style.opacity = '1';
            });

            let i = 0;
            const SPEED = 17;
            const punct = new Set(['。', '，', '——', '、', '？', '！', '…']);

            const tick = () => {
                if (this._phase !== 'typing') { p.textContent = text; resolve(); return; }
                if (i >= text.length) { resolve(); return; }
                const ch = text[i++];
                p.textContent += ch;
                this.textEl.scrollTop = this.textEl.scrollHeight;
                if (i % 4 === 0 && typeof GameAudio !== 'undefined') GameAudio.playNarrationTyping();
                setTimeout(tick, punct.has(ch) ? SPEED * 2.5 : SPEED);
            };
            setTimeout(tick, 30);
        });
    }

    // ── 跳过（死亡叙事） ─────────────────────────────────────
    _skipToEnd() {
        this._phase = 'skipping';
        this.textEl.innerHTML = '';
        this._lines.forEach(({ text }) => {
            const p = document.createElement('p');
            p.className = 'narration-para';
            p.textContent = text;
            this.textEl.appendChild(p);
        });
        this.textEl.scrollTop = this.textEl.scrollHeight;
        this._showPrompt();
    }

    // ── 显示"按任意键继续" ───────────────────────────────────
    _showPrompt() {
        this._phase = 'prompt';
        this.promptEl.classList.remove('hidden');
        this.promptEl.style.opacity = '0';
        requestAnimationFrame(() => {
            this.promptEl.style.transition = 'opacity 1s ease';
            this.promptEl.style.opacity = '1';
        });
        document.addEventListener('keydown', this._onContinue, { once: true });
        this.promptEl.addEventListener('click', this._onContinue, { once: true });
        this.promptEl.addEventListener('touchstart', this._onContinue, { once: true, passive: true });
        // 跳过按钮也作为继续入口（手机友好）
        this.skipEl.style.display = '';
        this.skipEl.textContent = '点击继续';
        this.skipEl.addEventListener('click', this._onContinue, { once: true });
        this.skipEl.addEventListener('touchstart', this._onContinue, { once: true, passive: true });
    }

    // ── 收尾淡出 ─────────────────────────────────────────────
    _finish() {
        if (this._phase === 'finishing') return;
        this._phase = 'finishing';

        if (typeof GameAudio !== 'undefined') GameAudio.stopNarrationBGM();
        if (typeof GameAudio !== 'undefined') GameAudio.stopOpeningBell();
        if (this._narType === 'death' && typeof GameAudio !== 'undefined') GameAudio.stopDeathSob();

        document.removeEventListener('keydown', this._onSkipKey);
        document.removeEventListener('keydown', this._onContinue);
        this.skipEl.removeEventListener('click', this._onSkipClick);
        this.promptEl.classList.add('hidden');

        const doOverlayFade = () => {
            this.overlay.style.transition = 'opacity 1.4s ease';
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                this.overlay.classList.add('hidden');
                this.textEl.innerHTML = '';
                const stage = document.getElementById('collage-stage');
                if (stage) stage.innerHTML = '';
                this._phase = 'idle';
                if (this._resolve) { this._resolve(); this._resolve = null; }
            }, 1450);
        };

        if (this._collage && this._collage._active) {
            // 拼贴序言还在运行：让 collage 跑完 Phase1+2，然后调用 doOverlayFade
            this._collage._startFadeOut(doOverlayFade);
        } else {
            doOverlayFade();
        }
    }

    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}
