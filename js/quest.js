// 主线任务系统 - 追踪进度与指引

class QuestSystem {
    constructor(game) {
        this.game = game;
        
        // 主线阶段定义
        this.stages = [
            {
                id: 'explore',
                chapter: '序章',
                title: '初入褪色界',
                objective: '探索周围环境，熟悉操作',
                hint: 'WASD移动，靠近发光物体按E采集',
                check: (p, w) => {
                    // 采集过任意1个资源即完成
                    return p.inventory.items.size > 0;
                },
                weight: 5
            },
            {
                id: 'gather',
                chapter: '第一章',
                title: '拾色者',
                objective: '采集基础资源',
                hint: '采集星尘草、晨露珠、炭骨枝各2个',
                check: (p, w) => {
                    return p.inventory.getItemCount('stardustGrass') >= 2 &&
                           p.inventory.getItemCount('morningDew') >= 2 &&
                           p.inventory.getItemCount('charBranch') >= 2;
                },
                subGoals: (p) => {
                    const goals = [];
                    const sg = p.inventory.getItemCount('stardustGrass');
                    const md = p.inventory.getItemCount('morningDew');
                    const cb = p.inventory.getItemCount('charBranch');
                    if (sg < 2) goals.push(`星尘草 (${sg}/2)`);
                    if (md < 2) goals.push(`晨露珠 (${md}/2)`);
                    if (cb < 2) goals.push(`炭骨枝 (${cb}/2)`);
                    return goals;
                },
                weight: 10
            },
            {
                id: 'craft_basics',
                chapter: '第一章',
                title: '调色之法',
                objective: '制作一件生存道具',
                hint: '按C打开调色盘，合成纸灯或安心茶',
                check: (p, w) => {
                    return this._hasCraftedAny(p);
                },
                weight: 10
            },
            {
                id: 'find_pieces',
                chapter: '第二章',
                title: '碎片追寻',
                objective: '寻找古钟碎片',
                hint: '碎片散落在世界各处，靠近时会出现金色齿轮光晕',
                check: (p, w) => {
                    return p.clockPieces >= 3;
                },
                subGoals: (p) => {
                    return [`古钟碎片 (${p.clockPieces}/3)`];
                },
                getTarget: (p, w) => {
                    // 指向最近的未找到碎片
                    let nearest = null;
                    let minDist = Infinity;
                    for (const piece of w.clockPieces) {
                        if (piece.found) continue;
                        const d = p.distanceTo(piece.x, piece.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = piece;
                        }
                    }
                    return nearest ? { x: nearest.x, y: nearest.y, label: '古钟碎片', dist: minDist } : null;
                },
                weight: 25
            },
            {
                id: 'craft_oil',
                chapter: '第三章',
                title: '钟表匠的秘方',
                objective: '合成古钟润滑剂',
                hint: '需要：七彩液（三色彩实）+ 澄墨水（炭骨枝+晨露）+ 星尘草×3',
                check: (p, w) => {
                    // 累计拥有过3瓶润滑剂（已用+库存）
                    return (p.clockOilUsed + p.inventory.getItemCount('clockOil')) >= 3;
                },
                subGoals: (p) => {
                    const total = p.clockOilUsed + p.inventory.getItemCount('clockOil');
                    const goals = [`古钟润滑剂 (${total}/3)`];
                    // 显示中间材料提示
                    if (total < 3) {
                        const rl = p.inventory.getItemCount('rainbowLiquid');
                        const ci = p.inventory.getItemCount('clearInk');
                        if (rl < 1) goals.push('  → 先合成七彩液 (赤+金+蓝彩实)');
                        if (ci < 1) goals.push('  → 先合成澄墨水 (炭骨枝×2+晨露×2)');
                    }
                    return goals;
                },
                weight: 25
            },
            {
                id: 'repair_clock',
                chapter: '终章',
                title: '归途',
                objective: '前往古钟塔修复古钟',
                hint: '靠近地图右上方的钟塔，按E使用润滑剂修复',
                check: (p, w) => {
                    return p.clockOilUsed >= 3;
                },
                subGoals: (p) => {
                    return [`修复进度 (${p.clockOilUsed}/3)`];
                },
                getTarget: (p, w) => {
                    return {
                        x: w.clockTower.x,
                        y: w.clockTower.y,
                        label: '古钟塔',
                        dist: p.distanceTo(w.clockTower.x, w.clockTower.y)
                    };
                },
                weight: 25
            }
        ];
        
        this.currentStageIndex = 0;
        this.completedStages = new Set();
        this._craftedItemFlag = false;
        
        // DOM缓存
        this.els = {
            tracker: document.getElementById('quest-tracker'),
            chapter: document.getElementById('quest-chapter'),
            progressFill: document.getElementById('quest-progress-fill'),
            progressText: document.getElementById('quest-progress-text'),
            miniFill: document.getElementById('quest-mini-fill'),
            miniPct: document.getElementById('quest-mini-pct'),
            body: document.getElementById('quest-body'),
            title: document.getElementById('quest-title'),
            objective: document.getElementById('quest-objective'),
            hint: document.getElementById('quest-hint'),
            steps: document.getElementById('quest-steps'),
            arrow: document.getElementById('quest-arrow'),
            arrowIcon: document.getElementById('quest-arrow-icon'),
            arrowLabel: document.getElementById('quest-arrow-label')
        };
        
        // 手机端：触摸切换展开/折叠
        if (this.els.tracker) {
            this.els.tracker.addEventListener('touchstart', (e) => {
                // 防止与内部按钮冲突
                if (e.target.closest('button')) return;
                this.els.tracker.classList.toggle('expanded');
            }, { passive: true });
        }
        
        this.lastNotifiedStage = -1;
    }
    
