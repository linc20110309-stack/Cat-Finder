//     存档系统
// 负责本地游戏进度的保存、读取，以及我的成绩相关数据：
//  - 首次通关时间 即毕业证书
//  - 各难度最佳时间记录
//  - 累计游玩次数
// 之前的 LEADERBOARD_KEY / addToLeaderboard / getLeaderboard 已不再使用。
var SaveSystem = {
    STORAGE_KEY: 'cat_finder_save',

    defaultData: {
        currentLevel: 0,
        unlockedLevel: 0,
        streak: 0,
        bestStreak: 0,
//         各难度最佳时间，单位为分钟，结构: { '4': minutes, '5': minutes, ... }
        bestTimes: {},
        // 累计游玩次数
        totalPlays: 0,
//         首次通关时间，单位为分钟；未通关则为 null
        firstClearTime: null,
        settings: { music: false, sound: true, vibration: true }
    },

    init: function() {
        try {
            var data = wx.getStorageSync(this.STORAGE_KEY);
            if (!data) this.save(this.defaultData);
        } catch(e) {
            this.save(this.defaultData);
        }
    },

    load: function() {
        try {
            var data = wx.getStorageSync(this.STORAGE_KEY);
            return data || this._cloneDefault();
        } catch(e) {
            return this._cloneDefault();
        }
    },

    save: function(data) {
        try { wx.setStorageSync(this.STORAGE_KEY, data); } catch(e) {}
    },

    _cloneDefault: function() {
        // 返回深拷贝，避免共享引用被外部修改
        return JSON.parse(JSON.stringify(this.defaultData));
    },

    updateSetting: function(key, value) {
        var data = this.load();
        if (!data.settings) {
            data.settings = { music: false, sound: true, vibration: true };
        }
        data.settings[key] = value;
        this.save(data);
    },

    getSetting: function(key) {
        var data = this.load();
        return data && data.settings ? data.settings[key] : undefined;
    },

    setCurrentLevel: function(level) {
        var data = this.load();
        data.currentLevel = level;
        this.save(data);
    },

    getCurrentLevel: function() {
        return this.load().currentLevel || 0;
    },

    setUnlockedLevel: function(level) {
        var data = this.load();
        if (level > (data.unlockedLevel || 0)) {
            data.unlockedLevel = level;
            this.save(data);
        }
    },

    getUnlockedLevel: function() {
        return this.load().unlockedLevel || 0;
    },

    setStreak: function(streak) {
        var data = this.load();
        data.streak = streak;
        if (streak > (data.bestStreak || 0)) data.bestStreak = streak;
        this.save(data);
    },

//     连胜：当前连胜 + 历史最佳连胜（首页“最佳”卡还在使用 getBestStreak）
    getStreak: function() {
        return this.load().streak || 0;
    },
    getBestStreak: function() {
        return this.load().bestStreak || 0;
    },

//     累计游玩次数
    getTotalPlays: function() {
        return this.load().totalPlays || 0;
    },
    incrementTotalPlays: function() {
        var data = this.load();
        data.totalPlays = (data.totalPlays || 0) + 1;
        this.save(data);
    },

//     首次通关时间即毕业证书。仅在未通关过任何关卡时设置，后续通关不会覆盖。
    getFirstClearTime: function() {
        return this.load().firstClearTime || null;
    },
    setFirstClearTime: function(timeMinutes) {
        var data = this.load();
        if (data.firstClearTime == null) {
            data.firstClearTime = timeMinutes;
            this.save(data);
        }
    },

//     各难度最佳通关时间
    getAllBestTimes: function() {
        var data = this.load();
        return data.bestTimes || {};
    },
    getBestTime: function(size) {
        var data = this.load();
        var bt = data.bestTimes;
        return bt && bt[size] != null ? bt[size] : null;
    },
    setBestTime: function(size, timeMinutes) {
        var data = this.load();
        if (!data.bestTimes) data.bestTimes = {};
        if (data.bestTimes[size] == null || timeMinutes < data.bestTimes[size]) {
            data.bestTimes[size] = timeMinutes;
            this.save(data);
        }
    },

    reset: function() {
        this.save(this._cloneDefault());
    }
};

module.exports = { SaveSystem: SaveSystem };