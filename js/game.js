// 游戏主控制器 - 失色纪·修钟人

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.startScreen = document.getElementById('start-screen');
        this.startBtn = document.getElementById('start-btn');
        
        this.width = 0;
        this.height = 0;
        
        this.player = null;
        this.world = null;
        this.ui = null;
        
        this.input = {
            keys: {},
            mouse: { x: 0, y: 0, down: false }
        };
        
        this.camera = { x: 0, y: 0 };
        // 手机端缩放视野：小于1表示缩小画面看到更多世界
        this.cameraZoom = 1;
        
        this.paused = false;
        this.gameStarted = false;
        this.gameEnded = false;
        
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = 1 / 60;
        
        this.narration = null; // 引言系统，在 DOMContentLoaded 后初始化
        
        // 外挂系统状态
        this.cheat = {
            unlocked:    false,
            invincible:  false,
            infiniteItems: false,
            timeMultiplier: 1
        };
        
        // 存档系统
        this.saveKey = 'shiseji_save';
        this.autoSaveInterval = 30000; // 30秒自动存档
        this._autoSaveTimer = null;
        
        // 攻击范围指示器
        this.showAttackRange = false;
        this.attackRangeTimer = 0;
        
        // 教程系统
        this.tutorial = null;
        this.isTutorialMode = false;
        
        // 成就系统
        this.achievements = null;
        
        this.init();
    }
    
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.bindInput();
        this.mobileControls = (typeof MobileControls !== 'undefined') ? new MobileControls(this) : null;
        
        this.startBtn.addEventListener('click', () => this.startGame());
        
        // 继续游戏按钮
        this.continueBtn = document.getElementById('continue-btn');
        if (this.continueBtn) {
            this.continueBtn.addEventListener('click', () => this.continueGame());
        }
        
        // 玩法说明面板
        const guideBtn = document.getElementById('guide-btn');
        const guidePanel = document.getElementById('guide-panel');
        const guideCloseBtn = document.getElementById('guide-close-btn');
        if (guideBtn && guidePanel) {
            guideBtn.addEventListener('click', () => guidePanel.classList.remove('hidden'));
        }
        if (guideCloseBtn && guidePanel) {
            guideCloseBtn.addEventListener('click', () => guidePanel.classList.add('hidden'));
        }
        
        // 引言系统
        this.narration = new NarrationSystem();

        // 全屏点击提示层：点击后初始化音频，播放序言，序言结束后显示开始屏
        const enterOverlay = document.getElementById('enter-overlay');
        if (enterOverlay) {
            const onEnter = async () => {
                enterOverlay.classList.add('enter-overlay-out');
                setTimeout(() => enterOverlay.remove(), 800);

                await GameAudio.init();
                // 序言播放（此时音频已就绪）
                await this.narration.play('opening');

                // 序言结束后启动开始屏
                this.startScreen.classList.remove('hidden');
                this._initStartTextBg();
                this._initClockTowerBg();
                GameAudio.startStartScreenMusic();
                
                // 检查是否有存档，显示继续按钮
                if (this.hasSaveData()) {
                    this.continueBtn?.classList.remove('hidden');
                }
            };
            enterOverlay.addEventListener('click', onEnter, { once: true });
        }
        
        // 线稿人物 → 世界观浮层
        this._initLoreFigure();

        // 外挂系统
        this._initCheatSystem();

        // 暴露到全局以供其他模块访问
        window.game = this;
        
        // 页面切换时自动存档
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameStarted && !this.gameEnded) {
                this.saveGame();
            }
        });
        
        // 初始化暂停菜单
        this._initPauseMenu();
        
        // 初始化设置面板
        this._initSettingsPanel();
    }
    
    _initPauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        const resumeBtn = document.getElementById('pause-resume');
        const saveBtn = document.getElementById('pause-save');
        const settingsBtn = document.getElementById('pause-settings');
        const quitBtn = document.getElementById('pause-quit');
        
        if (!pauseMenu) return;
        
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.togglePause());
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveGame();
                this.ui?.showDialog('游戏已存档', 1500);
            });
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                document.getElementById('settings-panel')?.classList.remove('hidden');
            });
        }
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (confirm('确定要退出吗？未保存的进度将丢失。')) {
                    this.saveGame();
                    location.reload();
                }
            });
        }
    }
    
    _initSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        const closeBtn = document.getElementById('settings-close');
        const masterSlider = document.getElementById('vol-master');
        const musicSlider = document.getElementById('vol-music');
        const sfxSlider = document.getElementById('vol-sfx');
        
        if (!panel) return;
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
        }
        
        // 从localStorage读取音量设置
        const savedVol = localStorage.getItem('shiseji_volume');
        if (savedVol) {
            try {
                const vol = JSON.parse(savedVol);
                if (masterSlider) masterSlider.value = vol.master ?? 70;
                if (musicSlider) musicSlider.value = vol.music ?? 50;
                if (sfxSlider) sfxSlider.value = vol.sfx ?? 80;
                if (GameAudio.initialized) {
                    GameAudio.setVolume('master', (vol.master ?? 70) / 100);
                    GameAudio.setVolume('music', (vol.music ?? 50) / 100);
                    GameAudio.setVolume('sfx', (vol.sfx ?? 80) / 100);
                }
            } catch(e) {}
        }
        
        const saveVolume = () => {
            const vol = {
                master: masterSlider?.value ?? 70,
                music: musicSlider?.value ?? 50,
                sfx: sfxSlider?.value ?? 80
            };
            localStorage.setItem('shiseji_volume', JSON.stringify(vol));
        };
        
        const masterVal = document.getElementById('vol-master-val');
        const musicVal = document.getElementById('vol-music-val');
        const sfxVal = document.getElementById('vol-sfx-val');
        
        const updateValueDisplay = () => {
            if (masterVal && masterSlider) masterVal.textContent = masterSlider.value + '%';
            if (musicVal && musicSlider) musicVal.textContent = musicSlider.value + '%';
            if (sfxVal && sfxSlider) sfxVal.textContent = sfxSlider.value + '%';
        };
        updateValueDisplay();
        
        if (masterSlider) {
            masterSlider.addEventListener('input', () => {
                GameAudio.setVolume('master', masterSlider.value / 100);
                saveVolume();
                updateValueDisplay();
            });
        }
        if (musicSlider) {
            musicSlider.addEventListener('input', () => {
                GameAudio.setVolume('music', musicSlider.value / 100);
                saveVolume();
                updateValueDisplay();
            });
        }
        if (sfxSlider) {
            sfxSlider.addEventListener('input', () => {
                GameAudio.setVolume('sfx', sfxSlider.value / 100);
                saveVolume();
                updateValueDisplay();
            });
        }
    }
    
    togglePause() {
        if (!this.gameStarted || this.gameEnded) return;
        
        this.paused = !this.paused;
        const pauseMenu = document.getElementById('pause-menu');
        
        if (this.paused) {
            pauseMenu?.classList.remove('hidden');
            GameAudio.setVolume('master', GameAudio.volumes.master * 0.3);
        } else {
            pauseMenu?.classList.add('hidden');
            document.getElementById('settings-panel')?.classList.add('hidden');
            GameAudio.setVolume('master', GameAudio.volumes.master);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 存档系统
    // ═══════════════════════════════════════════════════════════
    
    saveGame() {
        if (!this.gameStarted || this.gameEnded || !this.player || !this.world) return false;
        
        try {
            const saveData = {
                version: 1,
                timestamp: Date.now(),
                player: {
                    x: this.player.x,
                    y: this.player.y,
                    stats: { ...this.player.stats },
                    pigments: { ...this.player.pigments },
                    clockPieces: this.player.clockPieces,
                    clockOilUsed: this.player.clockOilUsed,
                    inventory: this.player.inventory.serialize(),
                    equippedWeapon: this.player.equippedWeapon?.id || null,
                    placedItems: this.player.placedItems.map(item => ({
                        type: item.type,
                        x: item.x,
                        y: item.y,
                        duration: item.duration
                    }))
                },
                world: {
                    gameTime: this.world.gameTime,
                    day: this.world.day,
                    clockPieces: this.world.clockPieces.map(p => ({ ...p })),
                    resourceNodes: this.world.resourceNodes.map(n => ({
                        type: n.type,
                        x: n.x,
                        y: n.y,
                        available: n.available,
                        respawnTimer: n.respawnTimer
                    }))
                },
                quest: this.quest ? {
                    currentStage: this.quest.currentStage
                } : null
            };
            
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            console.log('[存档] 游戏已保存');
            return true;
        } catch (e) {
            console.warn('[存档] 保存失败:', e);
            return false;
        }
    }
    
    loadGame() {
        try {
            const raw = localStorage.getItem(this.saveKey);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[存档] 读取失败:', e);
            return null;
        }
    }
    
    hasSaveData() {
        return !!localStorage.getItem(this.saveKey);
    }
    
    deleteSaveData() {
        localStorage.removeItem(this.saveKey);
    }
    
    async loadAndResumeGame(saveData) {
        if (!saveData) return false;
        
        try {
            // 创建世界
            this.world = new World(2400, 1800);
            
            // 恢复世界状态
            this.world.gameTime = saveData.world.gameTime;
            this.world.day = saveData.world.day;
            this.world.clockPieces = saveData.world.clockPieces;
            
            // 恢复资源节点状态
            if (saveData.world.resourceNodes) {
                saveData.world.resourceNodes.forEach((saved, i) => {
                    if (this.world.resourceNodes[i]) {
                        this.world.resourceNodes[i].available = saved.available;
                        this.world.resourceNodes[i].respawnTimer = saved.respawnTimer;
                    }
                });
            }
            
            // 创建玩家
            this.player = new Player(saveData.player.x, saveData.player.y);
            
            // 恢复玩家状态
            this.player.stats = { ...saveData.player.stats };
            this.player.pigments = { ...saveData.player.pigments };
            this.player.clockPieces = saveData.player.clockPieces;
            this.player.clockOilUsed = saveData.player.clockOilUsed;
            
            // 恢复背包
            if (saveData.player.inventory) {
                this.player.inventory.deserialize(saveData.player.inventory);
            }
            
            // 恢复装备
            if (saveData.player.equippedWeapon) {
                const weaponKey = Object.keys(CraftedItems).find(k => 
                    CraftedItems[k].id === saveData.player.equippedWeapon
                );
                if (weaponKey) {
                    this.player.equippedWeapon = CraftedItems[weaponKey];
                }
            }
            
            // 恢复放置物品
            if (saveData.player.placedItems) {
                this.player.placedItems = saveData.player.placedItems;
            }
            
            // 创建UI
            this.ui = new UI(this);
            this.ui.show();
            
            // 创建任务系统
            this.quest = new QuestSystem(this);
            if (saveData.quest) {
                this.quest.currentStage = saveData.quest.currentStage;
            }
            
            // 开始游戏
            this.gameStarted = true;
            this.lastTime = performance.now();
            
            const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
            if (isMobile && window.innerHeight < 500) {
                this.cameraZoom = 0.65;
            }
            if (this.mobileControls) this.mobileControls.show();
            
            // 启动自动存档
            this._startAutoSave();
            
            // 开始背景音乐
            const period = this.world.getCurrentPeriod();
            GameAudio.startBackgroundMusic(period);
            
            // 开始游戏循环
            requestAnimationFrame((time) => this.gameLoop(time));
            
            this.ui.showDialog('存档已读取，继续你的旅途...', 2000);
            
            return true;
        } catch (e) {
            console.warn('[存档] 恢复失败:', e);
            return false;
        }
    }
    
    _startAutoSave() {
        if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
        this._autoSaveTimer = setInterval(() => {
            if (this.gameStarted && !this.gameEnded && !this.paused) {
                this.saveGame();
            }
        }, this.autoSaveInterval);
    }
    
    _stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }
    
    async continueGame() {
        const saveData = this.loadGame();
        if (!saveData) {
            this.ui?.showDialog('存档数据不存在', 1500);
            return;
        }
        
        // 初始化音频
        await GameAudio.init();
        
        // 隐藏开始界面
        this.startScreen.classList.add('hidden');
        
        // 停止开始界面音乐与文字背景
        GameAudio.stopStartScreenMusic();
        if (this._stopStartTextBg) this._stopStartTextBg();
        if (this._stopClockTowerBg) this._stopClockTowerBg();
        
        // 加载存档
        const success = await this.loadAndResumeGame(saveData);
        if (!success) {
            this.startScreen.classList.remove('hidden');
            alert('存档加载失败，请开始新游戏');
        }
    }
    
    _initStartTextBg() {
        const canvas = document.getElementById('start-text-bg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const TEXT = '世间的钟停了，指针褪尽颜色，时间凝为灰烬。修钟人林渡以颜料为血，修补残钟。每一笔上色皆是偷取光阴，可世界正被不可见的怪物蚕食——万物褪色，记忆湮灭，众生化为灰屑。钟响非报时，乃吞噬之声。修钟人明知徒劳，仍重复涂抹、碎裂、重生的轮回。石榴树的血红褪为铅粉，语言在消色中失名。这是一场注定失败的修补，绝望如褪色本身，无声蔓延，永无终点。';
        const chars = TEXT.split('');
        const CELL = 30;

        const buildParticles = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            const cols = Math.ceil(canvas.width  / CELL) + 1;
            const rows = Math.ceil(canvas.height / CELL) + 1;
            const list = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const ch = chars[(r * cols + c) % chars.length];
                    const g  = 100 + Math.floor(Math.random() * 70);
                    // 少量字符带一丝黯淡暖色或冷色
                    const tint = Math.random();
                    const color = tint < 0.15
                        ? `rgb(${g + 30},${g},${g - 20})`    // 暗赭
                        : tint < 0.25
                        ? `rgb(${g - 10},${g - 10},${g + 20})` // 冷蓝灰
                        : `rgb(${g},${g},${g})`;
                    list.push({
                        x:    c * CELL + (Math.random() - 0.5) * CELL * 0.55,
                        y:    r * CELL + (Math.random() - 0.5) * CELL * 0.55,
                        char: ch,
                        baseAlpha: 0.08 + Math.random() * 0.20,
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.0006 + Math.random() * 0.0014,
                        size:  12 + Math.floor(Math.random() * 9),
                        rot:   (Math.random() - 0.5) * 0.28,
                        color,
                    });
                }
            }
            return list;
        };

        let particles = buildParticles();
        window.addEventListener('resize', () => { particles = buildParticles(); });

        let running = true;
        const draw = () => {
            if (!running) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.phase += p.speed;
                const alpha = p.baseAlpha * (0.35 + 0.65 * Math.abs(Math.sin(p.phase)));
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.globalAlpha = alpha;
                ctx.fillStyle   = p.color;
                ctx.font        = `${p.size}px 'Ma Shan Zheng', serif`;
                ctx.fillText(p.char, 0, 0);
                ctx.restore();
            });
            requestAnimationFrame(draw);
        };
        // 等待字体加载完毕再开始绘制，避免回退字体渲染错误
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => draw());

        // 进入游戏后停止绘制
        this._stopStartTextBg = () => { running = false; };
    }

    _initClockTowerBg() {
        const canvas = document.getElementById('clock-tower-bg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // ── 颜料粒子 ─────────────────────────────────────────
        const COLORS = ['#C2452D','#C4A35A','#4A7FBF','#708238','#8B4A8B','#D4A060'];
        const particles = [];
        const MAX_P = 55;

        const spawnParticle = (towerX, towerH, towerW) => {
            const side = Math.random() < 0.5 ? -1 : 1;
            particles.push({
                x:    towerX + side * (towerW * 0.5) * Math.random(),
                y:    canvas.height - towerH * (0.3 + Math.random() * 0.65),
                vx:   (Math.random() - 0.5) * 0.6,
                vy:   -(0.4 + Math.random() * 0.7),
                r:    2 + Math.random() * 4,
                life: 1,
                decay: 0.0018 + Math.random() * 0.0025,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                sat:  1,       // 当前饱和度倍率（会随粒子老化减小）
            });
        };

        // ── 绘制钟楼函数 ─────────────────────────────────────
        // 返回 { x, h, w } 供粒子使用
        const drawTower = (desat, dim) => {
            const W  = canvas.width;
            const H  = canvas.height;
            const cx = W * 0.72;          // 钟楼水平位置（偏右）
            const bw = W * 0.10;          // 塔基宽度
            const th = H * 0.72;          // 塔总高
            const by = H - th;            // 塔顶 y

            // 整体饱和度/亮度随褪色相位变化
            ctx.save();
            ctx.filter = `saturate(${desat}) brightness(${dim})`;

            // ── 主塔身 ──
            const bodyGrad = ctx.createLinearGradient(cx - bw * 0.5, by, cx + bw * 0.5, H);
            bodyGrad.addColorStop(0,   'rgba(55,35,80,0.82)');
            bodyGrad.addColorStop(0.4, 'rgba(80,55,110,0.78)');
            bodyGrad.addColorStop(1,   'rgba(30,18,50,0.90)');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(cx - bw * 0.5, H);
            ctx.lineTo(cx - bw * 0.5, by + th * 0.15);
            ctx.lineTo(cx - bw * 0.42, by + th * 0.12);
            ctx.lineTo(cx - bw * 0.42, by);
            ctx.lineTo(cx + bw * 0.42, by);
            ctx.lineTo(cx + bw * 0.42, by + th * 0.12);
            ctx.lineTo(cx + bw * 0.5, by + th * 0.15);
            ctx.lineTo(cx + bw * 0.5, H);
            ctx.closePath();
            ctx.fill();

            // ── 钟楼顶部尖塔 ──
            const spireH = th * 0.22;
            const spireGrad = ctx.createLinearGradient(cx, by - spireH, cx, by);
            spireGrad.addColorStop(0, 'rgba(196,163,90,0.60)');
            spireGrad.addColorStop(1, 'rgba(55,35,80,0.85)');
            ctx.fillStyle = spireGrad;
            ctx.beginPath();
            ctx.moveTo(cx, by - spireH);
            ctx.lineTo(cx - bw * 0.42, by);
            ctx.lineTo(cx + bw * 0.42, by);
            ctx.closePath();
            ctx.fill();

            // 尖顶小球
            ctx.fillStyle = `rgba(196,163,90,${0.55 * dim})`;
            ctx.beginPath();
            ctx.arc(cx, by - spireH - 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // ── 钟楼窗（发光钟面） ──
            const winY  = by + th * 0.08;
            const winR  = bw * 0.30;
            // 外圈金色光晕
            const glowGrad = ctx.createRadialGradient(cx, winY, 0, cx, winY, winR * 2.2);
            glowGrad.addColorStop(0,   `rgba(196,163,90,${0.35 * dim})`);
            glowGrad.addColorStop(0.5, `rgba(196,163,90,${0.12 * dim})`);
            glowGrad.addColorStop(1,   'rgba(196,163,90,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(cx, winY, winR * 2.2, 0, Math.PI * 2);
            ctx.fill();
            // 钟面圆
            const faceGrad = ctx.createRadialGradient(cx, winY, 0, cx, winY, winR);
            faceGrad.addColorStop(0,   `rgba(244,228,188,${0.20 * dim})`);
            faceGrad.addColorStop(0.6, `rgba(196,163,90,${0.14 * dim})`);
            faceGrad.addColorStop(1,   `rgba(55,35,80,${0.70})`);
            ctx.fillStyle = faceGrad;
            ctx.beginPath();
            ctx.arc(cx, winY, winR, 0, Math.PI * 2);
            ctx.fill();
            // 钟面边框
            ctx.strokeStyle = `rgba(196,163,90,${0.50 * dim})`;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
            // 指针（静止，随褪色相位偏转）
            const handAngle = Math.PI * 1.15 + desat * 0.4;
            ctx.strokeStyle = `rgba(244,228,188,${0.55 * dim})`;
            ctx.lineWidth   = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, winY);
            ctx.lineTo(cx + Math.cos(handAngle) * winR * 0.65, winY + Math.sin(handAngle) * winR * 0.65);
            ctx.stroke();
            ctx.strokeStyle = `rgba(196,163,90,${0.45 * dim})`;
            ctx.lineWidth   = 1.0;
            ctx.beginPath();
            ctx.moveTo(cx, winY);
            ctx.lineTo(cx + Math.cos(handAngle - 1.7) * winR * 0.45, winY + Math.sin(handAngle - 1.7) * winR * 0.45);
            ctx.stroke();

            // ── 塔身装饰横线 ──
            ctx.strokeStyle = `rgba(196,163,90,${0.18 * dim})`;
            ctx.lineWidth   = 1;
            [0.30, 0.50, 0.70, 0.88].forEach(frac => {
                const ly = by + th * frac;
                ctx.beginPath();
                ctx.moveTo(cx - bw * 0.5, ly);
                ctx.lineTo(cx + bw * 0.5, ly);
                ctx.stroke();
            });

            // ── 底部台阶 ──
            [[1.10, 0.06],[1.22, 0.04],[1.36, 0.03]].forEach(([wMul, hFrac]) => {
                const sw = bw * wMul;
                const sh = th * hFrac;
                ctx.fillStyle = 'rgba(35,22,55,0.75)';
                ctx.fillRect(cx - sw * 0.5, H - sh, sw, sh);
            });

            // ── 远景：两侧小塔楼 ──
            [cx - bw * 1.35, cx + bw * 1.35].forEach((sx, i) => {
                const smH  = th * 0.42;
                const smW  = bw * 0.40;
                const smBy = H - smH;
                ctx.fillStyle = 'rgba(45,28,68,0.60)';
                ctx.fillRect(sx - smW * 0.5, smBy, smW, smH);
                // 小尖顶
                ctx.fillStyle = `rgba(196,163,90,${0.30 * dim})`;
                ctx.beginPath();
                ctx.moveTo(sx, smBy - smH * 0.28);
                ctx.lineTo(sx - smW * 0.5, smBy);
                ctx.lineTo(sx + smW * 0.5, smBy);
                ctx.closePath();
                ctx.fill();
            });

            // ── 地面阴影晕染 ──
            const groundGrad = ctx.createLinearGradient(0, H - th * 0.08, 0, H);
            groundGrad.addColorStop(0, 'rgba(20,10,35,0)');
            groundGrad.addColorStop(1, 'rgba(8,5,18,0.85)');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(0, H - th * 0.08, W, th * 0.08);

            ctx.restore();
            return { x: cx, h: th, w: bw };
        };

        // ── 褪色相位 ─────────────────────────────────────────
        // phase 在 [0,1] 循环：0=满色，0.5=完全灰，1=满色
        let phase = 0;
        const CYCLE = 420;   // 帧数，约7秒一轮

        let frame = 0;
        let running = true;

        const tick = () => {
            if (!running) return;
            frame++;

            // 相位推进
            phase = (frame % CYCLE) / CYCLE;
            // 饱和度：1 → 0 → 1（峰值在phase=0.5完全灰）
            const desat = 1 - Math.sin(phase * Math.PI);
            // 亮度：略微随褪色变暗
            const dim   = 0.55 + 0.45 * (1 - Math.sin(phase * Math.PI) * 0.65);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const { x: tx, h: th, w: tw } = drawTower(desat, dim);

            // 粒子生成（褪色最深时最多，满色时少量）
            const spawnRate = 0.18 + 0.62 * Math.sin(phase * Math.PI);
            if (particles.length < MAX_P && Math.random() < spawnRate) {
                spawnParticle(tx, th, tw);
            }

            // 粒子更新 & 绘制
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x   += p.vx;
                p.vy  -= 0.008;             // 轻微加速上飘
                p.y   += p.vy;
                p.vx  += (Math.random() - 0.5) * 0.04;  // 微微飘摆
                p.life -= p.decay;
                p.sat  = Math.max(0, p.sat - p.decay * 1.4);  // 粒子自身也褪色

                if (p.life <= 0) { particles.splice(i, 1); continue; }

                const alpha = p.life * 0.75;
                // 用 filter 让粒子同步褪色
                ctx.save();
                ctx.filter    = `saturate(${p.sat * (1 - desat * 0.6)})`;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fill();
                // 粒子小尾迹
                ctx.globalAlpha = alpha * 0.3;
                ctx.beginPath();
                ctx.arc(p.x - p.vx * 3, p.y - p.vy * 3, p.r * p.life * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        this._stopClockTowerBg = () => { running = false; };
    }

    _initLoreFigure() {
        const figure = document.getElementById('lore-figure');
        const overlay = document.getElementById('lore-overlay');
        const textEl = document.getElementById('lore-text');
        if (!figure || !overlay || !textEl) return;

        const LORE = '世间的钟停了，指针褪尽颜色，时间凝为灰烬。修钟人林渡以颜料为血，修补残钟。每一笔上色皆是偷取光阴，可世界正被不可见的怪物蚕食——万物褪色，记忆湮灭，众生化为灰屑。钟响非报时，乃吞噬之声。修钟人明知徒劳，仍重复涂抹、碎裂、重生的轮回。石榴树的血红褪为铅粉，语言在消色中失名。这是一场注定失败的修补，绝望如褪色本身，无声蔓延，永无终点。';

        let revealTimer = null;

        const openLore = () => {
            // 构建逐字 span
            textEl.innerHTML = '';
            const chars = LORE.split('');
            chars.forEach(ch => {
                const span = document.createElement('span');
                span.className = 'lore-char';
                span.textContent = ch;
                textEl.appendChild(span);
            });

            overlay.classList.remove('hidden');
            // 下一帧触发过渡
            requestAnimationFrame(() => overlay.classList.add('show'));
            // 呜咽声变大
            GameAudio.boostSob();

            // 逐字显现
            const spans = textEl.querySelectorAll('.lore-char');
            let idx = 0;
            revealTimer = setInterval(() => {
                if (idx < spans.length) {
                    spans[idx].classList.add('visible');
                    idx++;
                } else {
                    clearInterval(revealTimer);
                    revealTimer = null;
                }
            }, 65);
        };

        const closeLore = () => {
            if (revealTimer) { clearInterval(revealTimer); revealTimer = null; }
            overlay.classList.remove('show');
            setTimeout(() => overlay.classList.add('hidden'), 600);
            // 呜咽声还原
            GameAudio.restoreSob();
        };

        figure.addEventListener('click', (e) => {
            e.stopPropagation();
            openLore();
        });

        overlay.addEventListener('click', () => {
            // 如果文字还在显现中，先全部显示；再次点击才关闭
            const hidden = textEl.querySelectorAll('.lore-char:not(.visible)');
            if (hidden.length > 0) {
                if (revealTimer) { clearInterval(revealTimer); revealTimer = null; }
                hidden.forEach(s => s.classList.add('visible'));
            } else {
                closeLore();
            }
        });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    bindInput() {
        // 键盘
        window.addEventListener('keydown', (e) => {
            this.input.keys[e.key.toLowerCase()] = true;
            
            // 游戏内快捷键
            if (this.gameStarted && !this.gameEnded) {
                switch(e.key.toLowerCase()) {
                    case 'e':
                        this.interact();
                        break;
                    case 'i':
                        this.ui.toggleInventory();
                        break;
                    case 'c':
                        this.ui.toggleCraftScreen();
                        break;
                    case ' ':
                        this.attack();
                        break;
                    case 'escape':
                        // 如果有面板打开，先关闭面板
                        const invOpen = !this.ui.elements.inventoryScreen.classList.contains('hidden');
                        const craftOpen = !this.ui.elements.craftScreen.classList.contains('hidden');
                        if (invOpen || craftOpen) {
                            this.ui.elements.inventoryScreen.classList.add('hidden');
                            this.ui.elements.craftScreen.classList.add('hidden');
                            this.paused = false;
                        } else {
                            // 否则切换暂停菜单
                            this.togglePause();
                        }
                        break;
                    case '1':
                        this.player.usePigment('red');
                        break;
                    case '2':
                        this.player.usePigment('yellow');
                        break;
                    case '3':
                        this.player.usePigment('blue');
                        break;
                    case 'f':
                        this.placeOrUseLantern();
                        break;
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.input.keys[e.key.toLowerCase()] = false;
        });
        
        // 鼠标
        this.canvas.addEventListener('mousemove', (e) => {
            this.input.mouse.x = e.clientX;
            this.input.mouse.y = e.clientY;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.input.mouse.down = true;
            if (this.gameStarted && !this.gameEnded && !this.paused) {
                this.attack();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.input.mouse.down = false;
        });
        
        // 触摸支持
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.input.mouse.x = touch.clientX;
            this.input.mouse.y = touch.clientY;
            this.input.mouse.down = true;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.input.mouse.x = touch.clientX;
            this.input.mouse.y = touch.clientY;
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.input.mouse.down = false;
        });
    }
    
    async startGame() {
        // 初始化音频
        await GameAudio.init();
        
        // 隐藏开始界面
        this.startScreen.classList.add('hidden');
        
        // 停止开始界面音乐与文字背景
        GameAudio.stopStartScreenMusic();
        if (this._stopStartTextBg)   this._stopStartTextBg();
        if (this._stopClockTowerBg)  this._stopClockTowerBg();
        
        // 进入世界互动动画
        if (typeof IntroAnimation !== 'undefined') {
            const intro = new IntroAnimation();
            await intro.play();
        }

        // 检查是否需要教程（首次游戏）
        const hasPlayedBefore = localStorage.getItem('shiseji_tutorial_done');
        
        if (!hasPlayedBefore && typeof TutorialSystem !== 'undefined') {
            // 启动教程模式（序日）
            await this._startTutorialMode();
        } else {
            // 正常游戏流程
            await this._startNormalGame();
        }
    }
    
    async _startTutorialMode() {
        this.isTutorialMode = true;
        
        // 检测移动端并提前设置缩放
        const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (isMobile && window.innerHeight < 500) {
            this.cameraZoom = 0.65;
        }
        
        // 创建教程世界（需要足够大以适配缩放后的视口，保证相机能跟随玩家）
        const effectiveWidth = this.width / this.cameraZoom;
        const effectiveHeight = this.height / this.cameraZoom;
        // 世界尺寸需要比视口大很多，确保玩家在任意位置都能被相机跟随
        const tutorialWidth = Math.max(effectiveWidth * 1.5, 2000);
        const tutorialHeight = Math.max(effectiveHeight * 1.5, 1200);
        
        this.world = new World(tutorialWidth, tutorialHeight);
        this.world.day = 0;
        this.world.isTutorial = true;
        this.world.gameTime = 1020; // 黄昏17:00
        // World构造函数已调用generateWorld()，清除教程不需要的生物
        this.world.creatures.creatures = [];
        
        // 创建玩家（居中）
        const playerX = tutorialWidth / 2;
        const playerY = tutorialHeight / 2;
        this.player = new Player(playerX, playerY);
        this.player.stats.color = 100;
        this.player.stats.ink = 100;
        this.player.stats.warmth = 100;
        
        // 初始化相机位置跟随玩家
        const vw = this.width / this.cameraZoom;
        const vh = this.height / this.cameraZoom;
        this.camera.x = Math.max(0, Math.min(playerX - vw / 2, tutorialWidth - vw));
        this.camera.y = Math.max(0, Math.min(playerY - vh / 2, tutorialHeight - vh));
        
        // 初始化统计追踪
        this.player.stats.totalCollected = 0;
        this.player.stats.totalCrafted = 0;
        this.player.stats.totalKills = 0;
        this.player.stats.uniqueResources = new Set();
        this.player.stats.minInkEver = 100;
        
        // 创建UI
        this.ui = new UI(this);
        this.ui.show();
        
        // 创建成就系统
        this.achievements = new AchievementSystem(this);
        
        // 创建教程系统
        this.tutorial = new TutorialSystem(this);
        
        // 开始游戏循环
        this.gameStarted = true;
        this.lastTime = performance.now();
        
        // 移动端控件显示
        if (this.mobileControls) this.mobileControls.show();
        
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // 启动教程
        this.tutorial.start();
    }
    
    async _startNormalGame() {
        // 创建游戏世界
        this.world = new World(2400, 1800);
        
        // 创建玩家
        this.player = new Player(200, this.world.height / 2);
        
        // 初始化统计追踪
        this.player.stats.totalCollected = 0;
        this.player.stats.totalCrafted = 0;
        this.player.stats.totalKills = 0;
        this.player.stats.uniqueResources = new Set();
        this.player.stats.minInkEver = this.player.stats.ink;
        
        // 给玩家一些初始物资
        this.player.inventory.addItem('stardustGrass', 3);
        this.player.inventory.addItem('morningDew', 2);
        
        // 创建UI
        this.ui = new UI(this);
        this.ui.show();
        
        // 创建成就系统
        this.achievements = new AchievementSystem(this);
        
        // 创建任务系统
        this.quest = new QuestSystem(this);
        
        // 显示进度可视化
        this._showProgressUI();
        
        // 显示开场对话
        const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        setTimeout(() => {
            this.ui.showDialog('你来到了褪色界...在三日内修复古钟，才能回到人间。');
            setTimeout(() => {
                if (isMobile) {
                    this.ui.showDialog('左侧摇杆移动，右侧按钮：拾取采集、攻击、背包、调色');
                } else {
                    this.ui.showDialog('按 WASD 移动，E 采集/交互，空格 攻击，I 背包，C 合成');
                }
            }, 4000);
        }, 1000);
        
        // 开始背景音乐
        GameAudio.startBackgroundMusic('day');
        
        this.gameStarted = true;
        this.lastTime = performance.now();
        // 手机横屏：缩小镜头以扩大视野
        if (isMobile && window.innerHeight < 500) {
            this.cameraZoom = 0.65;
        }
        if (this.mobileControls) this.mobileControls.show();
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
        
        // 启动自动存档
        this._startAutoSave();
        
        // 清除旧存档（新游戏）
        this.deleteSaveData();
        
        // 开始游戏循环
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameLoop(currentTime) {
        if (this.gameEnded) return;
        
        const rawDt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        const dt = rawDt * this.cheat.timeMultiplier;
        
        if (!this.paused) {
            this.update(dt);
        }
        
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        // 更新屏幕震动
        Utils.screenShake.update(dt);
        
        // 更新玩家
        const playerResult = this.player.update(dt, this.input, this.world);
        if (playerResult === 'death') {
            this.endGame('death');
            return;
        }
        
        // 更新世界
        const worldResult = this.world.update(dt, this.player);
        if (worldResult === 'victory') {
            this.endGame('victory');
            return;
        } else if (worldResult === 'timeout') {
            this.endGame('timeout');
            return;
        }
        
        // 更新粒子
        Particles.update(dt);
        
        // 更新UI
        this.ui.update(dt);
        
        // 更新任务系统
        if (this.quest) {
            this.quest.update();
        }
        
        // 更新相机
        this.updateCamera();
        
        // 更新背景音乐
        this.updateMusic();
        
        // 更新攻击范围指示器计时
        if (this.attackRangeTimer > 0) {
            this.attackRangeTimer -= dt;
            if (this.attackRangeTimer <= 0) {
                this.showAttackRange = false;
            }
        }
        
        // 更新教程系统
        if (this.tutorial && this.tutorial.active) {
            this.tutorial.update(dt);
        }
        
        // 更新成就系统
        if (this.achievements) {
            this.achievements.update();
            this.achievements.trackMinInk();
        }
        
        // 更新进度可视化
        this._updateProgressUI();
    }
    
    updateCamera() {
        // 缩放后的逻辑视口尺寸
        const vw = this.width / this.cameraZoom;
        const vh = this.height / this.cameraZoom;
        // 平滑跟随玩家
        const targetX = this.player.x - vw / 2;
        const targetY = this.player.y - vh / 2;
        
        this.camera.x = Utils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = Utils.lerp(this.camera.y, targetY, 0.1);
        
        // 边界限制
        const maxCamX = Math.max(0, this.world.width - vw);
        const maxCamY = Math.max(0, this.world.height - vh);
        this.camera.x = Utils.clamp(this.camera.x, 0, maxCamX);
        this.camera.y = Utils.clamp(this.camera.y, 0, maxCamY);
    }
    
    updateMusic() {
        const period = this.world.getCurrentPeriod();
        if (GameAudio.currentMusic !== period && !GameAudio._bgmSwitching) {
            GameAudio.switchBackgroundMusic(period);
        }
    }
    
    _showProgressUI() {
        document.getElementById('day-progress')?.classList.remove('hidden');
        document.getElementById('clock-progress')?.classList.remove('hidden');
    }
    
    _updateProgressUI() {
        if (!this.world || !this.player) return;
        
        // 更新三日进度条
        const dayProgress = document.getElementById('day-progress');
        if (dayProgress && this.world.day >= 1) {
            const segments = dayProgress.querySelectorAll('.day-segment');
            segments.forEach((seg, i) => {
                const dayNum = i + 1;
                const fill = seg.querySelector('.day-fill');
                
                seg.classList.remove('current', 'completed');
                
                if (dayNum < this.world.day) {
                    seg.classList.add('completed');
                    if (fill) fill.style.width = '100%';
                } else if (dayNum === this.world.day) {
                    seg.classList.add('current');
                    // 计算当日进度 (0-1440分钟)
                    const dayProgress = (this.world.gameTime % 1440) / 1440;
                    if (fill) fill.style.width = `${dayProgress * 100}%`;
                } else {
                    if (fill) fill.style.width = '0%';
                }
            });
        }
        
        // 更新钟面进度环
        const clockProgress = document.getElementById('clock-progress');
        if (clockProgress) {
            const pieces = this.player.clockPieces || 0;
            const total = 3;
            
            // 更新进度环
            const ring = clockProgress.querySelector('.clock-progress-ring');
            if (ring) {
                const circumference = 163.36; // 2 * PI * 26
                const offset = circumference * (1 - pieces / total);
                ring.style.strokeDashoffset = offset;
            }
            
            // 更新钟片
            for (let i = 1; i <= 3; i++) {
                const piece = clockProgress.querySelector(`.clock-piece[data-piece="${i}"]`);
                if (piece) {
                    if (i <= pieces) {
                        piece.classList.add('found');
                    } else {
                        piece.classList.remove('found');
                    }
                }
            }
        }
    }
    
    drawAttackRange() {
        const attackRange = 50;
        const alpha = this.attackRangeTimer / 0.3;
        const scale = 0.8 + (1 - alpha) * 0.3;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha * 0.4;
        this.ctx.strokeStyle = 'rgba(200, 80, 80, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, attackRange * scale, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    render() {
        if (!this.world || !this.player) return;
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 应用相机变换
        this.ctx.save();
        
        // 手机端缩放
        if (this.cameraZoom !== 1) {
            this.ctx.scale(this.cameraZoom, this.cameraZoom);
        }
        
        // 屏幕震动
        const shake = Utils.screenShake.getOffset();
        this.ctx.translate(-this.camera.x + shake.x, -this.camera.y + shake.y);
        
        // 绘制世界
        this.world.draw(this.ctx, this.player);
        
        // 绘制玩家
        this.player.draw(this.ctx);
        
        // 绘制攻击范围指示器
        if (this.showAttackRange && this.attackRangeTimer > 0) {
            this.drawAttackRange();
        }
        
        // 绘制粒子
        Particles.draw(this.ctx);
        
        this.ctx.restore();
        
        // 夜晚黑暗效果（使用离屏画布，避免 destination-out 破坏主画面）
        this.renderNightOverlay();
        
        // 绘制屏幕效果
        this.renderScreenEffects();
        
        // 绘制任务指引箭头（屏幕空间）
        if (this.quest) {
            this.quest.drawArrow(this.ctx);
        }
    }
    
    renderNightOverlay() {
        if (!this.world || !this.player) return;
        if (this.world.getCurrentPeriod() !== 'night') return;
        
        // 懒初始化离屏画布
        if (!this._darkCanvas) {
            this._darkCanvas = document.createElement('canvas');
            this._darkCtx = this._darkCanvas.getContext('2d');
        }
        this._darkCanvas.width = this.width;
        this._darkCanvas.height = this.height;
        
        const dctx = this._darkCtx;
        
        // 填充黑暗
        dctx.fillStyle = 'rgba(13, 13, 26, 0.75)';
        dctx.fillRect(0, 0, this.width, this.height);
        
        // 在光源位置挖洞（仅影响离屏画布）
        dctx.globalCompositeOperation = 'destination-out';
        
        // 性能优化：限制光源数量，按距离排序，优先渲染近处光源
        let lightSources = this.world.getLightSources(this.player);
        const MAX_LIGHTS = 8;
        if (lightSources.length > MAX_LIGHTS) {
            // 按距离排序，保留最近的光源
            lightSources.sort((a, b) => {
                const distA = Math.hypot(a.x - this.player.x, a.y - this.player.y);
                const distB = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                return distA - distB;
            });
            lightSources = lightSources.slice(0, MAX_LIGHTS);
        }
        
        for (const light of lightSources) {
            const sx = (light.x - this.camera.x) * this.cameraZoom;
            const sy = (light.y - this.camera.y) * this.cameraZoom;
            
            const sr = light.radius * this.cameraZoom;
            const gradient = dctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
            gradient.addColorStop(0.6, `rgba(0, 0, 0, ${light.intensity * 0.4})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            dctx.fillStyle = gradient;
            dctx.beginPath();
            dctx.arc(sx, sy, sr, 0, Math.PI * 2);
            dctx.fill();
        }
        
        dctx.globalCompositeOperation = 'source-over';
        
        // 合成到主画布
        this.ctx.drawImage(this._darkCanvas, 0, 0);
    }
    
    renderScreenEffects() {
        if (!this.player) return;
        // ── 持续性褪色叠加层 ────────────────────────
        // 根据色値动态调整灰化强度：色値满时叠加基础灰，色値低时加深
        const colorRatio  = this.player.stats.color / this.player.maxStats.color;
        // 基础灰化（始终存在）：模拟世界颜色持续流失
        const baseDesatAlpha = 0.10 + (1 - colorRatio) * 0.22;
        this.ctx.fillStyle = `rgba(145, 138, 130, ${baseDesatAlpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 边缘灰化晕：模拟视野褪色
        const edgeGrad = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.width * 0.25,
            this.width / 2, this.height / 2, this.width * 0.75
        );
        edgeGrad.addColorStop(0, 'rgba(130, 124, 116, 0)');
        edgeGrad.addColorStop(1, `rgba(100, 96, 90, ${0.12 + (1 - colorRatio) * 0.18})`);
        this.ctx.fillStyle = edgeGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 低墨韵值边缘效果
        if (this.player.stats.ink < 30) {
            const intensity = 1 - this.player.stats.ink / 30;
            
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(80, 75, 100, ${intensity * 0.35})`;
            this.ctx.lineWidth = 30 * intensity;
            this.ctx.strokeRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }
        
        // 低色值灰度效果（加强）
        if (this.player.stats.color < 50) {
            const intensity = 1 - this.player.stats.color / 50;
            this.ctx.fillStyle = `rgba(110, 106, 100, ${intensity * 0.35})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // 极低色值：画面几乎全灰，铅笔素描感
        if (this.player.stats.color < 15) {
            const intensity = 1 - this.player.stats.color / 15;
            this.ctx.fillStyle = `rgba(88, 84, 80, ${intensity * 0.45})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    interact() {
        if (this.paused) return;
        
        // 检查附近资源
        const resource = this.world.getResourceAt(this.player.x, this.player.y, 60);
        if (resource) {
            const collected = resource.collect(this.player);
            if (collected) {
                // 成就系统：采集奖励
                let bonusMultiplier = 1;
                if (this.achievements) {
                    const result = this.achievements.onCollect(collected.id);
                    bonusMultiplier = result.bonus || 1;
                }
                
                const finalCount = Math.ceil(collected.count * bonusMultiplier);
                this.player.inventory.addItem(collected.id, finalCount);
                
                // 显示提示（含连击/幸运信息）
                let msg = `获得了 ${collected.name}`;
                if (bonusMultiplier > 1) {
                    msg += bonusMultiplier >= 2 ? ' ×2!' : ` +${Math.round((bonusMultiplier - 1) * 100)}%`;
                }
                this.ui.showDialog(msg, 1500);
                
                // 教程系统通知
                if (this.tutorial && this.tutorial.active) {
                    // 教程不做额外处理
                }
                
                // 对应颜色的彩实回复颜料
                if (collected.id === 'colorFruitRed') {
                    this.player.addPigment('red', 20);
                } else if (collected.id === 'colorFruitYellow') {
                    this.player.addPigment('yellow', 20);
                } else if (collected.id === 'colorFruitBlue') {
                    this.player.addPigment('blue', 20);
                }
            }
            return;
        }
        
        // 检查附近生物
        const creature = this.world.creatures.getNearbyCreature(
            this.player.x, this.player.y, 60, 'chrysalis'
        );
        if (creature && creature instanceof Chrysalis) {
            this.player.interact(creature);
            this.ui.showDialog('你轻触了鸣蛹，它的歌声更加悠扬了', 1500);
            return;
        }
        
        // 教程模式：检查教程古钟交互
        if (this.isTutorialMode && this.world.tutorialClock) {
            const clock = this.world.tutorialClock;
            const distToClock = this.player.distanceTo(clock.x, clock.y);
            if (distToClock < 60 && this.player.inventory.hasItem('tutorialOil')) {
                this.player.inventory.removeItem('tutorialOil', 1);
                this.tutorial?.notifyClockInteracted();
                Particles.emit({
                    x: clock.x,
                    y: clock.y,
                    count: 15,
                    color: '#FFD700',
                    size: 4,
                    life: 1.5,
                    speed: 3
                });
                GameAudio.playCollect();
                return;
            }
        }
        
        // 检查钟塔交互
        const distToTower = this.player.distanceTo(
            this.world.clockTower.x, 
            this.world.clockTower.y
        );
        if (distToTower < 80) {
            if (this.player.clockPieces > this.player.clockOilUsed && this.player.inventory.hasItem('clockOil')) {
                if (this.player.useClockOil()) {
                    Particles.emitWatercolorSpread(
                        this.world.clockTower.x,
                        this.world.clockTower.y,
                        '#FFD700'
                    );
                    const repairCount = this.player.clockOilUsed;
                    if (repairCount >= 3) {
                        // 立即锁定游戏，防止14s等待期间玩家继续受伤/移动
                        this.gameEnded = true;
                        // 第3次：BGM淡出1s，立即起通关旋律，1.5s后启动结局动画（与旋律重叠）
                        GameAudio.stopBackgroundMusic(1.0);
                        GameAudio.playVictoryStinger();
                        setTimeout(() => this.endGame('victory'), 1500);
                    } else {
                        GameAudio.playClockRepair(repairCount);
                    }
                    this.ui.showDialog(`古钟碎片已修复！(${repairCount}/3)`);
                }
            } else if (this.player.clockPieces === 0) {
                this.ui.showDialog('这是一座古钟塔...需要找到古钟碎片才能修复');
            } else if (!this.player.inventory.hasItem('clockOil')) {
                this.ui.showDialog(`碎片(${this.player.clockPieces}/3) 还需要古钟润滑剂来修复`);
            } else {
                this.ui.showDialog(`需要找到更多古钟碎片 (${this.player.clockPieces}/3)`);
            }
            return;
        }
    }
    
    attack() {
        if (this.paused) return;
        
        const creatures = this.world.creatures.getCreaturesInRange(
            this.player.x, this.player.y, 100
        );
        
        this.player.attack(creatures);
        
        // 显示攻击范围指示器
        this.showAttackRange = true;
        this.attackRangeTimer = 0.3;
        
        // 攻击特效
        const attackDir = this.player.facingRight ? 1 : -1;
        Particles.emit({
            x: this.player.x + attackDir * 30,
            y: this.player.y,
            count: 5,
            angle: attackDir > 0 ? 0 : Math.PI,
            angleSpread: 0.5,
            speed: 4,
            life: 0.3,
            size: 10,
            color: '#1A1A2E',
            type: 'ink'
        });
    }
    
    placeOrUseLantern() {
        if (this.player.inventory.hasItem('paperLantern')) {
            if (this.player.placeItem('paperLantern')) {
                this.ui.showDialog('放置了纸灯', 1500);
            }
        } else {
            this.ui.showDialog('你没有纸灯可以放置', 1500);
        }
    }
    
    async endGame(result) {
        // victory路径：gameEnded已在interact()中提前设为true（锁定14s等待期）
        // 用_victorySeqPlayed防止重复播放，同时允许setTimeout的调用通过
        if (result === 'victory') {
            if (this._victorySeqPlayed) return;
            this._victorySeqPlayed = true;
        } else {
            if (this.gameEnded) return;
        }
        this.gameEnded = true;
        if (this.mobileControls) this.mobileControls.hide();
        if (this.ui) {
            this.ui.elements.uiLayer.classList.add('hidden');
            this.ui.hideDialog();
        }
        if (result === 'victory') {
            // victory: 真结局序列，音乐已在interact()中提前淡出+stinger
            if (typeof EndingSequence !== 'undefined') {
                const ending = new EndingSequence(this);
                await ending.play();
            }
        } else {
            // 死亡/超时：停背景乐 → 失败结局序列 → 结束屏
            GameAudio.stopBackgroundMusic(1.2);
            if (typeof DeathEndingSequence !== 'undefined') {
                const deathEnding = new DeathEndingSequence(this);
                await deathEnding.play();
            }
        }
        
        // 隐藏游戏画布，确保结束界面可见
        this.canvas.style.display = 'none';
        this.ui.showEndScreen(result);
    }

    _initCheatSystem() {
        const CHEAT_PWD     = '12138';
        const TRIGGER_TIMES = 5;   // 需连续点击次数

        const trigger     = document.getElementById('cheat-trigger');
        const pwdOverlay  = document.getElementById('cheat-pwd-overlay');
        const pwdInput    = document.getElementById('cheat-pwd-input');
        const pwdErr      = document.getElementById('cheat-pwd-err');
        const pwdConfirm  = document.getElementById('cheat-pwd-confirm');
        const pwdCancel   = document.getElementById('cheat-pwd-cancel');
        const panel       = document.getElementById('cheat-panel');
        const panelClose  = document.getElementById('cheat-panel-close');
        const chkInvinc   = document.getElementById('cheat-invincible');
        const speedBtns   = document.querySelectorAll('.cheat-speed-btn');
        const btnFillColor  = document.getElementById('cheat-fill-color');
        const btnFillInk    = document.getElementById('cheat-fill-ink');
        const chkInfItems   = document.getElementById('cheat-infinite-items');

        if (!trigger || !pwdOverlay || !panel) return;

        // ── 隐蔽触发：连续点击 TRIGGER_TIMES 次 ──
        let clickCount = 0;
        let clickTimer = null;
        trigger.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
            if (clickCount >= TRIGGER_TIMES) {
                clickCount = 0;
                clearTimeout(clickTimer);
                if (this.cheat.unlocked) {
                    // 已解锁直接显示面板
                    panel.classList.remove('hidden');
                } else {
                    // 弹出密码框
                    pwdInput.value = '';
                    pwdErr.textContent = '';
                    pwdOverlay.classList.remove('hidden');
                    setTimeout(() => pwdInput.focus(), 50);
                }
            }
        });

        // ── 密码确认 ──
        const confirmPwd = () => {
            if (pwdInput.value === CHEAT_PWD) {
                this.cheat.unlocked = true;
                pwdOverlay.classList.add('hidden');
                panel.classList.remove('hidden');
                pwdErr.textContent = '';
            } else {
                pwdErr.textContent = '密码错误';
                pwdInput.value = '';
                pwdInput.focus();
                // 错误抖动
                pwdErr.style.animation = 'none';
                requestAnimationFrame(() => {
                    pwdErr.style.animation = '';
                });
            }
        };

        pwdConfirm.addEventListener('click', confirmPwd);
        pwdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmPwd();
            if (e.key === 'Escape') pwdOverlay.classList.add('hidden');
            e.stopPropagation();   // 防止触发游戏键盘逻辑
        });
        pwdCancel.addEventListener('click', () => pwdOverlay.classList.add('hidden'));
        pwdOverlay.addEventListener('click', (e) => {
            if (e.target === pwdOverlay) pwdOverlay.classList.add('hidden');
        });

        // ── 关闭面板 ──
        panelClose.addEventListener('click', () => panel.classList.add('hidden'));

        // ── 无敌开关 ──
        chkInvinc.addEventListener('change', () => {
            this.cheat.invincible = chkInvinc.checked;
        });

        // ── 无限物品开关 ──
        if (chkInfItems) {
            chkInfItems.addEventListener('change', () => {
                this.cheat.infiniteItems = chkInfItems.checked;
            });
        }

        // ── 时间倍速 ──
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.cheat.timeMultiplier = parseFloat(btn.dataset.mult);
                speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // ── 立即恢复色值/墨韵 ──
        btnFillColor.addEventListener('click', () => {
            if (this.player) this.player.addStat('color', 9999);
        });
        btnFillInk.addEventListener('click', () => {
            if (this.player) this.player.addStat('ink', 9999);
        });

        // 阻止面板内所有按键冒泡到游戏
        panel.addEventListener('keydown', (e) => e.stopPropagation());
    }
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
