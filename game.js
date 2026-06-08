// ==================== 全局错误捕获 ====================
if (typeof wx !== 'undefined') {
    wx.onError(function(err) {
        console.error('[全局错误]', err);
        try {
            wx.showModal({ title: '游戏出错', content: err.message || String(err), showCancel: false });
        } catch(e) {}
    });
    wx.onUnhandledRejection(function(res) {
        console.error('[未处理拒绝]', res.reason);
    });
}

/**
 * 找猫大师 - 微信小游戏完整版
 * 包含：5关卡、音效、动画、UI完整复刻
 */

// ==================== 常量定义 ====================
var GAME_WIDTH = 750;
var GAME_HEIGHT = 1334;

// ==================== 关卡生成器 ====================
var LevelGenerator = {
    generateRegions: function(size) {
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var maxAttempts = 200;
        var attempts = 0;
        var dirs = [[0,1],[1,0],[0,-1],[-1,0]];
        
        while (attempts < maxAttempts) {
            attempts++;
            var regions = [];
            
            for (var r = 0; r < size; r++) {
                regions[r] = [];
                for (var c = 0; c < size; c++) {
                    regions[r][c] = null;
                }
            }
            
            // 创建所有位置的列表并随机打乱
            var allPositions = [];
            for (var r = 0; r < size; r++) {
                for (var c = 0; c < size; c++) {
                    allPositions.push([r, c]);
                }
            }
            
            // Fisher-Yates 洗牌
            for (var i = allPositions.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = allPositions[i];
                allPositions[i] = allPositions[j];
                allPositions[j] = temp;
            }
            
            // 选择前 size 个位置作为每个颜色区域的种子点，确保它们不相邻
            var seeds = [];
            var seedSet = new Set();
            
            for (var i = 0; i < allPositions.length && seeds.length < size; i++) {
                var pos = allPositions[i];
                var r = pos[0];
                var c = pos[1];
                var isAdjacent = false;
                
                for (var s = 0; s < seeds.length && !isAdjacent; s++) {
                    var sr = seeds[s][0];
                    var sc = seeds[s][1];
                    if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1 && !(r === sr && c === sc)) {
                        isAdjacent = true;
                    }
                }
                
                if (!isAdjacent) {
                    seeds.push([r, c]);
                }
            }
            
            // 如果找不到足够的非相邻种子点，使用随机选择
            while (seeds.length < size) {
                var pos = allPositions[seeds.length];
                seeds.push(pos);
            }
            
            // 随机打乱种子顺序
            for (var i = seeds.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = seeds[i];
                seeds[i] = seeds[j];
                seeds[j] = temp;
            }
            
            for (var i = 0; i < size; i++) {
                var seed = seeds[i];
                regions[seed[0]][seed[1]] = letters[i];
            }
            
            // 使用波浪式扩散 - 每次迭代所有区域都尝试扩散一次
            var regionCounts = {};
            var frontier = {}; // 每个区域的边界
            
            for (var i = 0; i < size; i++) {
                regionCounts[letters[i]] = 1;
                frontier[letters[i]] = [seeds[i]];
            }
            
            var assigned = size;
            var iterations = 0;
            var maxIterations = size * size * 2;
            
            while (assigned < size * size && iterations < maxIterations) {
                iterations++;
                var newFrontier = {};
                var anyProgress = false;
                
                for (var li = 0; li < size; li++) {
                    var letter = letters[li];
                    newFrontier[letter] = [];
                    
                    if (regionCounts[letter] >= size) continue;
                    
                    var currentFrontier = frontier[letter];
                    var nextFrontier = [];
                    
                    for (var fi = 0; fi < currentFrontier.length && regionCounts[letter] < size; fi++) {
                        var pos = currentFrontier[fi];
                        var r = pos[0];
                        var c = pos[1];
                        
                        // 随机打乱方向
                        var shuffledDirs = dirs.slice();
                        for (var di = shuffledDirs.length - 1; di > 0; di--) {
                            var dj = Math.floor(Math.random() * (di + 1));
                            var tempD = shuffledDirs[di];
                            shuffledDirs[di] = shuffledDirs[dj];
                            shuffledDirs[dj] = tempD;
                        }
                        
                        for (var d = 0; d < 4 && regionCounts[letter] < size; d++) {
                            var nr = r + shuffledDirs[d][0];
                            var nc = c + shuffledDirs[d][1];
                            
                            if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === null) {
                                regions[nr][nc] = letter;
                                regionCounts[letter]++;
                                assigned++;
                                nextFrontier.push([nr, nc]);
                                anyProgress = true;
                            }
                        }
                    }
                    
                    newFrontier[letter] = nextFrontier;
                }
                
                frontier = newFrontier;
                
                // 检查是否所有边界都为空
                var allEmpty = true;
                for (var li = 0; li < size; li++) {
                    if (frontier[letters[li]].length > 0 && regionCounts[letters[li]] < size) {
                        allEmpty = false;
                        break;
                    }
                }
                
                if (allEmpty) {
                    // 重新计算边界
                    for (var li = 0; li < size; li++) {
                        var letter = letters[li];
                        if (regionCounts[letter] >= size) continue;
                        
                        var newFrontierCells = [];
                        for (var r = 0; r < size; r++) {
                            for (var c = 0; c < size; c++) {
                                if (regions[r][c] === letter) {
                                    for (var d = 0; d < 4; d++) {
                                        var nr = r + dirs[d][0];
                                        var nc = c + dirs[d][1];
                                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === null) {
                                            var exists = false;
                                            for (var f = 0; f < newFrontierCells.length; f++) {
                                                if (newFrontierCells[f][0] === nr && newFrontierCells[f][1] === nc) {
                                                    exists = true;
                                                    break;
                                                }
                                            }
                                            if (!exists) {
                                                newFrontierCells.push([nr, nc]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        frontier[letter] = newFrontierCells;
                    }
                }
                
                if (!anyProgress && !allEmpty) {
                    break;
                }
            }
            
            // 检查是否所有区域都正确分配了 size 个格子
            var allCorrect = true;
            for (var i = 0; i < size; i++) {
                if (regionCounts[letters[i]] !== size) {
                    allCorrect = false;
                    break;
                }
            }
            
            // 验证连通性
            if (allCorrect) {
                allCorrect = this.verifyConnectivity(regions, size);
            }
            
            if (allCorrect) {
                return regions;
            }
        }
        
        // 使用保证连通的对角线布局作为保底
        var fallback = [];
        for (var r = 0; r < size; r++) {
            fallback[r] = [];
            for (var c = 0; c < size; c++) {
                fallback[r][c] = letters[r];
            }
        }
        return fallback;
    },
    
    verifyConnectivity: function(regions, size) {
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var visited = [];
        for (var r = 0; r < size; r++) {
            visited[r] = [];
            for (var c = 0; c < size; c++) {
                visited[r][c] = false;
            }
        }
        
        var dirs = [[0,1],[1,0],[0,-1],[-1,0]];
        
        // 检查每个区域是否连通
        for (var letterIdx = 0; letterIdx < size; letterIdx++) {
            var letter = letters[letterIdx];
            var startR = -1, startC = -1;
            
            // 找到这个区域的第一个格子
            for (var r = 0; r < size && startR === -1; r++) {
                for (var c = 0; c < size && startR === -1; c++) {
                    if (regions[r][c] === letter) {
                        startR = r;
                        startC = c;
                    }
                }
            }
            
            if (startR === -1) return false;
            
            // BFS 检查连通性
            var queue = [[startR, startC]];
            visited[startR][startC] = true;
            var count = 1;
            
            while (queue.length > 0) {
                var pos = queue.shift();
                var r = pos[0];
                var c = pos[1];
                
                for (var d = 0; d < 4; d++) {
                    var nr = r + dirs[d][0];
                    var nc = c + dirs[d][1];
                    
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && 
                        !visited[nr][nc] && regions[nr][nc] === letter) {
                        visited[nr][nc] = true;
                        queue.push([nr, nc]);
                        count++;
                    }
                }
            }
            
            if (count !== size) return false;
        }
        
        return true;
    },
    
    shuffle: function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    },
    
    generateLevel: function(levelIndex) {
        var size = 4 + levelIndex;
        if (size > 8) size = 8;
        
        var maxAttempts = 50;
        var attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            var regions = this.generateRegions(size);
            
            // 调试：检查区域颜色数量
            var colorCount = this.countUniqueColors(regions, size);
            console.log('[关卡生成] 尝试 ' + attempts + ', 区域大小: ' + size + ', 颜色数量: ' + colorCount);
            
            // 验证区域
            var regionValid = this.verifyConnectivity(regions, size);
            if (!regionValid) {
                console.log('[关卡生成] 连通性验证失败');
                continue;
            }
            
            if (colorCount !== size) {
                console.log('[关卡生成] 颜色数量不对: ' + colorCount + ' != ' + size);
                continue;
            }
            
            // 检查每个区域是否都有足够的空格来放置猫
            // 同时生成临时的猫位置来验证关卡是否有解
            var cats = this.generateCatPositionsForLevel(regions, size);
            
            if (cats && cats.length === size) {
                console.log('[关卡生成] 成功! 使用随机布局');
                return {
                    id: levelIndex,
                    size: size,
                    regions: regions,
                    cats: cats  // 预计算猫位置
                };
            } else {
                console.log('[关卡生成] 猫位置生成失败');
            }
        }
        
        // 如果多次尝试都失败，生成一个保证有解的关卡
        console.log('[关卡生成] 使用保底关卡');
        var fallbackRegions = this.generateFallbackLevel(size);
        
        // 调试 fallback 区域
        var fallbackColorCount = this.countUniqueColors(fallbackRegions, size);
        console.log('[关卡生成] Fallback 颜色数量: ' + fallbackColorCount);
        
        return {
            id: levelIndex,
            size: size,
            regions: fallbackRegions,
            cats: this.generateCatPositionsForLevel(fallbackRegions, size)
        };
    },
    
    countUniqueColors: function(regions, size) {
        var colors = new Set();
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (regions[r][c]) {
                    colors.add(regions[r][c]);
                }
            }
        }
        return colors.size;
    },
    
    generateFallbackLevel: function(size) {
        // 生成一个保证有解的对角线区域布局
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var regions = [];
        
        // 创建一个每行一个颜色的布局（保证每个区域恰好 size 个格子且连通）
        for (var r = 0; r < size; r++) {
            regions[r] = [];
            for (var c = 0; c < size; c++) {
                regions[r][c] = letters[r];
            }
        }
        
        // 验证所有区域都存在且数量正确
        var regionCount = {};
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var letter = regions[r][c];
                regionCount[letter] = (regionCount[letter] || 0) + 1;
            }
        }
        
        // 如果某些区域数量不对，尝试更可靠的布局
        var allCorrect = true;
        for (var i = 0; i < size; i++) {
            if (!regionCount[letters[i]] || regionCount[letters[i]] !== size) {
                allCorrect = false;
                break;
            }
        }
        
        // 如果有问题，使用更简单的按列布局
        if (!allCorrect) {
            regions = [];
            for (var r = 0; r < size; r++) {
                regions[r] = [];
                for (var c = 0; c < size; c++) {
                    regions[r][c] = letters[c];
                }
            }
        }
        
        return regions;
    },
    
    generateCatPositionsForLevel: function(regions, size) {
        // 生成猫位置，使用回溯算法确保找到解
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // 首先为每个区域找一个候选位置
        var regionCandidates = {};
        for (var li = 0; li < size; li++) {
            var letter = letters[li];
            regionCandidates[letter] = [];
        }
        
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var region = regions[r][c];
                if (region && regionCandidates[region]) {
                    regionCandidates[region].push([r, c]);
                }
            }
        }
        
        // 尝试找到有效解
        var cats = this.backtrackCatPositions(regions, size, 0, [], regionCandidates);
        
        if (cats && cats.length === size) {
            return cats;
        }
        
        // 如果回溯失败，尝试贪心算法
        return this.greedyCatPositions(regions, size);
    },
    
    backtrackCatPositions: function(regions, size, catCount, currentCats, regionCandidates) {
        if (catCount >= size) {
            return currentCats.slice();
        }
        
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var letter = letters[catCount];
        var candidates = regionCandidates[letter] || [];
        
        // 随机打乱候选位置
        for (var i = candidates.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = temp;
        }
        
        for (var i = 0; i < candidates.length; i++) {
            var pos = candidates[i];
            var row = pos[0];
            var col = pos[1];
            
            // 检查约束
            if (this.isValidCatPlacement(row, col, currentCats, regions, size)) {
                currentCats.push([row, col]);
                var result = this.backtrackCatPositions(regions, size, catCount + 1, currentCats, regionCandidates);
                if (result) return result;
                currentCats.pop();
            }
        }
        
        return null;
    },
    
    isValidCatPlacement: function(row, col, currentCats, regions, size) {
        var region = regions[row][col];
        
        // 检查行约束
        for (var i = 0; i < currentCats.length; i++) {
            if (currentCats[i][0] === row) return false;
        }
        
        // 检查列约束
        for (var i = 0; i < currentCats.length; i++) {
            if (currentCats[i][1] === col) return false;
        }
        
        // 检查区域约束
        for (var i = 0; i < currentCats.length; i++) {
            var catRow = currentCats[i][0];
            var catCol = currentCats[i][1];
            if (regions[catRow][catCol] === region) return false;
        }
        
        // 检查相邻约束
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (var d = 0; d < 4; d++) {
            var nr = row + dirs[d][0];
            var nc = col + dirs[d][1];
            for (var i = 0; i < currentCats.length; i++) {
                if (currentCats[i][0] === nr && currentCats[i][1] === nc) return false;
            }
        }
        
        return true;
    },
    
    greedyCatPositions: function(regions, size) {
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var cats = [];
        var usedRows = new Set();
        var usedCols = new Set();
        var usedRegions = new Set();
        
        // 收集所有位置并按区域分组
        var regionCells = {};
        for (var li = 0; li < size; li++) {
            regionCells[letters[li]] = [];
        }
        
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var region = regions[r][c];
                if (regionCells[region]) {
                    regionCells[region].push([r, c]);
                }
            }
        }
        
        // 贪心选择每个区域的位置
        for (var li = 0; li < size; li++) {
            var letter = letters[li];
            var cells = regionCells[letter] || [];
            
            // 随机打乱
            for (var i = cells.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = cells[i];
                cells[i] = cells[j];
                cells[j] = temp;
            }
            
            // 选择第一个满足约束的位置
            for (var i = 0; i < cells.length; i++) {
                var pos = cells[i];
                var r = pos[0];
                var c = pos[1];
                
                if (!usedRows.has(r) && !usedCols.has(c) && !usedRegions.has(letter)) {
                    // 检查相邻
                    var hasAdjacent = false;
                    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                    for (var d = 0; d < 4 && !hasAdjacent; d++) {
                        var nr = r + dirs[d][0];
                        var nc = c + dirs[d][1];
                        for (var j = 0; j < cats.length && !hasAdjacent; j++) {
                            if (cats[j][0] === nr && cats[j][1] === nc) {
                                hasAdjacent = true;
                            }
                        }
                    }
                    
                    if (!hasAdjacent) {
                        cats.push([r, c]);
                        usedRows.add(r);
                        usedCols.add(c);
                        usedRegions.add(letter);
                        break;
                    }
                }
            }
        }
        
        return cats;
    },
};

