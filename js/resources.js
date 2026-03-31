// 资源系统 - 5种基础资源 + 合成配方

// 教程专用资源
const TutorialResources = {
    RUSTY_GEAR: {
        id: 'rustyGear',
        name: '生锈齿轮',
        description: '工坊里的老齿轮，还能转动',
        color: '#8B7355',
        glowColor: 'rgba(139, 115, 85, 0.3)',
        isTutorial: true,
        collectEffect: { color: 3 }
    }
};

// 教程专用合成配方
const TutorialCraftedItems = {
    TUTORIAL_OIL: {
        id: 'tutorialOil',
        name: '润滑油',
        description: '让齿轮重新转动',
        color: '#A08050',
        icon: '🛢️',
        isTutorial: true,
        recipe: [
            { item: 'stardustGrass', count: 1 },
            { item: 'morningDew', count: 1 }
        ]
    }
};

const ResourceTypes = {
    // 星尘草 - 黄昏草地采集
    STARDUST_GRASS: {
        id: 'stardustGrass',
        name: '星尘草',
        description: '黄昏时分草地上自发光的细茎草，草叶尖端有金箔质感的亮点闪烁',
        color: '#708238',
        glowColor: '#FFD700',
        spawnTime: 'dusk',
        spawnTerrain: 'grass',
        collectEffect: 'stardustSparkle',
        onCollect: (player) => {
            player.addStat('color', 15);
        },
        icon: 'grass'
    },
    
    // 晨露珠 - 清晨石缝采集
    MORNING_DEW: {
        id: 'morningDew',
        name: '晨露珠',
        description: '清晨附着于石缝的半透明水珠，内部有细小气泡',
        color: '#6B9FFF',
        glowColor: '#A0CFFF',
        spawnTime: 'morning',
        spawnTerrain: 'stone',
        collectEffect: 'dewBurst',
        onCollect: (player) => {
            player.addStat('warmth', 20);
        },
        icon: 'drop'
    },
    
    // 炭骨枝 - 砍击枯色树
    CHAR_BRANCH: {
        id: 'charBranch',
        name: '炭骨枝',
        description: '枯死树木上残留的焦黑树枝，呈龟裂水彩干笔质感',
        color: '#2A2A3A',
        glowColor: '#5A4A8E',
        spawnTime: 'always',
        spawnTerrain: 'deadTree',
        collectEffect: 'inkSplatter',
        onCollect: null,
        icon: 'branch'
    },
    
    // 彩实 - 三色变体
    COLOR_FRUIT_RED: {
        id: 'colorFruitRed',
        name: '赤彩实',
        description: '挂于枝头的圆润浆果，赤色水彩饱和色',
        color: '#C2452D',
        glowColor: '#FF6B6B',
        spawnTime: 'day',
        spawnTerrain: 'colorTree',
        collectEffect: 'colorDrip',
        onCollect: (player) => {
            player.addStat('color', 20);
        },
        icon: 'fruit'
    },
    
    COLOR_FRUIT_YELLOW: {
        id: 'colorFruitYellow',
        name: '黄彩实',
        description: '挂于枝头的圆润浆果，黄色水彩饱和色',
        color: '#C4A35A',
        glowColor: '#FFE066',
        spawnTime: 'day',
        spawnTerrain: 'colorTree',
        collectEffect: 'colorDrip',
        onCollect: (player) => {
            player.addStat('color', 15);
        },
        icon: 'fruit'
    },
    
    COLOR_FRUIT_BLUE: {
        id: 'colorFruitBlue',
        name: '蓝彩实',
        description: '挂于枝头的圆润浆果，蓝色水彩饱和色',
        color: '#4A7FBF',
        glowColor: '#6B9FFF',
        spawnTime: 'day',
        spawnTerrain: 'colorTree',
        collectEffect: 'colorDrip',
        onCollect: (player) => {
            player.addStat('color', 10);
        },
        icon: 'fruit'
    },
    
    // 灰絮
    GRAY_FLUFF: {
        id: 'grayFluff',
        name: '灰絮',
        description: '飘浮于空气中的浅灰色绒絮，状如破碎的水彩晕染片段',
        color: '#808080',
        glowColor: '#A0A0A0',
        spawnTime: 'always',
        spawnTerrain: 'grayZone',
        collectEffect: 'fade',
        onCollect: (player) => {
            player.addStat('warmth', -5);
        },
        icon: 'fluff'
    }
};

