/**
 * 通用 UI 组件
 * 提供按钮、卡片、弹窗等通用 UI 元素的渲染函数
 *
 * 所有渲染函数都接收 ctx + 位置/样式参数，返回绘制结果信息
 * （部分返回 hit area，供触摸检测使用）
 */
var UI = {

    // 渐变按钮（带按压缩放）
    drawGradientButton: function(ctx, opts) {
        var x = opts.x, y = opts.y, w = opts.width, h = opts.height;
        var bgColor = opts.bgColor || '#667eea';
        var darkColor = opts.darkenColor || bgColor;
        var isDisabled = opts.disabled || false;
        var isPressed = opts.pressed || false;
        var scale = isPressed ? (opts.pressScale || 0.95) : 1;
        var radius = opts.radius !== undefined ? opts.radius : Math.floor(h / 2);

        ctx.save();
        // 按压缩放（中心点变换）
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(x + w / 2), -(y + h / 2));

        // 渐变背景
        var grad = ctx.createLinearGradient(x, y, x, y + h);
        if (isDisabled) {
            grad.addColorStop(0, '#CCCCCC');
            grad.addColorStop(1, '#AAAAAA');
        } else {
            grad.addColorStop(0, bgColor);
            grad.addColorStop(1, darkColor);
        }
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = isPressed ? 2 : 4;
        this._roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // 顶部高光
        if (!isDisabled) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this._roundRect(ctx, x + 4, y + 4, w - 8, (h - 8) / 2, radius - 4);
            ctx.fill();
        }

        // 文字
        ctx.fillStyle = isDisabled ? '#888888' : (opts.textColor || '#ffffff');
        ctx.font = opts.font || ('bold ' + Math.floor(h * 0.4) + 'px sans-serif');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var label = opts.icon ? (opts.icon + ' ' + opts.label) : opts.label;
        ctx.fillText(label, x + w / 2, y + h / 2 + (opts.textOffsetY || 0));

        ctx.restore();
    },

    // 通用圆角矩形填充
    _roundRect: function(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    // 圆形 FAB 按钮
    drawCircleButton: function(ctx, x, y, r, icon, opts) {
        opts = opts || {};
        ctx.save();
        ctx.fillStyle = opts.bgColor || 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = opts.iconColor || '#ffffff';
        ctx.font = opts.font || (Math.floor(r * 0.78) + 'px sans-serif');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
        ctx.restore();
    },

    // 信息小卡片（带阴影）
    drawInfoCard: function(ctx, x, y, w, h, opts) {
        opts = opts || {};
        ctx.save();
        ctx.fillStyle = opts.bgColor || '#ffffff';
        if (opts.shadow !== false) {
            ctx.shadowColor = opts.shadowColor || 'rgba(0, 0, 0, 0.08)';
            ctx.shadowBlur = opts.shadowBlur || 12;
            ctx.shadowOffsetY = opts.shadowOffsetY || 4;
        }
        this._roundRect(ctx, x, y, w, h, opts.radius || 20);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
    },

    // 弹窗容器（带弹性缩放中心）
    drawModalContainer: function(ctx, modalW, modalH, opts) {
        opts = opts || {};
        var modalX = (GAME_WIDTH - modalW) / 2;
        var modalY = (GAME_HEIGHT - modalH) / 2 - 20;
        var scale = opts.scale || 1;
        var shadowColor = opts.shadowColor || 'rgba(102, 126, 234, 0.3)';
        var radius = opts.radius || 32;

        ctx.save();
        // 中心缩放实现弹性动画
        ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);

        // 主卡片（带阴影）
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = opts.bgColor || '#ffffff';
        this._roundRect(ctx, modalX, modalY, modalW, modalH, radius);
        ctx.fill();

        // 顶部装饰条（可选）
        if (opts.headerHeight) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            var headerGrad = ctx.createLinearGradient(modalX, modalY, modalX + modalW, modalY);
            for (var i = 0; i < opts.headerGradient.length; i++) {
                headerGrad.addColorStop(i / (opts.headerGradient.length - 1), opts.headerGradient[i]);
            }
            ctx.fillStyle = headerGrad;
            this._roundRect(ctx, modalX, modalY, modalW, opts.headerHeight, radius);
            ctx.fill();
            // 抹掉下半圆角
            ctx.fillRect(modalX, modalY + opts.headerHeight / 2, modalW, opts.headerHeight / 2);
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        ctx.restore();
        return { x: modalX, y: modalY, w: modalW, h: modalH };
    },

    // 时间格式化
    formatTime: function(minutes) {
        if (minutes < 1) return Math.round(minutes * 60) + 's';
        return minutes.toFixed(1) + 'm';
    },

    // 弹性缓动函数
    elasticScale: function(progress) {
        if (progress >= 1) return 1;
        return 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 2.5) * (1 - progress);
    },

    // 屏幕闪烁效果
    drawScreenFlash: function(ctx, startTime, duration, color, maxAlpha) {
        var elapsed = Date.now() - startTime;
        var progress = elapsed / duration;
        if (progress >= 1) return false;
        var alpha = (maxAlpha || 0.4) * (1 - progress);
        ctx.fillStyle = 'rgba(' + color + ', ' + alpha + ')';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        return true;
    }
};

module.exports = { UI: UI };