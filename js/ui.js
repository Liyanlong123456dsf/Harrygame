// UI系统 - 羊皮纸风格界面

class UI {
    constructor(game) {
        this.game = game;
        this.elements = {};
        this.dialogQueue = [];
        this.dialogTimer = 0;
        this.currentDialog = null;
        this.tooltipTarget = null;
        this.craftSlotData = [{itemId:'',count:0},{itemId:'',count:0},{itemId:'',count:0},{itemId:'',count:0}];
        this.matchedRecipe = null;
        this._dragItemId = null;
        
        this.init();
    }
    
    init() {
        // 获取DOM元素
        this.elements = {
            uiLayer: document.getElementById('ui-layer'),
            statsPanel: document.getElementById('stats-panel'),
            colorFill: document.getElementById('color-fill'),
            inkFill: document.getElementById('ink-fill'),
            warmthFill: document.getElementById('warmth-fill'),
            colorStat: document.getElementById('color-stat'),
            inkStat: document.getElementById('ink-stat'),
            warmthStat: document.getElementById('warmth-stat'),
            dayDisplay: document.getElementById('day-display'),
            timeDisplay: document.getElementById('time-display'),
            pigmentRed: document.getElementById('pigment-red'),
            pigmentYellow: document.getElementById('pigment-yellow'),
            pigmentBlue: document.getElementById('pigment-blue'),
            inventoryBtn: document.getElementById('inventory-btn'),
            craftBtn: document.getElementById('craft-btn'),
            inventoryScreen: document.getElementById('inventory-screen'),
            inventoryGrid: document.getElementById('inventory-grid'),
            craftScreen: document.getElementById('craft-screen'),
            craftSlots: document.querySelectorAll('.craft-slot'),
            craftExecute: document.getElementById('craft-execute'),
            craftResult: document.getElementById('craft-result'),
            craftPreview: document.getElementById('craft-preview'),
            craftInvGrid: document.getElementById('craft-inv-grid'),
            recipesList: document.getElementById('recipes-list'),
            dialogBox: document.getElementById('dialog-box'),
            dialogText: document.getElementById('dialog-text'),
            tooltip: document.getElementById('tooltip'),
            endScreen: document.getElementById('end-screen'),
            endTitle: document.getElementById('end-title'),
            endMessage: document.getElementById('end-message'),
            restartBtn: document.getElementById('restart-btn'),
            equipWeaponSlot: document.getElementById('equip-weapon-slot'),
            equipWeaponIcon: document.getElementById('equip-weapon-icon'),
            equipWeaponName: document.getElementById('equip-weapon-name'),
            equipEffect: document.getElementById('equip-effect'),
            trackerMiniTime: document.getElementById('tracker-mini-time')
        };
        
        this.bindEvents();
        this.initInventoryGrid();
    }
    