// ==================== 存档系统 ====================
var SaveSystem = {
    STORAGE_KEY: 'cat_finder_save',
    LEADERBOARD_KEY: 'cat_finder_leaderboard',
    defaultData: {
        currentLevel: 0,
        unlockedLevel: 0,
        streak: 0,
        bestStreak: 0,
        settings: { music: false, sound: true, vibration: true },
        playerName: 'Player'
    },
    init: function() {
        try {
            var data = wx.getStorageSync(this.STORAGE_KEY);
            if (!data) this.save(this.defaultData);
        } catch(e) { this.save(this.defaultData); }
    },
    load: function() {
        try {
            var data = wx.getStorageSync(this.STORAGE_KEY);
            return data || this.defaultData;
        } catch(e) { return this.defaultData; }
    },
    save: function(data) {
        try { wx.setStorageSync(this.STORAGE_KEY, data); } catch(e) {}
    },
    updateSetting: function(key, value) {
        var data = this.load();
        if (!data.settings) {
            data.settings = { music: false, sound: true, vibration: true };
        }
        data.settings[key] = value;
        this.save(data);
    },
    getSetting: function(key) {
        var data = this.load();
        return data && data.settings ? data.settings[key] : undefined;
    },
    setCurrentLevel: function(level) {
        var data = this.load();
        data.currentLevel = level;
        this.save(data);
    },
    getCurrentLevel: function() {
        return this.load().currentLevel || 0;
    },
    setUnlockedLevel: function(level) {
        var data = this.load();
        if (level > data.unlockedLevel) {
            data.unlockedLevel = level;
            this.save(data);
        }
    },
    getUnlockedLevel: function() {
        return this.load().unlockedLevel || 0;
    },
    setStreak: function(streak) {
        var data = this.load();
        data.streak = streak;
        if (streak > data.bestStreak) data.bestStreak = streak;
        this.save(data);
    },
    getStreak: function() {
        return this.load().streak || 0;
    },
    getLeaderboard: function() {
        try {
            var data = wx.getStorageSync(this.LEADERBOARD_KEY);
            return data || [];
        } catch(e) { return []; }
    },
    addToLeaderboard: function(name, timeMinutes) {
        var leaderboard = this.getLeaderboard();
        var now = new Date();
        var dateStr = (now.getMonth() + 1) + '/' + now.getDate() + ' ' + 
                      now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        leaderboard.push({ name: name, time: timeMinutes, date: dateStr });
        leaderboard.sort(function(a, b) { return a.time - b.time; });
        if (leaderboard.length > 10) leaderboard = leaderboard.slice(0, 10);
        
        try { wx.setStorageSync(this.LEADERBOARD_KEY, leaderboard); } catch(e) {}
        return leaderboard;
    },
    reset: function() { this.save(this.defaultData); }
};

