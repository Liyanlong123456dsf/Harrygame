// 序日教程系统 - "钟匠的残梦"

class TutorialSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.currentStep = 0;
        this.completed = false;
        
        // 教程步骤定义
        this.steps = [
            {
                id: 'move',
                objective: '移动',
                narration: '你的脚步声惊醒了灰尘。',
                hint: '按 WASD 或 摇杆移动',
                highlightKeys: ['W', 'A', 'S', 'D'],
                highlightElement: 'joystick-zone',
                check: () => this._checkMoved(),
                onComplete: () => this._onMoveComplete()
            },
            {
                id: 'collect',
                objective: '拾取齿轮',
                narration: '齿轮还能转动。只是慢了一些。',
                hint: '靠近齿轮，按 E 或 交互按钮',
                highlightKeys: ['E'],
                highlightElement: 'btn-interact',
                check: () => this._checkCollected(),
                onComplete: () => this._onCollectComplete()
            },
            {
                id: 'inventory',
                objective: '打开背包',
                narration: '口袋里还有些旧东西。',
                hint: '按 I 或 背包按钮',
                highlightKeys: ['I'],
                highlightElement: 'btn-inventory',
                check: () => this._checkInventoryOpened(),
                onComplete: () => this._onInventoryComplete()
            },
            {
                id: 'craft',
                objective: '合成润滑油',
                narration: '你记得这个配方。师父教过你。',
                hint: '按 C 打开合成界面',
                highlightKeys: ['C'],
                highlightElement: 'btn-craft',
                check: () => this._checkCrafted(),
                onComplete: () => this._onCraftComplete()
            },
            {
                id: 'use',
                objective: '为古钟上油',
                narration: '钟响了。然后一切开始崩塌——',
                hint: '靠近古钟，按 E 使用润滑油',
                highlightKeys: ['E'],
                highlightElement: 'btn-interact',
                check: () => this._checkUsed(),
                onComplete: () => this._onUseComplete()
            }
        ];
        
        // 状态追踪
        this._moveDistance = 0;
        this._lastPlayerPos = null;
        this._inventoryOpened = false;
        this._itemCrafted = false;
        this._oilUsed = false;
        this._stepCompleting = false; // 防止_completeStep在setTimeout期间每帧重复触发
        this._craftPanelHintHidden = false; // Bug3：合成面板打开后是否已隐藏 C 键提示
        
        // 教程专用资源
        this.tutorialGear = null;
        this.tutorialClock = null;
    }
    
    start() {
        this.active = true;
        this.currentStep = 0;
        this.completed = false;
        
        // 显示序日标题
        this._showChapterTitle('序', '钟匠的残梦');
        
        // 延迟开始第一步
        setTimeout(() => {
            this._startStep(0);
        }, 2500);
    }
    
    update(dt) {
        if (!this.active || this.completed) return;
        
        const step = this.steps[this.currentStep];
        if (!step) return;
        
        // 追踪移动距离
        if (this.currentStep === 0 && this.game.player) {
            if (this._lastPlayerPos) {
                const dx = this.game.player.x - this._lastPlayerPos.x;
                const dy = this.game.player.y - this._lastPlayerPos.y;
                this._moveDistance += Math.sqrt(dx * dx + dy * dy);
            }
            this._lastPlayerPos = { x: this.game.player.x, y: this.game.player.y };
        }
        
        // 合成步骤：一旦合成面板打开，移除 C 键高亮并更新提示文字
        if (step.id === 'craft' && !this._craftPanelHintHidden) {
            const craftPanel = document.getElementById('craft-panel');
            if (craftPanel && !craftPanel.classList.contains('hidden')) {
                this._craftPanelHintHidden = true;
                this._removeHighlights();
                // 提示文字改为引导调制操作
                const objHint = document.querySelector('#tutorial-objective .objective-hint');
                if (objHint) objHint.textContent = '选择润滑油配方并点击调制';
            }
        }

        // 检查当前步骤是否完成（加入展开得死守卫，防止每帧重复触发）
        if (!this._stepCompleting && step.check && step.check()) {
            this._completeStep();
        }
    }
    
    _startStep(index) {
        if (index >= this.steps.length) {
            this._completeTutorial();
            return;
        }
        
        const step = this.steps[index];
        this.currentStep = index;
        this._stepCompleting = false;         // 新步骤允许再次检查
        this._craftPanelHintHidden = false;   // 重置合成提示状态
        
        // 显示旁白
        this._showNarration(step.narration);
        
        // 显示目标提示（保存 ID，允许 _completeStep() 取消以防快速触发竞态）
        this._showHintTimer = setTimeout(() => {
            if (this.currentStep !== index || this._stepCompleting || !this.active) return;
            this._showObjective(step.objective, step.hint);
            this._highlightControls(step);
        }, 1500);
    }
    
    _completeStep() {
        this._stepCompleting = true;
        // 取消尚未触发的提示显示计时器，防止它在清理后重新展示 UI
        clearTimeout(this._showHintTimer);
        this._showHintTimer = null;
        const step = this.steps[this.currentStep];
        
        // 移除高亮
        this._removeHighlights();
        
        // 执行完成回调
        if (step.onComplete) {
            step.onComplete();
        }
        
        // 播放完成音效
        if (typeof GameAudio !== 'undefined') GameAudio.playCollect?.();
        
        // 显示完成粒子
        if (this.game.player) {
            Particles.emit({
                x: this.game.player.x,
                y: this.game.player.y - 20,
                count: 8,
                color: '#C8A860',
                size: 3,
                life: 1,
                speed: 2
            });
        }
        
        // 延迟进入下一步
        setTimeout(() => {
            this._startStep(this.currentStep + 1);
        }, 1000);
    }
    
    _completeTutorial() {
        // 兜底清理：确保无论路径如何，所有 Tutorial UI 在进入过渡前都消失
        clearTimeout(this._showHintTimer);
        this._showHintTimer = null;
        this._removeHighlights();
        this.completed = true;
        this.active = false;
        
        // 触发过渡动画
        this._playTransitionAnimation();
    }
    
    // ═══════════════════════════════════════════════════════════
    // 步骤检查函数
    // ═══════════════════════════════════════════════════════════
    
    _checkMoved() {
        return this._moveDistance > 100;
    }
    
    _checkCollected() {
        return this.game.player?.inventory.hasItem('rustyGear');
    }
    
    _checkInventoryOpened() {
        return this._inventoryOpened;
    }
    
    _checkCrafted() {
        return this._itemCrafted || this.game.player?.inventory.hasItem('tutorialOil');
    }
    
    _checkUsed() {
        return this._oilUsed;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 步骤完成回调
    // ═══════════════════════════════════════════════════════════
    
    _onMoveComplete() {
        // 生成齿轮供玩家采集
        this._spawnTutorialGear();
    }
    
    _onCollectComplete() {
        // 准备背包步骤
    }
    
    _onInventoryComplete() {
        // 给玩家合成材料
        this.game.player.inventory.addItem('stardustGrass', 2);
        this.game.player.inventory.addItem('morningDew', 1);
    }
    
    _onCraftComplete() {
        // 生成古钟供玩家交互
        this._spawnTutorialClock();
    }
    
    _onUseComplete() {
        // 使用润滑油后立即清除教程古钟引用，停止 canvas [E] 标签继续渲染
        if (this.game.world) this.game.world.tutorialClock = null;
        this.tutorialClock = null;
    }
    
    // ═══════════════════════════════════════════════════════════
    // UI 辅助函数
    // ═══════════════════════════════════════════════════════════
    
    _showChapterTitle(chapter, title) {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-chapter-overlay';
        overlay.innerHTML = `
            <div class="tutorial-chapter-text">
                <span class="chapter-label">${chapter}</span>
                <span class="chapter-title">${title}</span>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 1000);
        }, 2000);
    }
    
    _showNarration(text) {
        const narration = document.getElementById('tutorial-narration') || this._createNarrationElement();
        narration.textContent = text;
        narration.classList.remove('hidden');
        narration.classList.add('show');
        
        setTimeout(() => {
            narration.classList.remove('show');
            narration.classList.add('hidden');
        }, 3000);
    }
    
    _createNarrationElement() {
        const el = document.createElement('div');
        el.id = 'tutorial-narration';
        el.className = 'tutorial-narration hidden';
        document.getElementById('game-container').appendChild(el);
        return el;
    }
    
    _showObjective(objective, hint) {
        const panel = document.getElementById('tutorial-objective') || this._createObjectiveElement();
        panel.classList.remove('hidden', 'hiding'); // 清除淡出中间状态
        panel.innerHTML = `
            <div class="objective-text">${objective}</div>
            <div class="objective-hint">${hint}</div>
        `;
    }
    
    _createObjectiveElement() {
        const el = document.createElement('div');
        el.id = 'tutorial-objective';
        el.className = 'tutorial-objective hidden';
        document.getElementById('game-container').appendChild(el);
        return el;
    }
    
    _highlightControls(step) {
        // 高亮键盘按键（桌面端）
        if (step.highlightKeys) {
            step.highlightKeys.forEach(key => {
                this._createKeyHighlight(key);
            });
        }
        
        // 高亮移动端按钮
        if (step.highlightElement) {
            const el = document.getElementById(step.highlightElement);
            if (el) {
                el.classList.add('tutorial-highlight');
            }
        }
    }
    
    _createKeyHighlight(key) {
        if (document.querySelector(`.tutorial-key-hint[data-key="${key}"]`)) return;
        
        // 获取或创建组容器
        let group = document.getElementById('tutorial-key-group');
        if (!group) {
            group = document.createElement('div');
            group.id = 'tutorial-key-group';
            group.className = 'tutorial-key-group';
            document.getElementById('game-container').appendChild(group);
        }
        
        const k = key.toUpperCase();
        const span = document.createElement('span');
        span.className = 'tutorial-key-hint';
        span.dataset.key = key;
        span.textContent = key;
        
        if (k === 'W') {
            // W 独占上排（D-pad 顶部）
            let topRow = group.querySelector('.key-row-top');
            if (!topRow) {
                topRow = document.createElement('div');
                topRow.className = 'tutorial-key-row key-row-top';
                group.insertBefore(topRow, group.firstChild);
            }
            topRow.appendChild(span);
        } else if (k === 'A' || k === 'S' || k === 'D') {
            // A S D 在下排横排（D-pad 中/下）
            let botRow = group.querySelector('.key-row-bot');
            if (!botRow) {
                botRow = document.createElement('div');
                botRow.className = 'tutorial-key-row key-row-bot';
                group.appendChild(botRow);
            }
            botRow.appendChild(span);
        } else {
            // 单键（E / I / C）直接放入组
            group.appendChild(span);
        }
    }
    
    _removeHighlights() {
        // 键盘提示组：300ms 淡出后移除（符合大纲第 4 节 ease-out 规范）
        const group = document.getElementById('tutorial-key-group');
        if (group && !group.classList.contains('hiding')) {
            group.classList.add('hiding');
            setTimeout(() => group.remove(), 300);
        }
        document.querySelectorAll('.tutorial-key-hint:not(#tutorial-key-group .tutorial-key-hint)').forEach(el => {
            el.style.transition = 'opacity 0.3s ease-out';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        });
        
        // 移除按钮高亮
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        // 目标面板：300ms 淡出后设为 hidden（采用 .hiding 进渡最终挂起 display:none）
        const panel = document.getElementById('tutorial-objective');
        if (panel && !panel.classList.contains('hidden') && !panel.classList.contains('hiding')) {
            panel.classList.add('hiding');
            setTimeout(() => {
                panel.classList.remove('hiding');
                panel.classList.add('hidden');
            }, 300);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 教程专用对象
    // ═══════════════════════════════════════════════════════════
    
    _spawnTutorialGear() {
        if (!this.game.world) return;
        
        // 在玩家附近生成齿轮
        const px = this.game.player.x;
        const py = this.game.player.y;
        
        // 创建教程专用资源节点（带collect和draw方法）
        this.tutorialGear = {
            type: 'RUSTY_GEAR',
            x: px + 80,
            y: py,
            available: true,
            collected: false,
            interactable: true,
            isTutorial: true,
            radius: 15,
            glowTimer: 0,
            update: function(dt, gameTime) {
                this.glowTimer = (this.glowTimer || 0) + dt;
            },
            isPlayerNear: function(px, py, range) {
                const dx = this.x - px;
                const dy = this.y - py;
                return Math.sqrt(dx * dx + dy * dy) < (range || 60);
            },
            draw: function(ctx) {
                if (this.collected) return;
                const glow = (Math.sin((this.glowTimer || 0) * 3) + 1) * 0.5;
                ctx.save();
                ctx.shadowColor = 'rgba(196,163,90,0.9)';
                ctx.shadowBlur = 10 + glow * 8;
                ctx.fillStyle = `rgba(196,163,90,${0.7 + glow * 0.3})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,220,120,0.9)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            },
            collect: function(player) {
                if (this.collected) return null;
                this.collected = true;
                this.available = false;
                this.interactable = false;
                if (typeof GameAudio !== 'undefined') GameAudio.playCollect?.();
                Particles.emit({ x: this.x, y: this.y, count: 8, color: '#8B7355', size: 4, life: 0.8, speed: 2 });
                return {
                    id: 'rustyGear',
                    name: '生锈齿轮',
                    count: 1
                };
            }
        };
        
        // 添加到世界资源节点
        this.game.world.resourceNodes.push(this.tutorialGear);
        
        // 显示指示粒子
        Particles.emit({
            x: this.tutorialGear.x,
            y: this.tutorialGear.y,
            count: 5,
            color: '#C8A860',
            size: 3,
            life: 1.5,
            speed: 1
        });
    }
    
    _spawnTutorialClock() {
        if (!this.game.world) return;
        
        const px = this.game.player.x;
        const py = this.game.player.y;
        const _game = this.game; // 闭包捕获，供 draw() 中做近距离检测
        
        this.tutorialClock = {
            type: 'tutorialClock',
            x: px + 100,
            y: py,
            interactable: true,
            collected: false,
            isTutorial: true,
            glowTimer: 0,
            update: function(dt, gameTime) {
                this.glowTimer = (this.glowTimer || 0) + dt;
            },
            isPlayerNear: function(px, py, range) {
                const dx = this.x - px;
                const dy = this.y - py;
                return Math.sqrt(dx * dx + dy * dy) < (range || 60);
            },
            draw: function(ctx) {
                const t = this.glowTimer || 0;
                const glow  = (Math.sin(t * 2.2) + 1) * 0.5;   // 0-1 循环
                const pulse = (Math.sin(t * 1.4) + 1) * 0.5;
                ctx.save();

                // ─ 外圈脉动光环（等待修复状态，频率快于正式钟塔）
                ctx.shadowColor = 'rgba(196,163,90,0.7)';
                ctx.shadowBlur = 14 + glow * 12;
                ctx.strokeStyle = `rgba(196,163,90,${0.20 + pulse * 0.30})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 36 + pulse * 5, 0, Math.PI * 2);
                ctx.stroke();

                // ─ 塔身（与 drawClockTower 同色系，但更暗/褪色）
                ctx.shadowBlur = 6;
                const bodyGrad = ctx.createLinearGradient(this.x - 18, this.y - 48, this.x + 18, this.y + 12);
                bodyGrad.addColorStop(0, '#4A3A2A');   // 同 drawClockTower 色系
                bodyGrad.addColorStop(0.5, '#3A2A1A');
                bodyGrad.addColorStop(1, '#2A1A0A');
                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.rect(this.x - 16, this.y - 48, 32, 60);
                ctx.fill();

                // ─ 塔顶尖（破损：填色比正式暗30%）
                const topGrad = ctx.createLinearGradient(this.x, this.y - 68, this.x, this.y - 48);
                topGrad.addColorStop(0, '#3A2A1A');
                topGrad.addColorStop(1, '#4A3A2A');
                ctx.fillStyle = topGrad;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 68);
                ctx.lineTo(this.x - 16, this.y - 48);
                ctx.lineTo(this.x + 16, this.y - 48);
                ctx.closePath();
                ctx.fill();

                // ─ 破损裂缝（与 creatures.js featherCracks 同风格）
                ctx.strokeStyle = 'rgba(200,160,80,0.25)';
                ctx.lineWidth = 0.8;
                [[-8, -35, 0.8, 12], [5, -20, 2.1, 10], [-3, -10, 1.3, 8]].forEach(([cx, cy, angle, len]) => {
                    ctx.beginPath();
                    ctx.moveTo(this.x + cx, this.y + cy);
                    ctx.lineTo(this.x + cx + Math.cos(angle) * len, this.y + cy + Math.sin(angle) * len);
                    ctx.stroke();
                });

                // ─ 钟面（未修复：暗淡，glow较小）
                const faceAlpha = 0.15 + glow * 0.20;   // 正式钟塔约0.5，此处更暗
                ctx.fillStyle = `rgba(244,228,188,${faceAlpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y - 20, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = `rgba(139,115,85,${0.4 + glow * 0.3})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // ─ 钟针（随 glowTimer 缓慢转动，暗示时间凝固）
                const handAngle = t * 0.15 - Math.PI / 2;  // 极慢转动
                ctx.strokeStyle = 'rgba(58,42,26,0.8)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 20);
                ctx.lineTo(this.x + Math.cos(handAngle) * 7, this.y - 20 + Math.sin(handAngle) * 7);
                ctx.stroke();

                // ─ 悬浮指引箭头
                const arrowY = this.y - 80 + Math.sin(t * 2.5) * 4;
                ctx.shadowBlur = 8;
                ctx.fillStyle = `rgba(196,163,90,${0.55 + pulse * 0.4})`;
                ctx.beginPath();
                ctx.moveTo(this.x, arrowY + 12);
                ctx.lineTo(this.x - 8, arrowY);
                ctx.lineTo(this.x + 8, arrowY);
                ctx.closePath();
                ctx.fill();

                // ─ 玩家靠近时显示世界坐标系 [E] 提示
                const _player = _game && _game.player;
                if (_player) {
                    const _dx = this.x - _player.x;
                    const _dy = this.y - _player.y;
                    const _dist = Math.sqrt(_dx * _dx + _dy * _dy);
                    if (_dist < 80) {
                        const _alpha = Math.min(1, 1.2 - _dist / 80);
                        ctx.shadowColor = 'rgba(0,0,0,0.9)';
                        ctx.shadowBlur = 4;
                        ctx.fillStyle = `rgba(244,228,188,${_alpha})`;
                        ctx.font = 'bold 13px "PingFang SC", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('[E]', this.x, this.y - 94);
                    }
                }

                ctx.restore();
            }
        };
        
        // 添加到世界
        this.game.world.tutorialClock = this.tutorialClock;
        
        // 显示指示
        this._showNarration('古钟在那里。它在等你。');
    }
    
    _playTransitionAnimation() {
        // 节奏: 0s鼓声 → 0.05s墨迹扩散 → 1.85s全黑
        //       → 2.4s上句入场 → 3.2s"第一日"入场 → 4.0s下句入场
        //       → 5.6s淡出 → 6.6s开始正式游戏
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-transition-overlay';
        
        // 上句（夹持布局：上方氛围文字）
        const subTop = document.createElement('p');
        subTop.className = 'ink-sub ink-sub-top';
        subTop.textContent = '钟声响了一下，就停了。';
        
        // 第一日模块（中心视觉焦点）
        const chapter = document.createElement('div');
        chapter.className = 'chapter-reveal';
        chapter.innerHTML = '<span class="day-label">第一日</span>';
        
        // 下句（夹持布局：下方余韵文字）
        const subBot = document.createElement('p');
        subBot.className = 'ink-sub ink-sub-bot';
        subBot.textContent = '你是第一个听见的人。';
        
        overlay.appendChild(subTop);
        overlay.appendChild(chapter);
        overlay.appendChild(subBot);
        document.body.appendChild(overlay);
        
        // 阶段一: 鼓声 + 墨迹扩散开始
        GameAudio.playClockChime?.();
        setTimeout(() => overlay.classList.add('ink-spreading'), 50);
        
        // 阶段二: 墨迹盖满，切换到纯黑
        setTimeout(() => {
            overlay.classList.remove('ink-spreading');
            overlay.classList.add('ink-full');
        }, 1850);
        
        // 阶段三: 上句滑入 (2.4s)
        setTimeout(() => subTop.classList.add('visible'), 2400);
        
        // 阶段四: "第一日"放大揭幕 (3.2s，上句后 0.8s)
        setTimeout(() => chapter.classList.add('visible'), 3200);
        
        // 阶段五: 下句滑入 (4.0s，上句后 1.6s，形成夹持完成感)
        setTimeout(() => subBot.classList.add('visible'), 4000);
        
        // 阶段六: 整体淡出 (5.6s)
        setTimeout(() => overlay.classList.add('fade-out'), 5600);
        
        // 阶段七: 开始正式游戏 (6.6s)
        setTimeout(() => {
            overlay.remove();
            this._startMainGame();
        }, 6600);
    }
    
    _startMainGame() {
        // 调试序章模式：弹出选择弹窗，让开发者决定后续操作
        if (this.game._isDebugTutorial) {
            this._showDebugTransitionChoice();
            return;
        }

        // 标记教程完成
        localStorage.setItem('shiseji_tutorial_done', '1');
        this.game.isTutorialMode = false;
        
        // 重新创建正常大小的世界（尺寸与 _startNormalGame 保持一致，兼容手机端缩放）
        const _vw = this.game.width / this.game.cameraZoom;
        const _vh = this.game.height / this.game.cameraZoom;
        this.game.world = new World(Math.max(_vw * 1.5, 2400), Math.max(_vh * 1.5, 1800));
        this.game.world.day = 1;
        this.game.world.gameTime = 360; // 早晨6点
        this.game.world.isTutorial = false;
        
        // 重置玩家位置
        this.game.player.x = 200;
        this.game.player.y = this.game.world.height / 2;
        
        // 重置相机跟随新玩家位置
        const vw = this.game.width / this.game.cameraZoom;
        const vh = this.game.height / this.game.cameraZoom;
        this.game.camera.x = Math.max(0, this.game.player.x - vw / 2);
        this.game.camera.y = Math.max(0, this.game.player.y - vh / 2);
        
        // 清除教程物品
        this.game.player.inventory.clear();
        
        // 给正式游戏初始物资
        this.game.player.inventory.addItem('stardustGrass', 3);
        this.game.player.inventory.addItem('morningDew', 2);
        
        // 重置玩家数值
        this.game.player.stats.color = 100;
        this.game.player.stats.ink = 100;
        this.game.player.stats.warmth = 100;
        
        // 创建任务系统
        this.game.quest = new QuestSystem(this.game);
        
        // 显示进度UI
        this.game._showProgressUI();
        
        // 启动自动存档
        this.game._startAutoSave();
        
        // 开始背景音乐
        GameAudio.startBackgroundMusic('day');
        
        // 显示开场提示
        this.game.ui?.showDialog('你跌入了褪色界...在三日内修复古钟，才能回到人间。');
    }
    
    _showDebugTransitionChoice() {
        this.game.paused = true;
        
        const modal = document.createElement('div');
        modal.id = 'debug-transition-modal';
        modal.innerHTML = `
            <div class="dtm-card">
                <div class="dtm-title">⚙ 序章调试完成</div>
                <div class="dtm-body">选择后续操作：</div>
                <button class="dtm-btn dtm-btn-primary" id="dtm-continue">
                    进入第一日<small>覆盖主存档，完整测试过渡流程</small>
                </button>
                <button class="dtm-btn dtm-btn-secondary" id="dtm-keep">
                    仅测试模式<small>游戏暂停，可从外挂面板"退出&amp;恢复"原存档</small>
                </button>
            </div>`;
        document.body.appendChild(modal);
        
        document.getElementById('dtm-continue').addEventListener('click', () => {
            modal.remove();
            // 清除调试标志，与正常路径合并
            document.getElementById('debug-tutorial-watermark')?.classList.remove('visible');
            if (this.game._debugBeforeUnload) {
                window.removeEventListener('beforeunload', this.game._debugBeforeUnload);
                this.game._debugBeforeUnload = null;
            }
            this.game._isDebugTutorial = false;
            this.game._debugSaveBackup = null;
            this.game.paused = false;
            // 正常执行 _startMainGame（调试标志已清除，不会再次拦截）
            this._startMainGame();
        });
        
        document.getElementById('dtm-keep').addEventListener('click', () => {
            modal.remove();
            document.getElementById('debug-tutorial-watermark')?.classList.remove('visible');
            this.game.isTutorialMode = false;
            this.game.ui?.showDialog('[DEBUG] 序章检查完成 ✓  点击外挂面板"退出&恢复"回到主存档', 5000);
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // 外部调用接口
    // ═══════════════════════════════════════════════════════════
    
    notifyInventoryOpened() {
        if (this.active && this.currentStep === 2) {
            this._inventoryOpened = true;
        }
    }
    
    notifyItemCrafted(itemId) {
        if (this.active && this.currentStep === 3) {
            this._itemCrafted = true;
        }
    }
    
    notifyClockInteracted() {
        if (this.active && this.currentStep === 4) {
            this._oilUsed = true;
        }
    }
}

// 导出
if (typeof window !== 'undefined') {
    window.TutorialSystem = TutorialSystem;
}
