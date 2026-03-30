// 生物系统 - 鸣蛹(友好) / 灰烬鸦 & 纸络蛛(敌对)

class Creature {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 20;
        this.hp = 100;
        this.maxHp = 100;
        this.alive = true;
        this.state = 'idle';
        this.stateTimer = 0;
        this.animPhase = Math.random() * Math.PI * 2;
        this.target = null;
        this.speed = 1;
        // 死亡动画
        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 0.6; // 秒
        this.deathAlpha = 1;
    }
    
    update(dt, player, world) {
        if (this.dying) {
            this.deathTimer += dt;
            this.deathAlpha = Math.max(0, 1 - this.deathTimer / this.deathDuration);
            return;
        }
        if (!this.alive) return;
        this.animPhase += dt * 3;
        this.stateTimer -= dt;
    }
    
    draw(ctx) {
        // 基类空实现
    }
    
    takeDamage(amount, player) {
        if (this.dying) return;
        this.hp -= amount;
        // 受伤闪白
        this.hitFlash = 0.25;
        
        // 受伤墨迹粒子
        Particles.emit({
            x: this.x,
            y: this.y,
            count: 5,
            type: 'ink',
            color: this.deathColor || '#3A3A4E',
            speed: 2,
            angleSpread: Math.PI,
            life: 0.4,
            size: 6
        });
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.dying = true;
            this.deathTimer = 0;
            
            // 死亡粒子爆发
            Particles.emit({
                x: this.x,
                y: this.y,
                count: 12,
                type: 'ink',
                color: this.deathColor || '#3A3A4E',
                speed: 3.5,
                angleSpread: Math.PI,
                life: 0.6,
                size: 10
            });
        }
    }
    
    die(player) {
        this.alive = false;
        return [];
    }
    
    moveToward(targetX, targetY, speed) {
        const angle = Utils.angle(this.x, this.y, targetX, targetY);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.x += this.vx;
        this.y += this.vy;
    }
    
    moveAway(targetX, targetY, speed) {
        const angle = Utils.angle(this.x, this.y, targetX, targetY);
        this.vx = -Math.cos(angle) * speed;
        this.vy = -Math.sin(angle) * speed;
        this.x += this.vx;
        this.y += this.vy;
    }
    
    distanceTo(x, y) {
        return Utils.distance(this.x, this.y, x, y);
    }

    // 基类绘制血条（供子类调用）
    _drawHpBar(ctx) {
        if (this.hp >= this.maxHp) return;
        const bw = this.radius * 2;
        const bh = 4;
        const bx = -this.radius;
        const by = -this.radius - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(bx, by, bw, bh);
        const pct = this.hp / this.maxHp;
        const col = pct > 0.5 ? '#7EC850' : pct > 0.25 ? '#F0A030' : '#D03030';
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, bw * pct, bh);
    }
}

// ========== 鸣蛹 - 友好生物 ==========
class Chrysalis extends Creature {
    constructor(x, y) {
        super(x, y);
        this.radius = 18;
        this.hp = 30;
        this.maxHp = 30;
        this.following = false;
        this.followDistance = 80;
        this.maxFollowDistance = 150;
        this.singTimer = 0;
        this.singInterval = 20; // 20秒唱一次歌
        this.swayOffset = 0;
        this.glowIntensity = 0.5;
        this.marked = false; // 是否被林渡画笔标记
        this.lacePattern = this.generateLacePattern();
    }
    
    generateLacePattern() {
        const pattern = [];
        const points = 12;
        for (let i = 0; i < points; i++) {
            pattern.push({
                angle: (i / points) * Math.PI * 2,
                radius: 0.7 + Math.random() * 0.3,
                curve: Math.random() * 0.5
            });
        }
        return pattern;
    }
    