var REGION_COLORS = {
    'A': 'rgb(255, 71, 71)',     // 红色
    'B': 'rgb(255, 140, 0)',    // 深橙色
    'C': 'rgb(255, 215, 0)',    // 金色
    'D': 'rgb(50, 205, 50)',    // 绿色
    'E': 'rgb(0, 191, 255)',    // 深天蓝
    'F': 'rgb(30, 144, 255)',   // 道奇蓝
    'G': 'rgb(138, 43, 226)',   // 蓝紫色
    'H': 'rgb(186, 85, 211)',   // 中紫色
    'I': 'rgb(255, 105, 180)',  // 热粉色
    'J': 'rgb(255, 69, 0)',     // 深红色
    'K': 'rgb(255, 165, 0)',    // 橙色
    'L': 'rgb(0, 206, 209)',    // 深青色
    'M': 'rgb(65, 105, 225)',   // 皇家蓝
    'N': 'rgb(219, 112, 147)',  // 印度红
    'O': 'rgb(147, 112, 219)',  // 淡紫色
    'P': 'rgb(100, 149, 237)',  // 矢车菊蓝
    'Q': 'rgb(220, 20, 60)',    // 胭脂红
    'R': 'rgb(255, 127, 80)',   // 珊瑚色
    'S': 'rgb(255, 248, 220)',  // 杏仁色（浅黄）
    'T': 'rgb(176, 224, 230)'   // 粉蓝色
};

// ==================== 音效系统 ====================
var AudioManager = {
    sounds: {},
    bgMusic: null,
    init: function() {
        var soundNames = ['correct', 'error', 'victory', 'fail', 'click'];
        for (var i = 0; i < soundNames.length; i++) {
            try {
                this.sounds[soundNames[i]] = wx.createInnerAudioContext();
                this.sounds[soundNames[i]].src = 'audio/' + soundNames[i] + '.mp3';
                this.sounds[soundNames[i]].obeyMuteSwitch = false;
            } catch(e) {}
        }
        
        // 初始化背景音乐
        try {
            this.bgMusic = wx.createInnerAudioContext();
            this.bgMusic.src = 'audio/bgm.mp3';
            this.bgMusic.loop = true;
            this.bgMusic.obeyMuteSwitch = false;
            this.bgMusic.volume = 0.5;
        } catch(e) {}
    },
    play: function(name) {
        if (!SaveSystem.getSetting('sound')) return;
        try {
            var sound = this.sounds[name];
            if (sound) { sound.stop(); sound.play(); }
        } catch(e) {}
    },
    playBgMusic: function() {
        if (!SaveSystem.getSetting('music')) return;
        try {
            if (this.bgMusic) {
                this.bgMusic.play();
            }
        } catch(e) {}
    },
    stopBgMusic: function() {
        try {
            if (this.bgMusic) {
                this.bgMusic.stop();
            }
        } catch(e) {}
    },
    pauseBgMusic: function() {
        try {
            if (this.bgMusic) {
                this.bgMusic.pause();
            }
        } catch(e) {}
    },
    vibrate: function() {
        if (SaveSystem.getSetting('vibration')) {
            wx.vibrateShort({ success: function() {} });
        }
    }
};

// ==================== 圆角矩形 ====================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ==================== 绘制心形 ====================
function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    var topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + topCurveHeight);
    // 左上半圆
    ctx.bezierCurveTo(
        x + size / 2, y,
        x, y,
        x, y + topCurveHeight
    );
    // 左下弧线
    ctx.bezierCurveTo(
        x, y + size * 0.55,
        x + size / 2, y + size * 0.8,
        x + size / 2, y + size
    );
    // 右下半圆
    ctx.bezierCurveTo(
        x + size / 2, y + size * 0.8,
        x + size, y + size * 0.55,
        x + size, y + topCurveHeight
    );
    // 右上弧线
    ctx.bezierCurveTo(
        x + size, y,
        x + size / 2, y,
        x + size / 2, y + topCurveHeight
    );
    ctx.fill();
    ctx.restore();
}

// ==================== 动画系统 ====================
var Animations = {
    list: [],
    add: function(anim) {
        anim.startTime = Date.now();
        this.list.push(anim);
    },
    update: function() {
        var now = Date.now();
        for (var i = this.list.length - 1; i >= 0; i--) {
            var anim = this.list[i];
            var progress = (now - anim.startTime) / anim.duration;
            if (progress >= 1) {
                if (anim.onComplete) anim.onComplete();
                this.list.splice(i, 1);
            }
        }
    },
    get: function(id) {
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i].id === id) return this.list[i];
        }
        return null;
    }
};

// ==================== 游戏主类 ====================
function GameManager() {
    this.canvas = null;
    this.ctx = null;
    this.scene = 'home';
    this.currentLevel = 0;
    this.cats = [];
    this.marks = [];
    this.foundCats = [];
    this.mistakesLeft = 2;
    this.streak = 0;
    this.gameStatus = 'playing';
    this.cellSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.touchStartTime = 0;
    this.touchStartCell = null;
    this.lastTapTime = 0;
    this.lastTapCell = null;
    this.particles = [];
    this.showSettings = false;
    this.hintsUsed = 0;
    this.hintCell = null;
    this.hintTimer = 0;
    this.showRules = false;
    this.gameStartTime = 0;
    this.showLeaderboard = false;
    this.finalTime = 0;
    this.currentLevelData = null;
}

