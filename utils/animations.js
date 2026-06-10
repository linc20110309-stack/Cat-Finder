/**
 * 简单动画队列
 * 用于驱动各种短暂动画（抖动、缩放、淡入淡出等）
 */
var Animations = {
    list: [],

    add: function(anim) {
        anim.startTime = Date.now();
        this.list.push(anim);
    },

    update: function() {
        var now = Date.now();
        // 倒序遍历，安全的删除
        for (var i = this.list.length - 1; i >= 0; i--) {
            var anim = this.list[i];
            var progress = (now - anim.startTime) / anim.duration;
            if (progress >= 1) {
                if (anim.onComplete) anim.onComplete();
                this.list.splice(i, 1);
            }
        }
    },

    get: function(id) {
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i].id === id) return this.list[i];
        }
        return null;
    },

    clear: function() {
        this.list.length = 0;
    },

    // 抖动偏移量计算（按 progress 衰减）
    shakeOffset: function(anim, amplitude) {
        if (!anim) return 0;
        var progress = (Date.now() - anim.startTime) / anim.duration;
        if (progress >= 1) return 0;
        return Math.sin(progress * Math.PI * 4) * amplitude * (1 - progress);
    }
};

module.exports = { Animations: Animations };