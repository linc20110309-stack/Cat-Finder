/**
 * 存档系统 - 使用本地存储保存游戏进度
 */
const SaveSystem = {
    STORAGE_KEY: 'cat_finder_save',

    // 默认存档数据
    defaultData: {
        currentLevel: 0,
        completedLevels: [],
        settings: {
            soundEnabled: true,
            musicEnabled: true
        },
        progress: {
            easy: [],
            normal: [],
            hard: []
        }
    },

    // 初始化存档
    init() {
        try {
            const savedData = wx.getStorageSync(this.STORAGE_KEY);
            if (!savedData) {
                this.save(this.defaultData);
            }
        } catch (e) {
            console.error('存档初始化失败:', e);
            this.save(this.defaultData);
        }
    },

    // 获取存档
    load() {
        try {
            const data = wx.getStorageSync(this.STORAGE_KEY);
            return data || this.defaultData;
        } catch (e) {
            console.error('读取存档失败:', e);
            return this.defaultData;
        }
    },

    // 保存存档
    save(data) {
        try {
            wx.setStorageSync(this.STORAGE_KEY, data);
        } catch (e) {
            console.error('保存存档失败:', e);
        }
    },

    // 获取当前关卡
    getCurrentLevel() {
        const data = this.load();
        return data.currentLevel || 0;
    },

    // 设置当前关卡
    setCurrentLevel(levelId) {
        const data = this.load();
        data.currentLevel = levelId;
        this.save(data);
    },

    // 获取已完成关卡
    getCompletedLevels(difficulty = null) {
        const data = this.load();
        if (difficulty) {
            return data.progress[difficulty] || [];
        }
        return data.completedLevels || [];
    },

    // 完成关卡
    completeLevel(levelId, difficulty, moves = 0, time = 0) {
        const data = this.load();

        // 添加到已完成列表
        if (!data.completedLevels.includes(levelId)) {
            data.completedLevels.push(levelId);
        }

        // 添加到难度进度
        if (!data.progress[difficulty].includes(levelId)) {
            data.progress[difficulty].push(levelId);
        }

        // 保存最佳成绩
        const key = `best_${difficulty}_${levelId}`;
        const existing = data[key];
        if (!existing || moves < existing.moves || time < existing.time) {
            data[key] = { moves, time, timestamp: Date.now() };
        }

        this.save(data);
    },

    // 获取最佳成绩
    getBestScore(difficulty, levelId) {
        const data = this.load();
        const key = `best_${difficulty}_${levelId}`;
        return data[key] || null;
    },

    // 重置存档
    reset() {
        this.save(this.defaultData);
    },

    // 获取统计数据
    getStats() {
        const data = this.load();
        return {
            totalCompleted: data.completedLevels.length,
            easyCompleted: data.progress.easy.length,
            normalCompleted: data.progress.normal.length,
            hardCompleted: data.progress.hard.length
        };
    }
};

// 导出
module.exports = { SaveSystem };