GameManager.prototype.init = function() {
    this.canvas = wx.createCanvas();
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    
    var self = this;
    wx.onTouchStart(function(e) {
        var t = e.touches[0];
        var info = wx.getSystemInfoSync();
        self.handleTouch('start', {
            x: t.clientX * (GAME_WIDTH / info.windowWidth),
            y: t.clientY * (GAME_HEIGHT / info.windowHeight)
        });
    });
    
    wx.onTouchEnd(function(e) {
        var t = e.changedTouches[0];
        var info = wx.getSystemInfoSync();
        self.handleTouch('end', {
            x: t.clientX * (GAME_WIDTH / info.windowWidth),
            y: t.clientY * (GAME_HEIGHT / info.windowHeight)
        });
    });
    
    SaveSystem.init();
    AudioManager.init();
    
    this.currentLevel = SaveSystem.getCurrentLevel();
    this.streak = SaveSystem.getStreak();
    this.gameStartTime = Date.now();
    
    this.gameLoop();
};

GameManager.prototype.loadLevel = function(levelIndex) {
    this.currentLevel = levelIndex;
    this.cats = [];
    this.marks = [];
    this.foundCats = [];
    // 生命值：1-2关2个，第3关开始每关+1
    this.maxMistakes = levelIndex <= 1 ? 2 : levelIndex + 1;
    this.mistakesLeft = this.maxMistakes;
    this.gameStatus = 'playing';
    this.hintsUsed = 0;
    this.hintCell = null;
    this.finalTime = 0;
    
    this.currentLevelData = LevelGenerator.generateLevel(levelIndex);
    
    var GRID_SIZE = this.currentLevelData.size;
    
    // 使用预计算的猫位置（关卡生成器已经计算好）
    if (this.currentLevelData.cats && this.currentLevelData.cats.length === GRID_SIZE) {
        this.cats = this.currentLevelData.cats.slice();
        console.log('[关卡加载] 使用预计算猫位置:', this.cats);
    } else {
        // 如果没有预计算结果，生成新的猫位置
        this.generateCatPositions();
    }
    
    var boardWidth = 600;
    this.cellSize = boardWidth / GRID_SIZE;
    this.boardX = (GAME_WIDTH - boardWidth) / 2;
    this.boardY = 280;
    
    SaveSystem.setCurrentLevel(levelIndex);
};

GameManager.prototype.generateCatPositions = function() {
    var level = this.currentLevelData;
    var GRID_SIZE = level.size;
    var cats = [];
    
    // 创建所有位置的数组并随机打乱
    var positions = [];
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            positions.push([r, c]);
        }
    }
    
    // Fisher-Yates 洗牌算法打乱位置
    for (var i = positions.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = positions[i];
        positions[i] = positions[j];
        positions[j] = temp;
    }
    
    // 按随机顺序尝试放置猫
    var maxAttempts = GRID_SIZE * GRID_SIZE * 10;
    var attempts = 0;
    var posIndex = 0;
    
    while (cats.length < GRID_SIZE && attempts < maxAttempts && posIndex < positions.length) {
        attempts++;
        var row = positions[posIndex][0];
        var col = positions[posIndex][1];
        posIndex++;
        
        if (this.isValidCatPosition(row, col, cats, level)) {
            cats.push([row, col]);
        }
    }
    
    if (cats.length < GRID_SIZE) {
        cats = this.generateCatPositionsBacktrack(level, GRID_SIZE);
    }
    
    this.cats = cats;
};

GameManager.prototype.generateCatPositionsBacktrack = function(level, GRID_SIZE) {
    var startTime = Date.now();
    var TIMEOUT_MS = 100;
    var cats = [];
    var usedRows = new Set();
    var usedCols = new Set();
    var usedRegions = new Set();
    
    // 创建所有位置的列表并随机打乱
    var allPositions = [];
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            allPositions.push([r, c]);
        }
    }
    
    // Fisher-Yates 洗牌
    for (var idx = allPositions.length - 1; idx > 0; idx--) {
        var j = Math.floor(Math.random() * (idx + 1));
        var temp = allPositions[idx];
        allPositions[idx] = allPositions[j];
        allPositions[j] = temp;
    }
    
    var posIndex = 0;
    
    var solve = function(count) {
        if (Date.now() - startTime > TIMEOUT_MS) {
            return false;
        }
        
        if (count >= GRID_SIZE) return true;
        
        while (posIndex < allPositions.length) {
            if (Date.now() - startTime > TIMEOUT_MS) {
                return false;
            }
            
            var pos = allPositions[posIndex];
            posIndex++;
            var row = pos[0];
            var col = pos[1];
            
            var region = level.regions[row][col];
            if (!region) continue;
            
            if (usedRows.has(row) || usedCols.has(col) || usedRegions.has(region)) {
                continue;
            }
            
            var hasAdjacent = false;
            var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            for (var d = 0; d < 4; d++) {
                var nr = row + dirs[d][0];
                var nc = col + dirs[d][1];
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    for (var ci = 0; ci < cats.length; ci++) {
                        if (cats[ci][0] === nr && cats[ci][1] === nc) {
                            hasAdjacent = true;
                            break;
                        }
                    }
                }
                if (hasAdjacent) break;
            }
            
            if (hasAdjacent) continue;
            
            cats.push([row, col]);
            usedRows.add(row);
            usedCols.add(col);
            usedRegions.add(region);
            
            if (solve(count + 1)) return true;
            
            cats.pop();
            usedRows.delete(row);
            usedCols.delete(col);
            usedRegions.delete(region);
        }
        
        return false;
    };
    
    var success = solve(0);
    
    // 如果成功且有足够的猫，返回结果
    if (success && cats.length >= GRID_SIZE) {
        return cats;
    }
    
    // 尝试使用 fallback 生成
    var fallbackCats = this.fallbackGenerateCats(level, GRID_SIZE);
    if (fallbackCats && fallbackCats.length === GRID_SIZE) {
        return fallbackCats;
    }
    
    // 如果 fallback 也失败，返回随机生成的猫位置（保底）
    var resultCats = [];
    var usedR = new Set();
    var usedC = new Set();
    var usedReg = new Set();
    
    for (var i = 0; i < allPositions.length && resultCats.length < GRID_SIZE; i++) {
        var p = allPositions[i];
        var rr = p[0];
        var cc = p[1];
        var reg = level.regions[rr][cc];
        
        if (!usedR.has(rr) && !usedC.has(cc) && !usedReg.has(reg)) {
            resultCats.push([rr, cc]);
            usedR.add(rr);
            usedC.add(cc);
            usedReg.add(reg);
        }
    }
    
    return resultCats;
};

GameManager.prototype.fallbackGenerateCats = function(level, GRID_SIZE) {
    var maxAttempts = 1000;
    var attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        var cats = [];
        var valid = true;
        
        for (var row = 0; row < GRID_SIZE && valid; row++) {
            var found = false;
            
            for (var col = 0; col < GRID_SIZE && !found; col++) {
                if (this.isValidCatPosition(row, col, cats, level)) {
                    cats.push([row, col]);
                    found = true;
                }
            }
            
            if (!found) {
                valid = false;
            }
        }
        
        if (valid && cats.length === GRID_SIZE) {
            return cats;
        }
    }
    
    var fallbackCats = [];
    var positions = [];
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            positions.push([r, c]);
        }
    }
    
    for (var i = positions.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = positions[i];
        positions[i] = positions[j];
        positions[j] = temp;
    }
    
    var validCats = [];
    var usedRows = new Set();
    var usedCols = new Set();
    var usedRegions = new Set();
    
    for (var i = 0; i < positions.length && validCats.length < GRID_SIZE; i++) {
        var r = positions[i][0];
        var c = positions[i][1];
        var region = level.regions[r][c];
        
        if (!usedRows.has(r) && !usedCols.has(c) && !usedRegions.has(region)) {
            var hasAdjacent = false;
            var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            for (var d = 0; d < 4 && !hasAdjacent; d++) {
                var nr = r + dirs[d][0];
                var nc = c + dirs[d][1];
                for (var j = 0; j < validCats.length && !hasAdjacent; j++) {
                    if (validCats[j][0] === nr && validCats[j][1] === nc) {
                        hasAdjacent = true;
                    }
                }
            }
            
            if (!hasAdjacent) {
                validCats.push([r, c]);
                usedRows.add(r);
                usedCols.add(c);
                usedRegions.add(region);
            }
        }
    }
    
    return validCats.length === GRID_SIZE ? validCats : fallbackCats;
};

