// 成就系统 - 多巴胺奖励机制

class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.unlocked = new Set();
        this.progress = {};
        this.streaks = {
            collect: 0,
            lastCollectTime: 0,
            kill: 0,
            lastKillTime: 0
        };
        
        // 成就定义
        this.achievements = {
            // ═══════════════════════════════════════════════════════════
            // 即时里程碑
            // ═══════════════════════════════════════════════════════════
            FIRST_COLLECT: {
                id: 'first_collect',
                name: '初次拾取',
                description: '收集了第一份资源',
                icon: '🌿',
                condition: (p) => p.stats.totalCollected >= 1,
                reward: { color: 5 },
                narration: '颜色还在。至少这里还有。'
            },
            COLLECTOR_5: {
                id: 'collector_5',
                name: '采集者',
                description: '收集5种不同资源',
                icon: '🎨',
                condition: (p) => (p.stats.uniqueResources?.size || 0) >= 5,
                reward: { maxPigment: 10 },
                narration: '你的口袋渐渐沉了。'
            },
            FIRST_CRAFT: {
                id: 'first_craft',
                name: '初次合成',
                description: '合成了第一个道具',
                icon: '⚙️',
                condition: (p) => p.stats.totalCrafted >= 1,
                reward: { ink: 10 },
                narration: '师父说过，万物皆可修补。'
            },
            CRAFTER_3: {
                id: 'crafter_3',
                name: '匠心',
                description: '合成3个道具',
                icon: '🔧',
                condition: (p) => p.stats.totalCrafted >= 3,
                reward: { craftSpeed: 1.1 },
                narration: '你的手指记起了旧日的技艺。'
            },
            
            // ═══════════════════════════════════════════════════════════
            // 生存里程碑
            // ═══════════════════════════════════════════════════════════
            SURVIVE_DUSK: {
                id: 'survive_dusk',
                name: '黄昏幸存',
                description: '存活至第一个黄昏',
                icon: '🌅',
                condition: (p, w) => w.day >= 1 && w.getCurrentPeriod() === 'dusk',
                reward: { color: 10, ink: 10, warmth: 10 },
                narration: '太阳落下。你还站着。'
            },
            SURVIVE_NIGHT: {
                id: 'survive_night',
                name: '夜行者',
                description: '在夜晚存活',
                icon: '🌙',
                condition: (p, w) => w.day >= 1 && w.getCurrentPeriod() === 'night' && p.stats.color > 20,
                reward: { nightVision: 1.1 },
                narration: '黑暗中，你学会了用心去看。'
            },
            SURVIVE_DAY2: {
                id: 'survive_day2',
                name: '第二日',
                description: '活过了第一天',
                icon: '☀️',
                condition: (p, w) => w.day >= 2,
                reward: { color: 20, collectSpeed: 1.1 },
                narration: '又一个黎明。还有两天。'
            },
            
            // ═══════════════════════════════════════════════════════════
            // 战斗成就
            // ═══════════════════════════════════════════════════════════
            FIRST_KILL: {
                id: 'first_kill',
                name: '初战',
                description: '击败第一个褪色生物',
                icon: '⚔️',
                condition: (p) => p.stats.totalKills >= 1,
                reward: { attackDamage: 2 },
                narration: '它们也会消散。像颜色一样。'
            },
            HUNTER_5: {
                id: 'hunter_5',
                name: '狩猎者',
                description: '击败5个褪色生物',
                icon: '🗡️',
                condition: (p) => p.stats.totalKills >= 5,
                reward: { attackSpeed: 1.1 },
                narration: '你的笔触越来越果决。'
            },
            
            // ═══════════════════════════════════════════════════════════
            // 探索成就
            // ═══════════════════════════════════════════════════════════
            FIRST_PIECE: {
                id: 'first_piece',
                name: '碎片',
                description: '找到第一个古钟碎片',
                icon: '🔔',
                condition: (p) => p.clockPieces >= 1,
                reward: { color: 15 },
                narration: '钟片还在颤动。它记得完整的自己。'
            },
            ALL_PIECES: {
                id: 'all_pieces',
                name: '完整',
                description: '收集所有古钟碎片',
                icon: '⏰',
                condition: (p) => p.clockPieces >= 3,
                reward: { color: 30, ink: 30, warmth: 30 },
                narration: '碎片相认。钟声将起。'
            },
            
            // ═══════════════════════════════════════════════════════════
            // 特殊成就
            // ═══════════════════════════════════════════════════════════
            PIGMENT_MASTER: {
                id: 'pigment_master',
                name: '调色师',
                description: '使用全部三种颜料',
                icon: '🖌️',
                condition: (p) => p.stats.pigmentsUsed?.red && p.stats.pigmentsUsed?.yellow && p.stats.pigmentsUsed?.blue,
                reward: { pigmentPower: 1.2 },
                narration: '赤、黄、蓝。世界的根基。'
            },
            INK_GUARDIAN: {
                id: 'ink_guardian',
                name: '墨韵守护',
                description: '墨韵值从未低于50',
                icon: '🖋️',
                condition: (p) => p.stats.minInkEver >= 50 && p.stats.totalCollected >= 10,
                reward: { skill: 'meditate' },
                narration: '你学会了在混沌中保持平静。'
            },
            STREAK_5: {
                id: 'streak_5',
                name: '连采',
                description: '连续采集5次',
                icon: '⚡',
                condition: (p) => p.stats.maxCollectStreak >= 5,
                reward: { color: 8 },
                narration: '节奏。一切都有节奏。'
            },
            LUCKY: {
                id: 'lucky',
                name: '幸运',
                description: '触发随机双倍奖励',
                icon: '🍀',
                condition: (p) => p.stats.luckyTriggers >= 1,
                reward: { luckBonus: 1.05 },
                narration: '有时候，世界也会回应你。'
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════
    // 核心方法
    // ═══════════════════════════════════════════════════════════
    
    update() {
        if (!this.game.player || !this.game.world) return;
        
        const player = this.game.player;
        const world = this.game.world;
        
        // 检查所有成就
        for (const key in this.achievements) {
            const ach = this.achievements[key];
            if (this.unlocked.has(ach.id)) continue;
            
            if (ach.condition(player, world)) {
                this.unlock(ach);
            }
        }
        
        // 更新连击计时
        const now = Date.now();
        if (now - this.streaks.lastCollectTime > 5000) {
            this.streaks.collect = 0;
        }
        if (now - this.streaks.lastKillTime > 8000) {
            this.streaks.kill = 0;
        }
    }
    
    unlock(achievement) {
        if (this.unlocked.has(achievement.id)) return;
        
        this.unlocked.add(achievement.id);
        
        // 应用奖励
        this.applyReward(achievement.reward);
        
        // 显示成就UI
        this.showAchievementPopup(achievement);
        
        // 播放音效
        GameAudio.playAchievement?.() || GameAudio.playCraft();
        
        // 粒子效果
        if (this.game.player) {
            Particles.emitAchievement?.(this.game.player.x, this.game.player.y - 30) ||
            Particles.emit({
                x: this.game.player.x,
                y: this.game.player.y - 30,
                count: 15,
                color: '#FFD700',
                size: 4,
                life: 1.5,
                speed: 3,
                angleSpread: Math.PI * 2
            });
        }
        
        // 显示旁白
        if (achievement.narration) {
            setTimeout(() => {
                this.game.ui?.showDialog(achievement.narration, 3000);
            }, 1500);
        }
        
        console.log(`[成就] 解锁: ${achievement.name}`);
    }
    
    applyReward(reward) {
        if (!reward || !this.game.player) return;
        
        const p = this.game.player;
        
        // 数值奖励
        if (reward.color) p.addStat('color', reward.color);
        if (reward.ink) p.addStat('ink', reward.ink);
        if (reward.warmth) p.addStat('warmth', reward.warmth);
        
        // 永久加成
        if (reward.collectSpeed) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.collectSpeed = (p.permanentBonuses.collectSpeed || 1) * reward.collectSpeed;
        }
        if (reward.craftSpeed) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.craftSpeed = (p.permanentBonuses.craftSpeed || 1) * reward.craftSpeed;
        }
        if (reward.nightVision) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.nightVision = (p.permanentBonuses.nightVision || 1) * reward.nightVision;
        }
        if (reward.attackDamage) {
            p.attackDamage = (p.attackDamage || 10) + reward.attackDamage;
        }
        if (reward.attackSpeed) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.attackSpeed = (p.permanentBonuses.attackSpeed || 1) * reward.attackSpeed;
        }
        if (reward.pigmentPower) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.pigmentPower = (p.permanentBonuses.pigmentPower || 1) * reward.pigmentPower;
        }
        if (reward.luckBonus) {
            p.permanentBonuses = p.permanentBonuses || {};
            p.permanentBonuses.luck = (p.permanentBonuses.luck || 1) * reward.luckBonus;
        }
        if (reward.maxPigment) {
            p.maxPigment = (p.maxPigment || 100) + reward.maxPigment;
        }
        
        // 技能解锁
        if (reward.skill) {
            p.unlockedSkills = p.unlockedSkills || new Set();
            p.unlockedSkills.add(reward.skill);
        }
    }
    
    showAchievementPopup(achievement) {
        // 移除旧的成就弹窗
        const old = document.querySelector('.achievement-popup');
        if (old) old.remove();
        
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-title">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        document.getElementById('game-container')?.appendChild(popup) || document.body.appendChild(popup);
        
        // 动画
        requestAnimationFrame(() => popup.classList.add('show'));
        
        setTimeout(() => {
            popup.classList.remove('show');
            popup.classList.add('hide');
            setTimeout(() => popup.remove(), 500);
        }, 3000);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 连击系统
    // ═══════════════════════════════════════════════════════════
    
    onCollect(resourceType) {
        const now = Date.now();
        const p = this.game.player;
        if (!p) return { bonus: 1 };
        
        // 更新连击
        if (now - this.streaks.lastCollectTime < 5000) {
            this.streaks.collect++;
        } else {
            this.streaks.collect = 1;
        }
        this.streaks.lastCollectTime = now;
        
        // 更新统计
        p.stats = p.stats || {};
        p.stats.totalCollected = (p.stats.totalCollected || 0) + 1;
        p.stats.uniqueResources = p.stats.uniqueResources || new Set();
        p.stats.uniqueResources.add(resourceType);
        p.stats.maxCollectStreak = Math.max(p.stats.maxCollectStreak || 0, this.streaks.collect);
        
        // 计算连击奖励
        let bonus = 1;
        if (this.streaks.collect >= 3) {
            bonus = 1 + (this.streaks.collect - 2) * 0.1;
            this.showStreakText(this.streaks.collect);
        }
        
        // 随机双倍奖励 (5%概率)
        const luck = p.permanentBonuses?.luck || 1;
        if (Math.random() < 0.05 * luck) {
            bonus *= 2;
            p.stats.luckyTriggers = (p.stats.luckyTriggers || 0) + 1;
            this.showLuckyEffect();
        }
        
        // 即时微奖励：采集回复少量色值
        p.addStat('color', 2);
        
        return { bonus, streak: this.streaks.collect };
    }
    
    onKill(creatureType) {
        const now = Date.now();
        const p = this.game.player;
        if (!p) return;
        
        // 更新连击
        if (now - this.streaks.lastKillTime < 8000) {
            this.streaks.kill++;
        } else {
            this.streaks.kill = 1;
        }
        this.streaks.lastKillTime = now;
        
        // 更新统计
        p.stats = p.stats || {};
        p.stats.totalKills = (p.stats.totalKills || 0) + 1;
        
        // 击杀奖励
        p.addStat('ink', 5);
        
        // 随机掉落 (10%概率)
        const luck = p.permanentBonuses?.luck || 1;
        if (Math.random() < 0.1 * luck) {
            this.dropRandomLoot();
        }
    }
    
    onCraft(itemId) {
        const p = this.game.player;
        if (!p) return;
        
        p.stats = p.stats || {};
        p.stats.totalCrafted = (p.stats.totalCrafted || 0) + 1;
        
        // 随机额外产出 (8%概率)
        const luck = p.permanentBonuses?.luck || 1;
        if (Math.random() < 0.08 * luck) {
            p.inventory.addItem(itemId, 1);
            this.game.ui?.showDialog('幸运！额外获得了一个', 1500);
            this.showLuckyEffect();
        }
    }
    
    onPigmentUsed(color) {
        const p = this.game.player;
        if (!p) return;
        
        p.stats = p.stats || {};
        p.stats.pigmentsUsed = p.stats.pigmentsUsed || {};
        p.stats.pigmentsUsed[color] = true;
    }
    
    trackMinInk() {
        const p = this.game.player;
        if (!p || !p.stats) return;
        
        // 使用单独的追踪字段，避免与核心stats混淆
        if (p.stats.minInkEver === undefined) {
            p.stats.minInkEver = p.stats.ink;
        } else {
            p.stats.minInkEver = Math.min(p.stats.minInkEver, p.stats.ink);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 视觉效果
    // ═══════════════════════════════════════════════════════════
    
    showStreakText(count) {
        const text = document.createElement('div');
        text.className = 'streak-text';
        text.textContent = `${count}连采！`;
        
        if (this.game.player) {
            const canvas = document.getElementById('game-canvas');
            const rect = canvas?.getBoundingClientRect() || { left: 0, top: 0 };
            text.style.left = `${rect.left + rect.width / 2}px`;
            text.style.top = `${rect.top + rect.height / 2 - 50}px`;
        }
        
        document.body.appendChild(text);
        
        requestAnimationFrame(() => text.classList.add('show'));
        setTimeout(() => {
            text.classList.add('fade');
            setTimeout(() => text.remove(), 500);
        }, 800);
    }
    
    showLuckyEffect() {
        // 屏幕边缘金色闪烁
        const flash = document.createElement('div');
        flash.className = 'lucky-flash';
        document.body.appendChild(flash);
        
        requestAnimationFrame(() => flash.classList.add('show'));
        setTimeout(() => flash.remove(), 600);
        
        // 粒子
        if (this.game.player) {
            Particles.emit({
                x: this.game.player.x,
                y: this.game.player.y,
                count: 20,
                color: '#FFD700',
                size: 5,
                life: 1,
                speed: 4,
                angleSpread: Math.PI * 2
            });
        }
    }
    
    dropRandomLoot() {
        const loots = ['stardustGrass', 'morningDew', 'charBone', 'colorFruit'];
        const item = loots[Math.floor(Math.random() * loots.length)];
        
        this.game.player?.inventory.addItem(item, 1);
        this.game.ui?.showDialog(`掉落：${this.getItemName(item)}`, 1500);
    }
    
    getItemName(itemId) {
        const names = {
            stardustGrass: '星尘草',
            morningDew: '晨露珠',
            charBone: '炭骨枝',
            colorFruit: '彩实'
        };
        return names[itemId] || itemId;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 序列化
    // ═══════════════════════════════════════════════════════════
    
    serialize() {
        return {
            unlocked: Array.from(this.unlocked),
            streaks: { ...this.streaks }
        };
    }
    
    deserialize(data) {
        if (data.unlocked) {
            this.unlocked = new Set(data.unlocked);
        }
        if (data.streaks) {
            this.streaks = { ...data.streaks };
        }
    }
}

// 导出
if (typeof window !== 'undefined') {
    window.AchievementSystem = AchievementSystem;
}
