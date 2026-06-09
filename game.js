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
    'A': '#FFD54F',  // 黄色渐变
    'B': '#8BC34A',  // 绿色渐变
    'C': '#FFB74D',  // 橙色渐变
    'D': '#FF8A80',  // 红色渐变
    'E': '#81D4FA',  // 蓝色渐变
    'F': '#CE93D8',  // 紫色渐变
    'G': '#80CBC4',  // 青色渐变
    'H': '#FFAB91',  // 珊瑚渐变
    'I': '#B39DDB',  // 紫罗兰渐变
    'J': '#90CAF9',  // 浅蓝渐变
    'K': '#FF8A65',  // 深橙渐变
    'L': '#4DB6AC',  // 深青渐变
    'M': '#9575CD',  // 中紫渐变
    'N': '#FF7043',  // 橙红渐变
    'O': '#66BB6A',  // 草绿渐变
    'P': '#42A5F5',  // 天蓝渐变
    'Q': '#EC407A',  // 粉红渐变
    'R': '#AB47BC',  // 深紫渐变
    'S': '#26A69A',  // 碧绿渐变
    'T': '#5C6BC0'   // 靛蓝渐变
};

// 渐变配置
var REGION_GRADIENTS = {
    'A': ['#FFE082', '#FFD54F'],
    'B': ['#AED581', '#8BC34A'],
    'C': ['#FFB74D', '#FFA726'],
    'D': ['#FF8A80', '#FF5252'],
    'E': ['#81D4FA', '#4FC3F7'],
    'F': ['#CE93D8', '#BA68C8'],
    'G': ['#80CBC4', '#4DB6AC'],
    'H': ['#FFAB91', '#FF8A65'],
    'I': ['#B39DDB', '#9575CD'],
    'J': ['#90CAF9', '#64B5F6'],
    'K': ['#FF8A65', '#FF7043'],
    'L': ['#4DB6AC', '#26A69A'],
    'M': ['#9575CD', '#7E57C2'],
    'N': ['#FF7043', '#F4511E'],
    'O': ['#66BB6A', '#4CAF50'],
    'P': ['#42A5F5', '#2196F3'],
    'Q': ['#EC407A', '#E91E63'],
    'R': ['#AB47BC', '#9C27B0'],
    'S': ['#26A69A', '#00897B'],
    'T': ['#5C6BC0', '#3F51B5']
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
    this.colorblindMode = false;
    this.showCoords = false;
    
    // ========== 新增交互动效变量 ==========
    // 按钮按压动画
    this.pressedBtn = -1; // 被按压的按钮索引 (-1表示无)
    this.btnAnimProgress = 0; // 按钮动画进度 (0-1)
    
    // 屏幕闪烁（错误反馈）
    this.screenFlash = false;
    this.screenFlashStart = 0;
    this.screenFlashDuration = 80;
    
    // 猫找到时的金色粒子
    this.catParticles = [];
    
    // 连胜火焰粒子
    this.streakParticles = [];
    this.lastStreakParticleTime = 0;
    
    // 页面切换淡入淡出
    this.sceneTransition = false;
    this.sceneTransitionAlpha = 0;
    this.sceneTransitionTarget = null;
    this.sceneTransitionCallback = null;
    
    // 心跳动画
    this.heartbeatPhase = 0;
    
    // 弹窗背景蒙层透明度
    this.modalBgAlpha = 0;
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

// ========== 触摸事件处理（与新布局对齐） ==========
GameManager.prototype.handleTouch = function(type, pos) {
    if (this._lastTouchTime && Date.now() - this._lastTouchTime < 50) return;
    this._lastTouchTime = Date.now();
    
    var marginX = 30;
    var safeTopY = 60;
    var navY = safeTopY;
    var navH = 110;
    
    // ========== 顶部导航栏按钮检测 ==========
    // 左上角圆形按钮
    var backBtnX = marginX + 35;
    var backBtnY = navY + navH / 2;
    var backBtnR = 28;
    var distToBack = Math.sqrt(Math.pow(pos.x - backBtnX, 2) + Math.pow(pos.y - backBtnY, 2));
    
    if (distToBack <= backBtnR) {
        if (type === 'start') {
            // 左上角：打开设置
            this.settingsSource = this.scene;
            this.showSettings = true;
        }
        return;
    }
    
    // 右上角圆形按钮
    var settingsBtnX = GAME_WIDTH - marginX - 35;
    var distToSettings = Math.sqrt(Math.pow(pos.x - settingsBtnX, 2) + Math.pow(pos.y - backBtnY, 2));
    
    if (distToSettings <= backBtnR) {
        if (type === 'start' && this.scene === 'game') {
            // 右上角：返回首页
            this.scene = 'home';
        }
        return;
    }
    
    // ========== 设置面板 ==========
    if (this.showSettings) {
        if (type === 'start') this.handleSettingsTouch(pos);
        return;
    }
    
    // ========== 排行榜 ==========
    if (this.showLeaderboard) {
        if (type === 'start') this.handleLeaderboardTouch(pos);
        return;
    }
    
    // ========== 规则面板 ==========
    if (this.showRules) {
        if (type === 'start') this.handleRulesTouch(pos);
        return;
    }
    
    // ========== 弹窗 ==========
    if (this.gameStatus === 'win' && type === 'start') {
        this.handleWinModalTouch(pos);
        return;
    }
    
    if (this.gameStatus === 'fail' && type === 'start') {
        this.handleFailModalTouch(pos);
        return;
    }
    
    // ========== 游戏场景 ==========
    if (this.scene === 'game' && this.gameStatus === 'playing') {
        // 底部按钮检测（四个按钮）
        var btnH = 56;
        var btnW = (GAME_WIDTH - 30 * 2 - 36) / 4;
        var btnGap = 12;
        var startX = 30;
        var btnY = this._btnAreaY || 900;
        
        // 检测按压状态
        if (type === 'start' || type === 'move') {
            for (var bi = 0; bi < 4; bi++) {
                var bx = startX + bi * (btnW + btnGap);
                if (pos.x >= bx && pos.x <= bx + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
                    this._pressedButton = bi;
                    break;
                } else {
                    this._pressedButton = null;
                }
            }
        }
        if (type === 'end') {
            var pressedBtn = this._pressedButton;
            this._pressedButton = null;
            
            if (pressedBtn !== null && pressedBtn !== undefined) {
                var bx = startX + pressedBtn * (btnW + btnGap);
                if (pos.x >= bx && pos.x <= bx + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
                    this.handleButtonClick(['clearMarks', 'colorblind', 'coords', 'hint'][pressedBtn]);
                    return;
                }
            }
        }
        
        // 棋盘触摸检测
        if (type === 'start') {
            var GRID_SIZE = this.currentLevelData ? this.currentLevelData.size : 4;
            var boardX = this._boardX || 90;
            var boardY = this._boardY || 400;
            var cellSize = this._cellSize || 80;
            
            var col = Math.floor((pos.x - boardX) / cellSize);
            var row = Math.floor((pos.y - boardY) / cellSize);
            
            if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
                this.touchStartCell = { row: row, col: col };
                this.touchStartTime = Date.now();
            }
        } else if (type === 'end' && this.touchStartCell) {
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
        return;
    }
    
    // ========== 首页场景 ==========
    if (this.scene === 'home' && type === 'start') {
        this.handleHomeTouch(pos);
    }
};

// ========== 规则面板触摸处理 ==========
GameManager.prototype.handleRulesTouch = function(pos) {
    // 点击右上角关闭
    if (pos.x >= 580 && pos.x <= 630 && pos.y >= 155 && pos.y <= 195) {
        this.showRules = false;
        return;
    }
    
    // 点击背景关闭
    if (pos.x < 100 || pos.x > 650 || pos.y < 150 || pos.y > 900) {
        this.showRules = false;
    }
};

// ========== 失败弹窗触摸处理 ==========
GameManager.prototype.handleFailModalTouch = function(pos) {
    var modalW = 420;
    var modalH = 340;
    var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
    var btnWidth = 200;
    var btnH = 56;
    var btnX = (GAME_WIDTH - btnWidth) / 2;
    var btnRetryY = modalY + 220;
    
    if (pos.x >= btnX && pos.x <= btnX + btnWidth && pos.y >= btnRetryY && pos.y <= btnRetryY + btnH) {
        this.loadLevel(this.currentLevel);
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
        
        // ========== 找到猫：金色粒子爆炸 ==========
        this.spawnCatParticles(row, col);
        
        this.checkWin();
    } else {
        AudioManager.play('error');
        AudioManager.vibrate();
        this.addAnimation('shake', row, col, 300);
        this.mistakesLeft--;
        
        // ========== 错误点击：屏幕闪烁红色 ==========
        this.screenFlash = true;
        this.screenFlashStart = Date.now();
        
        if (this.mistakesLeft <= 0) {
            this.gameStatus = 'fail';
            this.streak = 0;
            SaveSystem.setStreak(0);
            AudioManager.play('fail');
        }
    }
};

// ========== 金色粒子爆炸效果 ==========
GameManager.prototype.spawnCatParticles = function(row, col) {
    var GRID_SIZE = this.currentLevelData.size;
    var x = this.boardX + col * this.cellSize + this.cellSize / 2;
    var y = this.boardY + (GRID_SIZE - 1 - row) * this.cellSize + this.cellSize / 2;
    
    for (var i = 0; i < 20; i++) {
        var angle = (Math.PI * 2 / 20) * i + Math.random() * 0.5;
        var speed = 2 + Math.random() * 3;
        this.catParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5,
            color: Math.random() > 0.3 ? '#FFD700' : '#FFF8DC', // 金色或浅金色
            alpha: 1,
            life: 1
        });
    }
};