GameManager.prototype.isValidCatPosition = function(row, col, existingCats, level) {
    if (!level || !level.regions) return false;
    
    var GRID_SIZE = level.size;
    var region = level.regions[row] ? level.regions[row][col] : null;
    if (!region) return false;
    
    // 安全检查 existingCats
    if (!existingCats || !Array.isArray(existingCats)) {
        existingCats = [];
    }
    
    for (var i = 0; i < existingCats.length; i++) {
        if (!existingCats[i]) continue;
        if (existingCats[i][0] === row) return false;
    }
    for (var i = 0; i < existingCats.length; i++) {
        if (!existingCats[i]) continue;
        if (existingCats[i][1] === col) return false;
    }
    for (var i = 0; i < existingCats.length; i++) {
        if (!existingCats[i]) continue;
        var catRow = existingCats[i][0];
        var catCol = existingCats[i][1];
        if (level.regions[catRow] && level.regions[catRow][catCol] === region) return false;
    }
    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var d = 0; d < 4; d++) {
        var nr = row + dirs[d][0];
        var nc = col + dirs[d][1];
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (this.findInArray(existingCats, nr, nc) !== -1) return false;
        }
    }
    
    return true;
};

GameManager.prototype.findInArray = function(arr, row, col) {
    if (!arr || !Array.isArray(arr)) return -1;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i][0] === row && arr[i][1] === col) return i;
    }
    return -1;
};

GameManager.prototype.handleTouch = function(type, pos) {
    if (this._lastTouchTime && Date.now() - this._lastTouchTime < 50) return;
    this._lastTouchTime = Date.now();
    
    // 设置按钮（左上角圆形按钮）检测
    var settingsBtnX = 70;
    var settingsBtnY = 75;
    var settingsBtnR = 24;
    var distToSettings = Math.sqrt(Math.pow(pos.x - settingsBtnX, 2) + Math.pow(pos.y - settingsBtnY, 2));
    
    if (distToSettings <= settingsBtnR) {
        if (type === 'start' && (this.scene === 'game' || this.scene === 'home')) {
            this.showSettings = true;
        }
        return;
    }
    
    if (this.showSettings && pos.x >= 530 && pos.x <= 570 && pos.y >= 130 && pos.y <= 170) {
        if (type === 'start') this.showSettings = false;
        return;
    }
    
    if (this.showRules && pos.x >= 580 && pos.x <= 630 && pos.y >= 170 && pos.y <= 210) {
        if (type === 'start') this.showRules = false;
        return;
    }
    
    if (this.showLeaderboard) {
        if (type === 'start') this.handleLeaderboardTouch(pos);
        return;
    }
    
    if (this.gameStatus === 'win' && type === 'start') {
        this.handleWinModalTouch(pos);
        return;
    }
    
    if (this.showSettings) {
        if (type === 'start') this.handleSettingsTouch(pos);
        return;
    }
    
    if (this.scene === 'game') {
        var btnY = 920;
        var btnH = 64;
        var btnW = 160;
        var btnGap = 10;
        var totalWidth = btnW * 3 + btnGap * 2;
        var startX = (GAME_WIDTH - totalWidth) / 2;
        
        var clickedButton = false;
        for (var i = 0; i < 3; i++) {
            var x = startX + i * (btnW + btnGap);
            if (pos.x >= x && pos.x <= x + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
                clickedButton = true;
                break;
            }
        }
        
        if (pos.x >= 20 && pos.x <= 90 && pos.y >= 145 && pos.y <= 185) clickedButton = true;
        
        if ((this.gameStatus === 'win' || this.gameStatus === 'fail') && 
            pos.x >= 200 && pos.x <= 550 && pos.y >= 560 && pos.y <= 620) {
            clickedButton = true;
        }
        
        if (type === 'start') {
            if (clickedButton) {
                this.touchStartCell = null;
                this._pendingButtonClick = true;
            } else {
                var GRID_SIZE = this.currentLevelData.size;
                var col = Math.floor((pos.x - this.boardX) / this.cellSize);
                var row = Math.floor((this.boardY + GRID_SIZE * this.cellSize - pos.y) / this.cellSize);
                
                if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
                    this.touchStartCell = { row: row, col: col };
                    this.touchStartTime = Date.now();
                }
            }
        } else {
            if (clickedButton) {
                this.handleButtonTouch(pos);
                this._pendingButtonClick = false;
            } else if (this.touchStartCell) {
                var duration = Date.now() - this.touchStartTime;
                var row = this.touchStartCell.row;
                var col = this.touchStartCell.col;
                
                var now = Date.now();
                var isDoubleClick = this.lastTapCell && 
                    this.lastTapCell.row === row && 
                    this.lastTapCell.col === col && 
                    now - this.lastTapTime < 300;
                
                this.lastTapTime = now;
                this.lastTapCell = { row: row, col: col };
                
                if (this.gameStatus === 'playing') {
                    if (duration > 300) {
                        this.toggleMark(row, col);
                    } else if (isDoubleClick) {
                        this.handleCatDoubleClick(row, col);
                    } else {
                        this.handleCellClick(row, col);
                    }
                }
                
                this.touchStartCell = null;
            }
        }
        return;
    }
    
    if (this.scene === 'home' && type === 'start') {
        this.handleHomeTouch(pos);
    }
};

GameManager.prototype.handleCellClick = function(row, col) {
    AudioManager.play('click');
    
    var foundIdx = this.findInArray(this.foundCats, row, col);
    if (foundIdx !== -1) {
        this.foundCats.splice(foundIdx, 1);
        return;
    }
    
    var markIdx = this.findInArray(this.marks, row, col);
    if (markIdx !== -1) {
        this.marks.splice(markIdx, 1);
    } else {
        this.marks.push([row, col]);
        this.addAnimation('markPop', row, col, 200);
    }
};

GameManager.prototype.handleCatDoubleClick = function(row, col) {
    var foundIdx = this.findInArray(this.foundCats, row, col);
    if (foundIdx !== -1) {
        this.foundCats.splice(foundIdx, 1);
        return;
    }
    
    var markIdx = this.findInArray(this.marks, row, col);
    if (markIdx !== -1) {
        this.marks.splice(markIdx, 1);
    }
    
    var catIdx = this.findInArray(this.cats, row, col);
    if (catIdx !== -1) {
        this.foundCats.push([row, col]);
        AudioManager.play('correct');
        this.checkWin();
    } else {
        AudioManager.play('error');
        AudioManager.vibrate();
        this.addAnimation('shake', row, col, 300);
        this.mistakesLeft--;
        
        if (this.mistakesLeft <= 0) {
            this.gameStatus = 'fail';
            this.streak = 0;
            SaveSystem.setStreak(0);
            AudioManager.play('fail');
        }
    }
};

GameManager.prototype.toggleMark = function(row, col) {
    if (this.findInArray(this.foundCats, row, col) !== -1) return;
    
    var markIdx = this.findInArray(this.marks, row, col);
    if (markIdx !== -1) {
        this.marks.splice(markIdx, 1);
    } else {
        this.marks.push([row, col]);
        this.addAnimation('markPop', row, col, 200);
    }
    AudioManager.play('click');
};

GameManager.prototype.checkWin = function() {
    var GRID_SIZE = this.currentLevelData.size;
    if (this.foundCats.length === GRID_SIZE) {
        this.gameStatus = 'win';
        this.streak++;
        SaveSystem.setStreak(this.streak);
        SaveSystem.setUnlockedLevel(this.currentLevel + 1);
        this.spawnParticles();
        AudioManager.play('victory');
        
        if (this.currentLevel >= 4) {
            var now = Date.now();
            this.finalTime = (now - this.gameStartTime) / 60000;
            SaveSystem.addToLeaderboard('Player', this.finalTime);
        }
    }
};

