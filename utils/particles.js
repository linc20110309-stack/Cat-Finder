/**
 * 粒子系统
 * 提供彩色粒子（金色、彩纸）与更新/渲染的统一接口
 */
var Particles = {
    MAX_PARTICLES: 500,
    MAX_CAT_PARTICLES: 100,

    // 创建一束彩色纸屑粒子（顶部下落）
    spawnConfetti: function(list, count, width) {
        if (!list) return;
        for (var i = 0; i < count; i++) {
            list.push({
                x: Math.random() * width,
                y: -20 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 3 + 2,
                size: Math.random() * 8 + 4,
                color: Math.random() > 0.5 ? '#ffd700' : '#ffffff',
                alpha: 1
            });
        }
    },

    // 创建金色粒子爆炸（猫被找到时）
    spawnGoldBurst: function(list, x, y, count) {
        if (!list) return;
        count = count || 20;
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            var speed = 2 + Math.random() * 3;
            list.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.3 ? '#FFD700' : '#FFF8DC',
                alpha: 1,
                life: 1
            });
        }
    },

    // 更新彩色纸屑（下落 + 衰减）
    updateConfetti: function(list) {
        if (!list) return;
        // 限制数量
        while (list.length > this.MAX_PARTICLES) list.shift();
        for (var i = list.length - 1; i >= 0; i--) {
            var p = list[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.01;
            // 超出底部或完全透明时移除
            if (p.y > 1500 || p.alpha <= 0) {
                list.splice(i, 1);
            }
        }
    },

    // 更新金色粒子（带重力 + 尺寸衰减）
    updateGold: function(list) {
        if (!list) return;
        while (list.length > this.MAX_CAT_PARTICLES) list.shift();
        for (var i = list.length - 1; i >= 0; i--) {
            var p = list[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.alpha -= 0.03;
            p.life -= 0.03;
            p.size *= 0.97;
            if (p.alpha <= 0 || p.life <= 0) {
                list.splice(i, 1);
            }
        }
    },

    // 渲染彩色纸屑
    renderConfetti: function(ctx, list) {
        if (!list || !ctx) return;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // 渲染金色粒子（带发光）
    renderGold: function(ctx, list) {
        if (!list || !ctx) return;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
};

module.exports = { Particles: Particles };