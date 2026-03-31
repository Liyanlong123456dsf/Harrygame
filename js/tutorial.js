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
                hint: 'WASD 或 摇杆移动',
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
        
        // 检查当前步骤是否完成
        if (step.check && step.check()) {
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
        
        // 显示旁白
        this._showNarration(step.narration);
        
        // 显示目标提示
        setTimeout(() => {
            this._showObjective(step.objective, step.hint);
            this._highlightControls(step);
        }, 1500);
    }
    
    _completeStep() {
        const step = this.steps[this.currentStep];
        
        // 移除高亮
        this._removeHighlights();
        
        // 执行完成回调
        if (step.onComplete) {
            step.onComplete();
        }
        
        // 播放完成音效
        GameAudio.playCollect();
        
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
        // 准备过渡
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
        panel.innerHTML = `
            <div class="objective-text">${objective}</div>
            <div class="objective-hint">${hint}</div>
        `;
        panel.classList.remove('hidden');
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
        const existing = document.querySelector(`.tutorial-key-hint[data-key="${key}"]`);
        if (existing) return;
        
        const hint = document.createElement('div');
        hint.className = 'tutorial-key-hint';
        hint.dataset.key = key;
        hint.textContent = key;
        document.getElementById('game-container').appendChild(hint);
    }
    
    _removeHighlights() {
        // 移除键盘提示
        document.querySelectorAll('.tutorial-key-hint').forEach(el => el.remove());
        
        // 移除按钮高亮
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        // 隐藏目标面板
        const panel = document.getElementById('tutorial-objective');
        if (panel) panel.classList.add('hidden');
    }
    
    // ═══════════════════════════════════════════════════════════
    // 教程专用对象
    // ═══════════════════════════════════════════════════════════
    
    _spawnTutorialGear() {
        if (!this.game.world) return;
        
        // 在玩家附近生成齿轮
        const px = this.game.player.x;
        const py = this.game.player.y;
        
        // 创建教程专用资源节点（带collect方法）
        this.tutorialGear = {
            type: 'RUSTY_GEAR',
            x: px + 80,
            y: py,
            available: true,
            isTutorial: true,
            radius: 15,
            glowTimer: 0,
            // 模拟ResourceNode的collect方法
            collect: function(player) {
                if (!this.available) return null;
                this.available = false;
                GameAudio.playCollect();
                Particles.emitWatercolorSpread?.(this.x, this.y, '#8B7355') ||
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
        
        this.tutorialClock = {
            type: 'tutorialClock',
            x: px + 100,
            y: py,
            interactable: true,
            isTutorial: true
        };
        
        // 添加到世界
        this.game.world.tutorialClock = this.tutorialClock;
        
        // 显示指示
        this._showNarration('古钟在那里。它在等你。');
    }
    
    // ═══════════════════════════════════════════════════════════
    // 过渡动画
    // ═══════════════════════════════════════════════════════════
    
    _playTransitionAnimation() {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-transition-overlay';
        overlay.innerHTML = `
            <div class="transition-cracks"></div>
            <div class="transition-text">
                <span class="fall-text">——然后你醒了。</span>
                <span class="fall-text delay">或者说，你以为自己醒了。</span>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // 播放音效
        GameAudio.playClockChime?.();
        
        // 动画阶段
        setTimeout(() => overlay.classList.add('cracking'), 500);
        setTimeout(() => overlay.classList.add('fading'), 2000);
        setTimeout(() => overlay.classList.add('falling'), 3500);
        
        // 显示"第一日"
        setTimeout(() => {
            overlay.innerHTML = `
                <div class="chapter-reveal">
                    <span class="day-label">第一日</span>
                </div>
            `;
            overlay.classList.remove('cracking', 'fading', 'falling');
            overlay.classList.add('day-reveal');
        }, 4500);
        
        // 开始正式游戏
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                this._startMainGame();
            }, 1000);
        }, 6500);
    }
    
    _startMainGame() {
        // 标记教程完成
        localStorage.setItem('shiseji_tutorial_done', '1');
        this.game.isTutorialMode = false;
        
        // 重新创建正常大小的世界
        this.game.world = new World(2400, 1800);
        this.game.world.day = 1;
        this.game.world.gameTime = 360; // 早晨6点
        this.game.world.isTutorial = false;
        this.game.world.generateWorld();
        this.game.world.generateResources();
        
        // 重置玩家位置
        this.game.player.x = 200;
        this.game.player.y = this.game.world.height / 2;
        
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