GameManager.prototype.addAnimation = function(type, row, col, duration) {
    Animations.add({
        id: type + '_' + row + '_' + col,
        type: type,
        row: row,
        col: col,
        duration: duration
    });
};

GameManager.prototype.handleButtonTouch = function(pos) {
    var btnY = 920;
    var btnH = 64;
    var btnW = 160;
    var btnGap = 10;
    var totalWidth = btnW * 3 + btnGap * 2;
    var startX = (GAME_WIDTH - totalWidth) / 2;
    
    var buttons = ['clearMarks', 'coords', 'hint'];
    
    for (var i = 0; i < 3; i++) {
        var x = startX + i * (btnW + btnGap);
        if (pos.x >= x && pos.x <= x + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
            this.handleButtonClick(buttons[i]);
            return;
        }
    }
    
    if (pos.x >= 20 && pos.x <= 90 && pos.y >= 145 && pos.y <= 185) {
        this.scene = 'home';
        return;
    }
    
    if (this.gameStatus === 'fail' && pos.x >= 200 && pos.x <= 550 && pos.y >= 560 && pos.y <= 620) {
        this.loadLevel(this.currentLevel);
    }
};

GameManager.prototype.handleButtonClick = function(btn) {
    AudioManager.play('click');
    
    switch(btn) {
        case 'clearMarks':
            this.marks = [];
            break;
        case 'coords':
            this.showRules = !this.showRules;
            break;
        case 'hint':
            if (this.hintsUsed < 1) {
                this.showHint();
                this.hintsUsed = 1;
            }
            break;
    }
};

GameManager.prototype.showHint = function() {
    // 确保游戏数据已初始化
    if (!this.currentLevelData || !this.currentLevelData.size) {
        console.log('[提示] 错误: 游戏数据未初始化');
        return;
    }
    
    var GRID_SIZE = this.currentLevelData.size;
    var validPositions = [];
    
    // 确保 cats 数组有效
    if (!this.cats || this.cats.length === 0) {
        console.log('[提示] 错误: cats 数组为空');
        return;
    }
    
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var catIndex = this.findInArray(this.cats, r, c);
            var foundIndex = this.findInArray(this.foundCats, r, c);
            if (catIndex !== -1 && foundIndex === -1) {
                validPositions.push([r, c]);
            }
        }
    }
    
    if (validPositions.length > 0) {
        var pos = validPositions[Math.floor(Math.random() * validPositions.length)];
        this.hintCell = { row: pos[0], col: pos[1] };
        this.hintTimer = Date.now();
        console.log('[提示] 显示提示位置:', pos, '有效位置数:', validPositions.length);
        AudioManager.play('click');
    } else {
        console.log('[提示] 没有有效位置可提示, cats数量:', this.cats.length, 'foundCats数量:', this.foundCats ? this.foundCats.length : 0);
    }
};

GameManager.prototype.spawnParticles = function() {
    for (var i = 0; i < 40; i++) {
        this.particles.push({
            x: Math.random() * GAME_WIDTH,
            y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 8 + 4,
            color: Math.random() > 0.5 ? '#ffd700' : '#ffffff',
            alpha: 1
        });
    }
};

GameManager.prototype.updateParticles = function() {
    for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.01;
        if (p.y > GAME_HEIGHT || p.alpha <= 0) {
            this.particles.splice(i, 1);
        }
    }
};

GameManager.prototype.render = function() {
    var ctx = this.ctx;
    if (!ctx) return;
    
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    if (this.scene === 'home') {
        this.renderHome();
    } else if (this.scene === 'game') {
        this.renderGame();
    }
    
    if (this.showSettings) this.renderSettings();
    if (this.showRules) this.renderRules();
    if (this.showLeaderboard) this.renderLeaderboard();
    
    Animations.update();
    this.updateParticles();
};

GameManager.prototype.renderHome = function() {
    var ctx = this.ctx;
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 30, 30, GAME_WIDTH - 60, GAME_HEIGHT - 60, 40);
    ctx.fill();
    
    var gradient = ctx.createLinearGradient(30, 30, GAME_WIDTH - 30, 120);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    roundRect(ctx, 30, 30, GAME_WIDTH - 60, 90, 30);
    ctx.fill();
    
    // 标题居中显示（垂直居中于顶部栏 y=30-120，中心 y=75）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('猫咪归位', GAME_WIDTH / 2, 75);
    
    // 设置按钮（左上角圆形按钮，垂直居中）
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(70, 75, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙', 70, 75);
    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择关卡', GAME_WIDTH / 2, 180);
    
    var startY = 230;
    var cardW = 180;
    var cardH = 130;
    var gap = 15;
    var cols = 3;
    var startX = (GAME_WIDTH - (cardW * cols + gap * (cols - 1))) / 2;
    
    var unlockedLevel = SaveSystem.getUnlockedLevel();
    var levelSizes = [4, 5, 6, 7, 8];
    
    for (var i = 0; i < 5; i++) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var x = startX + col * (cardW + gap);
        var y = startY + row * (cardH + gap);
        
        var isUnlocked = i <= unlockedLevel;
        
        ctx.fillStyle = isUnlocked ? '#f0f8ff' : '#e8e8e8';
        roundRect(ctx, x, y, cardW, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = isUnlocked ? '#667eea' : '#cccccc';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = isUnlocked ? '#333333' : '#999999';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('第' + (i + 1) + '关', x + cardW / 2, y + 35);
        
        ctx.font = '22px sans-serif';
        ctx.fillText(levelSizes[i] + 'x' + levelSizes[i], x + cardW / 2, y + 65);
        
        if (isUnlocked) {
            ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
            ctx.font = '28px sans-serif';
            ctx.fillText('🔓', x + cardW / 2, y + 100);
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.font = '28px sans-serif';
            ctx.fillText('🔒', x + cardW / 2, y + 100);
        }
    }
};

GameManager.prototype.renderGame = function() {
    var ctx = this.ctx;
    // 安全检查：确保游戏数据已初始化
    if (!this.currentLevelData || !this.currentLevelData.size) {
        console.log('[渲染] 错误: 游戏数据未初始化');
        return;
    }
    
    var GRID_SIZE = this.currentLevelData.size;
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 30, 30, GAME_WIDTH - 60, GAME_HEIGHT - 60, 40);
    ctx.fill();
    
    var gradient = ctx.createLinearGradient(30, 30, GAME_WIDTH - 30, 120);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    roundRect(ctx, 30, 30, GAME_WIDTH - 60, 90, 30);
    ctx.fill();
    
    // 标题居中显示（垂直居中于顶部栏 y=30-120，中心 y=75）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('猫咪归位', GAME_WIDTH / 2, 75);
    
    // 设置按钮（左上角圆形按钮，垂直居中）
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(70, 75, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙', 70, 75);
    
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, 100, 150, 550, 60, 30);
    ctx.fill();
    
    ctx.fillStyle = '#667eea';
    roundRect(ctx, 110, 160, 100, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lv.' + (this.currentLevel + 1), 160, 185);
    
    var heartSize = 28;
    var heartY = 160;
    var heartCenterX = 375;
    // 根据 maxMistakes 动态绘制心形
    var maxHearts = this.maxMistakes || 2;
    var heartSpacing = 30;
    var totalWidth = (maxHearts - 1) * heartSpacing;
    var startHeartX = heartCenterX - totalWidth / 2;
    for (var h = 0; h < maxHearts; h++) {
        drawHeart(ctx, startHeartX + h * heartSpacing, heartY, heartSize, this.mistakesLeft >= (h + 1) ? '#ff4757' : '#cccccc');
    }
    
    ctx.fillStyle = '#666666';
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('连击:' + this.streak, 640, 185);
    
    var remainingCats = GRID_SIZE - (this.foundCats ? this.foundCats.length : 0);
    ctx.font = '24px sans-serif';
    ctx.fillText('🐱 剩余: ' + remainingCats, GAME_WIDTH / 2, 255);
    
    this.renderBoard();
    this.renderButtons();
    this.renderParticles();
    
    if (this.gameStatus === 'win') this.renderWinModal();
    else if (this.gameStatus === 'fail') this.renderFailModal();
};

