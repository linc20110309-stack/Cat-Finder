/**
 * 音效系统
 * 封装微信小游戏音频 API，支持音效、背景音乐与震动
 *
 * 注意：本模块依赖 SaveSystem（用于读取音效/音乐开关），
 *      通过 require 在使用本模块前确保已加载 storage.js。
 */
var AudioManager = {
    SOUND_NAMES: ['correct', 'error', 'victory', 'fail', 'click'],
    sounds: {},
    bgMusic: null,

    init: function(saveSystem) {
        this._save = saveSystem;
        var i;
        for (i = 0; i < this.SOUND_NAMES.length; i++) {
            try {
                var ctx = wx.createInnerAudioContext();
                ctx.src = 'audio/' + this.SOUND_NAMES[i] + '.mp3';
                ctx.obeyMuteSwitch = false;
                this.sounds[this.SOUND_NAMES[i]] = ctx;
            } catch(e) {}
        }

        // 背景音乐
        try {
            this.bgMusic = wx.createInnerAudioContext();
            this.bgMusic.src = 'audio/bgm.mp3';
            this.bgMusic.loop = true;
            this.bgMusic.obeyMuteSwitch = false;
            this.bgMusic.volume = 0.5;
        } catch(e) {}
    },

    play: function(name) {
        if (this._save && !this._save.getSetting('sound')) return;
        try {
            var sound = this.sounds[name];
            if (sound) {
                sound.stop();
                sound.play();
            }
        } catch(e) {}
    },

    playBgMusic: function() {
        if (this._save && !this._save.getSetting('music')) return;
        try { if (this.bgMusic) this.bgMusic.play(); } catch(e) {}
    },

    stopBgMusic: function() {
        try { if (this.bgMusic) this.bgMusic.stop(); } catch(e) {}
    },

    pauseBgMusic: function() {
        try { if (this.bgMusic) this.bgMusic.pause(); } catch(e) {}
    },

    vibrate: function() {
        if (this._save && !this._save.getSetting('vibration')) return;
        try {
            if (typeof wx !== 'undefined' && wx.vibrateShort) {
                wx.vibrateShort({ success: function() {} });
            }
        } catch(e) {}
    }
};

module.exports = { AudioManager: AudioManager };