    update(dt, player, world) {
        super.update(dt, player, world);
        if (!this.alive) return;
        
        const distToPlayer = this.distanceTo(player.x, player.y);
        
        // 跟随逻辑
        const followRange = this.marked ? 300 : 150;
        if (distToPlayer < followRange && !this.following) {
            this.following = true;
        }
        
        if (this.following) {
            const targetDist = this.marked ? 60 : 80;
            if (distToPlayer > targetDist + 20) {
                this.moveToward(player.x, player.y - 50, 1.5);
            } else if (distToPlayer < targetDist - 20) {
                this.moveAway(player.x, player.y, 0.5);
            }
        }
        
        // 悬浮摆动
        this.swayOffset = Math.sin(this.animPhase * 0.5) * 5;
        
        // 发光脉冲
        this.glowIntensity = 0.4 + Math.sin(this.animPhase) * 0.2;
        
        // 唱歌计时
        this.singTimer += dt;
        if (this.singTimer >= this.singInterval) {
            this.sing(player);
            this.singTimer = 0;
        }
    }
    
    sing(player) {
        if (this.distanceTo(player.x, player.y) < 200) {
            player.addStat('ink', 15);
            GameAudio.playChrysalisSong();
            
            // 彩色光点特效
            Particles.emit({
                x: this.x,
                y: this.y,
                count: 15,
                spreadX: 10,
                spreadY: 10,
                speed: 2,
                speedVariance: 1,
                life: 1.5,
                size: 8,
                color: '#FFE4B5',
                type: 'sparkle',
                friction: 0.98,
                gravity: -0.5
            });
        }
    }
    
    draw(ctx) {
        if (!this.alive && !this.dying) return;
        
        ctx.save();
        if (this.dying) ctx.globalAlpha = this.deathAlpha;
        ctx.translate(this.x, this.y + this.swayOffset);
        
        // 悬挂丝线
        ctx.strokeStyle = 'rgba(255, 248, 231, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, -this.radius - 40);
        ctx.stroke();
        
        // 发光效果
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        glowGradient.addColorStop(0, `rgba(255, 228, 181, ${this.glowIntensity})`);
        glowGradient.addColorStop(0.5, `rgba(255, 228, 181, ${this.glowIntensity * 0.3})`);
        glowGradient.addColorStop(1, 'rgba(255, 228, 181, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 茧体 - 蕾丝纹路
        const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius);
        bodyGradient.addColorStop(0, '#FFF8E7');
        bodyGradient.addColorStop(0.7, '#FFE4B5');
        bodyGradient.addColorStop(1, '#DEB887');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        
        // 不规则蕾丝边缘
        for (let i = 0; i <= this.lacePattern.length; i++) {
            const p = this.lacePattern[i % this.lacePattern.length];
            const r = this.radius * p.radius;
            const x = Math.cos(p.angle + this.animPhase * 0.1) * r;
            const y = Math.sin(p.angle + this.animPhase * 0.1) * r;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // 蕾丝纹路细节
        ctx.strokeStyle = 'rgba(222, 184, 135, 0.5)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * this.radius * 0.4,
                Math.sin(angle) * this.radius * 0.4,
                this.radius * 0.2,
                0, Math.PI * 2
            );
            ctx.stroke();
        }
        
        // 内部光晕
        const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.6);
        innerGlow.addColorStop(0, `rgba(255, 215, 0, ${this.glowIntensity * 0.5})`);
        innerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 标记效果
        if (this.marked) {
            ctx.strokeStyle = 'rgba(196, 163, 90, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (!this.dying) this._drawHpBar(ctx);
        ctx.restore();
    }
    
    mark() {
        if (!this.marked) {
            this.marked = true;
            this.maxFollowDistance = 300;
            
            Particles.emit({
                x: this.x,
                y: this.y,
                count: 10,
                speed: 1,
                life: 1,
                size: 12,
                color: '#C4A35A',
                type: 'watercolor',
                friction: 0.98
            });
        }
    }
    
    die(player) {
        super.die(player);
        
        // 蕾丝碎片飘散特效
        Particles.emitLaceShatter(this.x, this.y);
        
        // 掉落彩实和暖阳颜料
        const drops = [];
        const fruitTypes = ['colorFruitRed', 'colorFruitYellow', 'colorFruitBlue'];
        for (let i = 0; i < 6; i++) {
            drops.push({
                id: Utils.randomChoice(fruitTypes),
                count: 1
            });
        }
        
        // 返回掉落物
        return drops;
    }
}

