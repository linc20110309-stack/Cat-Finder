/**
 * 猫咪归位 (Cat Finder) - 微信小游戏主入口
 *
 * 主入口文件，负责：
 *   1. 全局错误捕获
 *   2. 加载所有模块
 *   3. GameManager 协调所有场景与子系统
 *   4. 启动游戏循环
 */

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

// ==================== 加载所有模块 ====================
var constants = require('./utils/constants.js');
var storageModule = require('./utils/storage.js');
var audioModule = require('./utils/audio.js');
var drawingModule = require('./utils/drawing.js');
var animationsModule = require('./utils/animations.js');
var particlesModule = require('./utils/particles.js');
var validatorModule = require('./utils/validator.js');
var boardModule = require('./utils/board.js');
var levelGenModule = require('./utils/level-generator.js');
var catSolverModule = require('./utils/cat-solver.js');
var uiModule = require('./utils/ui.js');
var homeModule = require('./utils/scenes/home.js');
var gameSceneModule = require('./utils/scenes/game.js');
var settingsModule = require('./utils/scenes/settings.js');
var rulesModule = require('./utils/scenes/rules.js');
var leaderboardModule = require('./utils/scenes/leaderboard.js');
var modalsModule = require('./utils/scenes/modals.js');

// ==================== 注册为全局，方便模块间使用 ====================
// 模块内部使用未限定的全局名（如 SaveSystem / AudioManager / UI 等）
var SaveSystem = storageModule.SaveSystem;
var AudioManager = audioModule.AudioManager;
var Animations = animationsModule.Animations;
var Particles = particlesModule.Particles;
var RuleValidator = validatorModule.RuleValidator;
var BoardComponent = boardModule.BoardComponent;
var LevelGenerator = levelGenModule.LevelGenerator;
var CatSolver = catSolverModule.CatSolver;
var UI = uiModule.UI;
var HomeScene = homeModule.HomeScene;
var GameScene = gameSceneModule.GameScene;
var SettingsScene = settingsModule.SettingsScene;
var RulesScene = rulesModule.RulesScene;
var LeaderboardScene = leaderboardModule.LeaderboardScene;
var Modals = modalsModule.Modals;

// ==================== 全局常量（GAME_WIDTH 等）====================
var GAME_WIDTH = constants.GAME_WIDTH;
var GAME_HEIGHT = constants.GAME_HEIGHT;
var REGION_COLORS = constants.REGION_COLORS;
var REGION_GRADIENTS = constants.REGION_GRADIENTS;
var COLORBLIND_COLORS = constants.COLORBLIND_COLORS;
var COORD_LETTERS = constants.COORD_LETTERS;
var draw3DHeart = drawingModule.draw3DHeart;

// ==================== GameManager ====================
function GameManager() {
    // Canvas
    this.canvas = null;
    this.ctx = null;

    // 场景与关卡
    this.scene = 'home';
    this.currentLevel = 0;
    this.currentLevelData = null;
    this.board = null;           // BoardComponent 实例

    // 游戏状态
    this.gameStatus = 'playing'; // playing / win / fail
    this.maxMistakes = 2;
    this.mistakesLeft = 2;
    this.streak = 0;
    this.gameStartTime = 0;
    this.finalTime = 0;

    // 玩家操作
    this.hintsUsed = 0;
    this.hintCell = null;
    this.hintTimer = 0;
    this.colorblindMode = false;
    this.showCoords = false;

    // 弹窗状态
    this.showSettings = false;
    this.showRules = false;
    this.showLeaderboard = false;
    this.settingsSource = 'home';

    // 触摸状态
    this._lastTouchTime = 0;
    this._touchStartCell = null;
    this._touchStartTime = 0;
    this._lastTapTime = 0;
    this._lastTapCell = null;
    this._pressedButton = null;

    // 效果状态
    this.particles = [];
    this.catParticles = [];
    this._screenFlash = false;
    this._screenFlashStart = 0;
    this.modalScale = 0.7;
    this._modalStartTime = null;

    // 运行控制
    this._running = false;
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
        self._handleTouch('start', {
            x: t.clientX * (GAME_WIDTH / info.windowWidth),
            y: t.clientY * (GAME_HEIGHT / info.windowHeight)
        });
    });
    wx.onTouchEnd(function(e) {
        var t = e.changedTouches[0];
        var info = wx.getSystemInfoSync();
        self._handleTouch('end', {
            x: t.clientX * (GAME_WIDTH / info.windowWidth),
            y: t.clientY * (GAME_HEIGHT / info.windowHeight)
        });
    });

    SaveSystem.init();
    AudioManager.init(SaveSystem);

    this.streak = SaveSystem.getStreak();
    this.gameStartTime = Date.now();
};

