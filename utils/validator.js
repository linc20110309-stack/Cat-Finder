/**
 * 规则验证器 - 验证玩家放置猫咪是否符合规则
 */
class RuleValidator {
    constructor(board, regions, size) {
        this.board = board;        // 玩家棋盘
        this.regions = regions;    // 区域划分
        this.size = size;          // 棋盘大小
        this.errors = [];          // 错误列表
    }

    // 重置验证
    reset() {
        this.errors = [];
    }

    // 检查所有规则
    checkAll() {
        this.reset();
        this.checkRow();
        this.checkColumn();
        this.checkRegion();
        this.checkAdjacent();
        return this.errors.length === 0;
    }

    // 检查胜利条件
    checkWin(solution) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                // 如果答案中有猫但玩家没有放，或者放的位置不对
                if (solution[row][col] === 1 && this.board[row][col] !== 1) {
                    return false;
                }
                // 如果答案中没有猫但玩家放了
                if (solution[row][col] === 0 && this.board[row][col] === 1) {
                    return false;
                }
            }
        }
        return true;
    }

    // 验证每行只有一只猫
    checkRow() {
        for (let row = 0; row < this.size; row++) {
            let catCount = 0;
            let catCol = -1;
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === 1) {
                    catCount++;
                    catCol = col;
                }
            }
            if (catCount > 1) {
                this.errors.push({
                    type: 'row',
                    row: row,
                    message: '此行有超过一只猫'
                });
            }
        }
    }

    // 验证每列只有一只猫
    checkColumn() {
        for (let col = 0; col < this.size; col++) {
            let catCount = 0;
            let catRow = -1;
            for (let row = 0; row < this.size; row++) {
                if (this.board[row][col] === 1) {
                    catCount++;
                    catRow = row;
                }
            }
            if (catCount > 1) {
                this.errors.push({
                    type: 'column',
                    col: col,
                    message: '此列有超过一只猫'
                });
            }
        }
    }

    // 验证每个区域只有一只猫
    checkRegion() {
        const regionCats = {};
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === 1) {
                    const region = this.regions[row][col];
                    if (regionCats[region]) {
                        this.errors.push({
                            type: 'region',
                            region: region,
                            row: row,
                            col: col,
                            message: '此区域已有猫咪'
                        });
                    } else {
                        regionCats[region] = { row, col };
                    }
                }
            }
        }
    }

    // 验证猫咪不相邻
    checkAdjacent() {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === 1) {
                    for (const [dr, dc] of directions) {
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (this.isValidPos(newRow, newCol) && 
                            this.board[newRow][newCol] === 1) {
                            this.errors.push({
                                type: 'adjacent',
                                row1: row, col1: col,
                                row2: newRow, col2: newCol,
                                message: '猫咪不能相邻'
                            });
                        }
                    }
                }
            }
        }
    }

    // 检查位置是否有效
    isValidPos(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    // 获取错误位置列表
    getErrorPositions() {
        const positions = new Set();
        for (const error of this.errors) {
            if (error.row !== undefined) positions.add(`${error.row},${error.col}`);
            if (error.row1 !== undefined) {
                positions.add(`${error.row1},${error.col1}`);
                positions.add(`${error.row2},${error.col2}`);
            }
        }
        return Array.from(positions).map(p => {
            const [row, col] = p.split(',').map(Number);
            return { row, col };
        });
    }
}

// 导出
module.exports = { RuleValidator };