// ========== 更新猫找到时的金色粒子 ==========
GameManager.prototype.updateCatParticles = function() {
    for (var i = this.catParticles.length - 1; i >= 0; i--) {
        var p = this.catParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 重力
        p.alpha -= 0.03;
        p.life -= 0.03;
        p.size *= 0.97;
        
        if (p.alpha <= 0 || p.life <= 0) {
            this.catParticles.splice(i, 1);
        }
    }
};

// ========== 渲染猫找到时的金色粒子 ==========
GameManager.prototype.renderCatParticles = function(ctx) {
    for (var i = 0; i < this.catParticles.length; i++) {
        var p = this.catParticles[i];
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        // 绘制金色粒子（带发光效果）
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
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
    // 底部按钮区域 - 四个按钮
    var btnY = 870;
    var btnH = 54;
    var btnW = 155;
    var btnGap = 12;
    var totalWidth = btnW * 4 + btnGap * 3;
    var startX = (GAME_WIDTH - totalWidth) / 2;
    
    var buttons = ['clearMarks', 'colorblind', 'coords', 'hint'];
    
    for (var i = 0; i < 4; i++) {
        var x = startX + i * (btnW + btnGap);
        if (pos.x >= x && pos.x <= x + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
            this.handleButtonClick(buttons[i]);
            return;
        }
    }
    
    // 返回按钮
    if (pos.x >= 20 && pos.x <= 90 && pos.y >= 145 && pos.y <= 185) {
        this.scene = 'home';
        return;
    }
    
    // 失败弹窗重试按钮
    if (this.gameStatus === 'fail') {
        var modalW = 420;
        var modalH = 340;
        var modalX = (GAME_WIDTH - modalW) / 2;
        var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
        var btnWidth = 200;
        var btnH = 56;
        var btnX = (GAME_WIDTH - btnWidth) / 2;
        var btnRetryY = modalY + 220;
        
        if (pos.x >= btnX && pos.x <= btnX + btnWidth && pos.y >= btnRetryY && pos.y <= btnRetryY + btnH) {
            this.loadLevel(this.currentLevel);
            return;
        }
    }
};

GameManager.prototype.handleButtonClick = function(btn) {
    AudioManager.play('click');
    
    switch(btn) {
        case 'clearMarks':
            this.marks = [];
            break;
        case 'colorblind':
            this.colorblindMode = !this.colorblindMode;
            break;
        case 'coords':
            this.showCoords = !this.showCoords;
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
    
    // ========== 更新所有特效 ==========
    this.updateCatParticles();
    this.updateScreenFlash();
    this.updateSceneTransition();
    
    // 浅色渐变背景 (#F0F2F5 → #E8ECF1)
    var bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#F0F2F5');
    bgGradient.addColorStop(1, '#E8ECF1');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    if (this.scene === 'home') {
        this.renderHome();
    } else if (this.scene === 'game') {
        this.renderGame();
    }
    
    if (this.showSettings) this.renderSettings();
    if (this.showRules) this.renderRules();
    if (this.showLeaderboard) this.renderLeaderboard();
    
    // ========== 渲染金色粒子 ==========
    if (this.catParticles.length > 0) {
        this.renderCatParticles(ctx);
    }
    
    // ========== 屏幕闪烁效果 ==========
    if (this.screenFlash) {
        this.renderScreenFlash(ctx);
    }
    
    // ========== 页面切换淡入淡出 ==========
    if (this.sceneTransition && this.sceneTransitionAlpha > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + this.sceneTransitionAlpha + ')';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    Animations.update();
    this.updateParticles();
    
    // 更新弹窗动画进度
    if (this.gameStatus === 'win' || this.gameStatus === 'fail') {
        if (!this.modalStartTime) {
            this.modalStartTime = Date.now();
        }
        this.modalAnimProgress = Math.min(1, (Date.now() - this.modalStartTime) / 400);
        // 弹性缓动函数 (elastic ease out)
        var t = this.modalAnimProgress;
        this.modalScale = 1 - Math.pow(2, -10 * t) * Math.cos(t * Math.PI * 2.5) * (1 - t);
        if (this.modalAnimProgress >= 1) {
            this.modalScale = 1;
        }
    } else {
        this.modalStartTime = null;
        this.modalAnimProgress = 0;
        this.modalScale = 0.7;
    }
};

// ========== 更新屏幕闪烁 ==========
GameManager.prototype.updateScreenFlash = function() {
    if (this.screenFlash) {
        var elapsed = Date.now() - this.screenFlashStart;
        if (elapsed >= this.screenFlashDuration) {
            this.screenFlash = false;
        }
    }
};

// ========== 渲染屏幕闪烁 ==========
GameManager.prototype.renderScreenFlash = function(ctx) {
    var elapsed = Date.now() - this.screenFlashStart;
    var progress = elapsed / this.screenFlashDuration;
    var alpha = 0.4 * (1 - progress); // 从0.4淡出到0
    
    ctx.fillStyle = 'rgba(255, 0, 0, ' + alpha + ')';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
};

// ========== 页面切换淡入淡出 ==========
GameManager.prototype.transitionToScene = function(targetScene, callback) {
    this.sceneTransition = true;
    this.sceneTransitionTarget = targetScene;
    this.sceneTransitionCallback = callback;
    this.sceneTransitionPhase = 'fadeOut'; // 先淡出
    this.sceneTransitionStart = Date.now();
    this.sceneTransitionDuration = 200; // 200ms
};

// ========== 更新页面切换 ==========
GameManager.prototype.updateSceneTransition = function() {
    if (!this.sceneTransition) return;
    
    var elapsed = Date.now() - this.sceneTransitionStart;
    var progress = Math.min(1, elapsed / this.sceneTransitionDuration);
    
    if (this.sceneTransitionPhase === 'fadeOut') {
        // 淡出阶段：0 -> 1
        this.sceneTransitionAlpha = progress;
        if (progress >= 1) {
            // 切换场景
            this.scene = this.sceneTransitionTarget;
            if (this.scene === 'game') {
                this.loadLevel(this.currentLevel);
            }
            // 开始淡入
            this.sceneTransitionPhase = 'fadeIn';
            this.sceneTransitionStart = Date.now();
            this.sceneTransitionAlpha = 1;
        }
    } else if (this.sceneTransitionPhase === 'fadeIn') {
        // 淡入阶段：1 -> 0
        this.sceneTransitionAlpha = 1 - progress;
        if (progress >= 1) {
            // 完成切换
            this.sceneTransition = false;
            this.sceneTransitionAlpha = 0;
            if (this.sceneTransitionCallback) {
                this.sceneTransitionCallback();
            }
        }
    }
};

// ========== 首页商业化改造 ==========
// ========== 首页渲染 ==========
GameManager.prototype.renderHome = function() {
    var ctx = this.ctx;
    
    // 全屏渐变背景
    var bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(0.5, '#16213e');
    bgGradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 动态粒子
    this.renderHomeParticles(ctx);
    
    var topY = 80;
    
    // Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱', GAME_WIDTH / 2 - 80, topY);
    ctx.fillText('找猫大师', GAME_WIDTH / 2 + 50, topY);
    
    // 统计卡片
    var statsY = topY + 100;
    var cardW = (GAME_WIDTH - 100) / 3;
    var stats = [
        { icon: '⭐', label: '已通关', value: SaveSystem.getUnlockedLevel() + 1 },
        { icon: '🔥', label: '连胜', value: this.streak },
        { icon: '🏆', label: '最佳', value: '-' }
    ];
    
    for (var i = 0; i < 3; i++) {
        var cx = 50 + i * (cardW + 25);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(ctx, cx, statsY, cardW, 100, 20);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '28px sans-serif';
        ctx.fillText(stats[i].icon, cx + cardW / 2, statsY + 30);
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(stats[i].value, cx + cardW / 2, statsY + 65);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(stats[i].label, cx + cardW / 2, statsY + 88);
    }
    
    // 关卡选择
    var levelY = statsY + 130;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('选择关卡', 50, levelY);
    
    var unlockedLevel = SaveSystem.getUnlockedLevel();
    var levelSizes = [4, 5, 6, 7, 8];
    var levelColors = ['#7F5AF0', '#2CB67D', '#FF4D4D', '#FF9500', '#00D4AA'];
    
    var levelCardW = 160;
    var levelCardH = 140;
    var levelGap = 20;
    var levelCols = 2;
    var levelStartX = (GAME_WIDTH - (levelCardW * levelCols + levelGap)) / 2;
    
    for (var i = 0; i < 5; i++) {
        var col = i % levelCols;
        var row = Math.floor(i / levelCols);
        var x = levelStartX + col * (levelCardW + levelGap);
        var y = levelY + 40 + row * (levelCardH + levelGap);
        var isUnlocked = i <= unlockedLevel;
        
        var grad = ctx.createLinearGradient(x, y, x, y + levelCardH);
        grad.addColorStop(0, levelColors[i]);
        grad.addColorStop(1, this.darkenColor(levelColors[i]));
        
        ctx.shadowColor = levelColors[i];
        ctx.shadowBlur = 15;
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, levelCardW, levelCardH, 20);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        roundRect(ctx, x + 4, y + 4, levelCardW - 8, levelCardH / 2 - 4, 16);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('第' + (i + 1) + '关', x + levelCardW / 2, y + 45);
        ctx.font = '16px sans-serif';
        ctx.fillText(levelSizes[i] + '×' + levelSizes[i], x + levelCardW / 2, y + 75);
        ctx.font = '24px sans-serif';
        ctx.fillText(isUnlocked ? '▶' : '🔒', x + levelCardW / 2, y + 110);
    }
    
    // 左上角设置按钮
    var settingsBtnX = 60;
    var settingsBtnY = topY + 40;
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(settingsBtnX, settingsBtnY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚙️', settingsBtnX, settingsBtnY);
    
    // 右下角排行榜按钮
    var leaderboardBtnX = GAME_WIDTH - 60;
    var leaderboardBtnY = GAME_HEIGHT - 120;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(leaderboardBtnX, leaderboardBtnY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = '22px sans-serif';
    ctx.fillText('🏆', leaderboardBtnX, leaderboardBtnY);
};

GameManager.prototype.renderHomeParticles = function(ctx) {
    var time = Date.now() / 1000;
    for (var i = 0; i < 12; i++) {
        var x = (Math.sin(time * 0.4 + i * 1.3) * 0.5 + 0.5) * GAME_WIDTH;
        var y = (Math.cos(time * 0.3 + i * 1.7) * 0.5 + 0.5) * GAME_HEIGHT;
        var size = 2 + Math.sin(time + i) * 1.5;
        var alpha = 0.2 + Math.sin(time * 2 + i) * 0.15;
        ctx.fillStyle = 'rgba(127, 90, 240, ' + alpha + ')';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
};

// ========== 现代化游戏界面渲染 ==========

// 绘制带双层阴影的主卡片
function drawDoubleShadowCard(ctx, x, y, w, h, r) {
    ctx.shadowColor = 'rgba(102, 126, 234, 0.12)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// 绘制3D心形（带高光和阴影）
function draw3DHeart(ctx, x, y, size, isActive) {
    ctx.save();
    var mainColor = isActive ? '#FF6B8A' : '#E0E0E0';
    var shadowColor = isActive ? '#D64555' : '#CCCCCC';
    var scale = isActive ? (1 + Math.sin(Date.now() / 200) * 0.08) : 1;
    ctx.translate(x + size / 2, y + size / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + size / 2), -(y + size / 2));
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    var topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + size / 2, y + 2, x + 2, y + 2, x + 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + 2, y + size * 0.55 + 2, x + size / 2, y + size * 0.8 + 2, x + size / 2, y + size + 2);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.8 + 2, x + size - 2, y + size * 0.55 + 2, x + size - 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + size - 2, y + 2, x + size / 2, y + 2, x + size / 2, y + topCurveHeight + 2);
    ctx.fill();
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + size * 0.55, x + size / 2, y + size * 0.8, x + size / 2, y + size);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.8, x + size, y + size * 0.55, x + size, y + topCurveHeight);
    ctx.bezierCurveTo(x + size, y, x + size / 2, y, x + size / 2, y + topCurveHeight);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.35, y + size * 0.35, size * 0.15, size * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// 主渲染方法 - 商业化布局
GameManager.prototype.renderGame = function() {
    var ctx = this.ctx;
    if (!this.currentLevelData || !this.currentLevelData.size) {
        console.log('[渲染] 错误: 游戏数据未初始化');
        return;
    }
    
    var GRID_SIZE = this.currentLevelData.size;
    var marginX = 30;
    var safeTopY = 60;
    
    // ========== 1. 顶部导航栏 ==========
    var navY = safeTopY;
    var navH = 110;
    
    // 导航栏渐变背景
    var navGradient = ctx.createLinearGradient(marginX, navY, GAME_WIDTH - marginX, navY);
    navGradient.addColorStop(0, '#7F5AF0');
    navGradient.addColorStop(1, '#6C5CE7');
    ctx.fillStyle = navGradient;
    roundRect(ctx, marginX, navY, GAME_WIDTH - marginX * 2, navH, 20);
    ctx.fill();
    
    // 左上角设置按钮（圆形）
    var backBtnX = marginX + 35;
    var backBtnY = navY + navH / 2;
    var backBtnR = 28;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(backBtnX, backBtnY, backBtnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙', backBtnX, backBtnY);
    
    // 右上角返回按钮（圆形）
    var settingsBtnX = GAME_WIDTH - marginX - 35;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(settingsBtnX, backBtnY, backBtnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏠', settingsBtnX, backBtnY);
    
    // 正中间关卡标题（胶囊背景）
    var titleText = '第' + (this.currentLevel + 1) + '关 · ' + GRID_SIZE + 'x' + GRID_SIZE;
    ctx.font = 'bold 28px sans-serif';
    var titleWidth = ctx.measureText(titleText).width + 48;
    var titleX = (GAME_WIDTH - titleWidth) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    roundRect(ctx, titleX, navY + (navH - 48) / 2, titleWidth, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(titleText, GAME_WIDTH / 2, navY + navH / 2);
    ctx.shadowColor = 'transparent';
    
    // ========== 2. 游戏信息卡片区（三卡片横排） ==========
    var cardY = navY + navH + 24;
    var cardH = 90;
    var cardW = (GAME_WIDTH - marginX * 2 - 24) / 3;
    var cardGap = 12;
    
    // 左侧卡片 - 剩余猫咪
    var card1X = marginX;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, card1X, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('剩余猫咪', card1X + cardW / 2, cardY + 22);
    var remainingCats = GRID_SIZE - (this.foundCats ? this.foundCats.length : 0);
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🐱 ' + remainingCats, card1X + cardW / 2, cardY + 60);
    
    // 中间卡片 - 生命值（心形）
    var card2X = card1X + cardW + cardGap;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, card2X, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('剩余生命', card2X + cardW / 2, cardY + 22);
    var maxHearts = this.maxMistakes || 2;
    var heartSize = 28;
    var heartSpacing = 36;
    var totalHeartsWidth = (maxHearts - 1) * heartSpacing + heartSize;
    var startHeartX = card2X + (cardW - totalHeartsWidth) / 2;
    var heartCenterY = cardY + 60;
    for (var h = 0; h < maxHearts; h++) {
        var heartX = startHeartX + h * heartSpacing;
        draw3DHeart(ctx, heartX, heartCenterY - heartSize / 2, heartSize, this.mistakesLeft > h);
    }
    
    // 右侧卡片 - 连胜
    var card3X = card2X + cardW + cardGap;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, card3X, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('连胜', card3X + cardW / 2, cardY + 22);
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🔥 ' + this.streak, card3X + cardW / 2, cardY + 60);
    
    // ========== 3. 游戏规则提示（药丸标签） ==========
    var rulesY = cardY + cardH + 24;
    var rules = [
        { icon: '🐱', text: '每色1只猫' },
        { icon: '📏', text: '每行每列1只' },
        { icon: '🚫', text: '猫不能相邻' }
    ];
    var pillH = 40;
    var pillGap = 12;
    var totalPillsWidth = 0;
    var pillWidths = [];
    for (var i = 0; i < rules.length; i++) {
        ctx.font = '16px sans-serif';
        pillWidths[i] = ctx.measureText(rules[i].icon + ' ' + rules[i].text).width + 40;
        totalPillsWidth += pillWidths[i];
    }
    totalPillsWidth += pillGap * (rules.length - 1);
    var pillsStartX = (GAME_WIDTH - totalPillsWidth) / 2;
    
    for (var i = 0; i < rules.length; i++) {
        var pillX = pillsStartX;
        for (var j = 0; j < i; j++) pillX += pillWidths[j] + pillGap;
        ctx.fillStyle = '#F0F2F5';
        roundRect(ctx, pillX, rulesY, pillWidths[i], pillH, 20);
        ctx.fill();
        ctx.fillStyle = '#5A5D6C';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rules[i].icon + ' ' + rules[i].text, pillX + pillWidths[i] / 2, rulesY + pillH / 2);
    }
    
    // ========== 4. 棋盘区域 ==========
    var boardY = rulesY + pillH + 24;
    this.renderModernBoard(ctx, GRID_SIZE, boardY);
    
    // ========== 5. 底部按钮区 ==========
    this.renderBottomButtons(ctx);
    
    // ========== 6. 粒子效果 ==========
    this.renderParticles();
    
    // ========== 7. 弹窗 ==========
    if (this.gameStatus === 'win') this.renderWinModal();
    else if (this.gameStatus === 'fail') this.renderFailModal();
};

// 现代化棋盘渲染（带行列号）
GameManager.prototype.renderModernBoard = function(ctx, GRID_SIZE, boardY) {
    // 计算棋盘尺寸
    var boardPadding = 12;
    var coordSize = 26;
    var gridAreaSize = GAME_WIDTH - 30 * 2 - boardPadding * 2 - coordSize - 8;
    var cellSize = Math.floor(gridAreaSize / GRID_SIZE);
    var actualBoardWidth = cellSize * GRID_SIZE;
    
    // 计算位置
    var totalWidth = coordSize + 8 + actualBoardWidth + boardPadding * 2;
    var boardX = (GAME_WIDTH - totalWidth) / 2;
    var gridStartX = boardX + coordSize + 8 + boardPadding;
    
    // 保存棋盘位置供触摸检测使用
    this._boardX = gridStartX;
    this._boardY = boardY + boardPadding;
    this._cellSize = cellSize;
    this._gridSize = GRID_SIZE;
    
    // 棋盘外框
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    var boardBgW = coordSize + 8 + actualBoardWidth + boardPadding * 2;
    roundRect(ctx, boardX, boardY, boardBgW, actualBoardWidth + boardPadding * 2, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    // 坐标显示模式
    if (this.showCoords) {
        // 绘制列号（底部）
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (var c = 0; c < GRID_SIZE; c++) {
            var coordX = gridStartX + c * cellSize + cellSize / 2;
            var coordY = boardY + actualBoardWidth + boardPadding + coordSize / 2 + 6;
            ctx.fillStyle = '#7F5AF0';
            ctx.beginPath();
            ctx.arc(coordX, coordY, coordSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letters[c], coordX, coordY);
        }
        
        // 绘制行号（左侧）
        for (var r = 0; r < GRID_SIZE; r++) {
            var displayRow = GRID_SIZE - r;
            var coordX = boardX + boardPadding + coordSize / 2;
            var coordY = boardY + boardPadding + r * cellSize + cellSize / 2;
            ctx.fillStyle = '#7F5AF0';
            ctx.beginPath();
            ctx.arc(coordX, coordY, coordSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayRow.toString(), coordX, coordY);
        }
    }
    
    // 绘制格子
    var level = this.currentLevelData;
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = gridStartX + c * cellSize;
            var y = boardY + boardPadding + r * cellSize;
            var region = level.regions[r][c];
            var gradientColors = REGION_GRADIENTS[region] || ['#ffffff', '#cccccc'];
            
            var anim = Animations.get('shake_' + r + '_' + c);
            if (anim) {
                var progress = (Date.now() - anim.startTime) / anim.duration;
                var offset = Math.sin(progress * Math.PI * 4) * 4 * (1 - progress);
                ctx.save();
                ctx.translate(offset, 0);
            }
            
            // 格子渐变
            var cellGrad = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + cellSize - 3);
            cellGrad.addColorStop(0, gradientColors[0]);
            cellGrad.addColorStop(1, gradientColors[1]);
            ctx.fillStyle = cellGrad;
            roundRect(ctx, x + 3, y + 3, cellSize - 6, cellSize - 6, 12);
            ctx.fill();
            
            // 高光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            roundRect(ctx, x + 3, y + 3, cellSize - 6, (cellSize - 6) / 2, 12);
            ctx.fill();
            
            // 色盲模式标识
            if (this.colorblindMode && COLORBLIND_COLORS[region]) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.font = 'bold ' + (cellSize * 0.35) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(COLORBLIND_COLORS[region].pattern, x + cellSize / 2, y + cellSize / 2 + 2);
            }
            
            if (anim) ctx.restore();
        }
    }
    
    // 绘制猫和标记
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = gridStartX + c * cellSize;
            var y = boardY + boardPadding + r * cellSize;
            
            // 找到的猫
            if (this.findInArray(this.foundCats, r, c) !== -1) {
                ctx.fillStyle = '#333333';
                ctx.font = Math.floor(cellSize * 0.5) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🐱', x + cellSize / 2, y + cellSize / 2 + 2);
            }
            
            // 标记
            if (this.findInArray(this.marks, r, c) !== -1 && this.findInArray(this.foundCats, r, c) === -1) {
                ctx.fillStyle = '#FF4757';
                ctx.font = 'bold ' + Math.floor(cellSize * 0.4) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✘', x + cellSize / 2, y + cellSize / 2 + 2);
            }
            
            // 提示（renderModernBoard 棋盘 y 从上到下递增，直接使用逻辑坐标比较）
            if (this.hintCell && this.hintCell.row === r && this.hintCell.col === c && Date.now() - this.hintTimer < 2000) {
                var hintAlpha = 0.5 + 0.5 * Math.sin((Date.now() - this.hintTimer) / 100);
                ctx.save();
                ctx.globalAlpha = hintAlpha;
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                roundRect(ctx, x + 3, y + 3, cellSize - 6, cellSize - 6, 12);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
    
    // 记录棋盘底部Y坐标
    this._boardBottomY = boardY + actualBoardWidth + boardPadding * 2 + coordSize + 20;
};

// 底部四个大按钮
GameManager.prototype.renderBottomButtons = function(ctx) {
    var btnY = this._boardBottomY + 30 || 900;
    var btnH = 56;
    var btnW = (GAME_WIDTH - 30 * 2 - 36) / 4;
    var btnGap = 12;
    var startX = 30;
    
    var buttonConfigs = [
        { name: '清空', bgColor: '#A0A0A0', icon: '🗑️' },
        { name: '色盲', bgColor: '#7F5AF0', icon: '🎨' },
        { name: '坐标', bgColor: '#FFC107', icon: '📍' },
        { name: '提示', bgColor: '#FF6B6B', icon: '💡', disabled: this.hintsUsed > 0 }
    ];
    
    for (var i = 0; i < 4; i++) {
        var btn = buttonConfigs[i];
        var x = startX + i * (btnW + btnGap);
        var isPressed = (this._pressedButton === i) && !btn.disabled;
        var scale = isPressed ? 0.95 : 1;
        var isDisabled = btn.disabled || false;
        
        ctx.save();
        ctx.translate(x + btnW / 2, btnY + btnH / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(x + btnW / 2), -(btnY + btnH / 2));
        
        // 按钮渐变
        var btnGrad = ctx.createLinearGradient(x, btnY, x, btnY + btnH);
        if (isDisabled) {
            btnGrad.addColorStop(0, '#CCCCCC');
            btnGrad.addColorStop(1, '#AAAAAA');
        } else {
            btnGrad.addColorStop(0, btn.bgColor);
            btnGrad.addColorStop(1, this._darkenColor(btn.bgColor));
        }
        ctx.fillStyle = btnGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = isPressed ? 2 : 4;
        roundRect(ctx, x, btnY, btnW, btnH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        // 高光（禁用时不显示）
        if (!isDisabled) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            roundRect(ctx, x + 4, btnY + 4, btnW - 8, (btnH - 8) / 2, 24);
            ctx.fill();
        }
        
        // 文字
        ctx.fillStyle = isDisabled ? '#888888' : '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.icon + ' ' + btn.name, x + btnW / 2, btnY + btnH / 2 + 1);
        
        ctx.restore();
    }
    
    // 记录按钮区域供触摸检测
    this._btnAreaY = btnY;
    this._btnAreaH = btnH;
    this._btnAreaW = btnW;
    this._btnAreaGap = btnGap;
    this._btnAreaStartX = startX;
};

// 颜色加深辅助函数
GameManager.prototype._darkenColor = function(hexColor) {
    var colorMap = {
        '#A0A0A0': '#808080',
        '#7F5AF0': '#6C5CE7',
        '#FFC107': '#FFB300',
        '#FF6B6B': '#FF5252'
    };
    return colorMap[hexColor] || hexColor;
};

// 色盲友好模式颜色配置（使用高对比度颜色和形状区分）
var COLORBLIND_COLORS = {
    'A': { bg: '#FFE082', pattern: 'A', shape: 'circle' },
    'B': { bg: '#AED581', pattern: 'B', shape: 'square' },
    'C': { bg: '#FFCC80', pattern: 'C', shape: 'triangle' },
    'D': { bg: '#EF9A9A', pattern: 'D', shape: 'diamond' },
    'E': { bg: '#81D4FA', pattern: 'E', shape: 'star' },
    'F': { bg: '#CE93D8', pattern: 'F', shape: 'heart' },
    'G': { bg: '#80CBC4', pattern: 'G', shape: 'cross' },
    'H': { bg: '#FFAB91', pattern: 'H', shape: 'plus' },
    'I': { bg: '#B39DDB', pattern: 'I', shape: 'minus' },
    'J': { bg: '#90CAF9', pattern: 'J', shape: 'dot' },
    'K': { bg: '#FF8A65', pattern: 'K', shape: 'ring' },
    'L': { bg: '#4DB6AC', pattern: 'L', shape: 'wave' },
    'M': { bg: '#9575CD', pattern: 'M', shape: 'zigzag' },
    'N': { bg: '#FF7043', pattern: 'N', shape: 'arrow' },
    'O': { bg: '#66BB6A', pattern: 'O', shape: 'bolt' },
    'P': { bg: '#42A5F5', pattern: 'P', shape: 'moon' },
    'Q': { bg: '#EC407A', pattern: 'Q', shape: 'sun' },
    'R': { bg: '#AB47BC', pattern: 'R', shape: 'cloud' },
    'S': { bg: '#26A69A', pattern: 'S', shape: 'leaf' },
    'T': { bg: '#5C6BC0', pattern: 'T', shape: 'box' }
};

// 绘制色盲友好模式的形状标识
function drawColorblindShape(ctx, x, y, size, shape, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    
    var cx = x + size / 2;
    var cy = y + size / 2;
    var s = size * 0.3;
    
    switch(shape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(cx, cy, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
        case 'square':
            ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
            ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s, cy + s);
            ctx.lineTo(cx - s, cy + s);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s, cy);
            ctx.lineTo(cx, cy + s);
            ctx.lineTo(cx - s, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'star':
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                var px = cx + Math.cos(angle) * s;
                var py = cy + Math.sin(angle) * s;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        default:
            // 默认显示字母
            ctx.font = 'bold ' + (size * 0.4) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(shape.charAt(0), cx, cy);
    }
    
    ctx.restore();
}

GameManager.prototype.renderBoard = function() {
    var ctx = this.ctx;
    var level = this.currentLevelData;
    var GRID_SIZE = level.size;
    
    // 棋盘外框 - 白色圆角容器+阴影
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(100, 100, 120, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, this.boardX - 15, this.boardY - 15, GRID_SIZE * this.cellSize + 30, GRID_SIZE * this.cellSize + 30, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = this.boardX + c * this.cellSize;
            var y = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
            var size = this.cellSize - 8;
            
            var region = level.regions[r][c];
            var baseColor = REGION_COLORS[region] || '#cccccc';
            var gradientColors = REGION_GRADIENTS[region] || ['#ffffff', '#cccccc'];
            
            var anim = Animations.get('shake_' + r + '_' + c);
            if (anim) {
                var progress = (Date.now() - anim.startTime) / anim.duration;
                var offset = Math.sin(progress * Math.PI * 4) * 5 * (1 - progress);
                ctx.save();
                ctx.translate(offset, 0);
            }
            
            ctx.globalAlpha = 1;
            // 增强阴影效果
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 3;
            
            // 创建渐变填充
            var cellGradient = ctx.createLinearGradient(x + 4, y + 4, x + 4, y + size + 4);
            cellGradient.addColorStop(0, gradientColors[0]);
            cellGradient.addColorStop(1, gradientColors[1]);
            ctx.fillStyle = cellGradient;
            roundRect(ctx, x + 4, y + 4, size, size, 14);
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // 高光效果 - 顶部渐变
            var highlight = ctx.createLinearGradient(x + 4, y + 4, x + 4, y + size / 2);
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            roundRect(ctx, x + 4, y + 4, size, size, 14);
            ctx.fill();
            
            // 色盲模式：在每个格子中绘制形状标识
            if (this.colorblindMode && COLORBLIND_COLORS[region]) {
                var cbConfig = COLORBLIND_COLORS[region];
                drawColorblindShape(ctx, x + 4, y + 4, size, cbConfig.shape, 'rgba(0,0,0,0.2)');
            }
            
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
    
    // 坐标显示模式
    if (this.showCoords) {
        // 列坐标 (A, B, C, ...)
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (var c = 0; c < GRID_SIZE; c++) {
            var coordX = this.boardX + c * this.cellSize + this.cellSize / 2;
            var coordY = this.boardY - 10;
            ctx.fillText(letters[c], coordX, coordY);
        }
        
        // 行坐标 (1, 2, 3, ...)
        for (var r = 0; r < GRID_SIZE; r++) {
            var displayRow = GRID_SIZE - r;
            var coordX = this.boardX - 10;
            var coordY = this.boardY + r * this.cellSize + this.cellSize / 2;
            ctx.fillText(displayRow.toString(), coordX, coordY);
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
};

GameManager.prototype.renderButtons = function() {
    var ctx = this.ctx;
    var btnY = 880;
    var btnH = 56;
    var btnW = 160;
    var btnGap = 16;
    var totalWidth = btnW * 3 + btnGap * 2;
    var startX = (GAME_WIDTH - totalWidth) / 2;
    
    // 按钮颜色配置 - 商业化渐变风格（3个按钮）
    var buttonConfigs = [
        { name: '清空', bgColor: '#f5f5f5', textColor: '#666666', icon: '🗑️' },
        { name: '规则', bgColor: '#64b5f6', textColor: '#ffffff', icon: '📖' },
        { name: '提示', bgColor: '#ffb74d', textColor: '#ffffff', icon: '💡' }
    ];
    
    for (var i = 0; i < 3; i++) {
        var btn = buttonConfigs[i];
        var x = startX + i * (btnW + btnGap);
        
        // 按钮阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        
        // 创建渐变背景
        var btnGradient = ctx.createLinearGradient(x, btnY, x, btnY + btnH);
        btnGradient.addColorStop(0, btn.bgColor);
        btnGradient.addColorStop(1, this.darkenColor(btn.bgColor));
        
        ctx.fillStyle = btnGradient;
        roundRect(ctx, x, btnY, btnW, btnH, 28);
        ctx.fill();
        
        // 清除阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // 绘制按钮图标和文字
        ctx.fillStyle = btn.textColor;
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.icon + ' ' + btn.name, x + btnW / 2, btnY + btnH / 2 + 2);
    }
};

// 颜色加深辅助函数
GameManager.prototype.darkenColor = function(hexColor) {
    // 简单的颜色加深逻辑
    var colorMap = {
        '#f5f5f5': '#e0e0e0',
        '#64b5f6': '#42a5f5',
        '#ffb74d': '#ffa726',
        '#81c784': '#66bb6a'
    };
    return colorMap[hexColor] || hexColor;
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

// ========== 现代化弹窗渲染方法（带弹性缓动动画） ==========

GameManager.prototype.renderWinModal = function() {
    var ctx = this.ctx;
    var isLastLevel = this.currentLevel >= 4;
    
    // 获取弹窗动画缩放值
    var scale = this.modalScale || 1;
    
    // 背景蒙层（带模糊模拟效果）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 弹窗参数
    var modalW = 480;
    var modalH = 360;
    var modalX = (GAME_WIDTH - modalW) / 2;
    var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
    
    ctx.save();
    
    // 中心点变换实现弹性动画
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);
    
    // 白色卡片 - 双层阴影
    ctx.shadowColor = 'rgba(102, 126, 234, 0.3)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, modalX, modalY, modalW, modalH, 32);
    ctx.fill();
    
    // 内阴影高光
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -5;
    roundRect(ctx, modalX, modalY, modalW, modalH, 32);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 顶部装饰条
    var decorGradient = ctx.createLinearGradient(modalX, modalY, modalX + modalW, modalY);
    decorGradient.addColorStop(0, '#A78BFA');
    decorGradient.addColorStop(0.5, '#8B5CF6');
    decorGradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = decorGradient;
    roundRect(ctx, modalX, modalY, modalW, 80, 32);
    ctx.fill();
    ctx.fillRect(modalX, modalY + 40, modalW, 40);
    
    // 胜利标题 - 带发光效果
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('🎉 胜利', GAME_WIDTH / 2, modalY + 50);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 内容区域
    if (isLastLevel) {
        ctx.fillStyle = '#4B5563';
        ctx.font = '22px sans-serif';
        ctx.fillText('用时: ' + this.formatTime(this.finalTime), GAME_WIDTH / 2, modalY + 130);
        
        // 两个按钮
        var btnWidth = 180;
        var btnGap = 16;
        var btnH = 52;
        var totalBtnWidth = btnWidth * 2 + btnGap;
        var btnStartX = (GAME_WIDTH - totalBtnWidth) / 2;
        var btnY = modalY + 180;
        
        // 重新开始按钮
        var btn1Gradient = ctx.createLinearGradient(btnStartX, btnY, btnStartX, btnY + btnH);
        btn1Gradient.addColorStop(0, '#8B5CF6');
        btn1Gradient.addColorStop(1, '#7C3AED');
        ctx.fillStyle = btn1Gradient;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, btnStartX, btnY, btnWidth, btnH, 26);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('重新开始', btnStartX + btnWidth / 2, btnY + btnH / 2);
        
        // 排行榜按钮
        var btn2Gradient = ctx.createLinearGradient(btnStartX + btnWidth + btnGap, btnY, btnStartX + btnWidth + btnGap, btnY + btnH);
        btn2Gradient.addColorStop(0, '#F59E0B');
        btn2Gradient.addColorStop(1, '#D97706');
        ctx.fillStyle = btn2Gradient;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, btnStartX + btnWidth + btnGap, btnY, btnWidth, btnH, 26);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('排行榜', btnStartX + btnWidth + btnGap + btnWidth / 2, btnY + btnH / 2);
    } else {
        // 连胜提示
        ctx.fillStyle = '#8B5CF6';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('🎊 连胜 +1', GAME_WIDTH / 2, modalY + 130);
        
        // 下一关按钮
        var btnWidth = 220;
        var btnH = 56;
        var btnY = modalY + 190;
        var btnX = (GAME_WIDTH - btnWidth) / 2;
        
        var btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        btnGradient.addColorStop(0, '#8B5CF6');
        btnGradient.addColorStop(1, '#7C3AED');
        ctx.fillStyle = btnGradient;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;
        roundRect(ctx, btnX, btnY, btnWidth, btnH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        // 按钮内高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        roundRect(ctx, btnX + 4, btnY + 4, btnWidth - 8, (btnH - 8) / 2, 24);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('下一关 →', GAME_WIDTH / 2, btnY + btnH / 2);
    }
    
    ctx.restore();
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
    
    // 与 renderWinModal 保持一致的坐标
    var modalW = 480;
    var modalH = 360;
    var modalX = (GAME_WIDTH - modalW) / 2;
    var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
    
    if (isLastLevel) {
        var btnWidth = 180;
        var btnGap = 16;
        var btnH = 52;
        var totalBtnWidth = btnWidth * 2 + btnGap;
        var btnStartX = (GAME_WIDTH - totalBtnWidth) / 2;
        var btnY = modalY + 180;
        
        // 重新开始按钮
        if (pos.x >= btnStartX && pos.x <= btnStartX + btnWidth && pos.y >= btnY && pos.y <= btnY + btnH) {
            this.loadLevel(0);
            this.gameStatus = 'playing';
            return;
        }
        
        // 排行榜按钮
        if (pos.x >= btnStartX + btnWidth + btnGap && pos.x <= btnStartX + btnWidth + btnGap + btnWidth && pos.y >= btnY && pos.y <= btnY + btnH) {
            this.showLeaderboard = true;
            return;
        }
    } else {
        // 下一关按钮
        var btnWidth = 220;
        var btnH = 56;
        var btnY = modalY + 190;
        var btnX = (GAME_WIDTH - btnWidth) / 2;
        
        if (pos.x >= btnX && pos.x <= btnX + btnWidth && pos.y >= btnY && pos.y <= btnY + btnH) {
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

// ========== 现代化失败弹窗（带弹性缓动动画） ==========
GameManager.prototype.renderFailModal = function() {
    var ctx = this.ctx;
    
    // 获取弹窗动画缩放值
    var scale = this.modalScale || 1;
    
    // 背景蒙层
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 弹窗参数
    var modalW = 420;
    var modalH = 340;
    var modalX = (GAME_WIDTH - modalW) / 2;
    var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
    
    ctx.save();
    
    // 中心点变换实现弹性动画
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);
    
    // 白色卡片 - 双层阴影
    ctx.shadowColor = 'rgba(255, 71, 87, 0.3)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, modalX, modalY, modalW, modalH, 32);
    ctx.fill();
    
    // 内阴影高光
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -5;
    roundRect(ctx, modalX, modalY, modalW, modalH, 32);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 顶部装饰条 - 珊瑚红渐变
    var decorGradient = ctx.createLinearGradient(modalX, modalY, modalX + modalW, modalY);
    decorGradient.addColorStop(0, '#FF6B8A');
    decorGradient.addColorStop(0.5, '#FF4757');
    decorGradient.addColorStop(1, '#E84118');
    ctx.fillStyle = decorGradient;
    roundRect(ctx, modalX, modalY, modalW, 90, 32);
    ctx.fill();
    ctx.fillRect(modalX, modalY + 45, modalW, 45);
    
    // 失败标题 - 带发光效果
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('💔 失败', GAME_WIDTH / 2, modalY + 55);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 提示文字
    ctx.fillStyle = '#6B7280';
    ctx.font = '22px sans-serif';
    ctx.fillText('没有机会了，再接再厉！', GAME_WIDTH / 2, modalY + 150);
    
    // 重试按钮
    var btnWidth = 200;
    var btnH = 56;
    var btnY = modalY + 220;
    var btnX = (GAME_WIDTH - btnWidth) / 2;
    
    var btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGradient.addColorStop(0, '#FF6B8A');
    btnGradient.addColorStop(1, '#FF4757');
    ctx.fillStyle = btnGradient;
    ctx.shadowColor = 'rgba(255, 71, 87, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, btnX, btnY, btnWidth, btnH, 28);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    // 按钮内高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, btnX + 4, btnY + 4, btnWidth - 8, (btnH - 8) / 2, 24);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🔄 重试', GAME_WIDTH / 2, btnY + btnH / 2);
    
    ctx.restore();
};

// ========== 底部抽屉式设置面板 ==========
GameManager.prototype.renderSettings = function() {
    var ctx = this.ctx;
    
    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 抽屉高度和位置
    var drawerH = 480;
    var drawerY = GAME_HEIGHT - drawerH;
    var drawerW = GAME_WIDTH;
    var drawerX = 0;
    var cornerRadius = 30;
    
    // 底部圆角卡片
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = -5;
    
    ctx.beginPath();
    ctx.moveTo(drawerX + cornerRadius, drawerY);
    ctx.lineTo(drawerX + drawerW - cornerRadius, drawerY);
    ctx.quadraticCurveTo(drawerX + drawerW, drawerY, drawerX + drawerW, drawerY + cornerRadius);
    ctx.lineTo(drawerX + drawerW, drawerY + drawerH);
    ctx.lineTo(drawerX, drawerY + drawerH);
    ctx.lineTo(drawerX, drawerY + cornerRadius);
    ctx.quadraticCurveTo(drawerX, drawerY, drawerX + cornerRadius, drawerY);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 拖动指示条
    ctx.fillStyle = '#E0E0E0';
    roundRect(ctx, GAME_WIDTH / 2 - 30, drawerY + 15, 60, 5, 3);
    ctx.fill();
    
    // 标题
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚙️ 设置', GAME_WIDTH / 2, drawerY + 55);
    
    // 分隔线
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, drawerY + 85);
    ctx.lineTo(GAME_WIDTH - 40, drawerY + 85);
    ctx.stroke();
    
    // 设置项
    var settingsY = drawerY + 120;
    var settings = [
        { name: '🎵 背景音乐', key: 'music', value: SaveSystem.getSetting('music') },
        { name: '🔊 游戏音效', key: 'sound', value: SaveSystem.getSetting('sound') },
        { name: '📳 震动反馈', key: 'vibration', value: SaveSystem.getSetting('vibration') }
    ];
    
    for (var i = 0; i < settings.length; i++) {
        var s = settings[i];
        var sy = settingsY + i * 65;
        
        // 设置项背景
        ctx.fillStyle = '#F8F9FA';
        roundRect(ctx, 30, sy, GAME_WIDTH - 60, 55, 12);
        ctx.fill();
        
        // 设置名称
        ctx.fillStyle = '#333333';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(s.name, 50, sy + 33);
        
        // 开关按钮
        var toggleW = 80;
        var toggleH = 36;
        var toggleX = GAME_WIDTH - 30 - toggleW;
        var toggleY = sy + (55 - toggleH) / 2;
        
        // 开关背景
        var toggleColor = s.value ? '#4CAF50' : '#E0E0E0';
        ctx.fillStyle = toggleColor;
        roundRect(ctx, toggleX, toggleY, toggleW, toggleH, toggleH / 2);
        ctx.fill();
        
        // 开关圆点
        var knobX = s.value ? toggleX + toggleW - toggleH + 4 : toggleX + 4;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(knobX + (toggleH - 8) / 2, toggleY + toggleH / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }
    
    // 分隔线
    ctx.strokeStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.moveTo(40, drawerY + 340);
    ctx.lineTo(GAME_WIDTH - 40, drawerY + 340);
    ctx.stroke();
    
    // 游戏信息
    ctx.fillStyle = '#999999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('找猫大师 v1.0.0', GAME_WIDTH / 2, drawerY + 375);
    
    // 底部按钮
    var btnY = drawerY + 395;
    var btnW = GAME_WIDTH - 80;
    var btnH = 55;
    var btnGap = 15;
    
    // 根据来源场景决定显示的按钮
    if (this.settingsSource === 'home') {
        // 首页打开的设置面板 - 只显示关闭按钮
        var closeBtnX = (GAME_WIDTH - 200) / 2;
        ctx.fillStyle = '#667eea';
        ctx.shadowColor = 'rgba(102, 126, 234, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, closeBtnX, btnY, 200, btnH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ 关闭', closeBtnX + 100, btnY + btnH / 2 + 2);
    } else {
        // 游戏页面打开的设置面板 - 显示重玩本关和返回主页
        // 重新开始按钮
        var restartX = 40;
        ctx.fillStyle = '#667eea';
        ctx.shadowColor = 'rgba(102, 126, 234, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, restartX, btnY, (btnW - btnGap) / 2, btnH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔄 重玩本关', restartX + (btnW - btnGap) / 4, btnY + btnH / 2 + 2);
        
        // 返回主页按钮
        var homeX = 40 + (btnW - btnGap) / 2 + btnGap;
        ctx.fillStyle = '#f0f2f5';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        roundRect(ctx, homeX, btnY, (btnW - btnGap) / 2, btnH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('🏠 返回主页', homeX + (btnW - btnGap) / 4, btnY + btnH / 2 + 2);
    }
};

// ========== 底部抽屉设置面板触摸处理 ==========
GameManager.prototype.handleSettingsTouch = function(pos) {
    // 背景遮罩点击 - 关闭设置
    if (pos.y < GAME_HEIGHT - 480) {
        this.showSettings = false;
        return;
    }
    
    var drawerY = GAME_HEIGHT - 480;
    var settingsY = drawerY + 120;
    
    // 设置项点击
    for (var i = 0; i < 3; i++) {
        var sy = settingsY + i * 65;
        var toggleX = GAME_WIDTH - 30 - 80;
        
        if (pos.x >= toggleX && pos.x <= toggleX + 80 && pos.y >= sy && pos.y <= sy + 55) {
            var keys = ['music', 'sound', 'vibration'];
            var key = keys[i];
            var newValue = !SaveSystem.getSetting(key);
            SaveSystem.updateSetting(key, newValue);
            AudioManager.play('click');
            
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
    
    // 底部按钮
    var btnY = drawerY + 395;
    var btnH = 55;
    
    // 根据来源场景处理底部按钮
    if (this.settingsSource === 'home') {
        // 首页打开的设置面板 - 只有关闭按钮
        var closeBtnX = (GAME_WIDTH - 200) / 2;
        if (pos.x >= closeBtnX && pos.x <= closeBtnX + 200 && pos.y >= btnY && pos.y <= btnY + btnH) {
            AudioManager.play('click');
            this.showSettings = false;
            return;
        }
    } else {
        // 游戏页面打开的设置面板 - 重玩本关和返回主页
        var btnW = GAME_WIDTH - 80;
        var btnGap = 15;
        
        // 重新开始按钮
        if (pos.x >= 40 && pos.x <= 40 + (btnW - btnGap) / 2 && pos.y >= btnY && pos.y <= btnY + btnH) {
            AudioManager.play('click');
            this.showSettings = false;
            this.loadLevel(this.currentLevel);
            return;
        }
        
        // 返回主页按钮
        var homeX = 40 + (btnW - btnGap) / 2 + btnGap;
        if (pos.x >= homeX && pos.x <= homeX + (btnW - btnGap) / 2 && pos.y >= btnY && pos.y <= btnY + btnH) {
            AudioManager.play('click');
            this.showSettings = false;
            this.scene = 'home';
            return;
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
    // 左上角设置按钮
    var topY = 80;
    var settingsBtnX = 60;
    var settingsBtnY = topY + 40;
    var btnRadius = 28;
    
    var distToSettings = Math.sqrt(Math.pow(pos.x - settingsBtnX, 2) + Math.pow(pos.y - settingsBtnY, 2));
    if (distToSettings <= btnRadius + 10) {
        if (this.scene === 'home') {
            this.settingsSource = 'home';
            this.showSettings = true;
        }
        return;
    }
    
    // 右下角排行榜按钮
    var leaderboardBtnX = GAME_WIDTH - 60;
    var leaderboardBtnY = GAME_HEIGHT - 120;
    var distToLeaderboard = Math.sqrt(Math.pow(pos.x - leaderboardBtnX, 2) + Math.pow(pos.y - leaderboardBtnY, 2));
    if (distToLeaderboard <= btnRadius + 10) {
        if (this.scene === 'home') {
            this.showLeaderboard = true;
        }
        return;
    }
    
    // 商业化首页关卡选择区域
    var topY = 80;
    var statsY = topY + 100;
    var levelY = statsY + 130;
    var levelCardW = 160;
    var levelCardH = 140;
    var levelGap = 20;
    var levelCols = 2;
    var levelStartX = (GAME_WIDTH - (levelCardW * levelCols + levelGap)) / 2;
    
    var unlockedLevel = SaveSystem.getUnlockedLevel();
    
    for (var i = 0; i < 5; i++) {
        var col = i % levelCols;
        var row = Math.floor(i / levelCols);
        var x = levelStartX + col * (levelCardW + levelGap);
        var y = levelY + 40 + row * (levelCardH + levelGap);
        
        if (pos.x >= x && pos.x <= x + levelCardW && pos.y >= y && pos.y <= y + levelCardH) {
            // 第一关（i=0）始终可以进入，其他关卡需要解锁
            if (i === 0 || i <= unlockedLevel) {
                this.scene = 'game';
                this.loadLevel(i);
            } else {
                wx.showToast({ title: '请先解锁关卡', icon: 'none', duration: 1500 });
            }
            return;
        }
    }
};

// ========== 粒子最大数量限制 ==========
var MAX_PARTICLES = 500;
var MAX_CAT_PARTICLES = 100;

// ========== 预计算的渐变缓存 ==========
var gradientCache = {};
var lastCacheKey = '';

// ========== 清理和重置方法 ==========
GameManager.prototype.destroy = function() {
    // 停止游戏循环
    this._running = false;
    
    // 清空所有粒子数组
    if (this.particles) this.particles.length = 0;
    if (this.catParticles) this.catParticles.length = 0;
    if (this.streakParticles) this.streakParticles.length = 0;
    
    // 清空动画队列
    if (Animations && Animations.list) Animations.list.length = 0;
    
    // 重置状态
    this.scene = 'home';
    this.gameStatus = 'idle';
    this.currentLevelData = null;
    
    console.log('[游戏] 实例已清理');
};

GameManager.prototype.resetAnimations = function() {
    // 清空动画队列（但不停止当前帧）
    if (Animations && Animations.list) {
        Animations.list.length = 0;
    }
};

// ========== 优化的粒子更新（带数量限制） ==========
GameManager.prototype.updateParticles = function() {
    // 如果粒子数量超过限制，从最老的开始删除
    while (this.particles.length > MAX_PARTICLES) {
        this.particles.shift();
    }
    
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

GameManager.prototype.updateCatParticles = function() {
    // 限制猫粒子数量
    while (this.catParticles.length > MAX_CAT_PARTICLES) {
        this.catParticles.shift();
    }
    
    for (var i = this.catParticles.length - 1; i >= 0; i--) {
        var p = this.catParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 重力
        p.alpha -= 0.03;
        p.life -= 0.03;
        p.size *= 0.97;
        
        if (p.alpha <= 0 || p.life <= 0) {
            this.catParticles.splice(i, 1);
        }
    }
};

// ========== 预计算渐变颜色（性能优化） ==========
function getCachedGradient(ctx, region, x, y, size) {
    var cacheKey = region + '_' + size;
    
    if (!gradientCache[cacheKey] || gradientCache.cacheKey !== cacheKey) {
        var gradientColors = REGION_GRADIENTS[region] || ['#ffffff', '#cccccc'];
        var gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, gradientColors[0]);
        gradient.addColorStop(1, gradientColors[1]);
        gradientCache[cacheKey] = gradient;
        gradientCache.cacheKey = cacheKey;
        return gradient;
    }
    return gradientCache[cacheKey];
}

// ========== 优化的棋盘渲染 ==========
GameManager.prototype.renderBoardOptimized = function() {
    var ctx = this.ctx;
    var level = this.currentLevelData;
    
    if (!level || !level.regions) return;
    
    var GRID_SIZE = level.size;
    
    // 预计算外框参数
    var boardX = this.boardX - 15;
    var boardY = this.boardY - 15;
    var boardSize = GRID_SIZE * this.cellSize + 30;
    
    // 绘制外框（只绘制一次）
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(100, 100, 120, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, boardX, boardY, boardSize, boardSize, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 预计算阴影样式（避免重复设置）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    
    // 预计算高光渐变（可复用）
    var baseHighlight = 'rgba(255, 255, 255, 0.6)';
    var midHighlight = 'rgba(255, 255, 255, 0.15)';
    var endHighlight = 'rgba(255, 255, 255, 0)';
    
    // 批量绘制所有格子
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = this.boardX + c * this.cellSize;
            var y = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
            var size = this.cellSize - 8;
            
            var region = level.regions[r][c];
            var gradientColors = REGION_GRADIENTS[region] || ['#ffffff', '#cccccc'];
            
            // 检查是否有抖动动画
            var anim = Animations.get('shake_' + r + '_' + c);
            if (anim) {
                var progress = (Date.now() - anim.startTime) / anim.duration;
                var offset = Math.sin(progress * Math.PI * 4) * 5 * (1 - progress);
                ctx.save();
                ctx.translate(offset, 0);
            }
            
            ctx.globalAlpha = 1;
            
            // 创建渐变填充（使用缓存）
            var cellGradient = ctx.createLinearGradient(x + 4, y + 4, x + 4, y + size + 4);
            cellGradient.addColorStop(0, gradientColors[0]);
            cellGradient.addColorStop(1, gradientColors[1]);
            ctx.fillStyle = cellGradient;
            roundRect(ctx, x + 4, y + 4, size, size, 14);
            ctx.fill();
            
            // 高光效果
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            roundRect(ctx, x + 4, y + 4, size, size / 2, 14);
            ctx.fill();
            
            if (anim) ctx.restore();
        }
    }
    
    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    // 绘制猫和标记
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            var x = this.boardX + c * this.cellSize;
            var y = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
            
            // 绘制找到的猫
            if (this.findInArray(this.foundCats, r, c) !== -1) {
                ctx.fillStyle = '#333333';
                ctx.font = Math.floor(this.cellSize * 0.5) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🐱', x + this.cellSize / 2, y + this.cellSize / 2 + 2);
            }
            
            // 绘制标记
            if (this.findInArray(this.marks, r, c) !== -1 && this.findInArray(this.foundCats, r, c) === -1) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(this.cellSize * 0.4) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('X', x + this.cellSize / 2, y + this.cellSize / 2 + 2);
            }
            
            // 绘制提示
            if (this.hintCell && this.hintCell.row === r && this.hintCell.col === c && Date.now() - this.hintTimer < 2000) {
                var hintAlpha = 0.5 + 0.5 * Math.sin((Date.now() - this.hintTimer) / 100);
                var hintX = this.boardX + c * this.cellSize;
                var hintY = this.boardY + (GRID_SIZE - 1 - r) * this.cellSize;
                var hintSize = this.cellSize - 6;
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
};

// ========== 使用 requestAnimationFrame 的游戏循环 ==========
GameManager.prototype.gameLoop = function(timestamp) {
    // 使用传入的时间戳计算 deltaTime（可选用于物理计算）
    if (!this._lastFrameTime) {
        this._lastFrameTime = timestamp || Date.now();
    }
    
    var deltaTime = (timestamp || Date.now()) - this._lastFrameTime;
    this._lastFrameTime = timestamp || Date.now();
    
    // 只在运行状态下渲染
    if (this._running !== false) {
        this.render();
    }
    
    // 使用 requestAnimationFrame 继续循环
    var self = this;
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function(ts) {
            self.gameLoop(ts);
        });
    } else {
        // 微信小游戏环境回退
        setTimeout(function() {
            self.gameLoop(Date.now());
        }, 16);
    }
};

// ========== 启动游戏循环 ==========
GameManager.prototype.startGameLoop = function() {
    this._running = true;
    this._lastFrameTime = null;
    var self = this;
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function(ts) {
            self.gameLoop(ts);
        });
    } else {
        this.gameLoop(Date.now());
    }
};

var GameMain = {
    init: function(config) {
        SaveSystem.init();
        var gm = new GameManager();
        gm.init();
        // 启动游戏循环
        gm.startGameLoop();
    }
};

module.exports = { GameMain: GameMain, GameManager: GameManager };

// 直接初始化游戏
GameMain.init({ width: 750, height: 1334 });
