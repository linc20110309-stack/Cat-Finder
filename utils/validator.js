/**
 * 规则校验器
 * 检查放置的猫是否满足每行/每列/每区域只 1 只，且不相邻
 */
function RuleValidator(board, regions, size) {
    this.board = board;
    this.regions = regions;
    this.size = size;
    this.errors = [];
}

RuleValidator.prototype.reset = function() {
    this.errors = [];
};

RuleValidator.prototype.checkAll = function() {
    this.reset();
    this.checkRow();
    this.checkColumn();
    this.checkRegion();
    this.checkAdjacent();
    return this.errors.length === 0;
};

// 1. 每行只能有 1 只猫
RuleValidator.prototype.checkRow = function() {
    for (var r = 0; r < this.size; r++) {
        var count = 0;
        for (var c = 0; c < this.size; c++) {
            if (this.board[r][c] === 1) count++;
        }
        if (count > 1) {
            this.errors.push({ type: 'row', row: r, message: '该行有多只猫' });
        }
    }
};

// 2. 每列只能有 1 只猫
RuleValidator.prototype.checkColumn = function() {
    for (var c = 0; c < this.size; c++) {
        var count = 0;
        for (var r = 0; r < this.size; r++) {
            if (this.board[r][c] === 1) count++;
        }
        if (count > 1) {
            this.errors.push({ type: 'column', col: c, message: '该列有多只猫' });
        }
    }
};

// 3. 每区域只能有 1 只猫
RuleValidator.prototype.checkRegion = function() {
    var seen = {};
    for (var r = 0; r < this.size; r++) {
        for (var c = 0; c < this.size; c++) {
            if (this.board[r][c] === 1) {
                var region = this.regions[r][c];
                if (seen[region]) {
                    this.errors.push({ type: 'region', region: region, row: r, col: c });
                } else {
                    seen[region] = { row: r, col: c };
                }
            }
        }
    }
};

// 4. 猫不能相邻（四方向）
RuleValidator.prototype.checkAdjacent = function() {
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var r = 0; r < this.size; r++) {
        for (var c = 0; c < this.size; c++) {
            if (this.board[r][c] !== 1) continue;
            for (var d = 0; d < dirs.length; d++) {
                var nr = r + dirs[d][0];
                var nc = c + dirs[d][1];
                if (this.inBounds(nr, nc) && this.board[nr][nc] === 1) {
                    this.errors.push({ type: 'adjacent', r1: r, c1: c, r2: nr, c2: nc });
                }
            }
        }
    }
};

RuleValidator.prototype.inBounds = function(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
};

RuleValidator.prototype.getErrorPositions = function() {
    var set = {};
    for (var i = 0; i < this.errors.length; i++) {
        var err = this.errors[i];
        if (err.r1 !== undefined) {
            set[err.r1 + ',' + err.c1] = true;
            set[err.r2 + ',' + err.c2] = true;
        } else if (err.row !== undefined) {
            set[err.row + ',' + err.col] = true;
        }
    }
    var positions = [];
    for (var k in set) {
        if (set.hasOwnProperty(k)) {
            var parts = k.split(',');
            positions.push({ row: +parts[0], col: +parts[1] });
        }
    }
    return positions;
};

module.exports = { RuleValidator: RuleValidator };