GameManager.prototype.renderBoard = function() {
    var ctx = this.ctx;
    var level = this.currentLevelData;
    var GRID_SIZE = level.size;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.boardX - 10, this.boardY - 10, GRID_SIZE * this.cellSize + 20, GRID_SIZE * this.cellSize + 20);
    
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = this.boardX + c * this.cellSize;
            var y = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
            var size = this.cellSize - 6;
            
            var region = level.regions[r][c];
            var baseColor = REGION_COLORS[region] || 'rgb(200,200,200)';
            
            var anim = Animations.get('shake_' + r + '_' + c);
            if (anim) {
                var progress = (Date.now() - anim.startTime) / anim.duration;
                var offset = Math.sin(progress * Math.PI * 4) * 5 * (1 - progress);
                ctx.save();
                ctx.translate(offset, 0);
            }
            
            ctx.globalAlpha = 1;
            ctx.shadowColor = 'rgba(100, 100, 120, 0.35)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 5;
            
            ctx.fillStyle = baseColor;
            roundRect(ctx, x + 3, y + 3, size, size, 16);
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            var gradient = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + size / 2);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            roundRect(ctx, x + 3, y + 3, size, size, 16);
            ctx.fill();
            
            if (anim) ctx.restore();
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = this.boardX + c * this.cellSize;
            var y = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
            
            if (this.findInArray(this.foundCats, r, c) !== -1) {
                ctx.globalAlpha = 1;
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#333333';
                ctx.font = Math.floor(this.cellSize * 0.5) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🐱', x + this.cellSize / 2, y + this.cellSize / 2 + 2);
            }
            
            if (this.findInArray(this.marks, r, c) !== -1 && this.findInArray(this.foundCats, r, c) === -1) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(this.cellSize * 0.4) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('X', x + this.cellSize / 2, y + this.cellSize / 2 + 2);
            }
            
            if (this.hintCell && this.hintCell.row === r && this.hintCell.col === c && Date.now() - this.hintTimer < 2000) {
                var hintProgress = (Date.now() - this.hintTimer) / 2000;
                var hintAlpha = 0.5 + 0.5 * Math.sin((Date.now() - this.hintTimer) / 100);
                var hintX = this.boardX + c * this.cellSize;
                var hintY = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
                var hintSize = this.cellSize - 6;
                
                // 获取单元格原本的区域颜色
                var region = level.regions[r][c];
                var baseColor = REGION_COLORS[region] || 'rgb(200,200,200)';
                
                ctx.save();
                
                ctx.globalAlpha = hintAlpha;
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 4;
                ctx.shadowColor = baseColor;
                ctx.shadowBlur = 15;
                roundRect(ctx, hintX + 3, hintY + 3, hintSize, hintSize, 16);
                ctx.stroke();
                
                // 将 rgb(r,g,b) 转换为 rgba(r,g,b,a)
                var colorMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (colorMatch) {
                    ctx.fillStyle = 'rgba(' + colorMatch[1] + ',' + colorMatch[2] + ',' + colorMatch[3] + ',0.4)';
                } else {
                    ctx.fillStyle = 'rgba(200,100,100,0.4)';
                }
                roundRect(ctx, hintX + 3, hintY + 3, hintSize, hintSize, 16);
                ctx.fill();
                
                ctx.restore();
            }
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
};

GameManager.prototype.renderButtons = function() {
    var ctx = this.ctx;
    var btnY = 920;
    var btnH = 64;
    var btnW = 160;
    var btnGap = 10;
    var totalWidth = btnW * 3 + btnGap * 2;
    var startX = (GAME_WIDTH - totalWidth) / 2;
    
    var buttons = [
        { name: '清空', active: false },
        { name: '规则', active: false },
        { name: '提示', active: false, disabled: this.hintsUsed > 0 }
    ];
    
    for (var i = 0; i < 3; i++) {
        var btn = buttons[i];
        var x = startX + i * (btnW + btnGap);
        
        if (btn.disabled) {
            ctx.fillStyle = '#e0e0e0';
            roundRect(ctx, x, btnY, btnW, btnH, 32);
            ctx.fill();
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(btn.name, x + btnW / 2, btnY + btnH / 2 + 8);
            continue;
        }
        
        ctx.fillStyle = btn.active ? '#667eea' : '#f0f2f5';
        roundRect(ctx, x, btnY, btnW, btnH, 32);
        ctx.fill();
        
        ctx.fillStyle = btn.active ? '#ffffff' : '#333333';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(btn.name, x + btnW / 2, btnY + btnH / 2 + 8);
    }
};

GameManager.prototype.renderParticles = function() {
    var ctx = this.ctx;
    for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
};

GameManager.prototype.renderWinModal = function() {
    var ctx = this.ctx;
    var isLastLevel = this.currentLevel >= 4;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    if (isLastLevel) {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 100, 300, 550, 350, 30);
        ctx.fill();
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 胜利', GAME_WIDTH / 2, 360);
        
        ctx.font = '26px sans-serif';
        ctx.fillText('用时: ' + this.formatTime(this.finalTime), GAME_WIDTH / 2, 410);
        
        var modalCenterX = 100 + 275;
        var btnWidth = 200;
        var btnGap = 10;
        var totalBtnWidth = btnWidth * 2 + btnGap;
        var btnStartX = modalCenterX - totalBtnWidth / 2;
        
        ctx.fillStyle = '#667eea';
        roundRect(ctx, btnStartX, 450, btnWidth, 50, 25);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('重新开始', btnStartX + btnWidth / 2, 450 + 25);
        
        ctx.fillStyle = '#f0f2f5';
        roundRect(ctx, btnStartX + btnWidth + btnGap, 450, btnWidth, 50, 25);
        ctx.fill();
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('排行榜', btnStartX + btnWidth + btnGap + btnWidth / 2, 450 + 25);
    } else {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 150, 380, 450, 300, 30);
        ctx.fill();
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 胜利', GAME_WIDTH / 2, 460);
        
        ctx.font = '28px sans-serif';
        ctx.fillText('连击 +1', GAME_WIDTH / 2, 510);
        
        ctx.fillStyle = '#667eea';
        roundRect(ctx, 200, 560, 350, 60, 30);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('下一关', 200 + 175, 560 + 30);
    }
};

GameManager.prototype.formatTime = function(minutes) {
    if (minutes < 1) return Math.round(minutes * 60) + 's';
    return minutes.toFixed(1) + 'm';
};