// ==================== 关卡 ====================
GameManager.prototype.loadLevel = function(levelIndex) {
    this.currentLevel = levelIndex;
    this.board = null;
    this.gameStatus = 'playing';
    this.hintsUsed = 0;
    this.hintCell = null;
    this.finalTime = 0;
    this.maxMistakes = levelIndex <= 1 ? 2 : levelIndex + 1;
    this.mistakesLeft = this.maxMistakes;

    var levelData = LevelGenerator.generateLevel(levelIndex);
    this.currentLevelData = levelData;

    this.board = new BoardComponent(levelData.size, levelData.regions);
    if (levelData.cats && levelData.cats.length === levelData.size) {
        this.board.setCats(levelData.cats);
    }

    SaveSystem.setCurrentLevel(levelIndex);
};

// ==================== 胜负判定 ====================
GameManager.prototype.checkWin = function() {
    if (!this.board) return;
    if (this.board.foundCats.length === this.currentLevelData.size) {
        this.gameStatus = 'win';
        this.streak++;
        SaveSystem.setStreak(this.streak);

        var newUnlocked = this.currentLevel + 1;
        SaveSystem.setUnlockedLevel(newUnlocked);

        Particles.spawnConfetti(this.particles, 40, GAME_WIDTH);
        AudioManager.play('victory');

        if (this.currentLevel >= 4) {
            this.finalTime = (Date.now() - this.gameStartTime) / 60000;
            SaveSystem.addToLeaderboard('Player', this.finalTime);
        }
    }
};

GameManager.prototype.showHint = function() {
    if (!this.board || !this.currentLevelData) return;
    var GRID_SIZE = this.currentLevelData.size;
    var candidates = [];
    for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
            if (this.board.isCatAt(r, c) && !this.board.hasFoundCat(r, c)) {
                candidates.push([r, c]);
            }
        }
    }
    if (candidates.length > 0) {
        var pos = candidates[Math.floor(Math.random() * candidates.length)];
        this.hintCell = { row: pos[0], col: pos[1] };
        this.hintTimer = Date.now();
        AudioManager.play('click');
    }
};

