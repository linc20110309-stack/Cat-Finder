// 猫咪归位 - 小程序入口
console.log('[app.js] 第1行 - 开始');

// 不使用 require，直接初始化游戏
// 因为 game.js 可能通过 app.json 的方式被自动加载

// 等待 game.js 加载完成后初始化
function initGame() {
    console.log('[app.js] initGame 被调用');
    if (typeof GameMain !== 'undefined') {
        console.log('[app.js] GameMain 存在，开始初始化');
        GameMain.init({ width: 750, height: 1334 });
    } else {
        console.log('[app.js] GameMain 未定义，2秒后重试');
        setTimeout(initGame, 2000);
    }
}

// 注册小程序
App({
    onLaunch: function() {
        console.log('[app.js] App onLaunch');
        initGame();
    }
});

console.log('[app.js] 第2行 - App 注册完成');