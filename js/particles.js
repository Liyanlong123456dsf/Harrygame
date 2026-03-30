// 粒子系统 - 水彩画风特效

class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 1;
        this.size = 10;
        this.color = '#FFFFFF';
        this.alpha = 1;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.type = 'circle';
        this.gravity = 0;
        this.friction = 0.98;
        this.shrink = true;
    }
    
    update(dt) {
        this.life -= dt;
        
        // 应用重力
        this.vy += this.gravity * dt;
        
        // 应用摩擦力
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // 更新位置
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        
        // 更新旋转
        this.rotation += this.rotationSpeed * dt;
        
        // 更新透明度
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        return this.life > 0;
    }
    
    draw(ctx) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const currentSize = this.shrink ? this.size * (this.life / this.maxLife) : this.size;
        
        switch(this.type) {
            case 'circle':
                this.drawCircle(ctx, currentSize);
                break;
            case 'watercolor':
                this.drawWatercolor(ctx, currentSize);
                break;
            case 'ink':
                this.drawInk(ctx, currentSize);
                break;
            case 'sparkle':
                this.drawSparkle(ctx, currentSize);
                break;
            case 'leaf':
                this.drawLeaf(ctx, currentSize);
                break;
            case 'feather':
                this.drawFeather(ctx, currentSize);
                break;
        }
        
        ctx.restore();
    }
    
    drawCircle(ctx, size) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        const rgb = Utils.hexToRgb(this.color);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawWatercolor(ctx, size) {
        const rgb = Utils.hexToRgb(this.color);
        
        // 外层晕染
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
        gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
        gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // 不规则形状模拟水彩晕染
        const points = 8;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radius = size * (0.8 + Math.sin(i * 3 + this.rotation) * 0.3);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawInk(ctx, size) {
        const rgb = Utils.hexToRgb(this.color);
        
        // 墨迹扩散效果
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
        
        // 主体
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 飞溅的小点
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + this.rotation;
            const dist = size * (0.7 + Math.random() * 0.4);
            const dotSize = size * 0.15 * Math.random();
            
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                dotSize,
                0, Math.PI * 2
            );
            ctx.fill();
        }
    }
    
    drawSparkle(ctx, size) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        // 四角星形
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const innerAngle = angle + Math.PI / 4;
            
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
            ctx.lineTo(Math.cos(innerAngle) * size * 0.3, Math.sin(innerAngle) * size * 0.3);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawLeaf(ctx, size) {
        const rgb = Utils.hexToRgb(this.color);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.4, size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 叶脉
        ctx.strokeStyle = `rgba(${rgb.r * 0.7}, ${rgb.g * 0.7}, ${rgb.b * 0.7}, 0.5)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();
    }
    
    drawFeather(ctx, size) {
        const rgb = Utils.hexToRgb(this.color);
        
        // 羽毛形状
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(size * 0.5, -size * 0.3, size * 0.3, size * 0.5);
        ctx.quadraticCurveTo(0, size, -size * 0.3, size * 0.5);
        ctx.quadraticCurveTo(-size * 0.5, -size * 0.3, 0, -size);
        ctx.fill();
        
        // 羽轴
        ctx.strokeStyle = `rgba(${rgb.r * 0.6}, ${rgb.g * 0.6}, ${rgb.b * 0.6}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size * 0.8);
        ctx.stroke();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.pool = new ObjectPool(
            () => new Particle(),
            (p) => p.reset(),
            100
        );
    }
    
    emit(config) {
        const count = config.count || 1;
        
        for (let i = 0; i < count; i++) {
            const p = this.pool.get();
            
            p.x = config.x + (config.spreadX ? Utils.random(-config.spreadX, config.spreadX) : 0);
            p.y = config.y + (config.spreadY ? Utils.random(-config.spreadY, config.spreadY) : 0);
            
            if (config.angle !== undefined) {
                const angle = config.angle + (config.angleSpread ? Utils.random(-config.angleSpread, config.angleSpread) : 0);
                const speed = config.speed || 2;
                const speedVariance = config.speedVariance || 0;
                const actualSpeed = speed + Utils.random(-speedVariance, speedVariance);
                
                p.vx = Math.cos(angle) * actualSpeed;
                p.vy = Math.sin(angle) * actualSpeed;
            } else {
                p.vx = config.vx || Utils.random(-2, 2);
                p.vy = config.vy || Utils.random(-2, 2);
            }
            
            p.life = config.life || 1;
            p.maxLife = p.life;
            p.size = config.size || 10;
            p.color = config.color || '#FFFFFF';
            p.type = config.type || 'circle';
            p.gravity = config.gravity || 0;
            p.friction = config.friction || 0.98;
            p.shrink = config.shrink !== false;
            p.rotation = config.rotation || 0;
            p.rotationSpeed = config.rotationSpeed || 0;
            
            this.particles.push(p);
        }
    }
    
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (!this.particles[i].update(dt)) {
                this.pool.release(this.particles[i]);
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }
    
    clear() {
        this.pool.releaseAll();
        this.particles = [];
    }
    
    // ========== 预设特效 ==========
    
    // 水墨晕开（采集资源）
    emitWatercolorSpread(x, y, color) {
        this.emit({
            x, y,
            count: 12,
            spreadX: 5,
            spreadY: 5,
            angle: 0,
            angleSpread: Math.PI,
            speed: 3,
            speedVariance: 1.5,
            life: 0.8,
            size: 25,
            color: color,
            type: 'watercolor',
            friction: 0.95,
            gravity: 0.5
        });
        
        // 小液滴
        this.emit({
            x, y,
            count: 8,
            spreadX: 10,
            spreadY: 10,
            angle: -Math.PI / 2,
            angleSpread: Math.PI / 3,
            speed: 4,
            speedVariance: 2,
            life: 0.6,
            size: 8,
            color: color,
            type: 'circle',
            friction: 0.96,
            gravity: 2
        });
    }
    
    // 墨迹飞溅（砍树/受击）
    emitInkSplatter(x, y, color = '#1A1A2E') {
        this.emit({
            x, y,
            count: 15,
            spreadX: 5,
            spreadY: 5,
            speed: 5,
            speedVariance: 3,
            life: 0.5,
            size: 15,
            color: color,
            type: 'ink',
            friction: 0.9,
            gravity: 3
        });
    }
    
    // 金色闪烁（星尘草）
    emitStardustSparkle(x, y) {
        this.emit({
            x, y,
            count: 6,
            spreadX: 15,
            spreadY: 15,
            speed: 1,
            speedVariance: 0.5,
            life: 1.2,
            size: 12,
            color: '#FFD700',
            type: 'sparkle',
            friction: 0.99,
            gravity: -0.5,
            rotationSpeed: 2
        });
    }
    
    // 水珠破裂（晨露珠）
    emitDewBurst(x, y) {
        this.emit({
            x, y,
            count: 10,
            spreadX: 3,
            spreadY: 3,
            speed: 4,
            speedVariance: 2,
            life: 0.4,
            size: 6,
            color: '#6B9FFF',
            type: 'circle',
            friction: 0.95,
            gravity: 4
        });
        
        // 水雾
        this.emit({
            x, y,
            count: 8,
            spreadX: 10,
            spreadY: 10,
            speed: 1,
            life: 0.8,
            size: 20,
            color: '#A0CFFF',
            type: 'watercolor',
            friction: 0.98,
            gravity: -0.3
        });
    }
    
    // 颜料滴落（彩实）
    emitColorDrip(x, y, color) {
        // 主滴
        this.emit({
            x, y,
            count: 1,
            speed: 0,
            life: 0.6,
            size: 18,
            color: color,
            type: 'watercolor',
            gravity: 5
        });
        
        // 小滴
        this.emit({
            x, y,
            count: 5,
            spreadX: 8,
            spreadY: 3,
            speed: 2,
            speedVariance: 1,
            life: 0.5,
            size: 8,
            color: color,
            type: 'circle',
            gravity: 4
        });
    }
    
    // 羽毛飘落（灰烬鸦）
    emitFeatherBurst(x, y) {
        for (let i = 0; i < 6; i++) {
            this.emit({
                x: x + Utils.random(-20, 20),
                y: y + Utils.random(-20, 20),
                count: 1,
                speed: Utils.random(1, 3),
                angle: Utils.random(-Math.PI, Math.PI),
                life: 2,
                size: Utils.random(15, 25),
                color: '#3A3A4E',
                type: 'feather',
                friction: 0.99,
                gravity: 0.8,
                rotationSpeed: Utils.random(-1, 1)
            });
        }
    }
    
    // 蕾丝碎片（鸣蛹死亡）
    emitLaceShatter(x, y) {
        const colors = ['#FFF8E7', '#FFE4B5', '#FFDAB9'];
        
        for (let i = 0; i < 12; i++) {
            this.emit({
                x, y,
                count: 1,
                speed: Utils.random(2, 5),
                angle: Utils.random(-Math.PI, Math.PI),
                life: 2.5,
                size: Utils.random(8, 15),
                color: Utils.randomChoice(colors),
                type: 'leaf',
                friction: 0.98,
                gravity: 0.5,
                rotationSpeed: Utils.random(-2, 2)
            });
        }
        
        // 光点
        this.emit({
            x, y,
            count: 20,
            spreadX: 20,
            spreadY: 20,
            speed: 3,
            speedVariance: 2,
            life: 1.5,
            size: 10,
            color: '#FFD700',
            type: 'sparkle',
            friction: 0.97,
            gravity: -0.3
        });
    }
    
    // 情绪颜料效果
    emitEmotionPigment(x, y, color, radius = 50) {
        const count = Math.floor(radius / 5);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.emit({
                x: x + Math.cos(angle) * radius * 0.3,
                y: y + Math.sin(angle) * radius * 0.3,
                count: 1,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1,
                size: 20,
                color: color,
                type: 'watercolor',
                friction: 0.96
            });
        }
    }
    
    // 纸灯光晕
    emitLanternGlow(x, y) {
        this.emit({
            x, y,
            count: 3,
            spreadX: 10,
            spreadY: 10,
            speed: 0.5,
            life: 1.5,
            size: 15,
            color: '#FFE4B5',
            type: 'sparkle',
            friction: 0.99,
            gravity: -0.3,
            rotationSpeed: 0.5
        });
    }
    
    // 褪色/灰化效果
    emitFade(x, y) {
        this.emit({
            x, y,
            count: 8,
            spreadX: 30,
            spreadY: 30,
            speed: 0.5,
            life: 1.2,
            size: 25,
            color: '#808080',
            type: 'watercolor',
            friction: 0.99,
            gravity: -0.2
        });
    }
}

// 全局粒子系统实例
const Particles = new ParticleSystem();
