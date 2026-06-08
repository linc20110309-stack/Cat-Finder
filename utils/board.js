/**
 * 棋盘组件 - 负责棋盘的渲染和交互
 */
class BoardComponent {
    constructor(x, y, size, cellSize, regions) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.cellSize = cellSize;
        this.regions = regions;
        this.board = this.createEmptyBoard();
        this.cellStates = this.createEmptyBoard(); // 0: empty, 1: block(X), 2: cat
        
        // 区域颜色
        this.regionColors = this.generateRegionColors();
    }

    // 创建空棋盘
    createEmptyBoard() {
        const board = [];
        for (let i = 0; i < this.size; i++) {
            board.push(new Array(this.size).fill(0));
        }
        return board;
    }

    // 生成区域颜色
    generateRegionColors() {
        const colors = [
            '#FFE4E1', // 浅粉红
            '#E6E6FA', // 淡紫
            '#B0E0E6', // 淡蓝
            '#98FB98', // 淡绿
            '#FFFACD', // 柠檬黄
            '#F0E68C', // 卡其色
            '#E0FFFF', // 浅青色
            '#FFDAB9', // 桃色
            '#DDA0DD', // 梅红
            '#B0C4DE', // 浅钢蓝
            '#FFD1DC', // 粉红
            '#C9E4CA', // 薄荷绿
            '#FFF5E1', // 鹿皮色
            '#E8E8E8', // 浅灰
            '#F5DEB3', // 小麦色
            '#D8BFD8'  // 蓟色
        ];
        
        const regionSet = new Set();
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                regionSet.add(this.regions[row][col]);
            }
        }
        
        const regionList = Array.from(regionSet).sort((a, b) => a - b);
        const colorMap = {};
        
        regionList.forEach((region, index) => {
            colorMap[region] = colors[index % colors.length];
        });
        
        return colorMap;
    }

    // 获取单元格区域
    getCellRegion(row, col) {
        return this.regions[row][col];
    }

    // 获取单元格颜色
    getCellColor(row, col) {
        return this.regionColors[this.regions[row][col]];
    }

    // 放置猫咪
    placeCat(row, col) {
        if (this.cellStates[row][col] === 0) {
            this.cellStates[row][col] = 2; // CAT
            this.board[row][col] = 1;
            return true;
        }
        return false;
    }

    // 标记为X
    markAsBlock(row, col) {
        if (this.cellStates[row][col] === 0) {
            this.cellStates[row][col] = 1; // BLOCK
            return true;
        }
        return false;
    }

    // 取消标记
    unmark(row, col) {
        if (this.cellStates[row][col] === 1) {
            this.cellStates[row][col] = 0; // EMPTY
            return true;
        }
        return false;
    }

    // 获取单元格状态
    getCellState(row, col) {
        return this.cellStates[row][col];
    }

    // 是否可以交互
    canInteract(row, col) {
        return this.cellStates[row][col] !== 2; // 不是猫就可以交互
    }

    // 获取点击的单元格
    getCellAt(x, y) {
        const col = Math.floor((x - this.x) / this.cellSize);
        const row = Math.floor((y - this.y) / this.cellSize);
        
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            return { row, col };
        }
        return null;
    }

    // 重置棋盘
    reset() {
        this.board = this.createEmptyBoard();
        this.cellStates = this.createEmptyBoard();
    }

    // 渲染棋盘
    render(ctx) {
        // 绘制每个单元格
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                this.renderCell(ctx, row, col);
            }
        }

        // 绘制网格线
        this.renderGrid(ctx);
    }

    // 渲染单个单元格
    renderCell(ctx, row, col) {
        const x = this.x + col * this.cellSize;
        const y = this.y + row * this.cellSize;
        const state = this.cellStates[row][col];

        // 绘制背景
        ctx.fillStyle = this.getCellColor(row, col);
        ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // 绘制内容
        if (state === 1) {
            // X 标记
            this.renderX(ctx, x, y);
        } else if (state === 2) {
            // 猫咪
            this.renderCat(ctx, x, y);
        }
    }

    // 渲染X标记
    renderX(ctx, x, y) {
        const padding = this.cellSize * 0.2;
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x + padding, y + padding);
        ctx.lineTo(x + this.cellSize - padding, y + this.cellSize - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + this.cellSize - padding, y + padding);
        ctx.lineTo(x + padding, y + this.cellSize - padding);
        ctx.stroke();
    }

    // 渲染猫咪
    renderCat(ctx, x, y) {
        const catSize = this.cellSize * 0.7;
        const catX = x + (this.cellSize - catSize) / 2;
        const catY = y + (this.cellSize - catSize) / 2;

        // 绘制圆脸
        ctx.fillStyle = '#FFB347';
        ctx.beginPath();
        ctx.arc(catX + catSize / 2, catY + catSize / 2, catSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制耳朵
        ctx.fillStyle = '#FFB347';
        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.15, catY + catSize * 0.3);
        ctx.lineTo(catX + catSize * 0.35, catY);
        ctx.lineTo(catX + catSize * 0.45, catY + catSize * 0.35);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.55, catY + catSize * 0.35);
        ctx.lineTo(catX + catSize * 0.65, catY);
        ctx.lineTo(catX + catSize * 0.85, catY + catSize * 0.3);
        ctx.fill();

        // 绘制内耳
        ctx.fillStyle = '#FFC0CB';
        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.2, catY + catSize * 0.28);
        ctx.lineTo(catX + catSize * 0.35, catY + catSize * 0.08);
        ctx.lineTo(catX + catSize * 0.42, catY + catSize * 0.28);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.58, catY + catSize * 0.28);
        ctx.lineTo(catX + catSize * 0.65, catY + catSize * 0.08);
        ctx.lineTo(catX + catSize * 0.8, catY + catSize * 0.28);
        ctx.fill();

        // 绘制眼睛
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(catX + catSize * 0.35, catY + catSize * 0.45, catSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(catX + catSize * 0.65, catY + catSize * 0.45, catSize * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // 绘制鼻子
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.5, catY + catSize * 0.55);
        ctx.lineTo(catX + catSize * 0.45, catY + catSize * 0.62);
        ctx.lineTo(catX + catSize * 0.55, catY + catSize * 0.62);
        ctx.fill();

        // 绘制嘴巴
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(catX + catSize * 0.5, catY + catSize * 0.62);
        ctx.lineTo(catX + catSize * 0.5, catY + catSize * 0.7);
        ctx.moveTo(catX + catSize * 0.4, catY + catSize * 0.72);
        ctx.quadraticCurveTo(catX + catSize * 0.5, catY + catSize * 0.68, catX + catSize * 0.6, catY + catSize * 0.72);
        ctx.stroke();

        // 绘制胡须
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        const whiskerY = catY + catSize * 0.58;
        const whiskerX = catX + catSize * 0.5;

        // 左边胡须
        ctx.beginPath();
        ctx.moveTo(whiskerX - catSize * 0.15, whiskerY);
        ctx.lineTo(whiskerX - catSize * 0.35, whiskerY - catSize * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(whiskerX - catSize * 0.15, whiskerY + catSize * 0.03);
        ctx.lineTo(whiskerX - catSize * 0.35, whiskerY + catSize * 0.08);
        ctx.stroke();

        // 右边胡须
        ctx.beginPath();
        ctx.moveTo(whiskerX + catSize * 0.15, whiskerY);
        ctx.lineTo(whiskerX + catSize * 0.35, whiskerY - catSize * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(whiskerX + catSize * 0.15, whiskerY + catSize * 0.03);
        ctx.lineTo(whiskerX + catSize * 0.35, whiskerY + catSize * 0.08);
        ctx.stroke();
    }

    // 渲染网格
    renderGrid(ctx) {
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2;

        // 绘制垂直线
        for (let i = 0; i <= this.size; i++) {
            const x = this.x + i * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.y);
            ctx.lineTo(x, this.y + this.size * this.cellSize);
            ctx.stroke();
        }

        // 绘制水平线
        for (let i = 0; i <= this.size; i++) {
            const y = this.y + i * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.size * this.cellSize, y);
            ctx.stroke();
        }
    }

    // 高亮错误单元格
    highlightErrors(ctx, errorPositions) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        
        for (const pos of errorPositions) {
            const x = this.x + pos.col * this.cellSize;
            const y = this.y + pos.row * this.cellSize;
            ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
    }
}

// 导出
module.exports = { BoardComponent };