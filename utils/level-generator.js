/**
 * 关卡生成器
 * 负责生成可解的关卡数据：区域分布 + 猫位置
 */
var CatSolver = require('./cat-solver.js').CatSolver;

var LevelGenerator = {
    LETTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    DIRS: [[0, 1], [1, 0], [0, -1], [-1, 0]],
    MAX_REGION_ATTEMPTS: 200,
    MAX_LEVEL_ATTEMPTS: 50,
    MAX_BOARD_SIZE: 8,

    // 生成指定 index 的关卡
    generateLevel: function(levelIndex) {
        var size = 4 + levelIndex;
        if (size > this.MAX_BOARD_SIZE) size = this.MAX_BOARD_SIZE;

        var attempts = 0;
        while (attempts < this.MAX_LEVEL_ATTEMPTS) {
            attempts++;
            var regions = this.generateRegions(size);

            // 验证：每个区域恰好 size 个格子，且连通
            if (!this._isValidRegions(regions, size)) {
                continue;
            }

            // 验证：可以解出 size 只猫
            var cats = CatSolver.solve(regions, size, 100);
            if (cats && cats.length === size) {
                return {
                    id: levelIndex,
                    size: size,
                    regions: regions,
                    cats: cats
                };
            }
        }

        // 兜底：保证有解的规则布局
        var fallbackRegions = this._generateFallbackRegions(size);
        return {
            id: levelIndex,
            size: size,
            regions: fallbackRegions,
            cats: CatSolver.solve(fallbackRegions, size, 100)
        };
    },

    // 验证区域布局是否合法
    _isValidRegions: function(regions, size) {
        var counts = this._countRegions(regions, size);
        if (counts.uniqueCount !== size) return false;
        for (var i = 0; i < size; i++) {
            if (counts.detail[this.LETTERS[i]] !== size) return false;
        }
        return this._verifyConnectivity(regions, size);
    },

    _countRegions: function(regions, size) {
        var detail = {};
        var unique = {};
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var l = regions[r][c];
                if (l) {
                    detail[l] = (detail[l] || 0) + 1;
                    unique[l] = true;
                }
            }
        }
        return { detail: detail, uniqueCount: Object.keys(unique).length };
    },

    // 波浪式扩散生成区域
    generateRegions: function(size) {
        var attempts = 0;
        while (attempts < this.MAX_REGION_ATTEMPTS) {
            attempts++;
            var regions = this._initEmptyRegions(size);
            var seeds = this._pickSeeds(size);
            this._placeSeeds(regions, seeds, size);

            var result = this._growRegions(regions, seeds, size);
            if (result && this._isValidRegions(regions, size)) {
                return regions;
            }
        }
        return this._generateFallbackRegions(size);
    },

    _initEmptyRegions: function(size) {
        var regions = [];
        for (var r = 0; r < size; r++) {
            regions[r] = [];
            for (var c = 0; c < size; c++) regions[r][c] = null;
        }
        return regions;
    },

    _pickSeeds: function(size) {
        var positions = [];
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) positions.push([r, c]);
        }
        this._shuffle(positions);

        var seeds = [];
        for (var i = 0; i < positions.length && seeds.length < size; i++) {
            var pos = positions[i];
            if (!this._isNearExisting(pos, seeds)) {
                seeds.push(pos);
            }
        }
        while (seeds.length < size) seeds.push(positions[seeds.length]);
        this._shuffle(seeds);
        return seeds;
    },

    _isNearExisting: function(pos, list) {
        for (var i = 0; i < list.length; i++) {
            var ex = list[i];
            if (Math.abs(pos[0] - ex[0]) <= 1 && Math.abs(pos[1] - ex[1]) <= 1 &&
                !(pos[0] === ex[0] && pos[1] === ex[1])) {
                return true;
            }
        }
        return false;
    },

    _placeSeeds: function(regions, seeds, size) {
        for (var i = 0; i < seeds.length && i < size; i++) {
            regions[seeds[i][0]][seeds[i][1]] = this.LETTERS[i];
        }
    },

    _growRegions: function(regions, seeds, size) {
        var regionCounts = {};
        var frontier = {};
        for (var i = 0; i < seeds.length; i++) {
            var letter = this.LETTERS[i];
            regionCounts[letter] = 1;
            frontier[letter] = [seeds[i]];
        }

        var assigned = seeds.length;
        var maxIterations = size * size * 2;
        var iterations = 0;

        while (assigned < size * size && iterations < maxIterations) {
            iterations++;
            var newFrontier = {};
            var anyProgress = false;

            for (var li = 0; li < size; li++) {
                var letter = this.LETTERS[li];
                newFrontier[letter] = [];

                if (regionCounts[letter] >= size) continue;

                var currentFrontier = frontier[letter];
                var nextFrontier = [];

                for (var fi = 0; fi < currentFrontier.length && regionCounts[letter] < size; fi++) {
                    var pos = currentFrontier[fi];
                    var dirs = this.DIRS.slice();
                    this._shuffle(dirs);

                    for (var d = 0; d < 4 && regionCounts[letter] < size; d++) {
                        var nr = pos[0] + dirs[d][0];
                        var nc = pos[1] + dirs[d][1];
                        if (this._inBounds(nr, nc, size) && regions[nr][nc] === null) {
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

            if (this._isAllFrontierEmpty(frontier, regionCounts, size)) {
                this._recomputeFrontier(regions, frontier, regionCounts, size);
            }

            if (!anyProgress && !this._isAllFrontierEmpty(frontier, regionCounts, size)) {
                break;
            }
        }
        return assigned === size * size;
    },

    _inBounds: function(r, c, size) {
        return r >= 0 && r < size && c >= 0 && c < size;
    },

    _isAllFrontierEmpty: function(frontier, regionCounts, size) {
        for (var li = 0; li < size; li++) {
            var letter = this.LETTERS[li];
            if (frontier[letter].length > 0 && regionCounts[letter] < size) return false;
        }
        return true;
    },

    _recomputeFrontier: function(regions, frontier, regionCounts, size) {
        for (var li = 0; li < size; li++) {
            var letter = this.LETTERS[li];
            if (regionCounts[letter] >= size) {
                frontier[letter] = [];
                continue;
            }
            var cells = [];
            var seen = {};
            for (var r = 0; r < size; r++) {
                for (var c = 0; c < size; c++) {
                    if (regions[r][c] !== letter) continue;
                    for (var d = 0; d < 4; d++) {
                        var nr = r + this.DIRS[d][0];
                        var nc = c + this.DIRS[d][1];
                        if (this._inBounds(nr, nc, size) && regions[nr][nc] === null && !seen[nr + ',' + nc]) {
                            cells.push([nr, nc]);
                            seen[nr + ',' + nc] = true;
                        }
                    }
                }
            }
            frontier[letter] = cells;
        }
    },

    // BFS 验证每个区域连通
    _verifyConnectivity: function(regions, size) {
        for (var li = 0; li < size; li++) {
            var letter = this.LETTERS[li];
            var startR = -1, startC = -1;
            for (var r = 0; r < size && startR === -1; r++) {
                for (var c = 0; c < size && startR === -1; c++) {
                    if (regions[r][c] === letter) {
                        startR = r;
                        startC = c;
                    }
                }
            }
            if (startR === -1) return false;

            var queue = [[startR, startC]];
            var visited = {};
            visited[startR + ',' + startC] = true;
            var count = 1;
            while (queue.length > 0) {
                var pos = queue.shift();
                for (var d = 0; d < 4; d++) {
                    var nr = pos[0] + this.DIRS[d][0];
                    var nc = pos[1] + this.DIRS[d][1];
                    if (this._inBounds(nr, nc, size) &&
                        !visited[nr + ',' + nc] &&
                        regions[nr][nc] === letter) {
                        visited[nr + ',' + nc] = true;
                        queue.push([nr, nc]);
                        count++;
                    }
                }
            }
            if (count !== size) return false;
        }
        return true;
    },

    _generateFallbackRegions: function(size) {
        var regions = [];
        for (var r = 0; r < size; r++) {
            regions[r] = [];
            for (var c = 0; c < size; c++) regions[r][c] = this.LETTERS[r];
        }
        return regions;
    },

    _shuffle: function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
};

module.exports = { LevelGenerator: LevelGenerator };