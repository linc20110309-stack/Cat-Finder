/**
 * 游戏主类 - 负责场景管理和页面切换
 */

// 保存全局引用
let _gameInstance = null;

/**
 * 场景基类
 */
class Scene {
    constructor(game) {
        this.game = game;
        this.width = game.width;
        this.height = game.height;
        this.buttons = [];
        this.touchStartTime = 0;
        this.touchStartPos = null;
    }

    onEnter() {}
    onExit() {}
    update() {}
    render(ctx) {}

    // 检查点是否在矩形内
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }

    // 创建按钮
    createButton(x, y, width, height, text, callback, options = {}) {
        return {
            x, y, width, height, text, callback,
            bgColor: options.bgColor || '#FFB6C1',
            textColor: options.textColor || '#FFFFFF',
            borderColor: options.borderColor || '#FF69B4',
            borderWidth: options.borderWidth || 3,
            radius: options.radius || 20,
            fontSize: options.fontSize || 32
        };
    }

    // 绘制圆角矩形
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

/**
 * 游戏主类
 */
class GameMain {
    static scenes = {};
    static currentScene = null;
    static config = null;
    static currentLevelData = null;

    static init(options) {
        this.config = options;
        this.width = options.width || 750;
        this.height = options.height || 1200;

        // 创建画布
        this.canvas = wx.createCanvas();
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');

        // 初始化存档系统
        SaveSystem.init();

        // 注册场景
        this.registerScenes();

        // 设置触摸事件
        this.setupTouchEvents();

        // 启动游戏循环
        this.startGameLoop();

        // 默认进入首页
        this.switchScene('index');

        console.log('Cat Finder 游戏初始化完成');
    }

    static registerScenes() {
        // 创建场景实例
        this.scenes = {
            'index': new IndexScene(this),
            'game': new GameScene(this),
            'level': new LevelScene(this),
            'settings': new SettingsScene(this)
        };
    }

    static switchScene(sceneName) {
        // 离开当前场景
        if (this.currentScene) {
            this.currentScene.onExit();
        }

        // 进入新场景
        this.currentScene = this.scenes[sceneName];
        if (this.currentScene) {
            this.currentScene.onEnter();
        }
    }

    static setupTouchEvents() {
        const game = this;
        
        this.canvas.addEventListener('touchstart', function(e) {
            if (game.currentScene && game.currentScene.onTouch) {
                const touch = e.touches[0];
                const sysInfo = wx.getSystemInfoSync();
                game.currentScene.onTouch('touchstart', {
                    x: touch.clientX * (game.width / sysInfo.windowWidth),
                    y: touch.clientY * (game.height / sysInfo.windowHeight)
                });
            }
        }, false);

        this.canvas.addEventListener('touchend', function(e) {
            if (game.currentScene && game.currentScene.onTouch) {
                const touch = e.changedTouches[0];
                const sysInfo = wx.getSystemInfoSync();
                game.currentScene.onTouch('touchend', {
                    x: touch.clientX * (game.width / sysInfo.windowWidth),
                    y: touch.clientY * (game.height / sysInfo.windowHeight)
                });
            }
        }, false);
    }

    static startGameLoop() {
        const game = this;
        const loop = function() {
            // 更新
            if (game.currentScene) {
                game.currentScene.update();
            }

            // 渲染
            game.render();

            requestAnimationFrame(loop);
        };
        loop();
    }

    static render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 渲染当前场景
        if (this.currentScene) {
            this.currentScene.render(this.ctx);
        }
    }
}

// 导出到全局
module.exports = { GameMain, Scene };