GameManager.prototype.renderLeaderboard = function() {
    var ctx = this.ctx;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 75, 100, 600, 850, 30);
    ctx.fill();
    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 排行榜', GAME_WIDTH / 2, 155);
    
    ctx.fillStyle = '#999999';
    ctx.font = '28px sans-serif';
    ctx.fillText('x', 625, 155);
    
    ctx.fillStyle = '#f0f2f5';
    roundRect(ctx, 100, 180, 550, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('排名', 120, 215);
    ctx.fillText('姓名', 200, 215);
    ctx.fillText('时间', 380, 215);
    ctx.fillText('日期', 520, 215);
    
    var leaderboard = SaveSystem.getLeaderboard();
    
    if (leaderboard.length === 0) {
        ctx.fillStyle = '#999999';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无记录', GAME_WIDTH / 2, 500);
    } else {
        for (var i = 0; i < leaderboard.length; i++) {
            var entry = leaderboard[i];
            var y = 260 + i * 55;
            
            if (i % 2 === 0) {
                ctx.fillStyle = '#f8fafc';
                roundRect(ctx, 100, y, 550, 45, 8);
                ctx.fill();
            }
            
            ctx.fillStyle = i === 0 ? '#ffd700' : (i === 1 ? '#c0c0c0' : (i === 2 ? '#cd7f32' : '#666666'));
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText((i + 1) + '', 120, y + 30);
            
            ctx.fillStyle = '#333333';
            ctx.font = '22px sans-serif';
            ctx.fillText(entry.name.substring(0, 8), 200, y + 30);
            
            ctx.fillStyle = '#667eea';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(this.formatTime(entry.time), 380, y + 30);
            
            ctx.fillStyle = '#999999';
            ctx.font = '20px sans-serif';
            ctx.fillText(entry.date, 520, y + 30);
        }
    }
    
    ctx.fillStyle = '#f0f2f5';
    roundRect(ctx, 100, 800, 550, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', 100 + 275, 800 + 25);
};

GameManager.prototype.handleWinModalTouch = function(pos) {
    var isLastLevel = this.currentLevel >= 4;
    
    if (isLastLevel) {
        var modalCenterX = 100 + 275;
        var btnWidth = 200;
        var btnGap = 10;
        var totalBtnWidth = btnWidth * 2 + btnGap;
        var btnStartX = modalCenterX - totalBtnWidth / 2;
        
        if (pos.x >= btnStartX && pos.x <= btnStartX + btnWidth && pos.y >= 450 && pos.y <= 500) {
            this.loadLevel(0);
            this.gameStatus = 'playing';
            return;
        }
        
        if (pos.x >= btnStartX + btnWidth + btnGap && pos.x <= btnStartX + btnWidth + btnGap + btnWidth && pos.y >= 450 && pos.y <= 500) {
            this.showLeaderboard = true;
            return;
        }
    } else {
        if (pos.x >= 200 && pos.x <= 550 && pos.y >= 560 && pos.y <= 620) {
            var nextLevel = this.currentLevel + 1;
            if (nextLevel < 5) {
                this.loadLevel(nextLevel);
            }
        }
    }
};

GameManager.prototype.handleLeaderboardTouch = function(pos) {
    if (pos.x >= 625 && pos.x <= 675 && pos.y >= 130 && pos.y <= 180) {
        this.showLeaderboard = false;
        return;
    }
    
    if (pos.x >= 100 && pos.x <= 650 && pos.y >= 800 && pos.y <= 850) {
        this.showLeaderboard = false;
    }
};

GameManager.prototype.renderFailModal = function() {
    var ctx = this.ctx;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 150, 380, 450, 300, 30);
    ctx.fill();
    
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('失败', GAME_WIDTH / 2, 460);
    
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('没有机会了', GAME_WIDTH / 2, 510);
    
    ctx.fillStyle = '#667eea';
    roundRect(ctx, 200, 560, 350, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('重试', 200 + 175, 560 + 30);
};

GameManager.prototype.renderSettings = function() {
    var ctx = this.ctx;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 125, 100, 500, 700, 24);
    ctx.fill();
    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('设置', 160, 150);
    
    ctx.fillStyle = '#999999';
    ctx.font = '28px sans-serif';
    ctx.fillText('x', 550, 150);
    
    ctx.font = '24px sans-serif';
    ctx.fillText('版本: 1.0.0', 160, 210);
    ctx.fillText('猫咪归位', 160, 250);
    
    var settingsY = 320;
    var settings = [
        { name: '音乐', key: 'music', value: SaveSystem.getSetting('music') },
        { name: '音效', key: 'sound', value: SaveSystem.getSetting('sound') },
        { name: '震动', key: 'vibration', value: SaveSystem.getSetting('vibration') }
    ];
    
    for (var i = 0; i < settings.length; i++) {
        var s = settings[i];
        ctx.fillStyle = '#666666';
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(s.name, 160, settingsY + i * 60);
        
        ctx.fillStyle = s.value ? '#667eea' : '#cccccc';
        roundRect(ctx, 450, settingsY + i * 60 - 20, 80, 40, 20);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.value ? 'ON' : 'OFF', 490, settingsY + i * 60 + 5);
    }
    
    var btnY = 550;
    var buttons = ['退出', '重玩'];
    
    for (var i = 0; i < 2; i++) {
        ctx.fillStyle = i === 1 ? '#667eea' : '#f0f2f5';
        roundRect(ctx, 160, btnY + i * 70, 430, 55, 28);
        ctx.fill();
        
        ctx.fillStyle = i === 1 ? '#ffffff' : '#333333';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(buttons[i], GAME_WIDTH / 2, btnY + i * 70 + 33);
    }
};

GameManager.prototype.handleSettingsTouch = function(pos) {
    var settingsY = 320;
    var settings = ['music', 'sound', 'vibration'];
    
    for (var i = 0; i < 3; i++) {
        if (pos.x >= 450 && pos.x <= 530 && pos.y >= settingsY + i * 60 - 20 && pos.y <= settingsY + i * 60 + 20) {
            var key = settings[i];
            var newValue = !SaveSystem.getSetting(key);
            SaveSystem.updateSetting(key, newValue);
            AudioManager.play('click');
            
            // 处理音乐开关
            if (key === 'music') {
                if (newValue) {
                    AudioManager.playBgMusic();
                } else {
                    AudioManager.pauseBgMusic();
                }
            }
            return;
        }
    }
    
    var btnY = 550;
    var buttons = ['exit', 'restart'];
    
    for (var i = 0; i < 2; i++) {
        if (pos.x >= 160 && pos.x <= 590 && pos.y >= btnY + i * 70 && pos.y <= btnY + i * 70 + 55) {
            AudioManager.play('click');
            
            switch(buttons[i]) {
                case 'exit':
                    this.showSettings = false;
                    this.scene = 'home';
                    break;
                case 'restart':
                    this.showSettings = false;
                    this.loadLevel(this.currentLevel);
                    break;
            }
        }
    }
};

GameManager.prototype.renderRules = function() {
    var ctx = this.ctx;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 100, 150, 550, 750, 24);
    ctx.fill();
    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏规则', GAME_WIDTH / 2, 200);
    
    ctx.fillStyle = '#999999';
    ctx.font = '26px sans-serif';
    ctx.fillText('x', 600, 200);
    
    var rules = [
        '目标: 找到所有猫的位置',
        '',
        '规则1: 每行只能有1只猫',
        '规则2: 每列只能有1只猫',
        '规则3: 每个颜色只能有1只猫',
        '规则4: 猫不能相邻',
        '',
        '操作:',
        '- 点击: 标记/取消标记格子',
        '- 双击: 确认猫的位置',
        '- 长按: 切换标记',
        '',
        '生命: 随关卡增加',
        '  1-2关: 2次',
        '  第3关: 3次',
        '  第4关: 4次',
        '  第5关: 5次',
        '',
        '提示: 每关1次提示'
    ];
    
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    for (var i = 0; i < rules.length; i++) {
        ctx.fillStyle = '#333333';
        ctx.fillText(rules[i], 130, 260 + i * 35);
    }
};

GameManager.prototype.handleHomeTouch = function(pos) {
    var startY = 230;
    var cardW = 180;
    var cardH = 130;
    var gap = 15;
    var cols = 3;
    var startX = (GAME_WIDTH - (cardW * cols + gap * (cols - 1))) / 2;
    
    var unlockedLevel = SaveSystem.getUnlockedLevel();
    
    for (var i = 0; i < 5; i++) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var x = startX + col * (cardW + gap);
        var y = startY + row * (cardH + gap);
        
        if (pos.x >= x && pos.x <= x + cardW && pos.y >= y && pos.y <= y + cardH) {
            if (i <= unlockedLevel) {
                // 已解锁，可以进入
                this.scene = 'game';
                this.loadLevel(i);
            } else {
                // 未解锁，显示提示
                wx.showToast({ title: '请先解锁关卡', icon: 'none', duration: 1500 });
            }
            return;
        }
    }
};

GameManager.prototype.gameLoop = function() {
    var self = this;
    this.render();
    
    var frameDelay = 1000 / 60;
    setTimeout(function() { 
        self.gameLoop();
    }, frameDelay);
};

var GameMain = {
    init: function(config) {
        SaveSystem.init();
        var gm = new GameManager();
        gm.init();
    }
};

module.exports = { GameMain: GameMain, GameManager: GameManager };

// 直接初始化游戏
GameMain.init({ width: 750, height: 1334 });