    bindEvents() {
        // 背包按钮
        this.elements.inventoryBtn.addEventListener('click', () => {
            this.toggleInventory();
        });
        
        // 合成按钮
        this.elements.craftBtn.addEventListener('click', () => {
            this.toggleCraftScreen();
        });
        
        // 关闭按钮
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.screen').classList.add('hidden');
                this.game.paused = false;
                this.hideTooltip();
                this._returnSlotsToInventory();
            });
        });
        
        // 颜料槽点击（添加消耗波动动画）
        this.elements.pigmentRed.addEventListener('click', () => {
            this._triggerPigmentDrain(this.elements.pigmentRed);
            this.game.player.usePigment('red');
            this.updatePigments();
        });
        this.elements.pigmentYellow.addEventListener('click', () => {
            this._triggerPigmentDrain(this.elements.pigmentYellow);
            this.game.player.usePigment('yellow');
            this.updatePigments();
        });
        this.elements.pigmentBlue.addEventListener('click', () => {
            this._triggerPigmentDrain(this.elements.pigmentBlue);
            this.game.player.usePigment('blue');
            this.updatePigments();
        });
        
        // 合成执行
        this.elements.craftExecute.addEventListener('click', () => {
            this.executeCraft();
        });
        
        // 重新开始
        this.elements.restartBtn.addEventListener('click', () => {
            location.reload();
        });
        
        // 对话框点击关闭
        this.elements.dialogBox.addEventListener('click', () => {
            this.hideDialog();
        });

        // 手机端：任意触摸隐藏tooltip（mouseenter/mouseleave在触屏上不可靠）
        document.addEventListener('touchstart', () => {
            this.hideTooltip();
        }, { passive: true });

        // 装备槽点击 → 卸下装备
        this.elements.equipWeaponSlot.addEventListener('click', () => {
            const player = this.game.player;
            if (player && player.equippedWeapon) {
                player.equippedWeapon = null;
                this.showDialog('已卸下武器');
                this.updateEquipPanel();
            }
        });
    }
    
    initInventoryGrid() {
        // 创建20个背包格子
        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slot = i;
            slot.addEventListener('click', () => this.onInventorySlotClick(i));
            slot.addEventListener('mouseenter', (e) => this.showItemTooltip(e, i));
            slot.addEventListener('mouseleave', () => this.hideTooltip());
            
            // 触屏长按显示tooltip
            let longPressTimer = null;
            slot.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    this.showItemTooltip(e.touches[0], i);
                }, 500);
            }, { passive: true });
            slot.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            }, { passive: true });
            slot.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
            }, { passive: true });
            
            this.elements.inventoryGrid.appendChild(slot);
        }
    }
    
    update(dt) {
        if (!this.game.player) return;
        
        // 更新数值栏
        this.updateStats();
        
        // 更新时间显示
        this.updateTimeDisplay();

        // 更新装备栏
        this.updateEquipPanel();
        
        // 更新颜料槽
        this.updatePigments();
        
        // 更新对话框
        this.updateDialog(dt);
    }
    
    updateStats() {
        const player = this.game.player;
        
        // 色值
        const colorPercent = (player.stats.color / player.maxStats.color) * 100;
        this.elements.colorFill.style.width = colorPercent + '%';
        this.updateStatWarning(this.elements.colorStat, colorPercent);
        
        // 墨韵值
        const inkPercent = (player.stats.ink / player.maxStats.ink) * 100;
        this.elements.inkFill.style.width = inkPercent + '%';
        this.updateStatWarning(this.elements.inkStat, inkPercent);
        
        // 纸温值
        const warmthPercent = (player.stats.warmth / player.maxStats.warmth) * 100;
        this.elements.warmthFill.style.width = warmthPercent + '%';
        this.updateStatWarning(this.elements.warmthStat, warmthPercent);
    }
    
    updateStatWarning(element, percent) {
        element.classList.remove('warning', 'critical');
        if (percent < 20) {
            element.classList.add('critical');
        } else if (percent < 40) {
            element.classList.add('warning');
        }
    }

    // 显示数值变化浮动文字
    showStatChange(statType, delta) {
        if (delta === 0) return;
        const statMap = { color: 'colorStat', ink: 'inkStat', warmth: 'warmthStat' };
        const statEl = this.elements[statMap[statType]];
        if (!statEl) return;

        const floatEl = document.createElement('div');
        floatEl.className = 'stat-float ' + (delta > 0 ? 'positive' : 'negative');
        floatEl.textContent = (delta > 0 ? '+' : '') + Math.round(delta);
        statEl.style.position = 'relative';
        statEl.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 1200);
    }
    
    updateEquipPanel() {
        const player = this.game.player;
        if (!player) return;
        const weapon = player.equippedWeapon;
        const slot   = this.elements.equipWeaponSlot;
        const icon   = this.elements.equipWeaponIcon;
        const name   = this.elements.equipWeaponName;
        const effect = this.elements.equipEffect;

        if (weapon) {
            slot.classList.add('has-item');
            icon.style.background = weapon.color || '#1A1A2E';
            name.textContent = weapon.name;
            // 效果说明
            const lines = [];
            if (weapon.damage) lines.push(`⚔ 攻击力 +${weapon.damage}`);
            if (weapon.description) lines.push(`◈ ${weapon.description}`);
            effect.innerHTML = lines.join('<br>');
        } else {
            slot.classList.remove('has-item');
            icon.style.background = 'transparent';
            name.textContent = '—';
            effect.textContent = '未装备武器，攻击力 10';
        }
    }

    updateTimeDisplay() {
        const world = this.game.world;
        const dayNames = ['第一日', '第二日', '第三日'];

        this.elements.dayDisplay.textContent = dayNames[world.day - 1] || `第${world.day}日`;
        const period = world.getCurrentPeriod();
        this.elements.timeDisplay.textContent = Utils.getTimePeriodName(period);

        // 时段进度条
        // 一天24小时映射到进度条 0-100%
        // 白昼 6-14h → bar 0%~33.3%（8h / 24h）
        // 黄昏 14-18h → bar 33.3%~50%（4h / 24h）
        // 黑夜 18-6h → bar 50%~100%（12h / 24h）
        const barFill   = document.getElementById('period-bar-fill');
        const barCursor = document.getElementById('period-bar-cursor');
        const labels    = document.querySelectorAll('.pbl');
        if (!barFill || !barCursor) return;

        const hour = world.gameTime / 60; // 0-24
        // 把 hour 转换成进度条上的位置 [0,1]
        // 我们把一天起点定在 0点（午夜）
        // 0→6h: 夜晚后半段 (bar 83.3%→100%)
        // 6→14h: 白昼 (bar 0%→33.3%)
        // 14→18h: 黄昏 (bar 33.3%→50%)
        // 18→24h: 夜晚前半段 (bar 50%→83.3%)
        let pct;
        if (hour >= 6 && hour < 14) {
            pct = ((hour - 6) / 8) * (1 / 3);          // 0 → 1/3
        } else if (hour >= 14 && hour < 18) {
            pct = (1 / 3) + ((hour - 14) / 4) * (1 / 6); // 1/3 → 1/2
        } else if (hour >= 18) {
            pct = 0.5 + ((hour - 18) / 6) * (1 / 4);   // 1/2 → 3/4
        } else {
            pct = 0.75 + (hour / 6) * (1 / 4);          // 3/4 → 1
        }
        pct = Math.min(Math.max(pct, 0), 1);
        const pctStr = (pct * 100).toFixed(1) + '%';

        // 颜色随时段
        const colors = {
            day:   'rgba(220, 170, 50, 0.7)',
            dusk:  'rgba(200, 100, 40, 0.75)',
            night: 'rgba(50, 40, 100, 0.8)'
        };
        const cursorColors = {
            day:   '#f5c842',
            dusk:  '#e07830',
            night: '#9080c8'
        };
        barFill.style.width = pctStr;
        barFill.style.backgroundColor = colors[period] || colors.day;
        barCursor.style.left = pctStr;
        barCursor.style.backgroundColor = cursorColors[period] || cursorColors.day;

        // 同步 mini 进度条
        const miniFill   = document.getElementById('period-bar-mini-fill');
        const miniCursor = document.getElementById('period-bar-mini-cursor');
        if (miniFill)   { miniFill.style.width = pctStr; miniFill.style.backgroundColor = colors[period] || colors.day; }
        if (miniCursor) { miniCursor.style.left = pctStr; miniCursor.style.backgroundColor = cursorColors[period] || cursorColors.day; }

        // 同步折叠态时段文字
        if (this.elements.trackerMiniTime) {
            this.elements.trackerMiniTime.textContent = Utils.getTimePeriodName(period);
        }

        // 高亮当前时段标签
        labels.forEach(l => {
            l.classList.toggle('active', l.classList.contains(period));
        });
    }
    
    updatePigments() {
        const player = this.game.player;
        
        const updateSlot = (element, value, max) => {
            const fill = element.querySelector('.pigment-fill');
            fill.style.height = (value / max * 100) + '%';
        };
        
        updateSlot(this.elements.pigmentRed, player.pigments.red, player.maxPigment);
        updateSlot(this.elements.pigmentYellow, player.pigments.yellow, player.maxPigment);
        updateSlot(this.elements.pigmentBlue, player.pigments.blue, player.maxPigment);
    }

    // 颜料消耗波动动画
    _triggerPigmentDrain(slotEl) {
        const fill = slotEl.querySelector('.pigment-fill');
        if (fill) {
            fill.classList.add('draining');
            setTimeout(() => fill.classList.remove('draining'), 400);
        }
    }
    
    toggleInventory() {
        const screen = this.elements.inventoryScreen;
        const isHidden = screen.classList.contains('hidden');
        
        if (isHidden) {
            this.refreshInventory();
            screen.classList.remove('hidden');
            this.game.paused = true;
        } else {
            screen.classList.add('hidden');
            this.game.paused = false;
        }
        
        // 关闭合成界面 + 隐藏残留tooltip
        this.elements.craftScreen.classList.add('hidden');
        this.hideTooltip();
    }
    
    refreshInventory() {
        const items = this.game.player.inventory.getAllItems();
        const slots = this.elements.inventoryGrid.querySelectorAll('.inventory-slot');
        
        // 记录旧物品状态用于检测新增
        const oldItems = this._lastInventorySnapshot || {};
        const newSnapshot = {};
        
        slots.forEach((slot, index) => {
            slot.innerHTML = '';
            
            if (items[index]) {
                const item = items[index];
                newSnapshot[item.id] = (newSnapshot[item.id] || 0) + item.count;
                
                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.style.backgroundColor = item.color;
                
                const count = document.createElement('span');
                count.className = 'item-count';
                count.textContent = item.count;
                
                slot.appendChild(icon);
                slot.appendChild(count);
                slot.dataset.itemId = item.id;
                
                // 检测是否为新增物品，添加闪光
                const oldCount = oldItems[item.id] || 0;
                if (item.count > oldCount) {
                    slot.classList.add('item-new');
                    setTimeout(() => slot.classList.remove('item-new'), 1200);
                }
            } else {
                slot.dataset.itemId = '';
            }
        });
        
        this._lastInventorySnapshot = newSnapshot;
    }
    
    onInventorySlotClick(slotIndex) {
        const slot = this.elements.inventoryGrid.children[slotIndex];
        const itemId = slot.dataset.itemId;
        
        if (itemId) {
            // 尝试使用物品
            if (this.game.player.useItem(itemId)) {
                this.refreshInventory();
                this.showDialog(`使用了 ${this.getItemName(itemId)}`);
            }
        }
    }
    
    showItemTooltip(event, slotIndex) {
        // 先隐藏旧tooltip，防止连续点击时闪烁
        this.hideTooltip();

        const items = this.game.player.inventory.getAllItems();
        const item = items[slotIndex];
        
        if (item) {
            this.elements.tooltip.innerHTML = `
                <strong>${item.name}</strong><br>
                <small>${item.description}</small><br>
                <em>数量: ${item.count}</em>
            `;
            this.elements.tooltip.classList.remove('hidden');
            this.positionTooltip(event);

            // 自动隐藏（防止手机端mouseleave不触发导致tooltip卡住）
            clearTimeout(this._tooltipAutoHide);
            this._tooltipAutoHide = setTimeout(() => this.hideTooltip(), 3000);
        }
    }
    
    positionTooltip(event) {
        const tooltip = this.elements.tooltip;
        const margin = 10;
        const tw = tooltip.offsetWidth || 200;
        const th = tooltip.offsetHeight || 80;
        const left = Math.min(event.pageX + 15, window.innerWidth - tw - margin);
        const top  = Math.min(event.pageY + 15, window.innerHeight - th - margin);
        tooltip.style.left = Math.max(margin, left) + 'px';
        tooltip.style.top  = Math.max(margin, top)  + 'px';
    }
    
    hideTooltip() {
        clearTimeout(this._tooltipAutoHide);
        this.elements.tooltip.classList.add('hidden');
    }
    
    // ──────────────────────────────────────────
    // 合成界面（调色盘）
    // ──────────────────────────────────────────

    toggleCraftScreen() {
        const screen = this.elements.craftScreen;
        const isHidden = screen.classList.contains('hidden');

        if (isHidden) {
            // 先把调色槽里残留的物品退回背包
            this._returnSlotsToInventory();
            this.refreshCraftInventory();
            this.refreshRecipes();
            this._setupCraftSlotListeners();
            this.updateCraftPreview();
            screen.classList.remove('hidden');
            this.game.paused = true;
        } else {
            this._returnSlotsToInventory();
            screen.classList.add('hidden');
            this.game.paused = false;
        }

        // 关闭背包 + 隐藏残留tooltip
        this.elements.inventoryScreen.classList.add('hidden');
        this.hideTooltip();
    }

    // — 左侧材料背包 —

    refreshCraftInventory() {
        const grid = this.elements.craftInvGrid;
        grid.innerHTML = '';
        const items = this.game.player.inventory.getAllItems();

        for (const item of items) {
            // 计算该物品已放入调色槽的数量
            let inSlot = 0;
            this.craftSlotData.forEach(s => { if (s.itemId === item.id) inSlot += s.count; });
            const available = item.count - inSlot;

            const el = document.createElement('div');
            el.className = 'craft-inv-item';
            el.dataset.itemId = item.id;
            el.dataset.count = available;
            el.draggable = true;
            el.innerHTML = `
                <div class="ci-icon" style="background-color:${item.color}"></div>
                <span class="ci-count">${available}</span>
                <span class="ci-name">${item.name}</span>
            `;
            el.title = item.name;

            // 拖拽开始
            el.addEventListener('dragstart', (e) => {
                const infinite = window.game && window.game.cheat && window.game.cheat.infiniteItems;
                if (!infinite && available <= 0) { e.preventDefault(); return; }
                this._dragItemId = item.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.id);
            });

            // 点击选中（备选操作方式）
            el.addEventListener('click', () => {
                const infinite = window.game && window.game.cheat && window.game.cheat.infiniteItems;
                if (!infinite && available <= 0) return;
                // 找第一个空槽或同类槽放入
                const idx = this._findAvailableSlot(item.id);
                if (idx !== -1) {
                    this._addToSlot(idx, item.id, 1);
                    this.refreshCraftInventory();
                    this._renderSlots();
                    this.updateCraftPreview();
                }
            });

            grid.appendChild(el);
        }
    }

    // — 右侧调色槽 —

    _setupCraftSlotListeners() {
        this.elements.craftSlots.forEach((slotEl, i) => {
            // 避免重复绑定
            if (slotEl._craftBound) return;
            slotEl._craftBound = true;

            slotEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slotEl.classList.add('drag-over');
            });
            slotEl.addEventListener('dragleave', () => {
                slotEl.classList.remove('drag-over');
            });
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                slotEl.classList.remove('drag-over');
                const itemId = e.dataTransfer.getData('text/plain') || this._dragItemId;
                if (!itemId) return;

                const slot = this.craftSlotData[i];
                if (slot.itemId && slot.itemId !== itemId) {
                    // 槽已有不同物品 → 退回旧物品再放新的
                    this._removeFromSlot(i);
                }
                if (!slot.itemId || slot.itemId === itemId) {
                    // 检查背包可用量
                    const avail = this._availableCount(itemId);
                    if (avail > 0) {
                        this._addToSlot(i, itemId, 1);
                    }
                }
                this._dragItemId = null;
                this.refreshCraftInventory();
                this._renderSlots();
                this.updateCraftPreview();
            });

            // 点击已填充的槽 → 退回物品
            slotEl.addEventListener('click', () => {
                if (this.craftSlotData[i].itemId) {
                    this._removeFromSlot(i);
                    this.refreshCraftInventory();
                    this._renderSlots();
                    this.updateCraftPreview();
                }
            });
        });
    }

    _addToSlot(idx, itemId, count) {
        const slot = this.craftSlotData[idx];
        if (!slot.itemId) {
            slot.itemId = itemId;
            slot.count = count;
        } else if (slot.itemId === itemId) {
            slot.count += count;
        }
    }

    _removeFromSlot(idx) {
        this.craftSlotData[idx] = { itemId: '', count: 0 };
    }

    _returnSlotsToInventory() {
        // 不需要真正 addItem，因为 craftSlotData 只是"虚拟占位"
        // 实际库存没被扣减，只是 UI 上的 available 减去了 inSlot
        this.craftSlotData = [
            {itemId:'',count:0},{itemId:'',count:0},
            {itemId:'',count:0},{itemId:'',count:0}
        ];
        this.matchedRecipe = null;
        this._renderSlots();
    }

    _availableCount(itemId) {
        if (window.game && window.game.cheat && window.game.cheat.infiniteItems) return 99;
        const total = this.game.player.inventory.getItemCount(itemId);
        let inSlot = 0;
        this.craftSlotData.forEach(s => { if (s.itemId === itemId) inSlot += s.count; });
        return total - inSlot;
    }

    _findAvailableSlot(itemId) {
        // 优先找同类未满的槽
        for (let i = 0; i < 4; i++) {
            if (this.craftSlotData[i].itemId === itemId) return i;
        }
        // 再找空槽
        for (let i = 0; i < 4; i++) {
            if (!this.craftSlotData[i].itemId) return i;
        }
        return -1;
    }

    _renderSlots() {
        this.elements.craftSlots.forEach((el, i) => {
            const data = this.craftSlotData[i];
            if (data.itemId) {
                const color = this._getItemColor(data.itemId);
                el.innerHTML = `<div class="cs-icon" style="background:${color}"></div><span class="cs-count">×${data.count}</span>`;
                el.classList.add('filled');
                el.title = `${this.getItemName(data.itemId)} ×${data.count}（点击移除）`;
            } else {
                el.innerHTML = '';
                el.classList.remove('filled');
                const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
                el.title = isTouchDevice ? '点击左侧材料添加' : '拖入材料或点击左侧物品';
            }
        });
    }

    // — 配方匹配 —

    updateCraftPreview() {
        // 收集调色槽内容 → {itemId: totalCount}
        const contents = {};
        this.craftSlotData.forEach(s => {
            if (s.itemId) {
                contents[s.itemId] = (contents[s.itemId] || 0) + s.count;
            }
        });

        const keys = Object.keys(contents);
        const preview = this.elements.craftPreview;
        const btn = this.elements.craftExecute;

        if (keys.length === 0) {
            preview.innerHTML = '';
            preview.className = '';
            btn.disabled = true;
            this.matchedRecipe = null;
            return;
        }

        // 遍历所有配方，看是否完全匹配
        let matched = null;
        for (const key in CraftedItems) {
            const recipe = CraftedItems[key];
            const needs = {};
            recipe.recipe.forEach(r => { needs[r.item] = r.count; });

            const needKeys = Object.keys(needs);
            if (needKeys.length !== keys.length) continue;

            let ok = true;
            for (const nk of needKeys) {
                if ((contents[nk] || 0) !== needs[nk]) { ok = false; break; }
            }
            if (ok) { matched = recipe; break; }
        }

        if (matched) {
            preview.className = '';
            preview.innerHTML = `
                <div class="cp-icon" style="background:${matched.color}"></div>
                <span>→ <strong>${matched.name}</strong></span>
            `;
            btn.disabled = false;
            this.matchedRecipe = matched;
        } else {
            // 检查是否是某个配方的部分子集（给提示）
            let partial = this._findPartialMatch(contents);
            preview.className = 'no-match';
            preview.innerHTML = partial
                ? `还需更多材料… 可能是：${partial.name}`
                : '当前材料无法合成';
            btn.disabled = true;
            this.matchedRecipe = null;
        }
    }

    _findPartialMatch(contents) {
        const keys = Object.keys(contents);
        for (const rKey in CraftedItems) {
            const recipe = CraftedItems[rKey];
            const needs = {};
            recipe.recipe.forEach(r => { needs[r.item] = r.count; });

            let isSubset = true;
            for (const k of keys) {
                if (!needs[k] || contents[k] > needs[k]) { isSubset = false; break; }
            }
            if (isSubset) return recipe;
        }
        return null;
    }

    // — 合成执行 —

    executeCraft() {
        if (!this.matchedRecipe) {
            this.showDialog('请将材料拖入调色槽');
            return;
        }

        const recipe = this.matchedRecipe;
        const inventory = this.game.player.inventory;

        // 从背包扣减材料（无限物品模式下跳过）
        if (!(window.game && window.game.cheat && window.game.cheat.infiniteItems)) {
            for (const ing of recipe.recipe) {
                inventory.removeItem(ing.item, ing.count);
            }
        }

        // 添加成品
        inventory.addItem(recipe.id, 1);

        // 特效 & 音效
        GameAudio.playCraft();
        this.showDialog(`成功制作了 ${recipe.name}！`);

        // 合成成功粒子特效
        const rect = this.elements.craftResult.getBoundingClientRect();
        Particles.emit({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            count: 15,
            type: 'sparkle',
            color: '#FFD700',
            speed: 2.5,
            angleSpread: Math.PI,
            life: 0.7,
            size: 8
        });

        // 通知任务系统
        if (this.game.quest) {
            this.game.quest.onCraftItem();
        }

        // 显示结果动画 + 闪光
        this.elements.craftResult.classList.add('success');
        this.elements.craftResult.innerHTML = `
            <div class="item-icon" style="background-color:${recipe.color};width:50px;height:50px;border-radius:50%;margin:0 auto;"></div>
            <p>${recipe.name}</p>
        `;
        setTimeout(() => {
            this.elements.craftResult.innerHTML = '';
            this.elements.craftResult.classList.remove('success');
        }, 2000);

        // 清空调色槽并刷新
        this._returnSlotsToInventory();
        this.refreshCraftInventory();
        this.refreshRecipes();
        this.refreshInventory();
        this.updateCraftPreview();
    }

    clearCraftSlots() {
        this._returnSlotsToInventory();
        this._renderSlots();
    }

    // — 配方列表（仅展示参考） —

    refreshRecipes() {
        const recipes = Object.values(CraftedItems);
        this.elements.recipesList.innerHTML = '<h3>配方参考</h3>';
        
        // 按类别分组
        const categories = {
            survival: { label: '🛡️ 生存', items: [] },
            weapon: { label: '⚔️ 武器', items: [] },
            key: { label: '🔑 关键', items: [] }
        };
        
        for (const recipe of recipes) {
            const cat = recipe.category || 'survival';
            if (categories[cat]) {
                categories[cat].items.push(recipe);
            } else {
                categories.survival.items.push(recipe);
            }
        }
        
        // 渲染各分类
        for (const [catKey, catData] of Object.entries(categories)) {
            if (catData.items.length === 0) continue;
            
            const catLabel = document.createElement('div');
            catLabel.className = 'recipe-category';
            catLabel.style.cssText = 'font-size:12px;color:var(--ochre);margin:8px 0 4px;font-weight:bold;';
            catLabel.textContent = catData.label;
            this.elements.recipesList.appendChild(catLabel);
            
            for (const recipe of catData.items) {
                this._renderRecipeItem(recipe);
            }
        }
    }
    
    _renderRecipeItem(recipe) {
        const canCraft = this.checkCanCraft(recipe);

        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe-item' + (canCraft ? '' : ' unavailable');

        const ingredientText = recipe.recipe.map(ing => {
            return `${this.getItemName(ing.item)}×${ing.count}`;
        }).join(' + ');

        recipeDiv.innerHTML = `
            <div class="item-icon" style="background-color:${recipe.color};width:30px;height:30px;border-radius:50%;"></div>
            <div>
                <strong>${recipe.name}</strong><br>
                <small>${ingredientText}</small>
            </div>
        `;

        // 点击配方 → 自动填充调色槽
        recipeDiv.addEventListener('click', () => {
            if (!canCraft) return;
            this._returnSlotsToInventory();
            let slotIdx = 0;
            for (const ing of recipe.recipe) {
                if (slotIdx >= 4) break;
                this._addToSlot(slotIdx, ing.item, ing.count);
                slotIdx++;
            }
            this.refreshCraftInventory();
            this._renderSlots();
            this.updateCraftPreview();
        });

        this.elements.recipesList.appendChild(recipeDiv);
    }

    checkCanCraft(recipe) {
        if (window.game && window.game.cheat && window.game.cheat.infiniteItems) return true;
        const inventory = this.game.player.inventory;
        for (const ing of recipe.recipe) {
            if (inventory.getItemCount(ing.item) < ing.count) return false;
        }
        return true;
    }

    // — 工具方法 —

    _getItemColor(itemId) {
        for (const key in ResourceTypes) {
            if (ResourceTypes[key].id === itemId) return ResourceTypes[key].color;
        }
        for (const key in CraftedItems) {
            if (CraftedItems[key].id === itemId) return CraftedItems[key].color;
        }
        return '#888';
    }

    getItemName(itemId) {
        for (const key in ResourceTypes) {
            if (ResourceTypes[key].id === itemId) return ResourceTypes[key].name;
        }
        for (const key in CraftedItems) {
            if (CraftedItems[key].id === itemId) return CraftedItems[key].name;
        }
        return itemId;
    }
    
    showDialog(text, duration = 3000) {
        this.dialogQueue.push({ text, duration });
        
        if (!this.currentDialog) {
            this.showNextDialog();
        }
    }
    
    showNextDialog() {
        if (this.dialogQueue.length === 0) {
            this.hideDialog();
            return;
        }
        
        // 清除上一个打字机interval（防止泄漏）
        if (this._typeInterval) { clearInterval(this._typeInterval); this._typeInterval = null; }

        this.currentDialog = this.dialogQueue.shift();
        this.elements.dialogText.textContent = '';
        this.elements.dialogBox.classList.remove('hidden');
        
        // 打字机效果
        let charIndex = 0;
        const text = this.currentDialog.text;
        this._typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                this.elements.dialogText.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(this._typeInterval);
                this._typeInterval = null;
                this.dialogTimer = this.currentDialog.duration;
            }
        }, 50);
    }
    
    updateDialog(dt) {
        if (this.currentDialog && this.dialogTimer > 0) {
            this.dialogTimer -= dt * 1000;
            if (this.dialogTimer <= 0) {
                this.currentDialog = null;
                this.showNextDialog();
            }
        }
    }
    
    hideDialog() {
        if (this._typeInterval) { clearInterval(this._typeInterval); this._typeInterval = null; }
        this.elements.dialogBox.classList.add('hidden');
        this.currentDialog = null;
        this.dialogTimer = 0;
    }
    
    showEndScreen(result) {
        this.elements.uiLayer.classList.remove('hidden');
        this.elements.endScreen.classList.remove('hidden');

        if (result === 'victory') {
            this.elements.endTitle.textContent = '归途开启';
            this.elements.endTitle.style.color = '#C4A35A';
            this.elements.endMessage.textContent = '古钟再次转动，褪色界的裂隙中透出人间的光芒。林渡踏入光中，身后的水彩世界渐渐恢复了它应有的色彩...';
            GameAudio.playClockChime();
        } else if (result === 'death') {
            this.elements.endTitle.textContent = '色尽而终';
            this.elements.endTitle.style.color = '#808080';
            this.elements.endMessage.textContent = '林渡的身影逐渐褪去颜色，最终化作一幅苍白的素描，永远留在了这片失色的世界...';
        } else if (result === 'timeout') {
            this.elements.endTitle.textContent = '时不我待';
            this.elements.endTitle.style.color = '#4A4A6E';
            this.elements.endMessage.textContent = '第三日的夜幕降临，无色王的侵蚀彻底吞噬了这片土地。林渡再也无法找到回家的路...';
        }

        this._startEndScreenAnimation(result);
    }

    _startEndScreenAnimation(result) {
        // 停止旧动画
        if (this._endAnimRaf) cancelAnimationFrame(this._endAnimRaf);

        const isDeath = (result === 'death' || result === 'timeout');
        const endContent = this.elements.endScreen.querySelector('.end-content');

        // ── 动态背景 canvas（全屏，绝对定位在 end-screen 后面）──
        let bgCvs = document.getElementById('end-bg-canvas');
        if (!bgCvs) {
            bgCvs = document.createElement('canvas');
            bgCvs.id = 'end-bg-canvas';
            bgCvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
            this.elements.endScreen.insertBefore(bgCvs, this.elements.endScreen.firstChild);
        }
        // 确保内容层在背景之上
        endContent.style.position = 'relative';
        endContent.style.zIndex   = '1';

        // ── 人物 canvas ──
        let figCvs = document.getElementById('end-figure-canvas');
        if (!figCvs) {
            figCvs = document.createElement('canvas');
            figCvs.id = 'end-figure-canvas';
            figCvs.style.cssText = 'display:block;margin:0 auto 20px;';
            endContent.insertBefore(figCvs, endContent.firstChild);
        }
        // 重置动画
        figCvs.style.animation = 'none';
        figCvs.offsetHeight; // reflow
        figCvs.style.animation = '';

        // 手机横屏高度较小，缩小图形以为标题/消息/按钮留出空间
        const isMobileH = window.innerHeight < 450;
        const FW = isMobileH ? 90  : 160;
        const FH = isMobileH ? 120 : 220;
        figCvs.style.cssText = `display:block;margin:0 auto ${isMobileH ? '6px' : '20px'};`;
        figCvs.width  = FW;
        figCvs.height = FH;

        bgCvs.width  = window.innerWidth  || 800;
        bgCvs.height = window.innerHeight || 600;

        const bgCtx  = bgCvs.getContext('2d');
        const figCtx = figCvs.getContext('2d');

        // 粒子系统
        const particles = [];
        const PARTICLE_COUNT = isDeath ? 55 : 40;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(this._makeEndParticle(bgCvs.width, bgCvs.height, isDeath, true));
        }

        const startTime = performance.now();

        const loop = (now) => {
            const elapsed = (now - startTime) / 1000; // 秒
            const W = bgCvs.width, H = bgCvs.height;

            // ── 背景 ──
            bgCtx.clearRect(0, 0, W, H);
            if (isDeath) {
                this._drawDeathBg(bgCtx, W, H, elapsed);
            } else {
                this._drawVictoryBg(bgCtx, W, H, elapsed);
            }

            // 粒子更新 & 绘制
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) Object.assign(p, this._makeEndParticle(W, H, isDeath, false));
                bgCtx.save();
                bgCtx.globalAlpha = Math.max(0, p.life) * p.alpha;
                bgCtx.fillStyle   = p.color;
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                bgCtx.fill();
                bgCtx.restore();
            }

            // ── 人物 ──
            figCtx.clearRect(0, 0, FW, FH);
            this._drawEndCharacter(figCtx, FW, FH, isDeath, elapsed);

            this._endAnimRaf = requestAnimationFrame(loop);
        };
        this._endAnimRaf = requestAnimationFrame(loop);
    }

    _makeEndParticle(W, H, isDeath, randomY) {
        const colors = isDeath
            ? ['rgba(120,115,130,0.7)', 'rgba(80,75,100,0.6)', 'rgba(160,155,170,0.5)', 'rgba(60,55,80,0.8)']
            : ['rgba(196,163,90,0.7)',  'rgba(107,30,138,0.6)', 'rgba(194,69,45,0.55)', 'rgba(74,127,191,0.6)', 'rgba(240,220,180,0.5)'];
        return {
            x: Math.random() * W,
            y: randomY ? Math.random() * H : (isDeath ? -10 : H + 10),
            vx: (Math.random() - 0.5) * (isDeath ? 0.3 : 0.5),
            vy: isDeath ? (0.2 + Math.random() * 0.5) : -(0.3 + Math.random() * 0.6),
            r: 1.5 + Math.random() * 3,
            alpha: 0.4 + Math.random() * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0.4 + Math.random() * 0.6,
            decay: 0.002 + Math.random() * 0.004,
        };
    }

    _drawDeathBg(ctx, W, H, t) {
        // 深灰渐变背景
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(18,15,28,1)');
        grad.addColorStop(0.5, 'rgba(28,24,40,1)');
        grad.addColorStop(1, 'rgba(10,8,18,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 底部灰雾扩散
        const fogY = H * 0.65;
        const fogR = ctx.createRadialGradient(W * 0.5, fogY, 10, W * 0.5, fogY, W * 0.65);
        fogR.addColorStop(0, `rgba(90,85,110,${0.18 + Math.sin(t * 0.4) * 0.06})`);
        fogR.addColorStop(1, 'rgba(90,85,110,0)');
        ctx.fillStyle = fogR;
        ctx.fillRect(0, 0, W, H);

        // 裂纹线（静态，随机种子固定）
        ctx.save();
        ctx.strokeStyle = 'rgba(100,90,120,0.12)';
        ctx.lineWidth = 0.8;
        // 固定3条裂纹
        const cracks = [
            [[W*0.3,H*0.2],[W*0.25,H*0.45],[W*0.18,H*0.6]],
            [[W*0.7,H*0.15],[W*0.72,H*0.5],[W*0.68,H*0.7]],
            [[W*0.5,H*0.05],[W*0.55,H*0.3],[W*0.58,H*0.55]],
        ];
        cracks.forEach(pts => {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawVictoryBg(ctx, W, H, t) {
        // 深蓝紫渐变背景
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(14,10,35,1)');
        grad.addColorStop(0.4, 'rgba(28,18,60,1)');
        grad.addColorStop(1, 'rgba(18,12,42,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 中心光晕（石榴金）
        const cx = W * 0.5, cy = H * 0.42;
        const pulse = 0.85 + Math.sin(t * 1.2) * 0.15;
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45 * pulse);
        halo.addColorStop(0, `rgba(196,163,90,${0.18 + Math.sin(t * 0.8) * 0.06})`);
        halo.addColorStop(0.5, `rgba(107,30,138,0.08)`);
        halo.addColorStop(1, 'rgba(14,10,35,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, W, H);

        // 石榴树剪影（右下角）
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#C4A35A';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        const tx = W * 0.82, ty = H * 0.95;
        // 主干
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 8, ty - 60); ctx.stroke();
        // 分枝
        [[tx-8,ty-60,tx-22,ty-90],[tx-8,ty-60,tx+5,ty-85],[tx-14,ty-75,tx-28,ty-100]].forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        // 石榴果实
        ctx.fillStyle = '#C2452D';
        ctx.globalAlpha = 0.22;
        [[tx-22,ty-92,5],[tx+4,ty-87,4],[tx-28,ty-102,4.5]].forEach(([x,y,r]) => {
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
    }

    _drawEndCharacter(ctx, W, H, isDeath, t) {
        // 与游戏角色完全一致的哥特风格，坐标系以人物中心为原点
        const cx = W * 0.5;
        const cy = H * 0.56;
        // 死亡：缓慢下沉+褪色；胜利：轻微浮动
        const floatY = isDeath
            ? Math.min(t * 1.5, 8)  // 最多下沉8px
            : Math.sin(t * 1.4) * 3; // ±3px 浮动
        const deathAlpha = isDeath ? Math.max(0.35, 1 - t * 0.035) : 1.0;
        const deathSat   = isDeath ? Math.max(0, 1 - t * 0.05) : 1.0; // 逐渐去色

        ctx.save();
        ctx.translate(cx, cy + floatY);
        ctx.globalAlpha = deathAlpha;
        if (deathSat < 1) ctx.filter = `saturate(${deathSat})`;

        // ── 阴影 ──
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 42, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── 披风 ──
        const capeSwing = isDeath ? Math.sin(t * 0.6) * 2 : Math.sin(t * 1.4) * 4;
        const capeGrad = ctx.createLinearGradient(-22, -14, 22, 36);
        capeGrad.addColorStop(0, isDeath ? '#1A1A28' : '#1E0A30');
        capeGrad.addColorStop(0.5, isDeath ? '#101018' : '#120820');
        capeGrad.addColorStop(1, isDeath ? '#080810' : '#0A0512');
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-9, -17);
        ctx.lineTo(9, -17);
        ctx.quadraticCurveTo(22 + capeSwing, 2, 19 + capeSwing, 32);
        ctx.quadraticCurveTo(0, 40, -19 - capeSwing, 32);
        ctx.quadraticCurveTo(-22 - capeSwing, 2, -9, -17);
        ctx.closePath();
        ctx.fill();
        // 披风内衬
        ctx.strokeStyle = isDeath ? 'rgba(60,20,30,0.6)' : '#5A0A1A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9,-17);
        ctx.quadraticCurveTo(-22-capeSwing, 2, -19-capeSwing, 32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(9,-17);
        ctx.quadraticCurveTo(22+capeSwing, 2, 19+capeSwing, 32);
        ctx.stroke();
        // 底边虚线
        ctx.strokeStyle = isDeath ? 'rgba(50,45,65,0.3)' : 'rgba(90,10,26,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(-19-capeSwing, 32);
        ctx.quadraticCurveTo(0, 42, 19+capeSwing, 32);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── 长衫主体 ──
        const coatGrad = ctx.createLinearGradient(-12, -18, 12, 26);
        coatGrad.addColorStop(0, isDeath ? '#1E1830' : '#2D1B4E');
        coatGrad.addColorStop(0.6, isDeath ? '#141228' : '#1E1035');
        coatGrad.addColorStop(1, isDeath ? '#0E0C1E' : '#160C28');
        ctx.fillStyle = coatGrad;
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(10, -16);
        ctx.lineTo(12, 24);
        ctx.quadraticCurveTo(0, 28, -12, 24);
        ctx.closePath();
        ctx.fill();

        // 尖领
        ctx.fillStyle = isDeath ? '#1A1430' : '#241540';
        ctx.beginPath();
        ctx.moveTo(-8,-16); ctx.lineTo(-3,-23); ctx.lineTo(0,-18);
        ctx.lineTo(3,-23);  ctx.lineTo(8,-16);
        ctx.closePath(); ctx.fill();

        // 领口阴影
        ctx.fillStyle = 'rgba(10,5,20,0.5)';
        ctx.beginPath();
        ctx.moveTo(-5,-16); ctx.lineTo(5,-16); ctx.lineTo(3,-12); ctx.lineTo(-3,-12);
        ctx.closePath(); ctx.fill();

        // 左臂（胜利时轻微摆动）
        const lArmSwing = isDeath ? 0.05 : Math.sin(t * 1.4) * 0.08;
        ctx.save();
        ctx.translate(-11, -2); ctx.rotate(-lArmSwing - 0.1);
        ctx.fillStyle = isDeath ? '#1E1830' : '#2D1B4E';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = isDeath ? '#C8C0BC' : '#EDE0D4';
        ctx.fillRect(-4, 20, 8, 4);
        ctx.restore();

        // 右臂
        const rArmSwing = isDeath ? -0.05 : Math.sin(t * 1.4 + Math.PI) * 0.08;
        ctx.save();
        ctx.translate(11, -2); ctx.rotate(rArmSwing + 0.1);
        ctx.fillStyle = isDeath ? '#1E1830' : '#2D1B4E';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = isDeath ? '#C8C0BC' : '#EDE0D4';
        ctx.fillRect(-4, 20, 8, 4);
        ctx.restore();

        // 黄铜扣子
        ctx.fillStyle = isDeath ? 'rgba(120,100,20,0.5)' : '#B8860B';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(0, -4 + i * 8, 2, 0, Math.PI * 2); ctx.fill();
        }

        // 胸前齿轮徽章
        ctx.strokeStyle = isDeath ? 'rgba(100,85,15,0.4)' : '#B8860B';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-6, 2, 4.5, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + (isDeath ? 0 : t * 0.5);
            ctx.beginPath();
            ctx.moveTo(-6 + Math.cos(a) * 3.8, 2 + Math.sin(a) * 3.8);
            ctx.lineTo(-6 + Math.cos(a) * 6,   2 + Math.sin(a) * 6);
            ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(-6, 2, 1.8, 0, Math.PI * 2); ctx.stroke();

        // 外套轮廓
        ctx.strokeStyle = isDeath ? 'rgba(60,45,90,0.2)' : 'rgba(100,60,150,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-10,-16); ctx.lineTo(-12,24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,-16);  ctx.lineTo(12,24);  ctx.stroke();

        // ── 头部 ──
        const skinGrad = ctx.createRadialGradient(-2,-30,0, 0,-26,12);
        skinGrad.addColorStop(0, isDeath ? '#D8D0C8' : '#F0E6DC');
        skinGrad.addColorStop(0.7, isDeath ? '#C0B8B0' : '#DDD0C4');
        skinGrad.addColorStop(1, isDeath ? '#A8A0A0' : '#C4B4A8');
        ctx.fillStyle = skinGrad;
        ctx.beginPath(); ctx.arc(0, -26, 11, 0, Math.PI * 2); ctx.fill();

        // 深黑发
        ctx.fillStyle = isDeath ? '#1A1A28' : '#0D0D1A';
        ctx.beginPath(); ctx.arc(0, -29, 11, Math.PI, Math.PI * 2); ctx.fill();
        // 左侧垂发
        ctx.beginPath();
        ctx.moveTo(-9,-27); ctx.quadraticCurveTo(-15,-20,-13,-12);
        ctx.quadraticCurveTo(-10,-8,-8,-14); ctx.quadraticCurveTo(-11,-20,-9,-27);
        ctx.fill();
        // 刘海
        ctx.beginPath();
        ctx.moveTo(-11,-32); ctx.quadraticCurveTo(-5,-24,1,-25);
        ctx.quadraticCurveTo(-2,-31,-11,-32); ctx.fill();

        // 黑眼圈
        ctx.fillStyle = isDeath ? 'rgba(30,25,50,0.45)' : 'rgba(50,20,80,0.28)';
        ctx.beginPath(); ctx.ellipse(-4,-23.5,4,2,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4,-23.5,4,2,0,0,Math.PI*2);  ctx.fill();

        // 左眼
        ctx.fillStyle = isDeath ? '#C0B8C8' : '#E8D0E8';
        ctx.beginPath(); ctx.ellipse(-4,-26,2.8,3.2,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = isDeath ? 'rgba(50,40,70,0.8)' : '#6B1E8A';
        ctx.beginPath(); ctx.ellipse(-4,-26,2,2.3,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1A0A2E';
        ctx.beginPath(); ctx.ellipse(-4,-26,1.2,1.4,0,0,Math.PI*2); ctx.fill();

        // 右眼
        ctx.fillStyle = isDeath ? '#C0B8C8' : '#E8D0E8';
        ctx.beginPath(); ctx.ellipse(4,-26,2.8,3.2,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = isDeath ? 'rgba(50,40,70,0.8)' : '#6B1E8A';
        ctx.beginPath(); ctx.ellipse(4,-26,2,2.3,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1A0A2E';
        ctx.beginPath(); ctx.ellipse(4,-26,1.2,1.4,0,0,Math.PI*2); ctx.fill();

        // 眼睛高光（死亡时高光消失）
        if (!isDeath) {
            ctx.fillStyle = 'rgba(240,200,255,0.85)';
            ctx.beginPath(); ctx.arc(-3,-27.5,0.85,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(5,-27.5,0.85,0,Math.PI*2);  ctx.fill();
        }

        // 眉毛
        ctx.strokeStyle = isDeath ? '#2A2838' : '#0D0D1A';
        ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7,-30); ctx.lineTo(-1,-29); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2,-29);  ctx.lineTo(7,-30);  ctx.stroke();
        ctx.lineCap = 'butt';

        // 嘴（死亡时微微张开）
        ctx.strokeStyle = isDeath ? 'rgba(120,90,100,0.5)' : 'rgba(180,140,160,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isDeath) {
            ctx.moveTo(-2,-19); ctx.quadraticCurveTo(0,-21,2,-19); // 微张
        } else {
            ctx.moveTo(-3,-19); ctx.quadraticCurveTo(0,-20,3,-19);
        }
        ctx.stroke();

        // 怀表链
        ctx.strokeStyle = isDeath ? 'rgba(100,85,15,0.4)' : '#B8860B';
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(3,-16); ctx.quadraticCurveTo(6,-11,4,-7); ctx.stroke();
        // 怀表
        ctx.fillStyle = isDeath ? 'rgba(100,85,15,0.4)' : '#B8860B';
        ctx.beginPath(); ctx.arc(4,-7,3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = isDeath ? '#C8C0B8' : '#F0E6DC';
        ctx.beginPath(); ctx.arc(4,-7,2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = isDeath ? 'rgba(100,85,15,0.4)' : '#B8860B';
        ctx.lineWidth = 0.5;
        // 怀表指针（胜利时转动）
        const watchAngle = isDeath ? 0.5 : t * 0.8;
        ctx.beginPath(); ctx.moveTo(4,-9); ctx.lineTo(4,-7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4,-7);
        ctx.lineTo(4 + Math.cos(watchAngle) * 1.5, -7 + Math.sin(watchAngle) * 1.5);
        ctx.stroke();

        // ── 毛笔 ──
        // 胜利：右手持笔，高举发光；死亡：笔从手中滑落
        ctx.save();
        if (isDeath) {
            // 笔向右下方斜落
            const dropAngle = Math.min(t * 0.3, 1.2);
            ctx.translate(14, 6 + Math.min(t * 2, 18));
            ctx.rotate(0.4 + dropAngle);
        } else {
            // 胜利：左侧高举，轻微摇晃
            ctx.translate(-14, -6 + Math.sin(t * 1.4) * 1.5);
            ctx.rotate(-0.3 + Math.sin(t * 1.0) * 0.06);
        }
        // 乌木杆
        const rodGrad = ctx.createLinearGradient(-1.5,-22,1.5,6);
        rodGrad.addColorStop(0, '#2A1A3E'); rodGrad.addColorStop(0.5,'#1A0A2E'); rodGrad.addColorStop(1,'#0D0520');
        ctx.fillStyle = rodGrad;
        ctx.fillRect(-1.5,-22,3,28);
        // 顶端黄铜球
        ctx.fillStyle = isDeath ? 'rgba(140,100,10,0.5)' : '#B8860B';
        ctx.beginPath(); ctx.arc(0,-22,3.5,0,Math.PI*2); ctx.fill();
        // 顶端小齿轮
        ctx.strokeStyle = isDeath ? 'rgba(100,80,8,0.4)' : '#8B6508';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
            const a = (i/6)*Math.PI*2 + (isDeath ? 0 : t * 0.4);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*2.5, -22+Math.sin(a)*2.5);
            ctx.lineTo(Math.cos(a)*4.2, -22+Math.sin(a)*4.2);
            ctx.stroke();
        }
        // 中段装饰环
        ctx.fillStyle = isDeath ? 'rgba(140,100,10,0.4)' : '#B8860B';
        ctx.fillRect(-3,-7,6,3);
        // 笔尖
        ctx.fillStyle = '#2A1530';
        ctx.beginPath();
        ctx.moveTo(-2.5,4); ctx.lineTo(2.5,4); ctx.lineTo(1,14); ctx.lineTo(-1,14);
        ctx.closePath(); ctx.fill();
        // 笔尖光晕（胜利时脉动发光）
        if (!isDeath) {
            const glowPulse = 0.45 + Math.sin(t * 2.2) * 0.25;
            ctx.fillStyle = `rgba(130,50,180,${glowPulse})`;
            ctx.shadowColor = '#CC60FF';
            ctx.shadowBlur  = 10 + Math.sin(t * 2.2) * 6;
            ctx.beginPath(); ctx.arc(0,12,4,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur  = 0;
            // 笔尖飞出的颜料光点
            const dropColors = ['#C2452D','#4A7FBF','#B8860B'];
            dropColors.forEach((col, i) => {
                const da = t * 2.0 + i * (Math.PI * 2 / 3);
                ctx.save();
                ctx.globalAlpha = 0.55 + Math.sin(da) * 0.3;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(Math.cos(da)*7, 12+Math.sin(da)*5, 1.8, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            });
        } else {
            // 死亡：笔尖墨水残迹（暗色）
            ctx.fillStyle = 'rgba(40,20,50,0.6)';
            ctx.beginPath(); ctx.arc(0,12,3,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // ── 死亡特效：形体消散颗粒 ──
        if (isDeath) {
            const dissolveProg = Math.min(t * 0.03, 0.6); // 最多60%消散
            ctx.save();
            ctx.globalAlpha = 0.35 * dissolveProg * 2;
            for (let i = 0; i < 10; i++) {
                const px = (Math.random() - 0.5) * 36;
                const py = 10 + Math.random() * 40;
                ctx.fillStyle = `rgba(${120 + Math.random()*40|0},${115+Math.random()*30|0},${130+Math.random()*25|0},0.8)`;
                ctx.beginPath(); ctx.arc(px, py, 1 + Math.random()*2, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }

        // ── 胜利特效：身侧水彩彩晕 ──
        if (!isDeath) {
            [
                { ox:-18, oy:-8,  r:7,  col:'rgba(194,69,45,0.22)' },
                { ox: 16, oy:2,   r:5,  col:'rgba(74,127,191,0.20)' },
                { ox:-12, oy:12,  r:6,  col:'rgba(196,163,90,0.22)' },
            ].forEach(d => {
                const pulse = 1 + Math.sin(t * 1.6 + d.ox) * 0.15;
                ctx.save();
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = d.col;
                ctx.beginPath(); ctx.arc(d.ox, d.oy, d.r * pulse, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
        }

        ctx.restore(); // translate(cx, cy+floatY)
    }
    
    show() {
        this.elements.uiLayer.classList.remove('hidden');
    }
    
    hide() {
        this.elements.uiLayer.classList.add('hidden');
    }
}