// ========== 灰烬鸦 - 敌对生物 ==========
class AshCrow extends Creature {
    constructor(x, y) {
        super(x, y);
        this.radius = 25;
        this.hp = 48;
        this.maxHp = 48;
        this.speed = 2.5;
        this.damage = 12;
        this.state = 'patrol';
        this.patrolCenter = { x, y };
        this.patrolRadius = 150;
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.attackCooldown = 0;
        this.attackRange = 40;
        this.detectRange = 200;
        this.retreatTimer = 0;
        this.wingPhase = 0;
        this.featherCracks = this.generateCracks();
    }
    
    generateCracks() {
        const cracks = [];
        for (let i = 0; i < 8; i++) {
            cracks.push({
                x: Utils.random(-15, 15),
                y: Utils.random(-15, 15),
                angle: Utils.random(0, Math.PI * 2),
                length: Utils.random(5, 12)
            });
        }
        return cracks;
    }
    
    update(dt, player, world) {
        super.update(dt, player, world);
        if (!this.alive) return;
        
        this.wingPhase += dt * 8;
        this.attackCooldown -= dt;
        
        const distToPlayer = this.distanceTo(player.x, player.y);
        
        switch (this.state) {
            case 'patrol':
                // 椭圆轨迹巡逻
                this.patrolAngle += dt * 0.5;
                const targetX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
                const targetY = this.patrolCenter.y + Math.sin(this.patrolAngle) * this.patrolRadius * 0.5;
                this.moveToward(targetX, targetY, this.speed * 0.5);
                
                // 检测玩家
                if (distToPlayer < this.detectRange) {
                    this.state = 'chase';
                    this.target = player;
                }
                break;
                
            case 'chase':
                if (distToPlayer > this.detectRange * 1.5) {
                    this.state = 'patrol';
                    this.target = null;
                } else if (distToPlayer < this.attackRange) {
                    this.state = 'attack';
                } else {
                    this.moveToward(player.x, player.y, this.speed);
                }
                break;
                
            case 'attack':
                if (this.attackCooldown <= 0) {
                    this.performAttack(player);
                    this.attackCooldown = 2;
                    this.state = 'retreat';
                    this.retreatTimer = 1;
                }
                break;
                
            case 'retreat':
                this.moveAway(player.x, player.y, this.speed * 1.5);
                this.retreatTimer -= dt;
                if (this.retreatTimer <= 0) {
                    this.state = 'chase';
                }
                break;
        }
        
        // 掉落灰屑粒子
        if (Utils.chance(0.02)) {
            Particles.emit({
                x: this.x + Utils.random(-10, 10),
                y: this.y + Utils.random(-5, 5),
                count: 1,
                speed: 0.5,
                life: 1,
                size: 4,
                color: '#808080',
                type: 'circle',
                gravity: 1
            });
        }
    }
    
    performAttack(player) {
        // 啄取颜色
        player.addStat('color', -this.damage);
        player.triggerFlash();
        
        GameAudio.playHit();
        Utils.screenShake.apply(5, 0.2);
        
        // 特效
        Particles.emitInkSplatter(player.x, player.y, '#808080');
    }
    
