/**
 * 存档系统
 * 负责本地游戏进度的保存、读取与排行榜管理
 */
var SaveSystem = {
    STORAGE_KEY: 'cat_finder_save',
    LEADERBOARD_KEY: 'cat_finder_leaderboard',
    LEADERBOARD_MAX: 10,

    defaultData: {
        currentLevel: 0,
        unlockedLevel: 0,
        streak: 0,
        bestStreak: 0,
        settings: { music: false, sound: true, vibration: true },
        playerName: 'Player'
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

    getStreak: function() {
        return this.load().streak || 0;
    },

    getBestStreak: function() {
        return this.load().bestStreak || 0;
    },

    getLeaderboard: function() {
        try {
            var data = wx.getStorageSync(this.LEADERBOARD_KEY);
            return data || [];
        } catch(e) {
            return [];
        }
    },

    addToLeaderboard: function(name, timeMinutes) {
        var leaderboard = this.getLeaderboard();
        var now = new Date();
        var dateStr = (now.getMonth() + 1) + '/' + now.getDate() + ' ' +
                      now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

        leaderboard.push({ name: name, time: timeMinutes, date: dateStr });
        leaderboard.sort(function(a, b) { return a.time - b.time; });
        if (leaderboard.length > this.LEADERBOARD_MAX) {
            leaderboard = leaderboard.slice(0, this.LEADERBOARD_MAX);
        }

        try { wx.setStorageSync(this.LEADERBOARD_KEY, leaderboard); } catch(e) {}
        return leaderboard;
    },

    reset: function() {
        this.save(this._cloneDefault());
    }
};

module.exports = { SaveSystem: SaveSystem };