// 工具函数库

const Utils = {
    // 随机数生成
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // 概率判断
    chance: (probability) => Math.random() < probability,
    
    // 距离计算
    distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    
    // 角度计算
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    
    // 线性插值
    lerp: (start, end, t) => start + (end - start) * t,
    
    // 限制范围
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    // 颜色处理
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    rgbToHex: (r, g, b) => '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join(''),
    
    // HSL转RGB
    hslToRgb: (h, s, l) => {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: r * 255, g: g * 255, b: b * 255 };
    },
    
    // 水彩色调生成
    watercolorPalette: {
        ochre: '#C4A35A',
        oliveGreen: '#708238',
        terracotta: '#C2452D',
        deepPurple: '#2D1B4E',
        shadowBlue: '#1A1A3E',
        parchment: '#F4E4BC',
        goldAccent: '#FFD700',
        inkBlack: '#1A1A2E'
    },
    
    // 生成水彩渐变色
    generateWatercolorGradient: (ctx, x, y, radius, baseColor, alpha = 1) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const rgb = Utils.hexToRgb(baseColor);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        return gradient;
    },
    
    // 格式化时间显示
    formatGameTime: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },
    
    // 获取时段名称
    getTimePeriod: (hour) => {
        if (hour >= 6 && hour < 14) return 'day';      // 白昼
        if (hour >= 14 && hour < 18) return 'dusk';    // 黄昏
        return 'night';                                  // 夜晚
    },
    
    getTimePeriodName: (period) => {
        const names = {
            'day': '白昼',
            'dusk': '黄昏',
            'night': '夜晚'
        };
        return names[period] || '白昼';
    },
    
    // 缓动函数
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        }
    },
    
    // 碰撞检测
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        return Utils.distance(x1, y1, x2, y2) < r1 + r2;
    },
    
    rectCollision: (rect1, rect2) => {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    },
    
    pointInRect: (px, py, rect) => {
        return px >= rect.x && px <= rect.x + rect.width &&
               py >= rect.y && py <= rect.y + rect.height;
    },
    
    // 屏幕震动效果
    screenShake: {
        intensity: 0,
        duration: 0,
        apply: (intensity, duration) => {
            Utils.screenShake.intensity = intensity;
            Utils.screenShake.duration = duration;
        },
        update: (dt) => {
            if (Utils.screenShake.duration > 0) {
                Utils.screenShake.duration -= dt;
                if (Utils.screenShake.duration <= 0) {
                    Utils.screenShake.intensity = 0;
                }
            }
        },
        getOffset: () => {
            if (Utils.screenShake.intensity <= 0) return { x: 0, y: 0 };
            return {
                x: Utils.random(-Utils.screenShake.intensity, Utils.screenShake.intensity),
                y: Utils.random(-Utils.screenShake.intensity, Utils.screenShake.intensity)
            };
        }
    },
    
    // 深拷贝
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    
    // 数组随机选择
    randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    
    // 打乱数组
    shuffle: (arr) => {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
};

// 对象池管理
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        while (this.active.length > 0) {
            const obj = this.active.pop();
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}

// 简易状态机
class StateMachine {
    constructor(initialState) {
        this.currentState = initialState;
        this.states = {};
        this.transitions = {};
    }
    
    addState(name, callbacks) {
        this.states[name] = {
            enter: callbacks.enter || (() => {}),
            update: callbacks.update || (() => {}),
            exit: callbacks.exit || (() => {})
        };
    }
    
    addTransition(from, to, condition) {
        if (!this.transitions[from]) {
            this.transitions[from] = [];
        }
        this.transitions[from].push({ to, condition });
    }
    
    setState(newState) {
        if (this.states[this.currentState]) {
            this.states[this.currentState].exit();
        }
        this.currentState = newState;
        if (this.states[this.currentState]) {
            this.states[this.currentState].enter();
        }
    }
    
    update(dt) {
        // 检查转换条件
        const possibleTransitions = this.transitions[this.currentState];
        if (possibleTransitions) {
            for (const transition of possibleTransitions) {
                if (transition.condition()) {
                    this.setState(transition.to);
                    return;
                }
            }
        }
        
        // 更新当前状态
        if (this.states[this.currentState]) {
            this.states[this.currentState].update(dt);
        }
    }
}