    draw(ctx) {
        if (!this.alive && !this.dying) return;
        
        ctx.save();
        if (this.dying) ctx.globalAlpha = this.deathAlpha;
        ctx.translate(this.x, this.y);
        
        // 面向移动方向
        const facingRight = this.vx >= 0;
        if (!facingRight) {
            ctx.scale(-1, 1);
        }
        
        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 翅膀动画
        const wingAngle = Math.sin(this.wingPhase) * 0.4;
        
        // 左翅
        ctx.save();
        ctx.rotate(-wingAngle - 0.3);
        this.drawWing(ctx, -1);
        ctx.restore();
        
        // 右翅
        ctx.save();
        ctx.rotate(wingAngle + 0.3);
        this.drawWing(ctx, 1);
        ctx.restore();
        
        // 身体
        const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius);
        bodyGradient.addColorStop(0, '#4A4A5E');
        bodyGradient.addColorStop(0.7, '#2A2A3A');
        bodyGradient.addColorStop(1, '#1A1A2E');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 0.7, this.radius * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 干裂纹路
        ctx.strokeStyle = '#5A4A6E';
        ctx.lineWidth = 1;
        for (const crack of this.featherCracks) {
            ctx.beginPath();
            ctx.moveTo(crack.x, crack.y);
            ctx.lineTo(
                crack.x + Math.cos(crack.angle) * crack.length,
                crack.y + Math.sin(crack.angle) * crack.length
            );
            ctx.stroke();
        }
        
        // 喙
        ctx.fillStyle = '#8B7355';
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.5, -5);
        ctx.lineTo(this.radius + 10, 0);
        ctx.lineTo(this.radius * 0.5, 5);
        ctx.closePath();
        ctx.fill();
        
        // 眼睛 - 蓝紫磷光
        const eyeGlow = ctx.createRadialGradient(8, -8, 0, 8, -8, 8);
        eyeGlow.addColorStop(0, '#9F7FFF');
        eyeGlow.addColorStop(0.5, '#5A4A8E');
        eyeGlow.addColorStop(1, 'rgba(90, 74, 142, 0)');
        
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(8, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#DDA0FF';
        ctx.beginPath();
        ctx.arc(8, -8, 3, 0, Math.PI * 2);
        ctx.fill();
        
        if (!this.dying) this._drawHpBar(ctx);
        ctx.restore();
    }
    
    drawWing(ctx, side) {
        ctx.fillStyle = '#3A3A4E';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
            side * this.radius * 1.5, -this.radius * 0.3,
            side * this.radius * 2, this.radius * 0.2
        );
        ctx.quadraticCurveTo(
            side * this.radius, this.radius * 0.5,
            0, this.radius * 0.3
        );
        ctx.closePath();
        ctx.fill();
        
        // 羽毛边缘 - 焦黄毛刺
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const t = i / 5;
            const x = side * this.radius * (0.8 + t * 1.2);
            const y = -this.radius * 0.2 + t * this.radius * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + side * 8, y + 5);
            ctx.stroke();
        }
    }
    
    die(player) {
        super.die(player);
        
        // 羽毛飘散
        Particles.emitFeatherBurst(this.x, this.y);
        
        // 碎裂效果
        Particles.emitInkSplatter(this.x, this.y, '#3A3A4E');
        
        GameAudio.playPaperTear();
        
        // 掉落物
        return [
            { id: 'charBranch', count: Utils.randomInt(1, 2) },
            { id: 'grayFluff', count: Utils.randomInt(2, 3) }
        ];
    }
}

// ========== 纸络蛛 - 敌对生物 ==========
class PaperSpider extends Creature {
    constructor(x, y) {
        super(x, y);
        this.radius = 30;
        this.hp = 64;
        this.maxHp = 64;
        this.speed = 1.5;
        this.damage = 15;
        this.state = 'guard';
        this.guardPosition = { x, y };
        this.guardRadius = 100;
        this.webCooldown = 0;
        this.stunned = false;
        this.stunTimer = 0;
        this.legPhase = 0;
        this.paperFolds = this.generateFolds();
        this.burning = false;
        this.burnTimer = 0;
    }
    
    generateFolds() {
        const folds = [];
        for (let i = 0; i < 6; i++) {
            folds.push({
                angle: Utils.random(0, Math.PI * 2),
                depth: Utils.random(0.1, 0.3)
            });
        }
        return folds;
    }
    
    update(dt, player, world) {
        super.update(dt, player, world);
        if (!this.alive) return;
        
        // 夜晚更活跃
        const hour = Math.floor((world.gameTime % 1440) / 60);
        const period = Utils.getTimePeriod(hour);
        const isNight = period === 'night';
        
        this.legPhase += dt * 4;
        this.webCooldown -= dt;
        
        // 眩晕状态
        if (this.stunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.stunned = false;
                this.burning = false;
            }
            return;
        }
        
