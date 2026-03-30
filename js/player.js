// 玩家角色 - 林渡

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 20;
        this.speed = 4;
        this.baseSpeed = 4;
        
        // 三项核心数值
        this.stats = {
            color: 100,      // 色值
            ink: 100,        // 墨韵值
            warmth: 100      // 纸温值
        };
        this.maxStats = {
            color: 100,
            ink: 100,
            warmth: 100
        };
        
        // 情绪颜料
        this.pigments = {
            red: 100,
            yellow: 100,
            blue: 100
        };
        this.maxPigment = 100;
        
        // 状态
        this.emotionState = 'calm'; // calm, anxious, fear, ecstatic
        this.slowdown = 1;
        this.slowdownTimer = 0;
        this.flashTimer = 0;
        this.flashedPart = null;
        this.isMoving = false;
        this.facingRight = true;
        
        // 动画
        this.animPhase = 0;
        this.walkCycle = 0;
        this.inkParticleTimer = 0;
        this.brushAngle = 0;
        
        // 背包
        this.inventory = new Inventory(20);
        
        // 装备
        this.equippedWeapon = null;
        this.attackCooldown = 0;
        this.attackDamage = 10;
        
        // 放置的物品
        this.placedItems = [];
        
        // 古钟碎片
        this.clockPieces = 0;
        this.clockOilUsed = 0;
        
        // 状态效果
        this.statusEffects = new Map();
    }
    
    update(dt, input, world) {
        this.animPhase += dt * 3;
        this.attackCooldown -= dt;
        
        // 处理移动
        this.handleMovement(dt, input, world);
        
        // 更新减速效果
        if (this.slowdownTimer > 0) {
            this.slowdownTimer -= dt * 1000;
            if (this.slowdownTimer <= 0) {
                this.slowdown = 1;
            }
        }
        
        // 更新闪烁效果
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }
        
        // 数值自然消耗
        this.updateStats(dt, world);
        
        // 更新情绪状态
        this.updateEmotionState();
        
        // 墨迹粒子
        if (this.isMoving) {
            this.inkParticleTimer += dt;
            if (this.inkParticleTimer > 0.1) {
                this.inkParticleTimer = 0;
                this.emitInkParticle();
            }
        }
        
        // 更新放置物品
        for (let i = this.placedItems.length - 1; i >= 0; i--) {
            const item = this.placedItems[i];
            item.duration -= dt;
            
            if (item.type === 'paperLantern') {
                // 纸灯回复纸温值
                if (this.distanceTo(item.x, item.y) < item.lightRadius) {
                    this.addStat('warmth', item.warmthBonus * dt / 60);
                }
                
                // 光晕粒子
                if (Utils.chance(0.02)) {
                    Particles.emitLanternGlow(item.x, item.y);
                }
            }
            
            if (item.duration <= 0) {
                this.placedItems.splice(i, 1);
            }
        }
        
        // 检查死亡
        if (this.stats.color <= 0) {
            return 'death';
        }
        
        return null;
    }
    
    handleMovement(dt, input, world) {
        let dx = 0;
        let dy = 0;
        
        if (input.keys['w'] || input.keys['arrowup']) dy -= 1;
        if (input.keys['s'] || input.keys['arrowdown']) dy += 1;
        if (input.keys['a'] || input.keys['arrowleft']) dx -= 1;
        if (input.keys['d'] || input.keys['arrowright']) dx += 1;
        
        this.isMoving = dx !== 0 || dy !== 0;
        
        if (this.isMoving) {
            // 归一化
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
            
            // 应用速度（摇杆模拟量因子：手机轻推时降速，精准拾取）
            const joystickFactor = (input.joystickFactor !== undefined) ? input.joystickFactor : 1;
            const currentSpeed = this.speed * this.slowdown * joystickFactor;
            this.vx = dx * currentSpeed;
            this.vy = dy * currentSpeed;
            
            // 更新位置
            this.x += this.vx;
            this.y += this.vy;
            
            // 边界限制
            this.x = Utils.clamp(this.x, 50, world.width - 50);
            this.y = Utils.clamp(this.y, 50, world.height - 50);
            
            // 更新朝向
            if (dx !== 0) {
                this.facingRight = dx > 0;
            }
            
            // 行走循环动画
            this.walkCycle += dt * 10;
            
            // 奔跑消耗色值
            if (input.keys['shift']) {
                this.speed = this.baseSpeed * 1.5;
                this.addStat('color', -5 * dt);
            } else {
                this.speed = this.baseSpeed;
            }
        } else {
            this.vx = 0;
            this.vy = 0;
            this.walkCycle = 0;
        }
    }
    
    updateStats(dt, world) {
        const hour = Math.floor((world.gameTime % 1440) / 60);
        const period = Utils.getTimePeriod(hour);
        
        // 基础消耗
        this.addStat('color', -0.5 * dt);
        
        // 夜晚消耗
        if (period === 'night') {
            // 检查是否在纸灯范围内
            let inLanternLight = false;
            for (const item of this.placedItems) {
                if (item.type === 'paperLantern' && this.distanceTo(item.x, item.y) < item.lightRadius) {
                    inLanternLight = true;
                    break;
                }
            }
            
            if (!inLanternLight) {
                this.addStat('ink', -2 * dt);
                this.addStat('warmth', -1.5 * dt);
            }
        }
        
        // 墨韵值过低影响
        if (this.stats.ink < 30) {
            // 焦虑/恐惧状态
            if (Utils.chance(0.001)) {
                GameAudio.playWarning();
            }
        }
        
        // 纸温值过低 -> 色值急速流失
        if (this.stats.warmth <= 0) {
            this.addStat('color', -5 * dt);
        }
    }
    
    updateEmotionState() {
        const inkPercent = this.stats.ink / this.maxStats.ink * 100;
        
        if (inkPercent > 70) {
            this.emotionState = 'calm';
        } else if (inkPercent > 30) {
            this.emotionState = 'anxious';
        } else {
            this.emotionState = 'fear';
        }
    }
    
    addStat(stat, amount) {
        if (this.stats[stat] !== undefined) {
            // 无敌模式：拦截所有负值扣减
            if (amount < 0 && window.game && window.game.cheat && window.game.cheat.invincible) return;
            this.stats[stat] = Utils.clamp(
                this.stats[stat] + amount,
                0,
                this.maxStats[stat]
            );
        }
    }
    
    addPigment(color, amount) {
        if (this.pigments[color] !== undefined) {
            this.pigments[color] = Utils.clamp(
                this.pigments[color] + amount,
                0,
                this.maxPigment
            );
        }
    }
    
    usePigment(color) {
        if (this.pigments[color] >= 20) {
            this.pigments[color] -= 20;
            
            const colors = {
                red: '#C2452D',
                yellow: '#C4A35A',
                blue: '#4A7FBF'
            };
            
            Particles.emitEmotionPigment(this.x, this.y, colors[color], 80);
            GameAudio.playCollect();
            
            return true;
        }
        return false;
    }
    
    applySlowdown(factor, duration) {
        this.slowdown = factor;
        this.slowdownTimer = duration;
    }
    
    triggerFlash() {
        this.flashTimer = 0.5;
        this.flashedPart = Utils.randomChoice(['head', 'body', 'arm']);
    }
    
    removeStatus(status) {
        this.statusEffects.delete(status);
        if (status === 'fear' && this.emotionState === 'fear') {
            this.addStat('ink', 10);
        }
    }
    
    attack(creatures) {
        if (this.attackCooldown > 0) return;
        
        this.attackCooldown = 0.5;
        const attackRange = 50;
        const damage = this.equippedWeapon ? this.attackDamage + (this.equippedWeapon.damage || 0) : this.attackDamage;
        
        // 攻击动画（由 draw() 根据 attackCooldown 实时驱动）
        this.brushAngle = -1.6; // 初始拉回位置，draw() 每帧更新
        
        // 检测命中
        for (const creature of creatures) {
            if (!creature.alive) continue;
            if (creature instanceof Chrysalis) continue; // 不攻击友好生物
            
            if (this.distanceTo(creature.x, creature.y) < attackRange + creature.radius) {
                creature.takeDamage(damage, this);
                
                // 特殊效果：赤色颜料对纸络蛛造成燃烧
                if (creature instanceof PaperSpider && this.pigments.red > 10) {
                    creature.applyBurn();
                    this.pigments.red -= 10;
                }
                
                Particles.emitInkSplatter(creature.x, creature.y);
                GameAudio.playHit();
            }
        }
    }
    
    interact(target) {
        if (target instanceof Chrysalis) {
            target.mark();
            this.addStat('ink', 5);
        }
    }
    
    placeItem(itemId) {
        const itemData = CraftedItems[Object.keys(CraftedItems).find(k => CraftedItems[k].id === itemId)];
        if (!itemData || !itemData.placeable) return false;
        
        if (!this.inventory.hasItem(itemId)) return false;
        
        this.inventory.removeItem(itemId, 1);
        
        this.placedItems.push({
            type: itemId,
            x: this.x,
            y: this.y + 30,
            lightRadius: itemData.lightRadius || 100,
            warmthBonus: itemData.warmthBonus || 0,
            duration: itemData.duration || 300
        });
        
        Particles.emitWatercolorSpread(this.x, this.y + 30, itemData.color);
        
        return true;
    }
    
    useItem(itemId) {
        const itemKey = Object.keys(CraftedItems).find(k => CraftedItems[k].id === itemId);
        const itemData = CraftedItems[itemKey];
        
        if (!itemData || !this.inventory.hasItem(itemId)) return false;
        
        if (itemData.onUse) {
            this.inventory.removeItem(itemId, 1);
            itemData.onUse(this, window.game?.world);
            return true;
        }
        
        if (itemData.placeable) {
            return this.placeItem(itemId);
        }
        
        if (itemData.weapon) {
            this.equippedWeapon = itemData;
            // 通知 UI 刷新装备栏
            if (window.game && window.game.ui) {
                window.game.ui.updateEquipPanel();
                window.game.ui.showDialog(`已装备：${itemData.name}（攻击力 +${itemData.damage || 0}）`);
            }
            return true;
        }
        
        return false;
    }
    
    useClockOil() {
        if (this.inventory.hasItem('clockOil') && this.clockOilUsed < 3) {
            this.inventory.removeItem('clockOil', 1);
            this.clockOilUsed++;
            return true;
        }
        return false;
    }
    
    distanceTo(x, y) {
        return Utils.distance(this.x, this.y, x, y);
    }
    
    emitInkParticle() {
        Particles.emit({
            x: this.x + Utils.random(-5, 5),
            y: this.y + this.radius + Utils.random(0, 5),
            count: 1,
            speed: 0.3,
            life: 0.4,
            size: 4,
            color: '#1A1A2E',
            type: 'ink',
            gravity: 0.5
        });
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 水平翻转
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // 色值影响：褪色效果
        const colorPercent = this.stats.color / this.maxStats.color;
        if (colorPercent < 0.5) {
            ctx.filter = `saturate(${colorPercent * 2})`;
        }
        
        // 闪烁效果
        if (this.flashTimer > 0 && Math.floor(this.flashTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 行走摆动
        const walkBob = this.isMoving ? Math.sin(this.walkCycle) * 3 : 0;
        const armSwing = this.isMoving ? Math.sin(this.walkCycle) * 0.3 : 0;
        
        ctx.translate(0, walkBob);
        
        // 哥特式披风（在身体之后绘制，形成背景层）
        this.drawCape(ctx, armSwing);
        
        // 身体 - 哥特长衫
        this.drawBody(ctx, armSwing);
        
        // 头部
        this.drawHead(ctx);
        
        // 根据攻击冷却驱动画笔挥击角度
        if (this.attackCooldown > 0) {
            const p = this.attackCooldown / 0.5; // 1→0
            this.brushAngle = Utils.lerp(1.2, -1.6, p); // 从向前扫到拉回
        } else {
            this.brushAngle = 0;
        }
        
        // 画笔
        this.drawBrush(ctx, armSwing);
        
        ctx.restore();
        
        // 绘制放置的物品
        this.drawPlacedItems(ctx);
    }
    
    drawCape(ctx, armSwing) {
        const swing = this.isMoving ? Math.sin(this.walkCycle) * 5 : 0;
        
        // 披风主体
        const capeGrad = ctx.createLinearGradient(-22, -14, 22, 36);
        capeGrad.addColorStop(0, '#1E0A30');
        capeGrad.addColorStop(0.5, '#120820');
        capeGrad.addColorStop(1, '#0A0512');
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-9, -17);
        ctx.lineTo(9, -17);
        ctx.quadraticCurveTo(22 + swing, 2, 19 + swing, 32);
        ctx.quadraticCurveTo(0, 40, -19 - swing, 32);
        ctx.quadraticCurveTo(-22 - swing, 2, -9, -17);
        ctx.closePath();
        ctx.fill();
        
        // 内衬边缘（深红色）
        ctx.strokeStyle = '#5A0A1A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, -17);
        ctx.quadraticCurveTo(-22 - swing, 2, -19 - swing, 32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(9, -17);
        ctx.quadraticCurveTo(22 + swing, 2, 19 + swing, 32);
        ctx.stroke();
        
        // 披风底边（血色锯齿感）
        ctx.strokeStyle = 'rgba(90, 10, 26, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(-19 - swing, 32);
        ctx.quadraticCurveTo(0, 42, 19 + swing, 32);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    drawBody(ctx, armSwing) {
        // 哥特长衫主体
        const coatGrad = ctx.createLinearGradient(-12, -18, 12, 26);
        coatGrad.addColorStop(0, '#2D1B4E');
        coatGrad.addColorStop(0.6, '#1E1035');
        coatGrad.addColorStop(1, '#160C28');
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(10, -16);
        ctx.lineTo(12, 24);
        ctx.quadraticCurveTo(0, 28, -12, 24);
        ctx.closePath();
        ctx.fill();
        
        // 尖领（哥特式高领）
        ctx.fillStyle = '#241540';
        ctx.beginPath();
        ctx.moveTo(-8, -16);
        ctx.lineTo(-3, -23);
        ctx.lineTo(0, -18);
        ctx.lineTo(3, -23);
        ctx.lineTo(8, -16);
        ctx.closePath();
        ctx.fill();
        
        // 领口阴影
        ctx.fillStyle = 'rgba(10,5,20,0.5)';
        ctx.beginPath();
        ctx.moveTo(-5, -16);
        ctx.lineTo(5, -16);
        ctx.lineTo(3, -12);
        ctx.lineTo(-3, -12);
        ctx.closePath();
        ctx.fill();
        
        // 左臂
        ctx.save();
        ctx.translate(-11, -2);
        ctx.rotate(-armSwing - 0.1);
        ctx.fillStyle = '#2D1B4E';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = '#EDE0D4';
        ctx.fillRect(-4, 20, 8, 4);
        ctx.restore();
        
        // 右臂
        ctx.save();
        ctx.translate(11, -2);
        ctx.rotate(armSwing + 0.1);
        ctx.fillStyle = '#2D1B4E';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = '#EDE0D4';
        ctx.fillRect(-4, 20, 8, 4);
        ctx.restore();
        
        // 黄铜扣子
        ctx.fillStyle = '#B8860B';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -4 + i * 8, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 胸前齿轮徽章
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-6, 2, 4.5, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(-6 + Math.cos(a) * 3.8, 2 + Math.sin(a) * 3.8);
            ctx.lineTo(-6 + Math.cos(a) * 6, 2 + Math.sin(a) * 6);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(-6, 2, 1.8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 外套轮廓（紫色光泽）
        ctx.strokeStyle = 'rgba(100,60,150,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(-12, 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(10, -16);
        ctx.lineTo(12, 24);
        ctx.stroke();
    }
    
    drawHead(ctx) {
        // 苍白面容
        const skinGrad = ctx.createRadialGradient(-2, -30, 0, 0, -26, 12);
        skinGrad.addColorStop(0, '#F0E6DC');
        skinGrad.addColorStop(0.7, '#DDD0C4');
        skinGrad.addColorStop(1, '#C4B4A8');
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.arc(0, -26, 11, 0, Math.PI * 2);
        ctx.fill();
        
        // 深黑发 — 主发型
        ctx.fillStyle = '#0D0D1A';
        ctx.beginPath();
        ctx.arc(0, -29, 11, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // 左侧垂发
        ctx.beginPath();
        ctx.moveTo(-9, -27);
        ctx.quadraticCurveTo(-15, -20, -13, -12);
        ctx.quadraticCurveTo(-10, -8, -8, -14);
        ctx.quadraticCurveTo(-11, -20, -9, -27);
        ctx.fill();
        
        // 刘海（遮住部分额头）
        ctx.beginPath();
        ctx.moveTo(-11, -32);
        ctx.quadraticCurveTo(-5, -24, 1, -25);
        ctx.quadraticCurveTo(-2, -31, -11, -32);
        ctx.fill();
        
        // 黑眼圈（哥特风）
        ctx.fillStyle = 'rgba(50,20,80,0.28)';
        ctx.beginPath();
        ctx.ellipse(-4, -23.5, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -23.5, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 左眼（紫色虹膜）
        ctx.fillStyle = '#E8D0E8';
        ctx.beginPath();
        ctx.ellipse(-4, -26, 2.8, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6B1E8A';
        ctx.beginPath();
        ctx.ellipse(-4, -26, 2, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A0A2E';
        ctx.beginPath();
        ctx.ellipse(-4, -26, 1.2, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 右眼
        ctx.fillStyle = '#E8D0E8';
        ctx.beginPath();
        ctx.ellipse(4, -26, 2.8, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6B1E8A';
        ctx.beginPath();
        ctx.ellipse(4, -26, 2, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A0A2E';
        ctx.beginPath();
        ctx.ellipse(4, -26, 1.2, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛高光
        ctx.fillStyle = 'rgba(240,200,255,0.85)';
        ctx.beginPath();
        ctx.arc(-3, -27.5, 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -27.5, 0.85, 0, Math.PI * 2);
        ctx.fill();
        
        // 尖细眉（哥特上扬眉）
        ctx.strokeStyle = '#0D0D1A';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, -30);
        ctx.lineTo(-1, -29);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, -29);
        ctx.lineTo(7, -30);
        ctx.stroke();
        ctx.lineCap = 'butt';
        
        // 嘴（苍白细唇）
        ctx.strokeStyle = 'rgba(180,140,160,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, -19);
        ctx.quadraticCurveTo(0, -20, 3, -19);
        ctx.stroke();
        
        // 怀表链
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(3, -16);
        ctx.quadraticCurveTo(6, -11, 4, -7);
        ctx.stroke();
        
        // 怀表
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.arc(4, -7, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F0E6DC';
        ctx.beginPath();
        ctx.arc(4, -7, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(4, -9);
        ctx.lineTo(4, -7);
        ctx.moveTo(4, -7);
        ctx.lineTo(5.5, -6);
        ctx.stroke();
    }
    
    drawBrush(ctx, armSwing) {
        const isAttacking = this.attackCooldown > 0;
        const attackP = isAttacking ? (this.attackCooldown / 0.5) : 0; // 1→0
        const totalAngle = armSwing * 0.8 + this.brushAngle;
        
        ctx.save();
        ctx.translate(16, 8);
        
        // ── 攻击斩击弧尾（在工具本体之前绘制）──
        if (isAttacking) {
            const arcAlpha = (1 - attackP) * 0.85; // 划出时最亮
            const arcRadius = 34;
            const startA = totalAngle - Math.PI / 2 + 0.1;
            const endA   = totalAngle - Math.PI / 2 + Math.PI * 0.9;
            
            // 外层紫色发光弧
            ctx.save();
            ctx.globalAlpha = arcAlpha * 0.5;
            ctx.strokeStyle = '#9B30D0';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#C060FF';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, startA, endA);
            ctx.stroke();
            
            // 内层血红细线
            ctx.globalAlpha = arcAlpha * 0.9;
            ctx.strokeStyle = '#CC1040';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, startA, endA);
            ctx.stroke();
            ctx.restore();
            
            // 弧尾飞散墨滴
            if (attackP < 0.5) {
                const tipX = Math.sin(totalAngle) * 36;
                const tipY = -Math.cos(totalAngle) * 36;
                for (let i = 0; i < 3; i++) {
                    ctx.save();
                    ctx.globalAlpha = (0.5 - attackP) * 1.6 * (0.5 + Math.random() * 0.5);
                    ctx.fillStyle = i % 2 === 0 ? '#6B1E8A' : '#CC1040';
                    ctx.beginPath();
                    ctx.arc(
                        tipX + Utils.random(-8, 8),
                        tipY + Utils.random(-8, 8),
                        Utils.random(1.5, 3.5), 0, Math.PI * 2
                    );
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
        
        // ── 工具本体 ──
        ctx.rotate(totalAngle);
        
        // 乌木杆（攻击时加紫色外发光）
        if (isAttacking) {
            ctx.shadowColor = '#9B30D0';
            ctx.shadowBlur = 12 * (1 - attackP);
        }
        const rodGrad = ctx.createLinearGradient(-1.5, -22, 1.5, 6);
        rodGrad.addColorStop(0, '#2A1A3E');
        rodGrad.addColorStop(0.5, '#1A0A2E');
        rodGrad.addColorStop(1, '#0D0520');
        ctx.fillStyle = rodGrad;
        ctx.fillRect(-1.5, -22, 3, 28);
        ctx.shadowBlur = 0;
        
        // 顶端黄铜球
        ctx.fillStyle = isAttacking ? '#FFB800' : '#B8860B';
        ctx.beginPath();
        ctx.arc(0, -22, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // 顶端小齿轮
        ctx.strokeStyle = '#8B6508';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 2.5, -22 + Math.sin(a) * 2.5);
            ctx.lineTo(Math.cos(a) * 4.2, -22 + Math.sin(a) * 4.2);
            ctx.stroke();
        }
        
        // 中段装饰环
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(-3, -7, 6, 3);
        
        // 笔尖
        ctx.fillStyle = '#2A1530';
        ctx.beginPath();
        ctx.moveTo(-2.5, 4);
        ctx.lineTo(2.5, 4);
        ctx.lineTo(1, 14);
        ctx.lineTo(-1, 14);
        ctx.closePath();
        ctx.fill();
        
        // 笔尖光晕（攻击时爆发）
        const glowAlpha = isAttacking ? 0.5 + (1 - attackP) * 0.5 : 0.45;
        const glowRadius = isAttacking ? 3 + (1 - attackP) * 8 : 3;
        if (isAttacking) {
            ctx.shadowColor = '#CC60FF';
            ctx.shadowBlur = 16;
        }
        ctx.fillStyle = `rgba(130,50,180,${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 12, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 墨水沾染
        const colors = ['#4A1535', '#1E0A30', '#B8860B'];
        colors.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(-1 + i, 6 + i * 2, 1.6, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }
    
    drawPlacedItems(ctx) {
        for (const item of this.placedItems) {
            if (item.type === 'paperLantern') {
                this.drawPaperLantern(ctx, item);
            }
        }
    }
    
    drawPaperLantern(ctx, item) {
        ctx.save();
        ctx.translate(item.x, item.y);
        
        // 光晕
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, item.lightRadius);
        glowGradient.addColorStop(0, 'rgba(255, 228, 181, 0.3)');
        glowGradient.addColorStop(0.5, 'rgba(255, 228, 181, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 228, 181, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, item.lightRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 灯笼本体
        const lanternGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 20);
        lanternGradient.addColorStop(0, '#FFF8E7');
        lanternGradient.addColorStop(0.5, '#FFE4B5');
        lanternGradient.addColorStop(1, '#DEB887');
        
        ctx.fillStyle = lanternGradient;
        ctx.beginPath();
        
        // 六角形灯笼
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 15;
            const y = Math.sin(angle) * 20;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 骨架
        ctx.strokeStyle = '#5A4A3A';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 20);
            ctx.stroke();
        }
        
        // 手绘花纹
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 顶部挂环
        ctx.strokeStyle = '#5A4A3A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -25, 5, Math.PI, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}
