/**
 * 猫位置求解器
 * 在给定的区域布局上寻找合法的猫放置方案（每行/每列/每区域各 1，不相邻）
 *
 * 解题策略：
 *   1. 回溯搜索（带超时）寻找完整解
 *   2. 失败则用贪心算法生成近似解
 *   3. 极端情况下使用线性扫描的保底方案
 */
var CatSolver = {

    LETTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    DIRS: [[-1, 0], [1, 0], [0, -1], [0, 1]],

    // 入口：生成 size 个猫的位置数组 [[r, c], ...]
    solve: function(regions, size, timeoutMs) {
        timeoutMs = timeoutMs || 100;
        // 1) 收集每个区域的候选位置
        var candidates = this._collectCandidates(regions, size);

        // 2) 回溯搜索
        var backtrackResult = this._backtrack(regions, size, 0, [], candidates, timeoutMs);
        if (backtrackResult && backtrackResult.length === size) {
            return backtrackResult;
        }

        // 3) 贪心搜索
        return this._greedy(regions, size);
    },

    // 收集每个区域的候选格子
    _collectCandidates: function(regions, size) {
        var candidates = {};
        for (var i = 0; i < size; i++) {
            candidates[this.LETTERS[i]] = [];
        }
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var region = regions[r][c];
                if (candidates[region]) candidates[region].push([r, c]);
            }
        }
        return candidates;
    },

    // 回溯搜索（按区域字母顺序放置）
    _backtrack: function(regions, size, count, current, candidates, timeoutMs) {
        if (count >= size) return current.slice();

        var letter = this.LETTERS[count];
        var pool = (candidates[letter] || []).slice();
        this._shuffle(pool);

        var startTime = Date.now();
        for (var i = 0; i < pool.length; i++) {
            if (Date.now() - startTime > timeoutMs) return null;
            var pos = pool[i];
            var row = pos[0], col = pos[1];
            if (this._isValidPlacement(row, col, current, regions, size)) {
                current.push([row, col]);
                var result = this._backtrack(regions, size, count + 1, current, candidates, timeoutMs);
                if (result) return result;
                current.pop();
            }
        }
        return null;
    },

    // 检查在某位置放猫是否合法
    _isValidPlacement: function(row, col, existing, regions, size) {
        if (!regions[row] || !regions[row][col]) return false;
        var region = regions[row][col];

        for (var i = 0; i < existing.length; i++) {
            var ex = existing[i];
            if (ex[0] === row) return false;          // 行冲突
            if (ex[1] === col) return false;          // 列冲突
            if (regions[ex[0]][ex[1]] === region) return false; // 区域冲突
        }

        // 相邻检查
        for (var d = 0; d < this.DIRS.length; d++) {
            var nr = row + this.DIRS[d][0];
            var nc = col + this.DIRS[d][1];
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                for (var j = 0; j < existing.length; j++) {
                    if (existing[j][0] === nr && existing[j][1] === nc) return false;
                }
            }
        }
        return true;
    },

    // 贪心算法：按字母顺序，每个区域选第一个满足约束的位置
    _greedy: function(regions, size) {
        var cats = [];
        var usedRows = {}, usedCols = {}, usedRegions = {};

        // 重新收集（按区域分组）
        var cells = {};
        for (var i = 0; i < size; i++) cells[this.LETTERS[i]] = [];
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var region = regions[r][c];
                if (cells[region]) cells[region].push([r, c]);
            }
        }

        for (var li = 0; li < size; li++) {
            var letter = this.LETTERS[li];
            var pool = cells[letter] || [];
            this._shuffle(pool);
            var picked = false;

            for (var i = 0; i < pool.length; i++) {
                var row = pool[i][0], col = pool[i][1];
                if (usedRows[row] || usedCols[col] || usedRegions[letter]) continue;
                if (this._hasAdjacent(row, col, cats, size)) continue;

                cats.push([row, col]);
                usedRows[row] = true;
                usedCols[col] = true;
                usedRegions[letter] = true;
                picked = true;
                break;
            }
            if (!picked) break;
        }
        return cats;
    },

    // 是否有相邻的猫
    _hasAdjacent: function(row, col, cats, size) {
        for (var d = 0; d < this.DIRS.length; d++) {
            var nr = row + this.DIRS[d][0];
            var nc = col + this.DIRS[d][1];
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                for (var j = 0; j < cats.length; j++) {
                    if (cats[j][0] === nr && cats[j][1] === nc) return true;
                }
            }
        }
        return false;
    },

    // Fisher-Yates 洗牌
    _shuffle: function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
};

module.exports = { CatSolver: CatSolver };