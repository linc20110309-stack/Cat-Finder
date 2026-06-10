/**
 * 游戏场景
 * 包含：顶部导航栏、信息卡片、规则药丸、棋盘、底部按钮
 * 同时管理棋盘尺寸、触摸坐标等运行时状态
 */
var GameScene = {

    // 棋盘布局（在 render 时计算并写入 game 对象，供触摸检测使用）
    layout: function(game) {
        var marginX = 30;
        var safeTopY = 60;
        var navH = 110;

        // 估算 boardY：导航 + 三卡片 + 药丸
        var navY = safeTopY;
        var cardY = navY + navH + 24;
        var cardH = 90;
        var rulesY = cardY + cardH + 24;
        var pillH = 40;
        return marginX + rulesY + pillH + 24;  // boardY
    },

    render: function(ctx, game) {
        var GRID_SIZE = game.currentLevelData.size;
        var marginX = 30;
        var safeTopY = 60;
        var navY = safeTopY;
        var navH = 110;

        // ===== 1. 顶部导航栏 =====
        var navGradient = ctx.createLinearGradient(marginX, navY, GAME_WIDTH - marginX, navY);
        navGradient.addColorStop(0, '#7F5AF0');
        navGradient.addColorStop(1, '#6C5CE7');
        ctx.fillStyle = navGradient;
        UI.drawInfoCard(ctx, marginX, navY, GAME_WIDTH - marginX * 2, navH, { radius: 20, shadow: false });

        // 左上角设置按钮 + 右上角主页按钮
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

        var homeBtnX = GAME_WIDTH - marginX - 35;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(homeBtnX, backBtnY, backBtnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏠', homeBtnX, backBtnY);

        // 中间标题
        var titleText = '第' + (game.currentLevel + 1) + '关 · ' + GRID_SIZE + 'x' + GRID_SIZE;
        ctx.font = 'bold 28px sans-serif';
        var titleWidth = ctx.measureText(titleText).width + 48;
        var titleX = (GAME_WIDTH - titleWidth) / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        UI.drawInfoCard(ctx, titleX, navY + (navH - 48) / 2, titleWidth, 48, { radius: 24, shadow: false });
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText(titleText, GAME_WIDTH / 2, navY + navH / 2);
        ctx.shadowColor = 'transparent';

        // ===== 2. 三信息卡片 =====
        var cardY = navY + navH + 24;
        var cardH = 90;
        var cardW = (GAME_WIDTH - marginX * 2 - 24) / 3;
        var cardGap = 12;

        // 剩余猫咪
        var card1X = marginX;
        UI.drawInfoCard(ctx, card1X, cardY, cardW, cardH, { radius: 20 });
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('剩余猫咪', card1X + cardW / 2, cardY + 22);
        var remainingCats = GRID_SIZE - game.board.foundCats.length;
        ctx.fillStyle = '#2D3748';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('🐱 ' + remainingCats, card1X + cardW / 2, cardY + 60);

        // 生命值
        var card2X = card1X + cardW + cardGap;
        UI.drawInfoCard(ctx, card2X, cardY, cardW, cardH, { radius: 20 });
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '14px sans-serif';
        ctx.fillText('剩余生命', card2X + cardW / 2, cardY + 22);
        var maxHearts = game.maxMistakes || 2;
        var heartSize = 28;
        var heartSpacing = 36;
        var totalHeartsWidth = (maxHearts - 1) * heartSpacing + heartSize;
        var startHeartX = card2X + (cardW - totalHeartsWidth) / 2;
        var heartCenterY = cardY + 60;
        for (var h = 0; h < maxHearts; h++) {
            var heartX = startHeartX + h * heartSpacing;
            draw3DHeart(ctx, heartX, heartCenterY - heartSize / 2, heartSize, game.mistakesLeft > h);
        }

        // 连胜
        var card3X = card2X + cardW + cardGap;
        UI.drawInfoCard(ctx, card3X, cardY, cardW, cardH, { radius: 20 });
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('连胜', card3X + cardW / 2, cardY + 22);
        ctx.fillStyle = '#2D3748';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('🔥 ' + game.streak, card3X + cardW / 2, cardY + 60);

        // ===== 3. 规则药丸标签 =====
        var rulesY = cardY + cardH + 24;
        var rules = [
            { icon: '🐱', text: '每色1只猫' },
            { icon: '📏', text: '每行每列1只' },
            { icon: '🚫', text: '猫不能相邻' }
        ];
        var pillH = 40, pillGap = 12;
        var pillWidths = [];
        var totalPillsWidth = 0;
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
            UI.drawInfoCard(ctx, pillX, rulesY, pillWidths[i], pillH, { radius: 20, shadow: false });
            ctx.fillStyle = '#5A5D6C';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rules[i].icon + ' ' + rules[i].text, pillX + pillWidths[i] / 2, rulesY + pillH / 2);
        }

        // ===== 4. 棋盘 =====
        var boardY = rulesY + pillH + 24;
        this._renderBoard(ctx, game, GRID_SIZE, boardY);

        // ===== 5. 底部按钮 =====
        this._renderBottomButtons(ctx, game);

        // ===== 6. 粒子效果 =====
        Particles.renderConfetti(ctx, game.particles);
    },

    _renderBoard: function(ctx, game, GRID_SIZE, boardY) {
        var boardPadding = 12;
        var coordSize = 26;
        var gridAreaSize = GAME_WIDTH - 30 * 2 - boardPadding * 2 - coordSize - 8;
        var cellSize = Math.floor(gridAreaSize / GRID_SIZE);
        var actualBoardWidth = cellSize * GRID_SIZE;

        var totalWidth = coordSize + 8 + actualBoardWidth + boardPadding * 2;
        var boardX = (GAME_WIDTH - totalWidth) / 2;
        var gridStartX = boardX + coordSize + 8 + boardPadding;

        // 暴露给触摸检测
        game._boardX = gridStartX;
        game._boardY = boardY + boardPadding;
        game._cellSize = cellSize;

        // 棋盘外框
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;
        var boardBgW = coordSize + 8 + actualBoardWidth + boardPadding * 2;
        UI.drawInfoCard(ctx, boardX, boardY, boardBgW, actualBoardWidth + boardPadding * 2, { radius: 24, shadow: false });
        ctx.shadowColor = 'transparent';

        // 坐标显示
        if (game.showCoords) {
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
                ctx.fillText(COORD_LETTERS[c], coordX, coordY);
            }
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
                ctx.fillText(String(displayRow), coordX, coordY);
            }
        }

        // 绘制格子背景
        var level = game.currentLevelData;
        for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
                var x = gridStartX + c * cellSize;
                var y = boardY + boardPadding + r * cellSize;
                var region = level.regions[r][c];
                var gradientColors = REGION_GRADIENTS[region] || ['#ffffff', '#cccccc'];

                // 抖动动画
                var anim = Animations.get('shake_' + r + '_' + c);
                if (anim) {
                    var offset = Animations.shakeOffset(anim, 4);
                    ctx.save();
                    ctx.translate(offset, 0);
                }

                // 渐变填充
                var cellGrad = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + cellSize - 3);
                cellGrad.addColorStop(0, gradientColors[0]);
                cellGrad.addColorStop(1, gradientColors[1]);
                ctx.fillStyle = cellGrad;
                UI.drawInfoCard(ctx, x + 3, y + 3, cellSize - 6, cellSize - 6, { radius: 12, shadow: false });

                // 高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                UI.drawInfoCard(ctx, x + 3, y + 3, cellSize - 6, (cellSize - 6) / 2, { radius: 12, shadow: false });

                // 色盲模式标识
                if (game.colorblindMode && COLORBLIND_COLORS[region]) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                    ctx.font = 'bold ' + (cellSize * 0.35) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(COLORBLIND_COLORS[region].pattern, x + cellSize / 2, y + cellSize / 2 + 2);
                }

                if (anim) ctx.restore();
            }
        }

        // 绘制猫 + 标记 + 提示
        for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
                var x = gridStartX + c * cellSize;
                var y = boardY + boardPadding + r * cellSize;

                if (game.board.hasFoundCat(r, c)) {
                    ctx.fillStyle = '#333333';
                    ctx.font = Math.floor(cellSize * 0.5) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🐱', x + cellSize / 2, y + cellSize / 2 + 2);
                } else if (game.board.hasMark(r, c)) {
                    ctx.fillStyle = '#FF4757';
                    ctx.font = 'bold ' + Math.floor(cellSize * 0.4) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('✘', x + cellSize / 2, y + cellSize / 2 + 2);
                }

                // 提示（2 秒闪烁）
                if (game.hintCell && game.hintCell.row === r && game.hintCell.col === c && Date.now() - game.hintTimer < 2000) {
                    var hintAlpha = 0.5 + 0.5 * Math.sin((Date.now() - game.hintTimer) / 100);
                    ctx.save();
                    ctx.globalAlpha = hintAlpha;
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 4;
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 10;
                    UI.drawInfoCard(ctx, x + 3, y + 3, cellSize - 6, cellSize - 6, { radius: 12, shadow: false });
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        game._boardBottomY = boardY + actualBoardWidth + boardPadding * 2 + coordSize + 20;
    },

    _renderBottomButtons: function(ctx, game) {
        var btnY = (game._boardBottomY || 900) + 30;
        var btnH = 56;
        var btnW = (GAME_WIDTH - 30 * 2 - 36) / 4;
        var btnGap = 12;
        var startX = 30;

        var darkenMap = {
            '#A0A0A0': '#808080',
            '#7F5AF0': '#6C5CE7',
            '#FFC107': '#FFB300',
            '#FF6B6B': '#FF5252'
        };

        var buttons = [
            { name: '清空', bgColor: '#A0A0A0', icon: '🗑️', action: 'clearMarks' },
            { name: '色盲', bgColor: '#7F5AF0', icon: '🎨', action: 'colorblind' },
            { name: '坐标', bgColor: '#FFC107', icon: '📍', action: 'coords' },
            { name: '提示', bgColor: '#FF6B6B', icon: '💡', action: 'hint', disabled: game.hintsUsed > 0 }
        ];

        for (var i = 0; i < 4; i++) {
            var btn = buttons[i];
            var isPressed = game._pressedButton === i && !btn.disabled;
            UI.drawGradientButton(ctx, {
                x: startX + i * (btnW + btnGap),
                y: btnY,
                width: btnW,
                height: btnH,
                bgColor: btn.bgColor,
                darkenColor: darkenMap[btn.bgColor] || btn.bgColor,
                disabled: btn.disabled,
                pressed: isPressed,
                label: btn.name,
                icon: btn.icon,
                font: 'bold 20px sans-serif'
            });
        }

        game._btnAreaY = btnY;
        game._btnAreaH = btnH;
        game._btnAreaW = btnW;
        game._btnAreaGap = btnGap;
        game._btnAreaStartX = startX;
    },

    // 触摸：开始位置按下
    handleTouchStart: function(pos, game) {
        var btnY = game._btnAreaY || 900;
        var btnH = game._btnAreaH || 56;
        var btnW = game._btnAreaW || (GAME_WIDTH - 96) / 4;
        var btnGap = game._btnAreaGap || 12;
        var startX = game._btnAreaStartX || 30;

        for (var bi = 0; bi < 4; bi++) {
            var bx = startX + bi * (btnW + btnGap);
            if (pos.x >= bx && pos.x <= bx + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
                game._pressedButton = bi;
                return;
            }
        }
        game._pressedButton = null;
    },

    // 触摸：结束位置松开
    handleTouchEnd: function(pos, game) {
        var pressedBtn = game._pressedButton;
        game._pressedButton = null;
        if (pressedBtn === null || pressedBtn === undefined) return null;

        var btnY = game._btnAreaY || 900;
        var btnH = game._btnAreaH || 56;
        var btnW = game._btnAreaW || (GAME_WIDTH - 96) / 4;
        var btnGap = game._btnAreaGap || 12;
        var startX = game._btnAreaStartX || 30;
        var bx = startX + pressedBtn * (btnW + btnGap);

        if (pos.x >= bx && pos.x <= bx + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
            return ['clearMarks', 'colorblind', 'coords', 'hint'][pressedBtn];
        }
        return null;
    }
};

module.exports = { GameScene: GameScene };