// 合成物品
const CraftedItems = {
    // 暖阳颜料
    WARM_PIGMENT: {
        id: 'warmPigment',
        name: '暖阳颜料',
        description: '回复墨韵值+35，周围场景色彩饱和度临时提升',
        color: '#FFB347',
        category: 'survival',
        recipe: [
            { item: 'stardustGrass', count: 2 },
            { item: 'morningDew', count: 1 },
            { item: 'colorFruitYellow', count: 1 }
        ],
        onUse: (player, world) => {
            player.addStat('ink', 35);
            world.temporarySaturationBoost(5000);
            Particles.emitWatercolorSpread(player.x, player.y, '#FFB347');
            GameAudio.playCraft();
        },
        icon: 'bottle'
    },
    
    // 纸灯
    PAPER_LANTERN: {
        id: 'paperLantern',
        name: '纸灯',
        description: '照明半径4格，每夜持续8分钟，纸温值回复+5/分钟',
        color: '#FFE4B5',
        category: 'survival',
        recipe: [
            { item: 'charBranch', count: 3 },
            { item: 'stardustGrass', count: 1 },
            { item: 'grayFluff', count: 2 }
        ],
        placeable: true,
        lightRadius: 150,
        warmthBonus: 5,
        duration: 480,
        icon: 'lantern'
    },
    
    // 澄墨水
    CLEAR_INK: {
        id: 'clearInk',
        name: '澄墨水',
        description: '古钟润滑剂的原料，墨韵值+10',
        color: '#3A3A5E',
        category: 'key',
        recipe: [
            { item: 'charBranch', count: 2 },
            { item: 'morningDew', count: 2 }
        ],
        onUse: (player) => {
            player.addStat('ink', 10);
        },
        icon: 'ink'
    },
    
    // 七彩液
    RAINBOW_LIQUID: {
        id: 'rainbowLiquid',
        name: '七彩液',
        description: '三色彩实融合而成的神奇液体',
        color: '#FF69B4',
        category: 'key',
        recipe: [
            { item: 'colorFruitRed', count: 1 },
            { item: 'colorFruitYellow', count: 1 },
            { item: 'colorFruitBlue', count: 1 }
        ],
        icon: 'rainbow'
    },
    
    // 古钟润滑剂（关键道具）
    CLOCK_OIL: {
        id: 'clockOil',
        name: '古钟润滑剂',
        description: '修复古钟碎片的必要消耗品',
        color: '#C4A35A',
        category: 'key',
        recipe: [
            { item: 'rainbowLiquid', count: 1 },
            { item: 'clearInk', count: 1 },
            { item: 'stardustGrass', count: 3 }
        ],
        keyItem: true,
        icon: 'oil'
    },
    
    // 安心茶
    CALM_TEA: {
        id: 'calmTea',
        name: '安心茶',
        description: '恢复墨韵值+25，消除恐惧状态',
        color: '#90EE90',
        category: 'survival',
        recipe: [
            { item: 'morningDew', count: 2 },
            { item: 'stardustGrass', count: 1 }
        ],
        onUse: (player) => {
            player.addStat('ink', 25);
            player.removeStatus('fear');
        },
        icon: 'tea'
    },
    
    // 炭笔
    CHARCOAL_PEN: {
        id: 'charcoalPen',
        name: '炭笔',
        description: '战斗道具，攻击力+15',
        color: '#1A1A2E',
        category: 'weapon',
        recipe: [
            { item: 'charBranch', count: 5 }
        ],
        weapon: true,
        damage: 15,
        icon: 'pen'
    },
    
    // 灰幕弹
    SMOKE_BOMB: {
        id: 'smokeBomb',
        name: '灰幕弹',
        description: '投掷型迷雾道具，使敌人迷失方向',
        color: '#696969',
        category: 'weapon',
        recipe: [
            { item: 'grayFluff', count: 5 },
            { item: 'charBranch', count: 1 }
        ],
        throwable: true,
        effectRadius: 100,
        effectDuration: 3000,
        icon: 'bomb'
    }
};

