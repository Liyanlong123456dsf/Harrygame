// 音频管理系统 - 八音盒风格音效

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.currentMusic = null;
        
        // 音量设置
        this.volumes = {
            master: 0.7,
            music: 0.5,
            sfx: 0.8
        };
        
        // 音符频率（八音盒音阶）
        this.notes = {
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
            G4: 392.00, A4: 440.00, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
            G5: 783.99, A5: 880.00, B5: 987.77,
            C6: 1046.50
        };
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 主音量节点
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volumes.master;
            this.masterGain.connect(this.audioContext.destination);
            
            // 音乐音量节点
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.volumes.music;
            this.musicGain.connect(this.masterGain);
            
            // 音效音量节点
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.volumes.sfx;
            this.sfxGain.connect(this.masterGain);
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
    
    // 播放八音盒音符
    playMusicBoxNote(frequency, duration = 0.3, delay = 0) {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // 八音盒特有的金属音色
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        
        // 添加轻微的频率衰减（模拟机械振动）
        const now = this.audioContext.currentTime + delay;
        osc.frequency.setValueAtTime(frequency * 1.02, now);
        osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.05);
        
        // 快速起音，自然衰减的包络
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    // 播放简单旋律
    playMelody(notes, tempo = 200) {
        if (!this.initialized) return;
        
        notes.forEach((note, index) => {
            if (note && this.notes[note]) {
                this.playMusicBoxNote(this.notes[note], 0.4, index * (tempo / 1000));
            }
        });
    }
    
    // 墨水渗落音效（原水滴，改为低沉阴郁）
    playWaterDrop() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        // 低频下行，如墨水缓缓渗入纸张
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }
    
    // 播放撕纸音效
    playPaperTear() {
        if (!this.initialized) return;
        if (window.game && window.game.gameEnded) return;
        
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // 生成噪声并应用包络
        for (let i = 0; i < bufferSize; i++) {
            const envelope = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
        
        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(this.sfxGain);
        
        source.start();
    }
    
    // 拾取音效（阴郁低沉，如从灰土中拨出）
    playCollect(type = 'default') {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 各类型对应暗调频率（小调/减和弦音程）
        const freqMap = {
            'stardustGrass': [174.61, 207.65],   // F3-Ab3 小三度
            'morningDew':    [155.56, 185.00],   // Eb3-F#3 增二度
            'charBranch':    [130.81, 146.83],   // C3-D3  大二度 紧张感
            'colorFruit':    [196.00, 220.00, 233.08], // G3-A3-Bb3 小七
            'grayFluff':     [138.59, 155.56],   // C#3-Eb3 小二度
            'default':       [164.81, 196.00],   // E3-G3  小三度
        };
        const freqs = freqMap[type] || freqMap['default'];

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            // 轻微音高下滑，如物件从高处坠落
            osc.frequency.setValueAtTime(freq * 1.015, now + i * 0.1);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.985, now + i * 0.1 + 0.4);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + i * 0.1);
            g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.04);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.6);
            osc.connect(g);
            g.connect(this.sfxGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.7);
        });

        // 细沙/纸屑摩擦噪声
        const bufSize = Math.floor(ctx.sampleRate * 0.06);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2) * 0.18;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        src.connect(filter);
        filter.connect(this.sfxGain);
        src.start(now);
    }
    
    // 合成音效（暗调机械感，如齿轮咬合）
    playCraft() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 短促金属摩擦噪声
        const bufSize = Math.floor(ctx.sampleRate * 0.09);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.2) * 0.25;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 2;
        src.connect(filter);
        filter.connect(this.sfxGain);
        src.start(now);

        // 低沉小调三音（Dm: D3-F3-A3，缓慢下行）
        [146.83, 174.61, 220.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            const t = now + i * 0.12;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.13, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
            osc.connect(g);
            g.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.75);
        });
    }
    
    // 播放受击音效
    playHit() {
        if (!this.initialized) return;
        if (window.game && window.game.gameEnded) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        const now = this.audioContext.currentTime;
        
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.1);
        
        this.playPaperTear();
    }
    
    // 警告音效（数值过低，不安的脉冲）
    playWarning() {
        if (!this.initialized) return;
        if (window.game && window.game.gameEnded) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        // 两声低沉不和谐脉冲
        [0, 0.4].forEach(offset => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now + offset);
            osc.frequency.exponentialRampToValueAtTime(80, now + offset + 0.3);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.18, now + offset);
            g.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.35);
            osc.connect(g);
            g.connect(this.sfxGain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.4);
        });
    }
    
    // 鸣蛹歌声（异世界空鸣，非人声感）
    playChrysalisSong() {
        if (!this.initialized) return;
        if (window.game && window.game.gameEnded) return;
        const ctx = this.audioContext;
        // 古怪的泛音叠加，非自然音阶
        const freqs = [329.63, 369.99, 415.30, 369.99, 329.63, 293.66, 329.63]; // E4 系列但带半音
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            // 轻微颤音，像虫鸣
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 5.5 + i * 0.3;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 3;
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lfo.start();
            const g = ctx.createGain();
            const t = ctx.currentTime + i * 0.28;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.09, t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
            osc.connect(g);
            g.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.6);
            setTimeout(() => { try { lfo.stop(); } catch(e) {} }, (i * 280 + 620));
        });
    }
    
    // 背景乐音量衰减（每次修复古钟调用，永久-10%）
    _getBgmBaseVol() {
        return 0.45 * Math.pow(0.90, this._repairCount || 0);
    }

    // 游戏内背景音乐（统一C小调，仅密度区分时段；三天循环每晚降半音）
    startBackgroundMusic(period = 'day', nightIndex = 0) {
        if (!this.initialized || this.currentMusic) return;
        this.currentMusic = period;
        this._bgmNodes = this._bgmNodes || [];
        const ctx = this.audioContext;

        // 三天累计降半音：C(1.0) -> B(0.9439) -> Bb(0.8909)
        const pitchScale = Math.pow(0.9439, Math.min(nightIndex, 2));

        // 统一C小调各时段参数：仅调整密度/音量，调性不变
        // C2=65.41, Eb3=155.56, G3=196.00, C4=261.63, Eb4=311.13, G4=392.00
        const cfg = {
            day:  { droneFreq: 65.41,  padFreqs: [130.81, 155.56, 196.00], tempo: 3200, noteVol: 0.10, silenceRate: 0.40 },
            dusk: { droneFreq: 65.41,  padFreqs: [130.81, 155.56],          tempo: 4200, noteVol: 0.07, silenceRate: 0.60 },
            night:{ droneFreq: 32.70,  padFreqs: [65.41],                   tempo: 6000, noteVol: 0.05, silenceRate: 0.75 },
        };
        const { droneFreq, padFreqs, tempo, noteVol, silenceRate } = cfg[period] || cfg.day;

        // 主混音（音量受修复次数衰减）
        const baseVol = this._getBgmBaseVol();
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(baseVol, ctx.currentTime + 4);
        master.connect(ctx.destination);
        this._bgmMaster = master;

        // 古钟内腔混响（模拟钟内空腔，衰减较慢）
        const revLen = Math.floor(ctx.sampleRate * 3.5);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.6);
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.42;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        // 持续低频根音（C小调，带降半音偏移）
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = droneFreq * pitchScale;
        const droneG = ctx.createGain();
        droneG.gain.value = period === 'night' ? 0.35 : 0.26;
        drone.connect(droneG);
        droneG.connect(master);
        drone.start();
        this._bgmNodes.push(drone);

        // 夜晚：无色王呼吸 swell（0.05-0.12Hz 低频涌动）
        if (period === 'night') {
            const swellOsc = ctx.createOscillator();
            swellOsc.type = 'sine';
            swellOsc.frequency.value = 0.08;
            const swellG = ctx.createGain();
            swellG.gain.value = 0.18;
            const swellDrone = ctx.createOscillator();
            swellDrone.type = 'sine';
            swellDrone.frequency.value = 32.70 * pitchScale;
            swellOsc.connect(swellG);
            swellG.connect(swellDrone.frequency);
            swellOsc.start();
            const swellAmp = ctx.createGain();
            swellAmp.gain.value = 0.12;
            swellDrone.connect(swellAmp);
            swellAmp.connect(master);
            swellDrone.start();
            this._bgmNodes.push(swellOsc, swellDrone);
        }

        // 和弦衬底（C小调三音，极慢颤音）
        padFreqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq * pitchScale;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.15 + i * 0.05; // 比原版更慢，更压抑
            const lfoG = ctx.createGain();
            lfoG.gain.value = 1.2;
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lfo.start();
            const g = ctx.createGain();
            g.gain.value = period === 'night' ? 0.025 : 0.040;
            osc.connect(g);
            g.connect(master);
            osc.start();
            this._bgmNodes.push(osc, lfo);
        });

        // 稀疏孤音（C小调音阶，断裂感——每段旋律尾音下沉）
        // 白昼有旋律轮廓（但断裂），黄昏只有根音，夜晚单C2
        const scaleFreqs = {
            day:  [261.63, 311.13, 349.23, 392.00, 349.23, 311.13, 261.63, 220.00], // C小调，尾音下沉
            dusk: [130.81, 155.56, 130.81, 110.00],                                   // 仅根音+小三度
            night:[65.41 * pitchScale],                                                // 单C2（或降调）
        };
        const noteFreqs = scaleFreqs[period] || scaleFreqs.day;
        let noteIdx = 0;
        const playNote = () => {
            if (this.currentMusic !== period) return;
            const roll = Math.random();
            if (roll > silenceRate) {
                const freq = noteFreqs[noteIdx % noteFreqs.length] * pitchScale;
                // 白昼旋律：奇数音尾部下沉（断裂感）
                const driftDown = (period === 'day' && noteIdx % 2 === 1) ? 0.985 : 0.997;
                noteIdx++;
                const dur = tempo / 1000 * 0.72;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(freq * driftDown, ctx.currentTime + dur);
                const g = ctx.createGain();
                const now = ctx.currentTime;
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(noteVol, now + 0.15);
                g.gain.exponentialRampToValueAtTime(0.01, now + dur - 0.05);
                osc.connect(g);
                g.connect(master);
                osc.start(now);
                osc.stop(now + dur);
            }
            this._bgmLoopTimer = setTimeout(playNote, tempo + Math.random() * (tempo * 0.5));
        };
        this._bgmLoopTimer = setTimeout(playNote, 1500);
    }

    stopBackgroundMusic(fadeTime = 1.5) {
        this.currentMusic = null;
        clearTimeout(this._bgmLoopTimer);
        if (this._bgmMaster && this.initialized) {
            const now = this.audioContext.currentTime;
            this._bgmMaster.gain.cancelScheduledValues(now);
            this._bgmMaster.gain.setValueAtTime(this._bgmMaster.gain.value, now);
            this._bgmMaster.gain.linearRampToValueAtTime(0, now + fadeTime);
        }
        const stopDelay = Math.round(fadeTime * 1000) + 300;
        setTimeout(() => {
            if (this._bgmNodes) {
                this._bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} });
                this._bgmNodes = [];
            }
            this._bgmMaster = null;
            this._bgmSwitching = false;
        }, stopDelay);
    }

    // 平滑切换背景音乐（先淡出，再延迟启动新时段，避免重叠违和）
    switchBackgroundMusic(newPeriod) {
        if (this._bgmSwitching) return;
        if (this.currentMusic === newPeriod) return;
        this._bgmSwitching = true;
        const fadeOut = 1.8;
        this.stopBackgroundMusic(fadeOut);
        setTimeout(() => {
            if (this._bgmSwitching === false) return; // 已被打断
            this.startBackgroundMusic(newPeriod);
        }, Math.round(fadeOut * 1000) + 400);
    }
    
    // 碎片发现音效：下行C小调琶音 + 低频嗡鸣 + 湿纸撕裂声
    // "发现"不是奖励，是负担
    playClockPieceFound() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 独立增益，不干扰背景乐
        const master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);

        // 下行C小调琶音：C5→G4→Eb4→C4（颜色被吸走）
        const seq = [
            { freq: this.notes.C5,          delay: 0.00 },
            { freq: this.notes.G4,          delay: 0.14 },
            { freq: 311.13,                 delay: 0.30 }, // Eb4
            { freq: this.notes.C4,          delay: 0.50 },
        ];
        seq.forEach(({ freq, delay }) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            // 音高略微下滑——颜色流走感
            osc.frequency.setValueAtTime(freq, now + delay);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.982, now + delay + 0.8);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + delay);
            g.gain.linearRampToValueAtTime(0.16, now + delay + 0.05);
            g.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.9);
            osc.connect(g); g.connect(master);
            osc.start(now + delay);
            osc.stop(now + delay + 1.0);
        });

        // 低频嗡鸣（30-50Hz，身体可感的重量）
        const droneOsc = ctx.createOscillator();
        droneOsc.type = 'sine';
        droneOsc.frequency.setValueAtTime(42, now);
        droneOsc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
        const droneG = ctx.createGain();
        droneG.gain.setValueAtTime(0, now);
        droneG.gain.linearRampToValueAtTime(0.30, now + 0.08);
        droneG.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        droneOsc.connect(droneG); droneG.connect(master);
        droneOsc.start(now); droneOsc.stop(now + 1.6);

        // 湿纸撕裂感（低通白噪声，非金色高频）
        const bufLen = Math.floor(ctx.sampleRate * 0.18);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 0.6) * 0.55;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1200;
        const ng = ctx.createGain();
        ng.gain.value = 0.28;
        src.connect(lp); lp.connect(ng); ng.connect(master);
        src.start(now + 0.05);

        // 背景乐临时降速感：短暂压低音量20%，3s后恢复
        this._bgmSlowdown();
    }

    // 背景乐短暂降音量20%（碎片发现时，时间被拉长感）
    _bgmSlowdown() {
        if (!this._bgmMaster || !this.initialized) return;
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        const cur = this._bgmMaster.gain.value;
        this._bgmMaster.gain.cancelScheduledValues(t);
        this._bgmMaster.gain.setValueAtTime(cur, t);
        this._bgmMaster.gain.linearRampToValueAtTime(cur * 0.80, t + 0.3);
        this._bgmMaster.gain.linearRampToValueAtTime(cur, t + 3.2);
    }

    // 修复古钟stinger：统一C小调，情绪递进是"沉重→更沉重→空"
    // repairCount: 1/2（第3次不触发，改为静默进通关旋律）
    playClockRepair(repairCount = 1) {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 记录修复次数，用于背景乐音量永久衰减
        this._repairCount = (this._repairCount || 0) + 1;

        // 独立增益节点
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.50, now + 0.15);
        master.gain.exponentialRampToValueAtTime(0.01, now + 3.8);
        master.connect(ctx.destination);

        // 第1次：Am→Cm（哀愁，和声解决被悬留）
        // 第2次：Cm→Ebm（更沉，加入管风琴持续音但被切断）
        if (repairCount === 1) {
            // Am：A3-C4-E4
            [[220.00, 0.00], [261.63, 0.09], [329.63, 0.18]].forEach(([freq, delay]) => {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const g = ctx.createGain();
                const t = now + delay;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.15, t + 0.07);
                g.gain.exponentialRampToValueAtTime(0.01, t + 3.0);
                osc.connect(g); g.connect(master);
                osc.start(t); osc.stop(t + 3.2);
            });
            // Cm解决：C3-Eb3-G3，极弱，心跳过缓的拨弦感
            [[130.81, 0.6], [155.56, 0.8], [196.00, 1.0]].forEach(([freq, delay]) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const g = ctx.createGain();
                const t = now + delay;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.08, t + 0.04);
                g.gain.exponentialRampToValueAtTime(0.01, t + 2.2);
                osc.connect(g); g.connect(master);
                osc.start(t); osc.stop(t + 2.4);
            });
        } else {
            // 第2次：Cm-Ebm，和声解决被切断
            [[130.81, 0.00], [155.56, 0.10], [196.00, 0.20]].forEach(([freq, delay]) => {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const g = ctx.createGain();
                const t = now + delay;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.18, t + 0.07);
                g.gain.exponentialRampToValueAtTime(0.01, t + 3.2);
                osc.connect(g); g.connect(master);
                osc.start(t); osc.stop(t + 3.4);
            });
            // 管风琴持续音（Eb3），但2.4秒时突然切断
            const organOsc = ctx.createOscillator();
            organOsc.type = 'sawtooth';
            organOsc.frequency.value = 155.56;
            const organG = ctx.createGain();
            organG.gain.setValueAtTime(0, now + 0.5);
            organG.gain.linearRampToValueAtTime(0.09, now + 0.8);
            organG.gain.setValueAtTime(0.09, now + 2.3);
            organG.gain.linearRampToValueAtTime(0, now + 2.35); // 切断
            organOsc.connect(organG); organG.connect(master);
            organOsc.start(now + 0.5); organOsc.stop(now + 2.4);
        }

        // 两次修复均有：低沉钟鸣余韵，但音量随次数减弱（世界在远去）
        const bellVol = repairCount === 1 ? 0.10 : 0.07;
        [523.25, 392.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * 1.004, now + 0.2 + i * 0.18);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.995, now + 0.2 + i * 0.18 + 2.5);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + 0.2 + i * 0.18);
            g.gain.linearRampToValueAtTime(bellVol, now + 0.2 + i * 0.18 + 0.06);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.2 + i * 0.18 + 3.0);
            osc.connect(g); g.connect(master);
            osc.start(now + 0.2 + i * 0.18);
            osc.stop(now + 0.2 + i * 0.18 + 3.2);
        });

        // 背景乐音量永久降低（修复=世界在远去）
        if (this._bgmMaster && this.initialized) {
            const t = ctx.currentTime;
            const cur = this._bgmMaster.gain.value;
            this._bgmMaster.gain.cancelScheduledValues(t);
            this._bgmMaster.gain.setValueAtTime(cur, t);
            this._bgmMaster.gain.linearRampToValueAtTime(cur * 0.90, t + 1.5);
        }
    }

    // 通关旋律：全程C小调，悬停在属音G（未愈合的幸存）
    // 3次不规则钟鸣，最后一次音量衰减50%
    // 13s后：环境音渐入（风声、钟摆、石榴叶）
    playVictoryStinger() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 主混音（古钟内腔空洞感，长混响）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.48, now + 1.5); // 不超过0.5，不用"高潮"音量
        master.connect(ctx.destination);
        this._victoryMaster = master;

        // 古钟内腔混响（5秒脉冲，模拟钟内空腔）
        const revLen = Math.floor(ctx.sampleRate * 5.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.4);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.55; // 混响更深，空洞感
        master.connect(reverb); reverb.connect(revG); revG.connect(ctx.destination);

        // ── 0-3s：单音C4，钟的基频，长混响 ──
        const c4Osc = ctx.createOscillator();
        c4Osc.type = 'sine';
        c4Osc.frequency.value = this.notes.C4;
        const c4G = ctx.createGain();
        c4G.gain.setValueAtTime(0, now);
        c4G.gain.linearRampToValueAtTime(0.22, now + 0.6);
        c4G.gain.exponentialRampToValueAtTime(0.01, now + 3.5);
        c4Osc.connect(c4G); c4G.connect(master);
        c4Osc.start(now); c4Osc.stop(now + 3.8);

        // ── 3-6s：加入Eb4-G4小三度，和声层，极弱（像远处传来） ──
        [[311.13, 3.0], [this.notes.G4, 3.2]].forEach(([freq, t]) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.07, now + t + 0.8); // 极弱
            g.gain.exponentialRampToValueAtTime(0.01, now + t + 3.5);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + 4.0);
        });

        // ── 6-10s：旋律浮现，全C小调，尾音下沉而非上扬 ──
        const melody = [
            { f: this.notes.C4,  t: 6.0,  d: 1.0 },
            { f: this.notes.D4,  t: 7.0,  d: 0.8 },
            { f: 311.13,         t: 7.8,  d: 0.7 },  // Eb4
            { f: this.notes.F4,  t: 8.5,  d: 0.9 },
            { f: this.notes.G4,  t: 9.4,  d: 2.5 },  // 悬停在属音G（未完成感）
        ];
        melody.forEach(({ f, t, d }) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            // 所有尾音略微下沉（幸存者无法回到原点）
            osc.frequency.setValueAtTime(f, now + t);
            osc.frequency.exponentialRampToValueAtTime(f * 0.988, now + t + d);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.20, now + t + 0.12);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + d + 0.1);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + d + 0.3);
        });

        // ── 和声衬底（全小调，不出现大三度） ──
        const harmony = [
            { f: 130.81,           t: 6.0,  d: 4.5 },  // C3 低沉根音
            { f: 155.56,          t: 6.0,  d: 3.5 },  // Eb3
            { f: 196.00,          t: 8.5,  d: 3.5 },  // G3（属音）
        ];
        harmony.forEach(({ f, t, d }) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.08, now + t + 0.3);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + d);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + d + 0.3);
        });

        // ── 3次不规则钟鸣，最后一次衰减50% ──
        // 间隔不规整（1.8s / 4.3s / 9.8s），消逝而非庆祝
        [
            { t: 1.8,  freq: this.notes.C5, vol: 0.18 },
            { t: 4.3,  freq: this.notes.G4, vol: 0.14 },
            { t: 9.8,  freq: this.notes.C5, vol: 0.09 }, // 最后一次衰减50%
        ].forEach(({ t, freq, vol }) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * 1.003, now + t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.996, now + t + 4.5);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(vol, now + t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + 5.0);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + 5.5);
        });

        // ── 13s后：环境音渐入（风声、钟摆、极远石榴叶摩擦） ──
        setTimeout(() => this._startVictoryAmbience(), 13000);
    }

    // 通关环境音尾奏（风声+钟摆+石榴叶，持续循环直到结局结束）
    _startVictoryAmbience() {
        if (!this.initialized) return;
        const ctx = this.audioContext;

        const ambiMaster = ctx.createGain();
        ambiMaster.gain.setValueAtTime(0, ctx.currentTime);
        ambiMaster.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 4.0);
        ambiMaster.connect(ctx.destination);
        this._ambiMaster = ambiMaster;
        this._ambiNodes = [];

        // 风声：带通白噪声，极缓慢振幅调制
        const windBufLen = Math.floor(ctx.sampleRate * 4);
        const windBuf = ctx.createBuffer(1, windBufLen, ctx.sampleRate);
        const wd = windBuf.getChannelData(0);
        for (let i = 0; i < windBufLen; i++) wd[i] = Math.random() * 2 - 1;
        const windSrc = ctx.createBufferSource();
        windSrc.buffer = windBuf;
        windSrc.loop = true;
        const windBp = ctx.createBiquadFilter();
        windBp.type = 'bandpass';
        windBp.frequency.value = 380;
        windBp.Q.value = 0.6;
        const windLfo = ctx.createOscillator();
        windLfo.frequency.value = 0.07;
        const windLfoG = ctx.createGain();
        windLfoG.gain.value = 0.05;
        windLfo.connect(windLfoG);
        const windG = ctx.createGain();
        windG.gain.value = 0.06;
        windLfoG.connect(windG.gain);
        windSrc.connect(windBp); windBp.connect(windG); windG.connect(ambiMaster);
        windSrc.start(); windLfo.start();
        this._ambiNodes.push(windSrc, windLfo);

        // 钟摆：C2-G2交替，但每隔8-12次有一次"错位"（像要停）
        let pendulumCount = 0;
        const playPendulum = () => {
            if (!this._ambiMaster) return;
            const isC = pendulumCount % 2 === 0;
            const freq = isC ? 65.41 : 98.00;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            const t = ctx.currentTime;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
            osc.connect(g); g.connect(ambiMaster);
            osc.start(t); osc.stop(t + 1.0);
            pendulumCount++;
            // 错位：每8-12次多停顿一次（像钟快停了）
            const normal = 900;
            const drift = (pendulumCount % (8 + Math.floor(Math.random() * 4)) === 0)
                ? normal + 400 + Math.random() * 600
                : normal + Math.random() * 80;
            this._pendulumTimer = setTimeout(playPendulum, drift);
        };
        this._pendulumTimer = setTimeout(playPendulum, 500);

        // 石榴叶摩擦：极远的高频噪声短脉冲，随机稀疏
        const playLeaf = () => {
            if (!this._ambiMaster) return;
            if (Math.random() < 0.45) {
                const bLen = Math.floor(ctx.sampleRate * 0.04);
                const lBuf = ctx.createBuffer(1, bLen, ctx.sampleRate);
                const ld = lBuf.getChannelData(0);
                for (let i = 0; i < bLen; i++) ld[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bLen, 0.8);
                const lSrc = ctx.createBufferSource();
                lSrc.buffer = lBuf;
                const lHp = ctx.createBiquadFilter();
                lHp.type = 'highpass'; lHp.frequency.value = 4000;
                const lG = ctx.createGain(); lG.gain.value = 0.025;
                lSrc.connect(lHp); lHp.connect(lG); lG.connect(ambiMaster);
                lSrc.start(ctx.currentTime);
            }
            this._leafTimer = setTimeout(playLeaf, 1800 + Math.random() * 3200);
        };
        this._leafTimer = setTimeout(playLeaf, 2000);
    }

    stopVictoryAmbience() {
        clearTimeout(this._pendulumTimer);
        clearTimeout(this._leafTimer);
        if (this._ambiMaster && this.initialized) {
            const t = this.audioContext.currentTime;
            this._ambiMaster.gain.cancelScheduledValues(t);
            this._ambiMaster.gain.setValueAtTime(this._ambiMaster.gain.value, t);
            this._ambiMaster.gain.linearRampToValueAtTime(0, t + 2.0);
        }
        setTimeout(() => {
            if (this._ambiNodes) {
                this._ambiNodes.forEach(n => { try { n.stop(); } catch(e) {} });
                this._ambiNodes = [];
            }
            this._ambiMaster = null;
        }, 2500);
    }

    // 指纹彩蛋音效：唯一一次大调C-E-G-C，立即切断，静默2s，C4余韵
    playPlayerImprint() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 独立增益
        const master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);

        // 唯一大调：C4-E4-G4-C5（0.3秒内完成，立即切断）
        [this.notes.C4, this.notes.E4, this.notes.G4, this.notes.C5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            const t = now + i * 0.065;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.18, t + 0.03);
            // 0.3秒后立即切断
            g.gain.setValueAtTime(0.18, now + 0.28);
            g.gain.linearRampToValueAtTime(0, now + 0.32);
            osc.connect(g); g.connect(master);
            osc.start(t); osc.stop(now + 0.4);
        });

        // 静默2秒后：单音C4持续（像开始界面音乐的回声，暗示循环）
        setTimeout(() => {
            if (!this.initialized) return;
            const t2 = this.audioContext.currentTime;
            const echoOsc = this.audioContext.createOscillator();
            echoOsc.type = 'sine';
            echoOsc.frequency.value = this.notes.C4;
            const echoG = this.audioContext.createGain();
            echoG.gain.setValueAtTime(0, t2);
            echoG.gain.linearRampToValueAtTime(0.08, t2 + 0.4);
            echoG.gain.exponentialRampToValueAtTime(0.01, t2 + 6.0);
            echoOsc.connect(echoG); echoG.connect(this.audioContext.destination);
            echoOsc.start(t2); echoOsc.stop(t2 + 6.5);
        }, 2300);
    }

    // 播放钟声（通关结束屏）——C小调单鸣，余韵长，不庆祝
    playClockChime() {
        if (!this.initialized) return;
        // C4-G4-Eb4 小调三音，间隔拉宽，最后悬在G4（未完成感）
        [
            { freq: this.notes.C4, delay: 0 },
            { freq: this.notes.G4, delay: 0.9 },
            { freq: 311.13,        delay: 1.8 }, // Eb4
            { freq: this.notes.G4, delay: 3.2 }, // 悬停属音
        ].forEach(({ freq, delay }) => {
            this.playMusicBoxNote(freq, 2.0, delay);
        });
    }
    
    // 播放游戏结束音效——C小调下行，禁止大三度
    playGameOver() {
        if (!this.initialized) return;
        // C4→G3→Eb3→C3（纯C小调下行，无E自然音）
        [
            { freq: this.notes.C4, delay: 0.0 },
            { freq: 196.00,        delay: 0.45 }, // G3
            { freq: 155.56,        delay: 0.90 }, // Eb3
            { freq: 130.81,        delay: 1.35 }, // C3
        ].forEach(({ freq, delay }) => {
            this.playMusicBoxNote(freq, 1.2, delay);
        });
    }
    
    // ── 开始界面凄凉音乐 ──────────────────────────────────────

    startStartScreenMusic() {
        if (!this.initialized || this._startScreenActive) return;
        this._startScreenActive = true;
        this._startNodes = [];
        const ctx = this.audioContext;

        // 主增益（缓慢淡入）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.48, ctx.currentTime + 5);
        this._startMaster = master;
        master.connect(ctx.destination);

        // 深度混响（4 秒脉冲）
        const revLen = Math.floor(ctx.sampleRate * 4);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.6);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revGain = ctx.createGain();
        revGain.gain.value = 0.65;
        master.connect(reverb);
        reverb.connect(revGain);
        revGain.connect(ctx.destination);

        // 低频持续根音 C2（65 Hz）——空洞感
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 65.41;
        const droneG = ctx.createGain();
        droneG.gain.value = 0.22;
        drone.connect(droneG);
        droneG.connect(master);
        drone.start();
        this._startNodes.push(drone);

        // 中频空洞衬底：C3 + Eb3（小三度，哀愁感）
        [[130.81, 0], [155.56, 3]].forEach(([freq, detune]) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = detune;
            // 极慢颤音
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.22;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 1.4;
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lfo.start();
            const g = ctx.createGain();
            g.gain.value = 0.05;
            osc.connect(g);
            g.connect(master);
            osc.start();
            this._startNodes.push(osc, lfo);
        });

        // 稀疏孤音旋律：C 小调五声音阶，随机间隔 3-6 秒
        const melNotes = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 392.00, 311.13];
        let melIdx = 0;
        const playLoneNote = () => {
            if (!this._startScreenActive) return;
            const freq = melNotes[melIdx++ % melNotes.length];
            const dur = 3.2;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            // 轻微音高滑落（如古钟余音）
            osc.frequency.setValueAtTime(freq * 1.008, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.998, ctx.currentTime + dur);
            const g = ctx.createGain();
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.21, now + 0.18);
            g.gain.exponentialRampToValueAtTime(0.01, now + dur - 0.1);
            osc.connect(g);
            g.connect(master);
            osc.start(now);
            osc.stop(now + dur);
            this._startNoteTimer = setTimeout(playLoneNote, 3000 + Math.random() * 3000);
        };
        this._startNoteTimer = setTimeout(playLoneNote, 2000);

        // 极小声女声呜咽（不干扰主体，仅作氛围点缀）
        // 独立增益节点，方便外部调控音量
        const sobMaster = ctx.createGain();
        sobMaster.gain.value = 1;
        sobMaster.connect(master);
        this._sobGain = sobMaster;
        this._sobMode = 'normal'; // normal | urgent | crying

        const playSob = () => {
            if (!this._startScreenActive) return;
            // 存引用以便 boostSob 可直接触发
            const now = ctx.currentTime;
            const mode = this._sobMode;

            // 根据模式调整参数
            let sobDur, noiseAmp, voxAmp, vibRate, vibDepth, freqLo, freqHi, bpFreq, bpQ, pitchDrop;
            if (mode === 'crying') {
                sobDur   = 1.0 + Math.random() * 1.2;
                noiseAmp = 0.06;
                voxAmp   = 0.09;
                vibRate  = 8 + Math.random() * 3;
                vibDepth = 25 + Math.random() * 15;
                freqLo   = 450; freqHi = 620;
                bpFreq   = 750 + Math.random() * 250;
                bpQ      = 5;
                pitchDrop = 0.70;
            } else if (mode === 'urgent') {
                sobDur   = 0.35 + Math.random() * 0.4;
                noiseAmp = 0.035;
                voxAmp   = 0.055;
                vibRate  = 7 + Math.random() * 2;
                vibDepth = 18 + Math.random() * 10;
                freqLo   = 420; freqHi = 560;
                bpFreq   = 680 + Math.random() * 200;
                bpQ      = 6;
                pitchDrop = 0.78;
            } else {
                sobDur   = 0.6 + Math.random() * 0.8;
                noiseAmp = 0.018;
                voxAmp   = 0.028;
                vibRate  = 5.5 + Math.random() * 2;
                vibDepth = 12 + Math.random() * 8;
                freqLo   = 380; freqHi = 520;
                bpFreq   = 620 + Math.random() * 200;
                bpQ      = 8;
                pitchDrop = 0.82;
            }

            // 带通滤波白噪声 → 气息质感
            const bufLen = Math.floor(ctx.sampleRate * sobDur);
            const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const nd = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
            const noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = noiseBuf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = bpFreq;
            bp.Q.value = bpQ;
            const noiseG = ctx.createGain();
            noiseG.gain.setValueAtTime(0, now);
            noiseG.gain.linearRampToValueAtTime(noiseAmp, now + 0.05);
            noiseG.gain.setValueAtTime(noiseAmp, now + sobDur * 0.3);
            noiseG.gain.exponentialRampToValueAtTime(0.001, now + sobDur);
            noiseSrc.connect(bp);
            bp.connect(noiseG);
            noiseG.connect(sobMaster);
            noiseSrc.start(now);
            noiseSrc.stop(now + sobDur);

            // 正弦波声带振动 → 呜咽 / 哭泣音调
            const baseFreq = freqLo + Math.random() * (freqHi - freqLo);
            const vox = ctx.createOscillator();
            vox.type = 'sine';
            vox.frequency.setValueAtTime(baseFreq, now);
            const vib = ctx.createOscillator();
            vib.frequency.value = vibRate;
            const vibG = ctx.createGain();
            vibG.gain.value = vibDepth;
            vib.connect(vibG);
            vibG.connect(vox.frequency);
            vib.start(now);
            vib.stop(now + sobDur);
            vox.frequency.exponentialRampToValueAtTime(baseFreq * pitchDrop, now + sobDur);
            const voxG = ctx.createGain();
            voxG.gain.setValueAtTime(0, now);
            voxG.gain.linearRampToValueAtTime(voxAmp, now + 0.04);
            voxG.gain.setValueAtTime(voxAmp, now + sobDur * 0.25);
            voxG.gain.exponentialRampToValueAtTime(0.001, now + sobDur);
            vox.connect(voxG);
            voxG.connect(sobMaster);
            vox.start(now);
            vox.stop(now + sobDur);

            // 下一声间隔
            let nextDelay;
            if (mode === 'crying') {
                // 大哭：密集连续，短暂喘息
                nextDelay = sobDur * 1000 + 100 + Math.random() * 300;
            } else if (mode === 'urgent') {
                // 急促呜咽：快速连发
                const burst = Math.random() < 0.5;
                nextDelay = burst
                    ? (sobDur * 1000 + 120 + Math.random() * 200)
                    : (800 + Math.random() * 600);
            } else {
                // 正常：稀疏
                const double = Math.random() < 0.35;
                nextDelay = double
                    ? (sobDur * 1000 + 300 + Math.random() * 400)
                    : (6000 + Math.random() * 8000);
            }
            this._startSobTimer = setTimeout(playSob, nextDelay);
        };
        this._playSob = playSob;
        // 延迟 7s 后首次出现，不抢开场
        this._startSobTimer = setTimeout(playSob, 7000);

        // 绝望心跳低脉冲（不规则、渐弱）
        const playThud = () => {
            if (!this._startScreenActive) return;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(52, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.38);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.42, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
            osc.connect(g);
            g.connect(master);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.48);
            // 间隔不规则，像临死前的心跳
            this._startThudTimer = setTimeout(playThud, 2200 + Math.random() * 2800);
        };
        setTimeout(playThud, 4000);
    }

    stopStartScreenMusic(immediate = false) {
        this._startScreenActive = false;
        clearTimeout(this._startNoteTimer);
        clearTimeout(this._startThudTimer);
        clearTimeout(this._startSobTimer);
        clearTimeout(this._sobCryTimer);
        this._sobMode = 'normal';
        if (this._startMaster && this.initialized) {
            const now = this.audioContext.currentTime;
            const fade = immediate ? 0.1 : 2.2;
            this._startMaster.gain.cancelScheduledValues(now);
            this._startMaster.gain.setValueAtTime(this._startMaster.gain.value, now);
            this._startMaster.gain.linearRampToValueAtTime(0, now + fade);
        }
        setTimeout(() => {
            if (this._startNodes) {
                this._startNodes.forEach(n => { try { n.stop(); } catch (e) {} });
                this._startNodes = [];
            }
            this._startMaster = null;
        }, immediate ? 200 : 2500);
    }

    // 呜咽变大变急促（世界观浮层打开时）
    // 立即切 urgent，5秒后未关闭则升级为 crying
    boostSob() {
        if (!this._sobGain || !this.initialized) return;
        const now = this.audioContext.currentTime;
        // 音量升高
        this._sobGain.gain.cancelScheduledValues(now);
        this._sobGain.gain.setValueAtTime(this._sobGain.gain.value, now);
        this._sobGain.gain.linearRampToValueAtTime(5, now + 0.6);
        // 模式 → 急促
        this._sobMode = 'urgent';
        // 立即触发一声急促呜咽
        clearTimeout(this._startSobTimer);
        if (this._playSob) this._playSob();
        // 5秒后升级为大哭
        clearTimeout(this._sobCryTimer);
        this._sobCryTimer = setTimeout(() => {
            if (this._sobMode !== 'urgent') return;
            this._sobMode = 'crying';
            // 音量再推高
            const t = this.audioContext.currentTime;
            this._sobGain.gain.cancelScheduledValues(t);
            this._sobGain.gain.setValueAtTime(this._sobGain.gain.value, t);
            this._sobGain.gain.linearRampToValueAtTime(8, t + 1.5);
        }, 5000);
    }

    // 呜咽还原（关闭浮层）
    restoreSob() {
        if (!this._sobGain || !this.initialized) return;
        clearTimeout(this._sobCryTimer);
        const now = this.audioContext.currentTime;
        // 音量渐回
        this._sobGain.gain.cancelScheduledValues(now);
        this._sobGain.gain.setValueAtTime(this._sobGain.gain.value, now);
        this._sobGain.gain.linearRampToValueAtTime(1, now + 0.8);
        // 模式恢复
        this._sobMode = 'normal';
    }

    // ── 引言叙事音效 ─────────────────────────────────────────

    // 打字音效：轻柔笔尖点触声
    playNarrationTyping() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const bufSize = Math.floor(ctx.sampleRate * 0.018);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.5) * 0.28;
        }

        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2600;
        filter.Q.value = 1.1;
        const gain = ctx.createGain();
        gain.gain.value = 0.45;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(now);
    }

    // 引言背景音乐（悠扬悲情）
    startNarrationBGM(type = 'opening') {
        if (!this.initialized) return;
        if (this._narrationBGMActive) this.stopNarrationBGM(true);

        this._narrationBGMActive = type;
        this._narrationNodes = [];
        const ctx = this.audioContext;

        // 主增益节点（缓慢淡入）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.52, ctx.currentTime + 4);
        this._narrationMaster = master;
        master.connect(ctx.destination);

        // 简单混响（白噪脉冲响应）
        const revLen = Math.floor(ctx.sampleRate * 2.8);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2.2);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.42;
        master.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(ctx.destination);

        // 低频根音 drone
        const droneFreq = type === 'death' ? 55.0 : 73.42; // A1 或 D2
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = droneFreq;
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.32;
        drone.connect(droneGain);
        droneGain.connect(master);
        drone.start();
        this._narrationNodes.push(drone);

        // 和弦衬底 pad（三角波 + 微颤音）
        const padFreqs = type === 'death'
            ? [110.0, 130.81, 164.81]   // A2-C3-E3 (Am)
            : [146.83, 174.61, 220.00]; // D3-F3-A3 (Dm)
        padFreqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = i * 4 - 4;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.28 + i * 0.09;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 1.8;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            const g = ctx.createGain();
            g.gain.value = 0.06;
            osc.connect(g);
            g.connect(master);
            osc.start();
            this._narrationNodes.push(osc, lfo);
        });

        // 旋律慢速琶音循环
        const melodyNotes = type === 'death'
            ? [220.00, 196.00, 174.61, 164.81, 146.83, 164.81, 196.00, 220.00] // Am 下行
            : [293.66, 261.63, 220.00, 261.63, 293.66, 349.23, 293.66, 220.00]; // Dm 弧线
        const tempo = type === 'death' ? 2400 : 1900;

        const playNote = (idx) => {
            if (this._narrationBGMActive !== type) return;
            const freq = melodyNotes[idx % melodyNotes.length];
            const noteDur = tempo / 1000 * 0.82;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.19, now + 0.14);
            g.gain.exponentialRampToValueAtTime(0.01, now + noteDur - 0.08);
            osc.connect(g);
            g.connect(master);
            osc.start(now);
            osc.stop(now + noteDur);
            this._narrationBGMTimeout = setTimeout(() => playNote(idx + 1), tempo);
        };
        setTimeout(() => playNote(0), 900);
    }

    stopNarrationBGM(immediate = false) {
        this._narrationBGMActive = null;
        clearTimeout(this._narrationBGMTimeout);

        if (this._narrationMaster && this.initialized) {
            const now = this.audioContext.currentTime;
            const fadeTime = immediate ? 0.1 : 1.8;
            this._narrationMaster.gain.cancelScheduledValues(now);
            this._narrationMaster.gain.setValueAtTime(this._narrationMaster.gain.value, now);
            this._narrationMaster.gain.linearRampToValueAtTime(0, now + fadeTime);
        }

        setTimeout(() => {
            if (this._narrationNodes) {
                this._narrationNodes.forEach(n => { try { n.stop(); } catch (e) {} });
                this._narrationNodes = [];
            }
            this._narrationMaster = null;
        }, immediate ? 200 : 2000);
    }

    // 设置音量
    setVolume(type, value) {
        this.volumes[type] = Utils.clamp(value, 0, 1);
        
        if (this.initialized) {
            switch(type) {
                case 'master':
                    this.masterGain.gain.value = this.volumes.master;
                    break;
                case 'music':
                    this.musicGain.gain.value = this.volumes.music;
                    break;
                case 'sfx':
                    this.sfxGain.gain.value = this.volumes.sfx;
                    break;
            }
        }
    }

    // ── 死亡叙事呜咽系统 ──────────────────────────────────────
    // 共 11 段文字（NARRATION_DEATH length），随段落推进逐渐加速+放大

    startDeathSob() {
        if (!this.initialized) return;
        if (this._deathSobActive) return;
        this._deathSobActive = true;

        const ctx = this.audioContext;

        // 独立增益节点（从 0 淡入）
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
        g.connect(ctx.destination);
        this._deathSobGain = g;

        // 当前阶段参数（会被 escalateDeathSob 更新）
        this._deathSobStage = 0; // 0-10
        this._deathSobTimer = null;

        const playCycle = () => {
            if (!this._deathSobActive) return;
            const stage = this._deathSobStage; // 0(平静) → 10(崩溃)
            const t = ctx.currentTime;

            // 随阶段变化的参数
            const dur      = Math.max(0.25, 0.75 - stage * 0.045) + Math.random() * 0.2;
            const freqBase = 280 + stage * 18 + Math.random() * 60;
            const voxAmp   = 0.022 + stage * 0.012;
            const noiseAmp = 0.012 + stage * 0.006;
            const vibRate  = 5 + stage * 0.5;
            const pitchDrop = 0.72 + stage * 0.01;

            // 噪声气息
            const bufLen  = Math.floor(ctx.sampleRate * dur);
            const nBuf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const nd      = nBuf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;

            const nSrc = ctx.createBufferSource();
            nSrc.buffer = nBuf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 700 + stage * 40;
            bp.Q.value = 5 + stage * 0.3;
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0, t);
            nGain.gain.linearRampToValueAtTime(noiseAmp, t + 0.04);
            nGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            nSrc.connect(bp); bp.connect(nGain); nGain.connect(g);
            nSrc.start(t); nSrc.stop(t + dur);

            // 声带振动
            const vox = ctx.createOscillator();
            vox.type = 'sawtooth';
            vox.frequency.setValueAtTime(freqBase, t);
            vox.frequency.exponentialRampToValueAtTime(freqBase * pitchDrop, t + dur);
            const vibOsc = ctx.createOscillator();
            vibOsc.frequency.value = vibRate;
            const vibG = ctx.createGain();
            vibG.gain.value = 6 + stage * 1.2;
            vibOsc.connect(vibG); vibG.connect(vox.frequency);
            vibOsc.start(t); vibOsc.stop(t + dur);
            const vGain = ctx.createGain();
            vGain.gain.setValueAtTime(0, t);
            vGain.gain.linearRampToValueAtTime(voxAmp, t + 0.035);
            vGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            vox.connect(vGain); vGain.connect(g);
            vox.start(t); vox.stop(t + dur);

            // 下次间隔：随阶段越来越短
            const gap = Math.max(200, 4500 - stage * 380) + Math.random() * 400;
            this._deathSobTimer = setTimeout(playCycle, (dur * 1000) + gap);
        };

        this._deathSobPlayCycle = playCycle;
        // 首声延迟 1.2s 后出现
        this._deathSobTimer = setTimeout(playCycle, 1200);
    }

    // 每推进一段文字调用一次（idx: 0-10）
    escalateDeathSob(lineIdx) {
        if (!this._deathSobActive || !this._deathSobGain) return;
        this._deathSobStage = Math.min(lineIdx, 10);

        const ctx  = this.audioContext;
        const t    = ctx.currentTime;
        const g    = this._deathSobGain;

        // 音量随阶段提升：0.9 → 最高 5.5
        const targetVol = 0.9 + this._deathSobStage * 0.46;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(targetVol, t + 0.8);

        // 最后两段（idx≥9）强制立刻触发一次加急声
        if (lineIdx >= 9) {
            clearTimeout(this._deathSobTimer);
            if (this._deathSobPlayCycle) this._deathSobPlayCycle();
        }
    }

    stopDeathSob() {
        if (!this._deathSobActive) return;
        this._deathSobActive = false;
        clearTimeout(this._deathSobTimer);
        if (this._deathSobGain && this.initialized) {
            const t = this.audioContext.currentTime;
            this._deathSobGain.gain.cancelScheduledValues(t);
            this._deathSobGain.gain.setValueAtTime(this._deathSobGain.gain.value, t);
            this._deathSobGain.gain.linearRampToValueAtTime(0, t + 2.0);
            setTimeout(() => {
                try { this._deathSobGain.disconnect(); } catch(e) {}
                this._deathSobGain = null;
            }, 2200);
        }
        this._deathSobStage = 0;
    }

    // ── 失败结局：压抑绝望悠长drone ──────────────────────────
    // 在DeathEndingSequence.play()开始时调用，持续整个动画
    startDespairDrone(duration = 20) {
        if (!this.initialized) return;
        if (this._despairDroneActive) return;
        this._despairDroneActive = true;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 主增益（缓慢淡入2s，最后3s淡出）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(1.0, now + 2.5);
        master.gain.setValueAtTime(1.0, now + duration - 3);
        master.gain.linearRampToValueAtTime(0, now + duration);
        master.connect(ctx.destination);
        this._despairMaster = master;
        this._despairNodes = [];

        // 混响（长尾深沉空间感）
        const revLen = Math.floor(ctx.sampleRate * 3.5);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.8);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.55;
        master.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(ctx.destination);

        // 极低频根音drone（A1=55Hz，深沉绝望）
        const drone1 = ctx.createOscillator();
        drone1.type = 'sine';
        drone1.frequency.value = 55;
        const d1g = ctx.createGain();
        d1g.gain.value = 0.28;
        drone1.connect(d1g); d1g.connect(master);
        drone1.start(now); drone1.stop(now + duration);
        this._despairNodes.push(drone1);

        // 第二层drone（E2=82Hz，纯五度下方，空洞感）
        const drone2 = ctx.createOscillator();
        drone2.type = 'sine';
        drone2.frequency.value = 82.41;
        // 缓慢下行到73Hz，制造不安
        drone2.frequency.linearRampToValueAtTime(73, now + duration);
        const d2g = ctx.createGain();
        d2g.gain.value = 0.15;
        drone2.connect(d2g); d2g.connect(master);
        drone2.start(now); drone2.stop(now + duration);
        this._despairNodes.push(drone2);

        // 悲鸣三角波pad（Am: A2-C3-E3，极缓慢颤音）
        [110, 130.81, 164.81].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = (i - 1) * 6;
            // 微颤LFO
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.15 + i * 0.05;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 2.5;
            lfo.connect(lfoG); lfoG.connect(osc.frequency);
            lfo.start(now); lfo.stop(now + duration);
            const g = ctx.createGain();
            g.gain.value = 0.04;
            osc.connect(g); g.connect(master);
            osc.start(now); osc.stop(now + duration);
            this._despairNodes.push(osc, lfo);
        });

        // 风声/气息噪声层（持续的、缓慢起伏的哀叹感）
        const noiseDur = duration;
        const nBufLen = Math.floor(ctx.sampleRate * noiseDur);
        const nBuf = ctx.createBuffer(1, nBufLen, ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nBufLen; i++) {
            nd[i] = (Math.random() * 2 - 1);
        }
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 220;
        bp.Q.value = 3;
        // 噪声音量LFO起伏
        const nGain = ctx.createGain();
        nGain.gain.value = 0.035;
        const nLfo = ctx.createOscillator();
        nLfo.frequency.value = 0.08;
        const nLfoG = ctx.createGain();
        nLfoG.gain.value = 0.02;
        nLfo.connect(nLfoG); nLfoG.connect(nGain.gain);
        nLfo.start(now); nLfo.stop(now + noiseDur);
        nSrc.connect(bp); bp.connect(nGain); nGain.connect(master);
        nSrc.start(now); nSrc.stop(now + noiseDur);
        this._despairNodes.push(nSrc, nLfo);

        // 自动清理
        setTimeout(() => this.stopDespairDrone(), duration * 1000 + 500);
    }

    stopDespairDrone() {
        if (!this._despairDroneActive) return;
        this._despairDroneActive = false;
        if (this._despairNodes) {
            this._despairNodes.forEach(n => { try { n.stop(); } catch(e) {} });
            this._despairNodes = [];
        }
        if (this._despairMaster) {
            try { this._despairMaster.disconnect(); } catch(e) {}
            this._despairMaster = null;
        }
    }

    // ── 序言交互动画BGM（D小调，神秘/宿命） ──────────────────
    // IntroAnimation.play() 时调用，5幕约20秒
    startIntroBGM(duration = 22) {
        if (!this.initialized) return;
        if (this._introBGMActive) return;
        this._introBGMActive = true;
        this._introBGMNodes = [];

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 主增益（3s淡入，最后2s淡出）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.42, now + 3);
        master.gain.setValueAtTime(0.42, now + duration - 2);
        master.gain.linearRampToValueAtTime(0, now + duration);
        master.connect(ctx.destination);
        this._introBGMMaster = master;

        // 混响（古钟内腔空间感，3s衰减）
        const revLen = Math.floor(ctx.sampleRate * 3.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2.0);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.48;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        // 低频根音drone D2(73.42Hz)，缓慢下行到D2-10cents制造不安
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(73.42, now);
        drone.frequency.linearRampToValueAtTime(71.5, now + duration);
        const droneG = ctx.createGain();
        droneG.gain.value = 0.30;
        drone.connect(droneG); droneG.connect(master);
        drone.start(now); drone.stop(now + duration);
        this._introBGMNodes.push(drone);

        // 第二层drone A2(110Hz)，纯五度，空灵感
        const drone2 = ctx.createOscillator();
        drone2.type = 'sine';
        drone2.frequency.value = 110;
        const d2g = ctx.createGain();
        d2g.gain.value = 0.12;
        drone2.connect(d2g); d2g.connect(master);
        drone2.start(now); drone2.stop(now + duration);
        this._introBGMNodes.push(drone2);

        // 和弦pad Dm: D3-F3-A3 (146.83, 174.61, 220.00)，极缓LFO颤音
        [146.83, 174.61, 220.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = (i - 1) * 5;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.20 + i * 0.07;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 2.0;
            lfo.connect(lfoG); lfoG.connect(osc.frequency);
            lfo.start(now); lfo.stop(now + duration);
            const g = ctx.createGain();
            // pad在3s后渐入
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.05, now + 3);
            g.gain.setValueAtTime(0.05, now + duration - 2);
            g.gain.linearRampToValueAtTime(0, now + duration);
            osc.connect(g); g.connect(master);
            osc.start(now); osc.stop(now + duration);
            this._introBGMNodes.push(osc, lfo);
        });

        // 旋律：Dm下行琶音，断裂、稀疏、宿命感
        // D4-C4-A3-F3-D3，每音2.5s间隔，尾音下沉
        const melodyNotes = [293.66, 261.63, 220.00, 174.61, 146.83, 220.00, 261.63, 293.66, 349.23, 293.66, 220.00, 174.61];
        const melodyTempo = 2200; // ms per note
        let noteIdx = 0;
        const playMelodyNote = () => {
            if (!this._introBGMActive) return;
            // 40%概率静默（断裂感）
            if (Math.random() > 0.40) {
                const freq = melodyNotes[noteIdx % melodyNotes.length];
                const noteDur = melodyTempo / 1000 * 0.75;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                // 尾音下沉
                osc.frequency.exponentialRampToValueAtTime(freq * 0.988, ctx.currentTime + noteDur);
                const g = ctx.createGain();
                const t = ctx.currentTime;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.16, t + 0.12);
                g.gain.exponentialRampToValueAtTime(0.01, t + noteDur - 0.05);
                osc.connect(g); g.connect(master);
                osc.start(t); osc.stop(t + noteDur + 0.1);
            }
            noteIdx++;
            this._introBGMTimer = setTimeout(playMelodyNote, melodyTempo + Math.random() * 400);
        };
        // 延迟2s后开始旋律
        this._introBGMTimer = setTimeout(playMelodyNote, 2000);

        // 风声底噪（微弱，增加空间深度）
        const windLen = Math.floor(ctx.sampleRate * 3);
        const windBuf = ctx.createBuffer(1, windLen, ctx.sampleRate);
        const wd = windBuf.getChannelData(0);
        for (let i = 0; i < windLen; i++) wd[i] = Math.random() * 2 - 1;
        const windSrc = ctx.createBufferSource();
        windSrc.buffer = windBuf;
        windSrc.loop = true;
        const windBp = ctx.createBiquadFilter();
        windBp.type = 'bandpass';
        windBp.frequency.value = 300;
        windBp.Q.value = 0.8;
        const windG = ctx.createGain();
        windG.gain.value = 0.025;
        windSrc.connect(windBp); windBp.connect(windG); windG.connect(master);
        windSrc.start(now); windSrc.stop(now + duration);
        this._introBGMNodes.push(windSrc);

        // 自动清理
        setTimeout(() => this.stopIntroBGM(), duration * 1000 + 500);
    }

    stopIntroBGM() {
        if (!this._introBGMActive) return;
        this._introBGMActive = false;
        clearTimeout(this._introBGMTimer);
        if (this._introBGMNodes) {
            this._introBGMNodes.forEach(n => { try { n.stop(); } catch(e) {} });
            this._introBGMNodes = [];
        }
        if (this._introBGMMaster) {
            try { this._introBGMMaster.disconnect(); } catch(e) {}
            this._introBGMMaster = null;
        }
    }

    // ── 胜利结局动画BGM（C小调→微暖，苦涩重生） ──────────────
    // EndingSequence.play() 时调用，35秒，承接victoryStinger余韵
    startVictoryEndingBGM(duration = 37) {
        if (!this.initialized) return;
        if (this._victoryBGMActive) return;
        this._victoryBGMActive = true;
        this._victoryBGMNodes = [];

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 主增益（2s淡入，最后3s淡出）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.38, now + 2);
        master.gain.setValueAtTime(0.38, now + duration - 3);
        master.gain.linearRampToValueAtTime(0, now + duration);
        master.connect(ctx.destination);
        this._victoryBGMMaster = master;

        // 混响（长尾空灵，4s衰减——钟内空腔回声）
        const revLen = Math.floor(ctx.sampleRate * 4.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.5);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.50;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        // 根音drone C2(65.41Hz)，稳定持续
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 65.41;
        const droneG = ctx.createGain();
        droneG.gain.value = 0.22;
        drone.connect(droneG); droneG.connect(master);
        drone.start(now); drone.stop(now + duration);
        this._victoryBGMNodes.push(drone);

        // 第二层drone G2(98Hz)，属音，未完成但有希望
        const drone2 = ctx.createOscillator();
        drone2.type = 'sine';
        drone2.frequency.value = 98.00;
        const d2g = ctx.createGain();
        d2g.gain.value = 0.10;
        drone2.connect(d2g); d2g.connect(master);
        drone2.start(now); drone2.stop(now + duration);
        this._victoryBGMNodes.push(drone2);

        // pad Cm: C3-Eb3-G3 (130.81, 155.56, 196.00)
        // 随时间推进pad音量渐增（象征色彩回归）
        [130.81, 155.56, 196.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = (i - 1) * 4;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.18 + i * 0.06;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 1.5;
            lfo.connect(lfoG); lfoG.connect(osc.frequency);
            lfo.start(now); lfo.stop(now + duration);
            const g = ctx.createGain();
            // pad渐强：0→0.04→0.07（色彩渐归）
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.04, now + 5);
            g.gain.linearRampToValueAtTime(0.07, now + duration * 0.7);
            g.gain.linearRampToValueAtTime(0, now + duration);
            osc.connect(g); g.connect(master);
            osc.start(now); osc.stop(now + duration);
            this._victoryBGMNodes.push(osc, lfo);
        });

        // 旋律：C小调上行弧线，尾音下沉但整体向上
        // 对应叙事：钟响→靛蓝渗出→影子→石榴树→手→钟走→走向光
        const melodySeqs = [
            // 前半段：缓慢浮现（C4-D4-Eb4-G4，稀疏）
            { f: 261.63, t: 2.0 },  // C4
            { f: 293.66, t: 4.5 },  // D4
            { f: 311.13, t: 7.0 },  // Eb4
            { f: 392.00, t: 9.5 },  // G4 属音（悬停）
            // 中段：色彩回归（C4-Eb4-F4-G4-Eb4）
            { f: 261.63, t: 13.0 }, // C4
            { f: 311.13, t: 15.0 }, // Eb4
            { f: 349.23, t: 17.0 }, // F4
            { f: 392.00, t: 19.0 }, // G4
            { f: 311.13, t: 21.0 }, // Eb4（回落）
            // 后段：走向光（G4-F4-Eb4-D4-C4，下行解决但不完满）
            { f: 392.00, t: 24.0 }, // G4
            { f: 349.23, t: 26.0 }, // F4
            { f: 311.13, t: 28.0 }, // Eb4
            { f: 293.66, t: 30.0 }, // D4
            { f: 261.63, t: 32.0 }, // C4（根音回归，但尾音下沉）
        ];
        melodySeqs.forEach(({ f, t }) => {
            const noteDur = 1.8;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + t);
            // 尾音下沉（幸存者无法完全回归）
            osc.frequency.exponentialRampToValueAtTime(f * 0.990, now + t + noteDur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.17, now + t + 0.14);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + noteDur);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + noteDur + 0.3);
            this._victoryBGMNodes.push(osc);
        });

        // 高音泛音层（极弱八音盒质感，后半段渐入）
        const chimeTimes = [14, 17, 20, 24, 28, 32];
        chimeTimes.forEach(t => {
            const freq = [523.25, 587.33, 659.25, 783.99][Math.floor(Math.random() * 4)]; // C5-D5-E5-G5
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.06, now + t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + 2.5);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + 3.0);
            this._victoryBGMNodes.push(osc);
        });

        // 风声底噪（轻柔，象征外部世界）
        const windLen = Math.floor(ctx.sampleRate * 4);
        const windBuf = ctx.createBuffer(1, windLen, ctx.sampleRate);
        const wd = windBuf.getChannelData(0);
        for (let i = 0; i < windLen; i++) wd[i] = Math.random() * 2 - 1;
        const windSrc = ctx.createBufferSource();
        windSrc.buffer = windBuf;
        windSrc.loop = true;
        const windBp = ctx.createBiquadFilter();
        windBp.type = 'bandpass';
        windBp.frequency.value = 350;
        windBp.Q.value = 0.5;
        const windG = ctx.createGain();
        // 风声后半段渐强
        windG.gain.setValueAtTime(0.01, now);
        windG.gain.linearRampToValueAtTime(0.04, now + duration * 0.6);
        windG.gain.linearRampToValueAtTime(0, now + duration);
        windSrc.connect(windBp); windBp.connect(windG); windG.connect(master);
        windSrc.start(now); windSrc.stop(now + duration);
        this._victoryBGMNodes.push(windSrc);

        // 自动清理
        setTimeout(() => this.stopVictoryEndingBGM(), duration * 1000 + 500);
    }

    stopVictoryEndingBGM() {
        if (!this._victoryBGMActive) return;
        this._victoryBGMActive = false;
        if (this._victoryBGMNodes) {
            this._victoryBGMNodes.forEach(n => { try { n.stop(); } catch(e) {} });
            this._victoryBGMNodes = [];
        }
        if (this._victoryBGMMaster) {
            try { this._victoryBGMMaster.disconnect(); } catch(e) {}
            this._victoryBGMMaster = null;
        }
    }

    // ── 失败结局动画BGM（Am下行旋律碎片，叠加在despairDrone之上）──
    // DeathEndingSequence.play() 时调用，18秒
    // 与startDespairDrone共存，此方法添加旋律/节奏层
    startDeathEndingBGM(duration = 20) {
        if (!this.initialized) return;
        if (this._deathBGMActive) return;
        this._deathBGMActive = true;
        this._deathBGMNodes = [];

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 独立主增益（不与despairDrone共用master）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(1.0, now + 2);
        // 后半段渐弱至消失（音乐先于人消散）
        master.gain.setValueAtTime(1.0, now + duration * 0.55);
        master.gain.linearRampToValueAtTime(0, now + duration - 1);
        master.connect(ctx.destination);
        this._deathBGMMaster = master;

        // 混响（深沉，4s衰减）
        const revLen = Math.floor(ctx.sampleRate * 4.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.6);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.55;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        // 旋律碎片：Am下行，越来越稀疏、越来越慢
        // 对应叙事：钟没响→手透明→群像→加入→颜色逃→变灰→钟停
        const melodyFragments = [
            // 前段：尚有旋律轮廓（A3-G3-E3-D3-C3）
            { f: 220.00, t: 1.5 },  // A3
            { f: 196.00, t: 3.5 },  // G3
            { f: 164.81, t: 5.0 },  // E3
            { f: 146.83, t: 6.5 },  // D3
            { f: 130.81, t: 8.0 },  // C3
            // 中段：只剩根音和五度（A2-E3，间隔拉大）
            { f: 110.00, t: 10.0 }, // A2（八度下行）
            { f: 164.81, t: 12.5 }, // E3（最后的五度）
            // 尾段：单音A2，极缓衰减
            { f: 110.00, t: 14.5 }, // A2
        ];
        melodyFragments.forEach(({ f, t }) => {
            // 每个音的持续时间随序列推进变长（时间在凝固）
            const noteDur = 1.5 + t * 0.06;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + t);
            // 尾音持续下沉（一切在下坠）
            osc.frequency.exponentialRampToValueAtTime(f * 0.980, now + t + noteDur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.18 - t * 0.008, now + t + 0.15); // 音量随时间递减
            g.gain.exponentialRampToValueAtTime(0.01, now + t + noteDur);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + noteDur + 0.3);
            this._deathBGMNodes.push(osc);
        });

        // 不规则钟摆回声（D07文案对应：滴答，但错乱、间隔不等）
        const tickTimes = [3.0, 5.5, 9.0, 13.0];
        tickTimes.forEach(t => {
            const freq = 130.81 - t * 2; // 频率随时间下降
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.06, now + t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.01, now + t + 0.6);
            osc.connect(g); g.connect(master);
            osc.start(now + t); osc.stop(now + t + 0.8);
            this._deathBGMNodes.push(osc);
        });

        // 自动清理
        setTimeout(() => this.stopDeathEndingBGM(), duration * 1000 + 500);
    }

    stopDeathEndingBGM() {
        if (!this._deathBGMActive) return;
        this._deathBGMActive = false;
        if (this._deathBGMNodes) {
            this._deathBGMNodes.forEach(n => { try { n.stop(); } catch(e) {} });
            this._deathBGMNodes = [];
        }
        if (this._deathBGMMaster) {
            try { this._deathBGMMaster.disconnect(); } catch(e) {}
            this._deathBGMMaster = null;
        }
    }

    // ── 失败结局悠长钟声（渐入，持续循环直到停止） ─────────
    startDeathBell() {
        if (!this.initialized) return;
        if (this._deathBellActive) return;
        this._deathBellActive = true;

        const ctx = this.audioContext;

        // 主增益（3s渐入，持续循环）
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 3);
        master.connect(ctx.destination);
        this._deathBellMaster = master;

        // 长混响（钟声空腔，5s衰减）
        const revLen = Math.floor(ctx.sampleRate * 5.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.3);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.6;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        // 循环敲钟
        const toll = () => {
            if (!this._deathBellActive) return;
            const now = ctx.currentTime;

            // 基频 C3(130.81Hz) — 沉闷古钟
            const fund = ctx.createOscillator();
            fund.type = 'sine';
            fund.frequency.setValueAtTime(130.81, now);
            fund.frequency.exponentialRampToValueAtTime(129.5, now + 3.0); // 微降，疲惫感
            const fg = ctx.createGain();
            fg.gain.setValueAtTime(0.30, now);
            fg.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
            fund.connect(fg); fg.connect(master);
            fund.start(now); fund.stop(now + 3.2);

            // 泛音2: G3(196Hz) 纯五度
            const h2 = ctx.createOscillator();
            h2.type = 'sine';
            h2.frequency.value = 196.00;
            const h2g = ctx.createGain();
            h2g.gain.setValueAtTime(0.12, now);
            h2g.gain.exponentialRampToValueAtTime(0.01, now + 2.2);
            h2.connect(h2g); h2g.connect(master);
            h2.start(now); h2.stop(now + 2.4);

            // 泛音3: C4(261.63Hz) 八度
            const h3 = ctx.createOscillator();
            h3.type = 'sine';
            h3.frequency.value = 261.63;
            const h3g = ctx.createGain();
            h3g.gain.setValueAtTime(0.06, now);
            h3g.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            h3.connect(h3g); h3g.connect(master);
            h3.start(now); h3.stop(now + 1.7);

            // 金属撞击瞬态（短噪声脉冲）
            const impLen = Math.floor(ctx.sampleRate * 0.03);
            const impBuf = ctx.createBuffer(1, impLen, ctx.sampleRate);
            const impD = impBuf.getChannelData(0);
            for (let i = 0; i < impLen; i++) {
                impD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impLen, 3.0);
            }
            const impSrc = ctx.createBufferSource();
            impSrc.buffer = impBuf;
            const impBp = ctx.createBiquadFilter();
            impBp.type = 'bandpass'; impBp.frequency.value = 1200; impBp.Q.value = 2;
            const impG = ctx.createGain();
            impG.gain.value = 0.15;
            impSrc.connect(impBp); impBp.connect(impG); impG.connect(master);
            impSrc.start(now);

            // 下一次敲钟（3.5秒间隔，悠长）
            this._deathBellTimer = setTimeout(toll, 3500);
        };

        // 首次立即敲
        toll();
    }

    stopDeathBell() {
        if (!this._deathBellActive) return;
        this._deathBellActive = false;
        clearTimeout(this._deathBellTimer);
        if (this._deathBellMaster && this.initialized) {
            const now = this.audioContext.currentTime;
            this._deathBellMaster.gain.cancelScheduledValues(now);
            this._deathBellMaster.gain.setValueAtTime(this._deathBellMaster.gain.value, now);
            this._deathBellMaster.gain.linearRampToValueAtTime(0, now + 2.0);
        }
        setTimeout(() => {
            if (this._deathBellMaster) {
                try { this._deathBellMaster.disconnect(); } catch(e) {}
                this._deathBellMaster = null;
            }
        }, 2500);
    }

    // ── 序言钟响（"钟响了"前3s渐入，悠长循环敲鸣） ─────────
    startOpeningBell() {
        if (!this.initialized) return;
        if (this._openingBellActive) return;
        this._openingBellActive = true;

        const ctx = this.audioContext;

        // 主增益：3s渐入
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.72, ctx.currentTime + 3.0);
        master.connect(ctx.destination);
        this._openingBellMaster = master;

        // 长空腔混响（6s衰减，空旷幽深）
        const revLen = Math.floor(ctx.sampleRate * 6.0);
        const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = revBuf.getChannelData(c);
            for (let i = 0; i < revLen; i++) {
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.1);
            }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = revBuf;
        const revG = ctx.createGain();
        revG.gain.value = 0.58;
        master.connect(reverb);
        reverb.connect(revG);
        revG.connect(ctx.destination);

        const toll = () => {
            if (!this._openingBellActive) return;
            const now = ctx.currentTime;

            // 基频 D3 (146.83Hz) — 古朴悠长
            const fund = ctx.createOscillator();
            fund.type = 'sine';
            fund.frequency.setValueAtTime(146.83, now);
            fund.frequency.exponentialRampToValueAtTime(145.2, now + 4.5);
            const fg = ctx.createGain();
            fg.gain.setValueAtTime(0.38, now);
            fg.gain.exponentialRampToValueAtTime(0.01, now + 5.0);
            fund.connect(fg); fg.connect(master);
            fund.start(now); fund.stop(now + 5.2);

            // 泛音 A3 (220Hz) 纯五度
            const h2 = ctx.createOscillator();
            h2.type = 'sine';
            h2.frequency.value = 220.00;
            const h2g = ctx.createGain();
            h2g.gain.setValueAtTime(0.15, now);
            h2g.gain.exponentialRampToValueAtTime(0.01, now + 3.2);
            h2.connect(h2g); h2g.connect(master);
            h2.start(now); h2.stop(now + 3.5);

            // 泛音 D4 (293.66Hz) 八度
            const h3 = ctx.createOscillator();
            h3.type = 'sine';
            h3.frequency.value = 293.66;
            const h3g = ctx.createGain();
            h3g.gain.setValueAtTime(0.07, now);
            h3g.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
            h3.connect(h3g); h3g.connect(master);
            h3.start(now); h3.stop(now + 2.0);

            // 金属撞击瞬态
            const impLen = Math.floor(ctx.sampleRate * 0.028);
            const impBuf = ctx.createBuffer(1, impLen, ctx.sampleRate);
            const impD = impBuf.getChannelData(0);
            for (let i = 0; i < impLen; i++) {
                impD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impLen, 2.8);
            }
            const impSrc = ctx.createBufferSource();
            impSrc.buffer = impBuf;
            const impBp = ctx.createBiquadFilter();
            impBp.type = 'bandpass'; impBp.frequency.value = 950; impBp.Q.value = 1.6;
            const impG = ctx.createGain();
            impG.gain.value = 0.13;
            impSrc.connect(impBp); impBp.connect(impG); impG.connect(master);
            impSrc.start(now);

            // 每 5.5s 敲一次
            this._openingBellTimer = setTimeout(toll, 5500);
        };
        toll();
    }

    stopOpeningBell() {
        if (!this._openingBellActive) return;
        this._openingBellActive = false;
        clearTimeout(this._openingBellTimer);
        if (this._openingBellMaster && this.initialized) {
            const now = this.audioContext.currentTime;
            this._openingBellMaster.gain.cancelScheduledValues(now);
            this._openingBellMaster.gain.setValueAtTime(this._openingBellMaster.gain.value, now);
            this._openingBellMaster.gain.linearRampToValueAtTime(0, now + 2.5);
        }
        setTimeout(() => {
            if (this._openingBellMaster) {
                try { this._openingBellMaster.disconnect(); } catch(e) {}
                this._openingBellMaster = null;
            }
        }, 3000);
    }

    // ── 打字机音效（序言字幕逐字显示时） ──────────────────────
    playTypeClick() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        // 短促机械敲击：高频噪声脉冲 + 微弱金属振动
        const bufLen = Math.floor(ctx.sampleRate * 0.035);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.0) * 0.6;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1800 + Math.random() * 600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.connect(hp); hp.connect(g); g.connect(this.sfxGain);
        src.start(now);
    }
}

// 全局音频管理器实例
const GameAudio = new AudioManager();