GameManager.prototype.handleButtonClick = function(btn) {
    AudioManager.play('click');
    switch (btn) {
        case 'clearMarks':
            this.board && this.board.clearMarks();
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

// ==================== 玩家操作 ====================
GameManager.prototype._onCellClick = function(row, col) {
    if (!this.board) return;
    AudioManager.play('click');
    if (this.board.hasFoundCat(row, col)) {
        this.board.removeFoundCat(row, col);
        return;
    }
    if (this.board.hasMark(row, col)) {
        this.board.removeMark(row, col);
    } else {
        this.board.addMark(row, col);
        Animations.add({
            id: 'markPop_' + row + '_' + col,
            type: 'markPop', row: row, col: col, duration: 200
        });
    }
};

GameManager.prototype._onCellDoubleClick = function(row, col) {
    if (!this.board) return;
    if (this.board.hasFoundCat(row, col)) {
        this.board.removeFoundCat(row, col);
        return;
    }
    this.board.removeMark(row, col);

    if (this.board.isCatAt(row, col)) {
        this.board.addFoundCat(row, col);
        AudioManager.play('correct');

        // 金色粒子爆炸
        var GRID_SIZE = this.currentLevelData.size;
        var cellSize = this._cellSize || 80;
        var x = (this._boardX || 0) + col * cellSize + cellSize / 2;
        var y = (this._boardY || 0) + row * cellSize + cellSize / 2;
        Particles.spawnGoldBurst(this.catParticles, x, y, 20);

        this.checkWin();
    } else {
        AudioManager.play('error');
        AudioManager.vibrate();
        Animations.add({
            id: 'shake_' + row + '_' + col,
            type: 'shake', row: row, col: col, duration: 300
        });
        this.mistakesLeft--;
        this._screenFlash = true;
        this._screenFlashStart = Date.now();

        if (this.mistakesLeft <= 0) {
            this.gameStatus = 'fail';
            this.streak = 0;
            SaveSystem.setStreak(0);
            AudioManager.play('fail');
        }
    }
};

GameManager.prototype._onCellLongPress = function(row, col) {
    if (!this.board) return;
    if (this.board.hasFoundCat(row, col)) return;
    if (this.board.hasMark(row, col)) {
        this.board.removeMark(row, col);
    } else {
        this.board.addMark(row, col);
        Animations.add({
            id: 'markPop_' + row + '_' + col,
            type: 'markPop', row: row, col: col, duration: 200
        });
    }
    AudioManager.play('click');
};

// ==================== 触摸路由 ====================
GameManager.prototype._handleTouch = function(type, pos) {
    if (this._lastTouchTime && Date.now() - this._lastTouchTime < 50) return;
    this._lastTouchTime = Date.now();

    var marginX = 30;
    var navY = 60, navH = 110;
    var backBtnX = marginX + 35;
    var backBtnY = navY + navH / 2;
    var backBtnR = 28;

    // 左上角圆形按钮（设置）
    var distBack = Math.sqrt(Math.pow(pos.x - backBtnX, 2) + Math.pow(pos.y - backBtnY, 2));
    if (distBack <= backBtnR) {
        if (type === 'start') {
            this.settingsSource = this.scene;
            this.showSettings = true;
        }
        return;
    }

    // 右上角按钮（首页 / 主页）
    var homeBtnX = GAME_WIDTH - marginX - 35;
    var distHome = Math.sqrt(Math.pow(pos.x - homeBtnX, 2) + Math.pow(pos.y - backBtnY, 2));
    if (distHome <= backBtnR) {
        if (type === 'start' && this.scene === 'game') {
            this.scene = 'home';
        }
        return;
    }

    // 弹窗（优先级最高）
    if (this.showSettings) { if (type === 'start') SettingsScene.handleTouch(pos, this); return; }
    if (this.showLeaderboard) { if (type === 'start') LeaderboardScene.handleTouch(pos, this); return; }
    if (this.showRules) { if (type === 'start') RulesScene.handleTouch(pos, this); return; }
    if (this.gameStatus === 'win' && type === 'start') { Modals.handleWinTouch(pos, this); return; }
    if (this.gameStatus === 'fail' && type === 'start') { Modals.handleFailTouch(pos, this); return; }

    // 游戏场景
    if (this.scene === 'game' && this.gameStatus === 'playing') {
        if (type === 'start') GameScene.handleTouchStart(pos, this);
        else if (type === 'end') {
            var action = GameScene.handleTouchEnd(pos, this);
            if (action) {
                this.handleButtonClick(action);
                return;
            }
            // 棋盘触摸处理
            this._handleBoardTouch(type, pos);
        }
        return;
    }

    // 首页场景
    if (this.scene === 'home' && type === 'start') {
        HomeScene.handleTouch(pos, this);
    }
};

GameManager.prototype._handleBoardTouch = function(type, pos) {
    if (!this.board) return;
    var GRID_SIZE = this.currentLevelData.size;
    var boardX = this._boardX || 0;
    var boardY = this._boardY || 0;
    var cellSize = this._cellSize || 80;

    if (type === 'start') {
        var col = Math.floor((pos.x - boardX) / cellSize);
        var row = Math.floor((pos.y - boardY) / cellSize);
        if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
            this._touchStartCell = { row: row, col: col };
            this._touchStartTime = Date.now();
        }
    } else if (type === 'end' && this._touchStartCell) {
        var duration = Date.now() - this._touchStartTime;
        var row = this._touchStartCell.row;
        var col = this._touchStartCell.col;

        var now = Date.now();
        var isDoubleClick = this._lastTapCell &&
            this._lastTapCell.row === row && this._lastTapCell.col === col &&
            now - this._lastTapTime < 300;
        this._lastTapTime = now;
        this._lastTapCell = { row: row, col: col };

        if (duration > 300) {
            this._onCellLongPress(row, col);
        } else if (isDoubleClick) {
            this._onCellDoubleClick(row, col);
        } else {
            this._onCellClick(row, col);
        }
        this._touchStartCell = null;
    }
};

// ==================== 渲染 ====================
GameManager.prototype.render = function() {
    var ctx = this.ctx;
    if (!ctx) return;

    // 更新粒子
    Particles.updateGold(this.catParticles);
    Particles.updateConfetti(this.particles);

    // 浅色渐变背景
    var bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#F0F2F5');
    bgGradient.addColorStop(1, '#E8ECF1');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 渲染当前场景
    if (this.scene === 'home') {
        HomeScene.render(ctx, this);
    } else if (this.scene === 'game') {
        if (this.currentLevelData) {
            GameScene.render(ctx, this);
        }
        if (this.gameStatus === 'win') Modals.renderWin(ctx, this);
        else if (this.gameStatus === 'fail') Modals.renderFail(ctx, this);
    }

    // 弹窗（设置/规则/排行榜）
    if (this.showSettings) SettingsScene.render(ctx, this);
    if (this.showRules) RulesScene.render(ctx, this);
    if (this.showLeaderboard) LeaderboardScene.render(ctx, this);

    // 粒子和屏幕闪烁
    Particles.renderGold(ctx, this.catParticles);
    if (this._screenFlash) {
        UI.drawScreenFlash(ctx, this._screenFlashStart, 80, '255, 0, 0', 0.4);
        if (Date.now() - this._screenFlashStart >= 80) this._screenFlash = false;
    }

    // 弹窗动画进度
    if (this.gameStatus === 'win' || this.gameStatus === 'fail') {
        if (!this._modalStartTime) this._modalStartTime = Date.now();
        var progress = Math.min(1, (Date.now() - this._modalStartTime) / 400);
        this.modalScale = progress >= 1 ? 1 : (0.3 + 0.7 * UI.elasticScale(progress));
    } else {
        this._modalStartTime = null;
        this.modalScale = 0.7;
    }

    // 更新动画队列
    Animations.update();
};

// ==================== 游戏循环 ====================
GameManager.prototype._gameLoop = function(timestamp) {
    if (!this._lastFrameTime) this._lastFrameTime = timestamp || Date.now();
    this._lastFrameTime = timestamp || Date.now();

    this.render();

    var self = this;
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function(ts) { self._gameLoop(ts); });
    } else {
        setTimeout(function() { self._gameLoop(Date.now()); }, 16);
    }
};

GameManager.prototype.startGameLoop = function() {
    this._running = true;
    this._lastFrameTime = null;
    var self = this;
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function(ts) { self._gameLoop(ts); });
    } else {
        this._gameLoop(Date.now());
    }
};

// ==================== 入口 ====================
var GameMain = {
    init: function() {
        SaveSystem.init();
        var gm = new GameManager();
        gm.init();
        gm.startGameLoop();
        return gm;
    }
};

module.exports = { GameMain: GameMain, GameManager: GameManager };

// 启动游戏
GameMain.init();