    // 标记已合成过物品
    onCraftItem() {
        this._craftedItemFlag = true;
    }
    
    _hasCraftedAny(player) {
        // 检查是否拥有或曾拥有合成物
        if (this._craftedItemFlag) return true;
        const craftedIds = Object.values(CraftedItems).map(c => c.id);
        for (const id of craftedIds) {
            if (player.inventory.getItemCount(id) > 0) return true;
        }
        if (player.placedItems.length > 0) return true;
        if (player.equippedWeapon) return true;
        return false;
    }
    
    update() {
        const player = this.game.player;
        const world = this.game.world;
        if (!player || !world) return;
        
        // 检查所有阶段完成状态
        for (let i = 0; i < this.stages.length; i++) {
            const stage = this.stages[i];
            if (!this.completedStages.has(i) && stage.check(player, world)) {
                this.completedStages.add(i);
                
                // 通知
                if (i > this.lastNotifiedStage) {
                    this.lastNotifiedStage = i;
                    if (this.game.ui) {
                        this.game.ui.showDialog(`✦ 任务完成：${stage.title}`);
                    }
                }
            }
        }
        
        // 推进当前阶段
        while (this.currentStageIndex < this.stages.length &&
               this.completedStages.has(this.currentStageIndex)) {
            this.currentStageIndex++;
        }
        
        // 更新UI
        this.updateUI(player, world);
    }
    
