/**
 * 棋盘组件
 * 封装棋盘数据：猫、标记、区域的存储与基础查询
 */
function BoardComponent(size, regions) {
    this.size = size;
    this.regions = regions;           // 区域字母二维数组
    this.cats = this._emptyGrid();    // 答案（每格 0/1）
    this.foundCats = [];              // 玩家已找到的猫 [[r, c], ...]
    this.marks = [];                  // 玩家打的标记 [[r, c], ...]
}

BoardComponent.prototype._emptyGrid = function() {
    var grid = [];
    for (var r = 0; r < this.size; r++) {
        var row = [];
        for (var c = 0; c < this.size; c++) row.push(0);
        grid.push(row);
    }
    return grid;
};

// 预计算：每个格子所属的区域字母
BoardComponent.prototype.getCellRegion = function(row, col) {
    return this.regions[row][col];
};

// 标记某格放置猫（写入答案）
BoardComponent.prototype.setCats = function(catList) {
    this.cats = this._emptyGrid();
    for (var i = 0; i < catList.length; i++) {
        var pos = catList[i];
        this.cats[pos[0]][pos[1]] = 1;
    }
};

// 该位置是否为答案中的猫
BoardComponent.prototype.isCatAt = function(row, col) {
    return this.cats[row][col] === 1;
};

// 添加/移除玩家已找到的猫
BoardComponent.prototype.addFoundCat = function(row, col) {
    for (var i = 0; i < this.foundCats.length; i++) {
        if (this.foundCats[i][0] === row && this.foundCats[i][1] === col) return false;
    }
    this.foundCats.push([row, col]);
    return true;
};

BoardComponent.prototype.removeFoundCat = function(row, col) {
    for (var i = this.foundCats.length - 1; i >= 0; i--) {
        if (this.foundCats[i][0] === row && this.foundCats[i][1] === col) {
            this.foundCats.splice(i, 1);
            return true;
        }
    }
    return false;
};

// 添加/移除标记
BoardComponent.prototype.addMark = function(row, col) {
    for (var i = 0; i < this.marks.length; i++) {
        if (this.marks[i][0] === row && this.marks[i][1] === col) return false;
    }
    this.marks.push([row, col]);
    return true;
};

BoardComponent.prototype.removeMark = function(row, col) {
    for (var i = this.marks.length - 1; i >= 0; i--) {
        if (this.marks[i][0] === row && this.marks[i][1] === col) {
            this.marks.splice(i, 1);
            return true;
        }
    }
    return false;
};

BoardComponent.prototype.hasFoundCat = function(row, col) {
    for (var i = 0; i < this.foundCats.length; i++) {
        if (this.foundCats[i][0] === row && this.foundCats[i][1] === col) return true;
    }
    return false;
};

BoardComponent.prototype.hasMark = function(row, col) {
    for (var i = 0; i < this.marks.length; i++) {
        if (this.marks[i][0] === row && this.marks[i][1] === col) return true;
    }
    return false;
};

BoardComponent.prototype.clearMarks = function() {
    this.marks = [];
};

// 重置玩家进度（保留关卡数据）
BoardComponent.prototype.resetProgress = function() {
    this.foundCats = [];
    this.marks = [];
};

module.exports = { BoardComponent: BoardComponent };