// 资源节点类
class ResourceNode {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.data = ResourceTypes[type];
        this.radius = 25;
        this.collected = false;
        this.respawnTime = 0;
        this.respawnDelay = 60000; // 60秒后重生
        this.glowPhase = Math.random() * Math.PI * 2;
        this.wobble = 0;
        this.interactable = true;
    }
    
    update(dt, gameTime) {
        // 检查是否可以根据时间生成
        if (this.collected) {
            this.respawnTime -= dt * 1000;
            if (this.respawnTime <= 0) {
                this.collected = false;
                this.interactable = true;
            }
            return;
        }
        
        // 发光动画
        this.glowPhase += dt * 2;
        
        // 摆动动画
        this.wobble = Math.sin(this.glowPhase * 0.5) * 3;
        
        // 检查时间条件
        const hour = Math.floor((gameTime % 1440) / 60);
        const period = Utils.getTimePeriod(hour);
        
        if (this.data.spawnTime !== 'always') {
            if (this.data.spawnTime === 'morning' && (hour < 6 || hour >= 9)) {
                this.interactable = false;
            } else if (this.data.spawnTime === 'dusk' && period !== 'dusk') {
                this.interactable = false;
            } else if (this.data.spawnTime === 'day' && period !== 'day') {
                this.interactable = false;
            } else {
                this.interactable = true;
            }
        }
    }
    
    draw(ctx) {
        if (this.collected) return;
        
        const alpha = this.interactable ? 1 : 0.4;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y + this.wobble);
        
        // 发光效果
        const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
        const glowRadius = this.radius * 2;
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        const glowRgb = Utils.hexToRgb(this.data.glowColor);
        glowGradient.addColorStop(0, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${glowIntensity})`);
        glowGradient.addColorStop(1, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0)`);
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 根据图标类型绘制
        this.drawIcon(ctx);
        
        ctx.restore();
    }
    
    drawIcon(ctx) {
        const size = this.radius;
        const color = this.data.color;
        const rgb = Utils.hexToRgb(color);
        
        switch(this.data.icon) {
            case 'grass':
                this.drawGrass(ctx, size, rgb);
                break;
            case 'drop':
                this.drawDrop(ctx, size, rgb);
                break;
            case 'branch':
                this.drawBranch(ctx, size, rgb);
                break;
            case 'fruit':
                this.drawFruit(ctx, size, rgb);
                break;
            case 'fluff':
                this.drawFluff(ctx, size, rgb);
                break;
            default:
                this.drawDefault(ctx, size, rgb);
        }
    }
    
    drawGrass(ctx, size, rgb) {
        ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // 多根草
        for (let i = -2; i <= 2; i++) {
            const offset = i * 6;
            const height = size * (0.8 + Math.random() * 0.4);
            const curve = Math.sin(this.glowPhase + i) * 5;
            
            ctx.beginPath();
            ctx.moveTo(offset, size * 0.3);
            ctx.quadraticCurveTo(offset + curve, -height * 0.5, offset + curve * 0.5, -height);
            ctx.stroke();
            
            // 金色尖端
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(offset + curve * 0.5, -height, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawDrop(ctx, size, rgb) {
        // 水滴形状
        const gradient = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
        gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(size * 0.8, -size * 0.3, size * 0.8, size * 0.5, 0, size * 0.8);
        ctx.bezierCurveTo(-size * 0.8, size * 0.5, -size * 0.8, -size * 0.3, 0, -size);
        ctx.fill();
        
        // 气泡
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.1, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawBranch(ctx, size, rgb) {
        ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // 主干
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, size * 0.5);
        ctx.lineTo(size * 0.5, -size * 0.3);
        ctx.stroke();
        
        // 分支
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.3, -size * 0.6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.2);
        ctx.lineTo(-size * 0.5, -size * 0.2);
        ctx.stroke();
        
        // 磷火
        const fireGlow = ctx.createRadialGradient(size * 0.5, -size * 0.3, 0, size * 0.5, -size * 0.3, size * 0.3);
        fireGlow.addColorStop(0, 'rgba(90, 74, 142, 0.8)');
        fireGlow.addColorStop(1, 'rgba(90, 74, 142, 0)');
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(size * 0.5, -size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFruit(ctx, size, rgb) {
        // 果实
        const gradient = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size * 0.7);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0.3)`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
        gradient.addColorStop(1, `rgba(${rgb.r * 0.7}, ${rgb.g * 0.7}, ${rgb.b * 0.7}, 1)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // 小梗
        ctx.strokeStyle = '#708238';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(0, -size);
        ctx.stroke();
        
        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawFluff(ctx, size, rgb) {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        
        // 多个小絮状
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + this.glowPhase * 0.2;
            const dist = size * 0.4;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist + Math.sin(this.glowPhase + i) * 3;
            
            ctx.beginPath();
            ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 中心
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawDefault(ctx, size, rgb) {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    collect(player) {
        if (this.collected || !this.interactable) return null;
        
        this.collected = true;
        this.respawnTime = this.respawnDelay;
        
        // 播放采集特效
        switch(this.data.collectEffect) {
            case 'stardustSparkle':
                Particles.emitStardustSparkle(this.x, this.y);
                Particles.emitWatercolorSpread(this.x, this.y, this.data.glowColor);
                break;
            case 'dewBurst':
                Particles.emitDewBurst(this.x, this.y);
                break;
            case 'inkSplatter':
                Particles.emitInkSplatter(this.x, this.y);
                break;
            case 'colorDrip':
                Particles.emitColorDrip(this.x, this.y, this.data.color);
                break;
            case 'fade':
                Particles.emitFade(this.x, this.y);
                break;
            default:
                Particles.emitWatercolorSpread(this.x, this.y, this.data.color);
        }
        
        // 播放音效
        GameAudio.playCollect(this.data.id);
        
        // 应用即时效果
        if (this.data.onCollect) {
            this.data.onCollect(player);
        }
        
        return {
            id: this.data.id,
            name: this.data.name,
            count: 1
        };
    }
    
    isPlayerNear(playerX, playerY, range = 50) {
        return Utils.distance(this.x, this.y, playerX, playerY) < range;
    }
}

// 合成系统
class CraftingSystem {
    constructor() {
        this.recipes = Object.values(CraftedItems);
    }
    
    canCraft(recipeId, inventory) {
        const recipe = CraftedItems[recipeId];
        if (!recipe) return false;
        
        for (const ingredient of recipe.recipe) {
            const count = inventory.getItemCount(ingredient.item);
            if (count < ingredient.count) {
                return false;
            }
        }
        return true;
    }
    
    craft(recipeId, inventory) {
        const recipe = CraftedItems[recipeId];
        if (!recipe || !this.canCraft(recipeId, inventory)) {
            return null;
        }
        
        // 消耗材料
        for (const ingredient of recipe.recipe) {
            inventory.removeItem(ingredient.item, ingredient.count);
        }
        
        // 添加产物
        inventory.addItem(recipe.id, 1);
        
        // 播放合成音效
        GameAudio.playCraft();
        
        return recipe;
    }
    
    getAvailableRecipes(inventory) {
        return this.recipes.map(recipe => ({
            ...recipe,
            canCraft: this.canCraft(
                Object.keys(CraftedItems).find(key => CraftedItems[key].id === recipe.id),
                inventory
            )
        }));
    }
}

// 背包系统
class Inventory {
    constructor(maxSlots = 20) {
        this.maxSlots = maxSlots;
        this.items = new Map();
    }
    
    addItem(itemId, count = 1) {
        const current = this.items.get(itemId) || 0;
        this.items.set(itemId, current + count);
        return true;
    }
    
    removeItem(itemId, count = 1) {
        const current = this.items.get(itemId) || 0;
        if (current < count) return false;
        
        const newCount = current - count;
        if (newCount <= 0) {
            this.items.delete(itemId);
        } else {
            this.items.set(itemId, newCount);
        }
        return true;
    }
    
    getItemCount(itemId) {
        return this.items.get(itemId) || 0;
    }
    
    hasItem(itemId, count = 1) {
        return this.getItemCount(itemId) >= count;
    }
    
    getAllItems() {
        const result = [];
        this.items.forEach((count, id) => {
            // 查找物品信息
            let itemData = null;
            for (const key in ResourceTypes) {
                if (ResourceTypes[key].id === id) {
                    itemData = ResourceTypes[key];
                    break;
                }
            }
            if (!itemData) {
                for (const key in CraftedItems) {
                    if (CraftedItems[key].id === id) {
                        itemData = CraftedItems[key];
                        break;
                    }
                }
            }
            if (!itemData && typeof TutorialCraftedItems !== 'undefined') {
                for (const key in TutorialCraftedItems) {
                    if (TutorialCraftedItems[key].id === id) {
                        itemData = TutorialCraftedItems[key];
                        break;
                    }
                }
            }
            
            if (itemData) {
                result.push({
                    id,
                    name: itemData.name,
                    count,
                    color: itemData.color,
                    description: itemData.description
                });
            }
        });
        return result;
    }
    
    clear() {
        this.items.clear();
    }
    
    // 序列化背包数据（用于存档）
    serialize() {
        const data = {};
        this.items.forEach((count, id) => {
            data[id] = count;
        });
        return data;
    }
    
    // 反序列化背包数据（用于读档）
    deserialize(data) {
        this.items.clear();
        if (data && typeof data === 'object') {
            for (const id in data) {
                if (data[id] > 0) {
                    this.items.set(id, data[id]);
                }
            }
        }
    }
}