    updateUI(player, world) {
        const totalWeight = this.stages.reduce((s, st) => s + st.weight, 0);
        let doneWeight = 0;
        for (const i of this.completedStages) {
            doneWeight += this.stages[i].weight;
        }
        const progressPercent = Math.round((doneWeight / totalWeight) * 100);
        
        // 进度条（完整版 + mini 同步）
        this.els.progressFill.style.width = progressPercent + '%';
        this.els.progressText.textContent = progressPercent + '%';
        if (this.els.miniFill)  this.els.miniFill.style.width  = progressPercent + '%';
        if (this.els.miniPct)   this.els.miniPct.textContent   = progressPercent + '%';
        
        // 步骤列表
        const stepEls = this.els.steps.querySelectorAll('.quest-step');
        stepEls.forEach((el, i) => {
            const isCompleted = this.completedStages.has(i);
            const isActive = i === this.currentStageIndex;
            
            el.classList.toggle('completed', isCompleted);
            el.classList.toggle('active', isActive);
            
            const check = el.querySelector('.step-check');
            check.textContent = isCompleted ? '✓' : (isActive ? '▸' : '○');
            
            // 更新计数
            const countEl = el.querySelector('.step-count');
            if (countEl && this.stages[i].subGoals) {
                const goals = this.stages[i].subGoals(player);
                if (goals.length > 0) {
                    countEl.textContent = goals[0].includes('/') ?
                        goals[0].match(/\(.*?\)/)?.[0] || '' : '';
                }
            }
            
            // 完成闪光
            if (isCompleted && !el.dataset.flashed) {
                el.dataset.flashed = 'true';
                el.classList.add('quest-step-flash');
                setTimeout(() => el.classList.remove('quest-step-flash'), 800);
            }
        });
        
        // 当前阶段信息
        if (this.currentStageIndex < this.stages.length) {
            const stage = this.stages[this.currentStageIndex];
            
            this.els.chapter.textContent = stage.chapter;
            this.els.title.textContent = stage.title;
            this.els.objective.textContent = '▷ ' + stage.objective;
            
            // 提示 + 子目标
            let hintText = stage.hint;
            if (stage.subGoals) {
                const goals = stage.subGoals(player);
                if (goals.length > 0) {
                    hintText = goals.join('\n');
                }
            }
            this.els.hint.textContent = hintText;
            
            // 方向指引
            if (stage.getTarget) {
                const target = stage.getTarget(player, world);
                if (target) {
                    this.els.arrow.classList.remove('hidden');
                    
                    // 计算角度
                    const angle = Math.atan2(target.y - player.y, target.x - player.x);
                    const deg = (angle * 180 / Math.PI);
                    this.els.arrowIcon.style.transform = `rotate(${deg}deg)`;
                    
                    const distDisplay = Math.round(target.dist);
                    this.els.arrowLabel.textContent = `${target.label} — ${distDisplay}m`;
                } else {
                    this.els.arrow.classList.add('hidden');
                }
            } else {
                this.els.arrow.classList.add('hidden');
            }
        } else {
            // 全部完成
            this.els.chapter.textContent = '终章';
            this.els.title.textContent = '古钟已修复';
            this.els.objective.textContent = '归途已经开启...';
            this.els.hint.textContent = '';
            this.els.arrow.classList.add('hidden');
        }
    }
    
    // 在Canvas上绘制指向目标的屏幕内箭头
    drawArrow(ctx) {
        const player = this.game.player;
        const world = this.game.world;
        if (!player || !world) return;
        if (this.currentStageIndex >= this.stages.length) return;
        
        const stage = this.stages[this.currentStageIndex];
        if (!stage.getTarget) return;
        
        const target = stage.getTarget(player, world);
        if (!target || target.dist < 150) return;
        
        // 屏幕坐标
        const screenX = target.x - this.game.camera.x;
        const screenY = target.y - this.game.camera.y;
        
        // 判断是否在屏幕外
        const margin = 60;
        const inScreen = screenX > margin && screenX < this.game.width - margin &&
                         screenY > margin && screenY < this.game.height - margin;
        if (inScreen) return;
        
        // 计算箭头在屏幕边缘的位置
        const cx = this.game.width / 2;
        const cy = this.game.height / 2;
        const angle = Math.atan2(screenY - cy, screenX - cx);
        
        // 沿角度方向延伸到屏幕边缘
        const edgeDist = 200;
        let ax = cx + Math.cos(angle) * edgeDist;
        let ay = cy + Math.sin(angle) * edgeDist;
        
        // Clamp到屏幕边缘内
        ax = Utils.clamp(ax, margin, this.game.width - margin);
        ay = Utils.clamp(ay, margin, this.game.height - margin);
        
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        
        // 外发光
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        
        // 箭头三角
        ctx.fillStyle = 'rgba(196, 163, 90, 0.85)';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-8, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        
        // 描边
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // 距离文字
        ctx.rotate(-angle);
        ctx.fillStyle = 'rgba(244, 228, 188, 0.9)';
        ctx.font = '11px "ZCOOL XiaoWei", serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(target.dist)}m`, 0, 22);
        
        ctx.restore();
    }
}
