// 游戏世界 - 褪色界

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // 时间系统 (游戏内分钟)
        this.gameTime = 360; // 从早上6点开始
        this.day = 1;
        this.maxDays = 3;
        this.timeScale = 2; // 1秒现实时间 = 2分钟游戏时间
        
        // 教程模式标记
        this.isTutorial = false;
        
        // 资源节点
        this.resourceNodes = [];
        
        // 生物管理
        this.creatures = new CreatureManager();
        
        // 地图区域
        this.zones = [];
        
        // 古钟位置
        this.clockTower = { x: width - 150, y: 150 };
        this.clockPieces = [
            { x: 200, y: 300, found: false },
            { x: width / 2, y: height - 200, found: false },
            { x: width - 200, y: height / 2, found: false }
        ];
        
        // 环境效果
        this.saturationBoost = 0;
        this.saturationBoostTimer = 0;
        this.ambientParticleTimer = 0;
        
        // 无色王侵蚀
        this.erosionIntensity = 0;
        this.erosionWaveActive = false;
        
        // 刷怪系统
        this.spawnTimer = 0;       // 距离下次刷怪的倒计时（秒）
        this.spawnInterval = 25;   // 白昼刷怪间隔（秒）
        this.waveSize = 1;         // 每次刷多少只
        
        // 初始化世界
        this.generateWorld();
    }
    
    generateWorld() {
        // 生成资源节点
        this.generateResources();
        
        // 生成初始生物
        this.spawnInitialCreatures();
    }
    
    generateResources() {
        const nodeCount = 30;
        
        // 星尘草 - 草地区域
        for (let i = 0; i < 8; i++) {
            this.resourceNodes.push(new ResourceNode(
                'STARDUST_GRASS',
                Utils.random(100, this.width - 100),
                Utils.random(this.height / 2, this.height - 100)
            ));
        }
        
        // 晨露珠 - 石地区域
        for (let i = 0; i < 6; i++) {
            this.resourceNodes.push(new ResourceNode(
                'MORNING_DEW',
                Utils.random(100, this.width / 2),
                Utils.random(100, this.height / 2)
            ));
        }
        
        // 炭骨枝 - 枯树
        for (let i = 0; i < 5; i++) {
            this.resourceNodes.push(new ResourceNode(
                'CHAR_BRANCH',
                Utils.random(this.width / 2, this.width - 100),
                Utils.random(100, this.height - 100)
            ));
        }
        
        // 彩实 - 彩叶木
        const fruitTypes = ['COLOR_FRUIT_RED', 'COLOR_FRUIT_YELLOW', 'COLOR_FRUIT_BLUE'];
        for (let i = 0; i < 9; i++) {
            this.resourceNodes.push(new ResourceNode(
                fruitTypes[i % 3],
                Utils.random(100, this.width - 100),
                Utils.random(100, this.height - 100)
            ));
        }
        
        // 灰絮 - 灰雾地带边缘
        for (let i = 0; i < 4; i++) {
            this.resourceNodes.push(new ResourceNode(
                'GRAY_FLUFF',
                Utils.random(this.width * 0.6, this.width - 50),
                Utils.random(50, this.height * 0.4)
            ));
        }
    }
    
    spawnInitialCreatures() {
        // 鸣蛹
        this.creatures.spawn('chrysalis', 300, 400);
        this.creatures.spawn('chrysalis', this.width - 300, 300);
        
        // 灰烬鸦
        this.creatures.spawn('ashCrow', this.width / 2, 200, this.day);
        this.creatures.spawn('ashCrow', this.width - 200, this.height / 2, this.day);
        
        // 纸络蛛 - 守卫钟塔
        this.creatures.spawn('paperSpider', this.clockTower.x - 80, this.clockTower.y + 100, this.day);
        this.creatures.spawn('paperSpider', this.clockTower.x + 80, this.clockTower.y + 100, this.day);
    }
    
    update(dt, player) {
        // 教程模式：跳过大部分更新
        if (this.isTutorial) {
            // 仅更新资源节点（用于教程采集）
            for (const node of this.resourceNodes) {
                node.update(dt, this.gameTime);
            }
            return null;
        }
        
        // 更新时间
        this.updateTime(dt);
        
        // 更新资源节点
        for (const node of this.resourceNodes) {
            node.update(dt, this.gameTime);
        }
        
        // 更新生物
        this.creatures.update(dt, player, this);
        
        // 刷怪
        this.updateSpawns(dt, player);
        
        // 更新环境效果
        this.updateEnvironment(dt, player);
        
        // 检查古钟碎片
        this.checkClockPieces(player);
        
        // 夜晚无色王侵蚀
        this.updateErosion(dt, player);
        
        // 检查胜利条件
        if (player.clockOilUsed >= 3 && this.day <= this.maxDays) {
            return 'victory';
        }
        
        // 检查失败条件
        if (this.day > this.maxDays) {
            return 'timeout';
        }
        
        return null;
    }
    
    updateTime(dt) {
        this.gameTime += dt * this.timeScale;
        
        // 一天1440分钟 (24小时)
        if (this.gameTime >= 1440) {
            this.gameTime = 0;
            this.day++;
            
            // 新的一天，重置一些状态
            this.onNewDay();
        }
    }
    
    onNewDay() {
        // 增加侵蚀强度
        this.erosionIntensity = Math.min(1, this.erosionIntensity + 0.3);
        
        // 可能生成新的敌对生物
        if (this.day >= 2) {
            this.creatures.spawn('ashCrow', 
                Utils.random(100, this.width - 100),
                Utils.random(100, this.height - 100),
                this.day
            );
        }
        
        if (this.day >= 3) {
            this.creatures.spawn('paperSpider',
                Utils.random(this.width / 2, this.width - 100),
                Utils.random(100, this.height / 2),
                this.day
            );
        }
    }
    
    updateEnvironment(dt, player) {
        // 饱和度提升效果
        if (this.saturationBoostTimer > 0) {
            this.saturationBoostTimer -= dt * 1000;
            if (this.saturationBoostTimer <= 0) {
                this.saturationBoost = 0;
            }
        }
        
        // 环境粒子
        this.ambientParticleTimer += dt;
        if (this.ambientParticleTimer > 0.5) {
            this.ambientParticleTimer = 0;
            this.emitAmbientParticle(player);
        }
    }
    
    emitAmbientParticle(player) {
        const hour = Math.floor((this.gameTime % 1440) / 60);
        const period = Utils.getTimePeriod(hour);
        
        if (period === 'dusk') {
            // 黄昏金色粒子
            if (Utils.chance(0.3)) {
                Particles.emit({
                    x: player.x + Utils.random(-200, 200),
                    y: player.y + Utils.random(-200, 200),
                    count: 1,
                    speed: 0.5,
                    life: 2,
                    size: 6,
                    color: '#FFD700',
                    type: 'sparkle',
                    gravity: -0.2
                });
            }
        } else if (period === 'night') {
            // 夜晚灰色粒子
            if (Utils.chance(0.2)) {
                Particles.emit({
                    x: player.x + Utils.random(-150, 150),
                    y: player.y + Utils.random(-150, 150),
                    count: 1,
                    speed: 0.3,
                    life: 1.5,
                    size: 8,
                    color: '#606060',
                    type: 'circle',
                    gravity: 0.5
                });
            }
        }
    }
    
    updateErosion(dt, player) {
        const hour = Math.floor((this.gameTime % 1440) / 60);
        const period = Utils.getTimePeriod(hour);
        
        if (period === 'night') {
            // 侵蚀波
            if (!this.erosionWaveActive && hour >= 18) {
                this.erosionWaveActive = true;
                this.startErosionWave(player);
            }
            
            // 持续侵蚀伤害
            if (this.erosionWaveActive) {
                let protected_ = false;
                for (const item of player.placedItems) {
                    if (item.type === 'paperLantern' && 
                        player.distanceTo(item.x, item.y) < item.lightRadius) {
                        protected_ = true;
                        break;
                    }
                }
                
                if (!protected_) {
                    // 伤害系数限制在合理范围：第1日0.4，第2日0.6，第3日0.8
                    const dayScale = 0.3 + this.day * 0.15;
                    const damage = dayScale * this.erosionIntensity * dt;
                    player.addStat('color', -damage);
                    player.addStat('ink', -damage * 0.5);
                }
            }
        } else {
            this.erosionWaveActive = false;
        }
    }
    
    startErosionWave(player) {
        // 屏幕边缘侵蚀效果
        Particles.emit({
            x: player.x,
            y: player.y,
            count: 20,
            spreadX: 300,
            spreadY: 300,
            speed: 0.5,
            life: 3,
            size: 30,
            color: '#404040',
            type: 'watercolor',
            gravity: 0
        });
        
        GameAudio.playWarning();
    }
    
    checkClockPieces(player) {
        for (const piece of this.clockPieces) {
            if (!piece.found && player.distanceTo(piece.x, piece.y) < 50) {
                piece.found = true;
                player.clockPieces++;
                
                // 特效
                Particles.emitWatercolorSpread(piece.x, piece.y, '#C4A35A');
                GameAudio.playClockPieceFound();
                
                // 显示提示
                if (window.game && window.game.ui) {
                    window.game.ui.showDialog(`找到了古钟碎片！(${player.clockPieces}/3)`);
                }
            }
        }
    }
    
    temporarySaturationBoost(duration) {
        this.saturationBoost = 0.3;
        this.saturationBoostTimer = duration;
    }
    
    getResourceAt(x, y, range = 50) {
        for (const node of this.resourceNodes) {
            if (!node.collected && node.interactable && node.isPlayerNear(x, y, range)) {
                return node;
            }
        }
        return null;
    }
    
    updateSpawns(dt, player) {
        const period = this.getCurrentPeriod();

        // 按时段设定间隔和波规模
        if (period === 'night') {
            this.spawnInterval = 15;
            this.waveSize = 2;
        } else if (period === 'dusk') {
            this.spawnInterval = 20;
            this.waveSize = 1;
        } else {
            this.spawnInterval = 30;
            this.waveSize = 1;
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;
        this.spawnTimer = this.spawnInterval;

        // 统计当前存活的敌对生物数量
        const maxCrows   = period === 'night' ? 6 : 4;
        const maxSpiders = period === 'night' ? 5 : 3;
        let crowCount   = 0;
        let spiderCount = 0;
        for (const c of this.creatures.creatures) {
            if (c instanceof AshCrow   && c.alive) crowCount++;
            if (c instanceof PaperSpider && c.alive) spiderCount++;
        }

        // 在玩家附近随机边缘刷怪（距玩家 400-700px）
        for (let i = 0; i < this.waveSize; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = 400 + Math.random() * 300;
            const sx = Utils.clamp(player.x + Math.cos(angle) * dist, 60, this.width  - 60);
            const sy = Utils.clamp(player.y + Math.sin(angle) * dist, 60, this.height - 60);

            // 优先刷灰烬鸦，数量超上限则刷纸络蛛
            if (crowCount < maxCrows) {
                this.creatures.spawn('ashCrow', sx, sy, this.day);
                crowCount++;
                // 出现粒子提示
                Particles && Particles.emit({
                    x: sx, y: sy, count: 8, speed: 1.5, life: 0.8,
                    size: 10, color: '#3A3A4E', type: 'circle', gravity: -1
                });
            } else if (spiderCount < maxSpiders) {
                this.creatures.spawn('paperSpider', sx, sy, this.day);
                spiderCount++;
                Particles && Particles.emit({
                    x: sx, y: sy, count: 8, speed: 1, life: 0.8,
                    size: 12, color: '#C0C0C0', type: 'circle', gravity: -0.5
                });
            }
        }
    }

    getCurrentPeriod() {
        const hour = Math.floor((this.gameTime % 1440) / 60);
        return Utils.getTimePeriod(hour);
    }
    
    getCurrentHour() {
        return Math.floor((this.gameTime % 1440) / 60);
    }
    
    draw(ctx, player) {
        // 绘制背景
        this.drawBackground(ctx, player);
        
        // 绘制地面装饰
        this.drawGroundDetails(ctx);
        
        // 绘制古钟碎片位置提示
        this.drawClockPieceHints(ctx, player);
        
        // 绘制资源节点
        for (const node of this.resourceNodes) {
            node.draw(ctx);
        }
        
        // 绘制生物
        this.creatures.draw(ctx);
        
        // 绘制钟塔
        this.drawClockTower(ctx, player);
        
        // 绘制环境覆盖层
        this.drawEnvironmentOverlay(ctx, player);
    }
    
    drawBackground(ctx, player) {
        const hour = this.getCurrentHour();
        const period = this.getCurrentPeriod();
        
        // 根据时段变化背景色
        let bgColors;
        switch (period) {
            case 'day':
                bgColors = ['#D8D2C8', '#C8C2B4', '#B4AEA0'];  // 苍白灰 → 天空已褪色
                break;
            case 'dusk':
                bgColors = ['#A89080', '#907868', '#6A5848'];    // 灰橙褐 → 黄昏已攜色
                break;
            case 'night':
                bgColors = ['#1E1828', '#14101E', '#0A0810'];   // 深铅蓝黑 → 将死的夜
                break;
        }
        
        // 应用情绪色彩影响
        if (player.emotionState === 'fear') {
            bgColors = bgColors.map(c => this.desaturateColor(c, 0.5));
        } else if (player.emotionState === 'anxious') {
            bgColors = bgColors.map(c => this.desaturateColor(c, 0.2));
        }
        
        // 渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, bgColors[0]);
        gradient.addColorStop(0.5, bgColors[1]);
        gradient.addColorStop(1, bgColors[2]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 水彩晕染效果层
        this.drawWatercolorLayer(ctx);
        
        // 饱和度提升效果
        if (this.saturationBoost > 0) {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.saturationBoost * 0.1})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    drawWatercolorLayer(ctx) {
        // 模拟水彩晕染的不规则斑块
        ctx.globalAlpha = 0.1;
        
        const patches = [
            { x: 100, y: 100, r: 150, color: '#708238' },
            { x: this.width - 150, y: 200, r: 120, color: '#C2452D' },
            { x: this.width / 2, y: this.height - 150, r: 180, color: '#C4A35A' },
            { x: 200, y: this.height / 2, r: 100, color: '#4A7FBF' }
        ];
        
        for (const patch of patches) {
            const gradient = ctx.createRadialGradient(
                patch.x, patch.y, 0,
                patch.x, patch.y, patch.r
            );
            const rgb = Utils.hexToRgb(patch.color);
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
            gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(patch.x, patch.y, patch.r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawGroundDetails(ctx) {
        // 手绘线稿风格的地面纹理
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.2)';
        ctx.lineWidth = 1;
        
        // 随机草丛线条
        for (let i = 0; i < 50; i++) {
            const x = (i * 47) % this.width;
            const y = this.height - 50 - (i * 23) % 100;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + 5, y - 15, x + 2, y - 25);
            ctx.stroke();
        }
    }
    
    drawClockPieceHints(ctx, player) {
        for (const piece of this.clockPieces) {
            if (piece.found) continue;
            
            const dist = player.distanceTo(piece.x, piece.y);
            
            // 近距离时显示光晕
            if (dist < 200) {
                const alpha = 0.3 * (1 - dist / 200);
                
                const gradient = ctx.createRadialGradient(
                    piece.x, piece.y, 0,
                    piece.x, piece.y, 40
                );
                gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(piece.x, piece.y, 40, 0, Math.PI * 2);
                ctx.fill();
                
                // 齿轮图标
                ctx.save();
                ctx.translate(piece.x, piece.y);
                ctx.rotate(Date.now() / 1000);
                
                ctx.strokeStyle = `rgba(196, 163, 90, ${alpha * 2})`;
                ctx.lineWidth = 2;
                
                // 简单齿轮
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.stroke();
                
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
                    ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
                    ctx.stroke();
                }
                
                ctx.restore();
            }
        }
    }
    
    drawClockTower(ctx, player) {
        const x = this.clockTower.x;
        const y = this.clockTower.y;
        
        ctx.save();
        ctx.translate(x, y);
        
        // 塔身
        const towerGradient = ctx.createLinearGradient(-40, -100, 40, 100);
        towerGradient.addColorStop(0, '#5A4A3A');
        towerGradient.addColorStop(0.5, '#4A3A2A');
        towerGradient.addColorStop(1, '#3A2A1A');
        
        ctx.fillStyle = towerGradient;
        ctx.beginPath();
        ctx.moveTo(-35, 80);
        ctx.lineTo(-30, -60);
        ctx.lineTo(30, -60);
        ctx.lineTo(35, 80);
        ctx.closePath();
        ctx.fill();
        
        // 塔顶
        ctx.beginPath();
        ctx.moveTo(-35, -60);
        ctx.lineTo(0, -100);
        ctx.lineTo(35, -60);
        ctx.closePath();
        ctx.fill();
        
        // 钟面
        const clockGlow = player.clockOilUsed > 0 ? 0.5 : 0.2;
        ctx.fillStyle = `rgba(244, 228, 188, ${clockGlow})`;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 钟针
        ctx.strokeStyle = '#3A2A1A';
        ctx.lineWidth = 2;
        
        // 根据修复进度转动
        const hourAngle = (player.clockOilUsed / 3) * Math.PI * 2 - Math.PI / 2;
        const minuteAngle = hourAngle * 12;
        
        // 时针
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(hourAngle) * 12, Math.sin(hourAngle) * 12);
        ctx.stroke();
        
        // 分针
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(minuteAngle) * 18, Math.sin(minuteAngle) * 18);
        ctx.stroke();
        
        // 修复进度指示
        if (player.clockOilUsed > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '14px "ZCOOL XiaoWei"';
            ctx.textAlign = 'center';
            ctx.fillText(`${player.clockOilUsed}/3`, 0, 50);
        }
        
        ctx.restore();
    }
    
    getLightSources(player) {
        let lightSources = [{ x: player.x, y: player.y, radius: 100, intensity: 0.4 }];
        
        for (const item of player.placedItems) {
            if (item.type === 'paperLantern') {
                lightSources.push({
                    x: item.x,
                    y: item.y,
                    radius: item.lightRadius,
                    intensity: 0.9
                });
            }
        }
        return lightSources;
    }
    
    drawEnvironmentOverlay(ctx, player) {
        // 低墨韵值水渍扭曲边缘
        if (player.stats.ink < 30) {
            const intensity = 1 - player.stats.ink / 30;
            ctx.strokeStyle = `rgba(106, 159, 255, ${intensity * 0.3})`;
            ctx.lineWidth = 20 + intensity * 30;
            ctx.strokeRect(0, 0, this.width, this.height);
        }
        
        // 低纸温值涟漪效果
        if (player.stats.warmth < 40) {
            const intensity = 1 - player.stats.warmth / 40;
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = `rgba(135, 206, 235, ${intensity * 0.1})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                const offset = Math.sin(Date.now() / 500 + i) * 10;
                ctx.arc(player.x, player.y, 100 + i * 50 + offset, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    desaturateColor(hex, amount) {
        const rgb = Utils.hexToRgb(hex);
        const gray = (rgb.r + rgb.g + rgb.b) / 3;
        return Utils.rgbToHex(
            Utils.lerp(rgb.r, gray, amount),
            Utils.lerp(rgb.g, gray, amount),
            Utils.lerp(rgb.b, gray, amount)
        );
    }
}