        const distToPlayer = this.distanceTo(player.x, player.y);
        const activeRange = isNight ? this.guardRadius * 1.5 : this.guardRadius;
        
        switch (this.state) {
            case 'guard':
                // 守卫位置
                if (distToPlayer < activeRange) {
                    this.state = 'attack';
                }
                break;
                
            case 'attack':
                if (distToPlayer > activeRange * 1.5) {
                    this.state = 'return';
                } else if (distToPlayer < 150 && this.webCooldown <= 0) {
                    this.shootWeb(player);
                    this.webCooldown = 4;
                } else if (distToPlayer < 50) {
                    this.meleeAttack(player);
                } else {
                    this.moveToward(player.x, player.y, this.speed);
                }
                break;
                
            case 'return':
                if (this.distanceTo(this.guardPosition.x, this.guardPosition.y) < 20) {
                    this.state = 'guard';
                } else {
                    this.moveToward(this.guardPosition.x, this.guardPosition.y, this.speed * 0.8);
                }
                break;
        }
        
        // 燃烧特效
        if (this.burning) {
            Particles.emit({
                x: this.x + Utils.random(-15, 15),
                y: this.y + Utils.random(-15, 15),
                count: 1,
                speed: 1,
                life: 0.5,
                size: 15,
                color: '#FF6B00',
                type: 'watercolor',
                gravity: -2
            });
        }
    }
    
    shootWeb(player) {
        // 吐丝攻击
        player.applySlowdown(0.4, 5000);
        
        // 丝网轨迹特效
        const steps = 10;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            Particles.emit({
                x: Utils.lerp(this.x, player.x, t),
                y: Utils.lerp(this.y, player.y, t),
                count: 1,
                speed: 0.2,
                life: 0.8,
                size: 8,
                color: '#C0C0C0',
                type: 'circle',
                friction: 0.99
            });
        }
        
        GameAudio.playPaperTear();
    }
    
    meleeAttack(player) {
        player.addStat('warmth', -this.damage);
        GameAudio.playHit();
        Utils.screenShake.apply(4, 0.15);
    }
    
    applyBurn() {
        this.stunned = true;
        this.stunTimer = 3;
        this.burning = true;
        
        // 燃烧晕染特效
        Particles.emitWatercolorSpread(this.x, this.y, '#FF6B00');
    }
    
    draw(ctx) {
        if (!this.alive && !this.dying) return;
        
        ctx.save();
        if (this.dying) ctx.globalAlpha = this.deathAlpha;
        ctx.translate(this.x, this.y);
        
        // 眩晕抖动
        if (this.stunned) {
            ctx.translate(Utils.random(-3, 3), Utils.random(-3, 3));
        }
        
        // 蛛网阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius + 8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 腿部 - 几何硬线条
        ctx.strokeStyle = this.burning ? '#8B4513' : '#4A4A5E';
        ctx.lineWidth = 3;
        ctx.lineCap = 'square';
        
        for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1;
            const index = i % 4;
            const baseAngle = (index / 4) * Math.PI * 0.6 - Math.PI * 0.3;
            const legOffset = Math.sin(this.legPhase + i * 0.5) * 5;
            
            ctx.save();
            ctx.scale(side, 1);
            
            // 第一节
            const joint1X = Math.cos(baseAngle) * 25;
            const joint1Y = Math.sin(baseAngle) * 15 + legOffset;
            
            // 第二节
            const joint2X = joint1X + Math.cos(baseAngle + 0.5) * 20;
            const joint2Y = joint1Y + 15;
            
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.3, 0);
            ctx.lineTo(joint1X, joint1Y);
            ctx.lineTo(joint2X, joint2Y);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // 腹部 - 皱褶羊皮纸球
        const bodyColor = this.burning ? '#D2691E' : '#F4E4BC';
        const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius * 0.8);
        bodyGradient.addColorStop(0, bodyColor);
        bodyGradient.addColorStop(0.7, this.burning ? '#8B4513' : '#D4C4A0');
        bodyGradient.addColorStop(1, this.burning ? '#654321' : '#B8A888');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 褶皱纹路
        ctx.strokeStyle = this.burning ? 'rgba(139, 69, 19, 0.5)' : 'rgba(139, 119, 101, 0.4)';
        ctx.lineWidth = 1;
        for (const fold of this.paperFolds) {
            ctx.beginPath();
            const r = this.radius * 0.7;
            ctx.moveTo(
                Math.cos(fold.angle) * r * (1 - fold.depth),
                Math.sin(fold.angle) * r * (1 - fold.depth)
            );
            ctx.lineTo(
                Math.cos(fold.angle) * r,
                Math.sin(fold.angle) * r
            );
            ctx.stroke();
        }
        
        // 头部
        ctx.fillStyle = this.burning ? '#A0522D' : '#E8D8C0';
        ctx.beginPath();
        ctx.arc(this.radius * 0.5, -this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛
        ctx.fillStyle = '#1A1A2E';
        for (let i = 0; i < 4; i++) {
            const ex = this.radius * 0.4 + (i % 2) * 8;
            const ey = -this.radius * 0.35 + Math.floor(i / 2) * 6;
            ctx.beginPath();
            ctx.arc(ex, ey, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (!this.dying) this._drawHpBar(ctx);
        ctx.restore();
    }
    
    die(player) {
        super.die(player);
        
        Particles.emitInkSplatter(this.x, this.y, '#D4C4A0');
        GameAudio.playPaperTear();
        
        return [
            { id: 'grayFluff', count: Utils.randomInt(1, 2) }
        ];
    }
}

// 生物管理器
class CreatureManager {
    constructor() {
        this.creatures = [];
    }
    
    spawn(type, x, y, day = 1) {
        let creature;
        switch (type) {
            case 'chrysalis':
                creature = new Chrysalis(x, y);
                break;
            case 'ashCrow':
                creature = new AshCrow(x, y);
                break;
            case 'paperSpider':
                creature = new PaperSpider(x, y);
                break;
            default:
                return null;
        }
        // 按天数缩放敌对生物血量：第1日×0.7，之后每天额外+30%
        if (creature && !(creature instanceof Chrysalis)) {
            const scale = 0.7 * Math.pow(1.3, day - 1);
            creature.hp    = Math.round(creature.hp    * scale);
            creature.maxHp = Math.round(creature.maxHp * scale);
        }
        this.creatures.push(creature);
        return creature;
    }
    
    update(dt, player, world) {
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const creature = this.creatures[i];
            creature.update(dt, player, world);
            
            // 刚死亡：触发 die() 特效 + 掉落
            if (!creature.alive && !creature._deathProcessed) {
                creature._deathProcessed = true;
                const drops = creature.die ? creature.die(player) : [];
                if (drops && drops.length > 0) {
                    for (const drop of drops) {
                        player.inventory.addItem(drop.id, drop.count);
                    }
                }
                // 记录击杀
                if (!(creature instanceof Chrysalis)) {
                    this.killCount = (this.killCount || 0) + 1;
                }
            }
            
            // 死亡动画播完后删除
            if (creature.dying && creature.deathTimer >= creature.deathDuration) {
                this.creatures.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        for (const creature of this.creatures) {
            creature.draw(ctx);
        }
    }
    
    getNearbyCreature(x, y, radius, type = null) {
        for (const creature of this.creatures) {
            if (!creature.alive) continue;
            if (type && creature.constructor.name.toLowerCase() !== type) continue;
            if (creature.distanceTo(x, y) < radius) {
                return creature;
            }
        }
        return null;
    }
    
    getCreaturesInRange(x, y, radius) {
        return this.creatures.filter(c => c.alive && c.distanceTo(x, y) < radius);
    }
    
    clear() {
        this.creatures = [];
    }
}
