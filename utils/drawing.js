/**
 * 绘图工具集合
 * 集中提供 Canvas 2D 常用图形的绘制函数
 */

// ==================== 圆角矩形路径 ====================
function roundRect(ctx, x, y, w, h, r) {
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
}

// ==================== 实心心形 ====================
function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    var topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + size * 0.55, x + size / 2, y + size * 0.8, x + size / 2, y + size);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.8, x + size, y + size * 0.55, x + size, y + topCurveHeight);
    ctx.bezierCurveTo(x + size, y, x + size / 2, y, x + size / 2, y + topCurveHeight);
    ctx.fill();
    ctx.restore();
}

// ==================== 3D 心形（带高光与心跳）====================
function draw3DHeart(ctx, x, y, size, isActive) {
    ctx.save();
    var mainColor = isActive ? '#FF6B8A' : '#E0E0E0';
    var shadowColor = isActive ? '#D64555' : '#CCCCCC';
    var scale = isActive ? (1 + Math.sin(Date.now() / 200) * 0.08) : 1;

    // 缩放变换中心
    ctx.translate(x + size / 2, y + size / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + size / 2), -(y + size / 2));

    // 阴影层
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    var topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + size / 2, y + 2, x + 2, y + 2, x + 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + 2, y + size * 0.55 + 2, x + size / 2, y + size * 0.8 + 2, x + size / 2, y + size + 2);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.8 + 2, x + size - 2, y + size * 0.55 + 2, x + size - 2, y + topCurveHeight + 2);
    ctx.bezierCurveTo(x + size - 2, y + 2, x + size / 2, y + 2, x + size / 2, y + topCurveHeight + 2);
    ctx.fill();

    // 主体
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + size * 0.55, x + size / 2, y + size * 0.8, x + size / 2, y + size);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.8, x + size, y + size * 0.55, x + size, y + topCurveHeight);
    ctx.bezierCurveTo(x + size, y, x + size / 2, y, x + size / 2, y + topCurveHeight);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.35, y + size * 0.35, size * 0.15, size * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==================== 双层阴影卡片 ====================
function drawDoubleShadowCard(ctx, x, y, w, h, r) {
    ctx.shadowColor = 'rgba(102, 126, 234, 0.12)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// ==================== 色盲模式形状 ====================
function drawColorblindShape(ctx, x, y, size, shape, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;

    var cx = x + size / 2;
    var cy = y + size / 2;
    var s = size * 0.3;

    switch (shape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(cx, cy, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
        case 'square':
            ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
            ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s, cy + s);
            ctx.lineTo(cx - s, cy + s);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s, cy);
            ctx.lineTo(cx, cy + s);
            ctx.lineTo(cx - s, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'star':
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                var px = cx + Math.cos(angle) * s;
                var py = cy + Math.sin(angle) * s;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        default:
            ctx.font = 'bold ' + (size * 0.4) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(shape.charAt(0), cx, cy);
    }

    ctx.restore();
}

// ==================== 颜色加深辅助 ====================
function darkenColor(hexColor, map) {
    return (map && map[hexColor]) || hexColor;
}

module.exports = {
    roundRect: roundRect,
    drawHeart: drawHeart,
    draw3DHeart: draw3DHeart,
    drawDoubleShadowCard: drawDoubleShadowCard,
    drawColorblindShape: drawColorblindShape,
    darkenColor: darkenColor
};