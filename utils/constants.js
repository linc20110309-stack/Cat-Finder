/**
 * 常量定义
 * 集中管理游戏中所有配置常量，方便统一维护
 */

// ==================== 屏幕尺寸 ====================
var GAME_WIDTH = 750;
var GAME_HEIGHT = 1334;

// ==================== 区域颜色（基础色）====================
var REGION_COLORS = {
    'A': '#FFD54F',
    'B': '#8BC34A',
    'C': '#FFB74D',
    'D': '#FF8A80',
    'E': '#81D4FA',
    'F': '#CE93D8',
    'G': '#80CBC4',
    'H': '#FFAB91',
    'I': '#B39DDB',
    'J': '#90CAF9',
    'K': '#FF8A65',
    'L': '#4DB6AC',
    'M': '#9575CD',
    'N': '#FF7043',
    'O': '#66BB6A',
    'P': '#42A5F5',
    'Q': '#EC407A',
    'R': '#AB47BC',
    'S': '#26A69A',
    'T': '#5C6BC0'
};

// ==================== 区域渐变（亮 -> 暗）====================
var REGION_GRADIENTS = {
    'A': ['#FFE082', '#FFD54F'],
    'B': ['#AED581', '#8BC34A'],
    'C': ['#FFB74D', '#FFA726'],
    'D': ['#FF8A80', '#FF5252'],
    'E': ['#81D4FA', '#4FC3F7'],
    'F': ['#CE93D8', '#BA68C8'],
    'G': ['#80CBC4', '#4DB6AC'],
    'H': ['#FFAB91', '#FF8A65'],
    'I': ['#B39DDB', '#9575CD'],
    'J': ['#90CAF9', '#64B5F6'],
    'K': ['#FF8A65', '#FF7043'],
    'L': ['#4DB6AC', '#26A69A'],
    'M': ['#9575CD', '#7E57C2'],
    'N': ['#FF7043', '#F4511E'],
    'O': ['#66BB6A', '#4CAF50'],
    'P': ['#42A5F5', '#2196F3'],
    'Q': ['#EC407A', '#E91E63'],
    'R': ['#AB47BC', '#9C27B0'],
    'S': ['#26A69A', '#00897B'],
    'T': ['#5C6BC0', '#3F51B5']
};

// ==================== 色盲模式（每个区域一个形状）====================
var COLORBLIND_COLORS = {
    'A': { bg: '#FFE082', pattern: 'A', shape: 'circle' },
    'B': { bg: '#AED581', pattern: 'B', shape: 'square' },
    'C': { bg: '#FFCC80', pattern: 'C', shape: 'triangle' },
    'D': { bg: '#EF9A9A', pattern: 'D', shape: 'diamond' },
    'E': { bg: '#81D4FA', pattern: 'E', shape: 'star' },
    'F': { bg: '#CE93D8', pattern: 'F', shape: 'heart' },
    'G': { bg: '#80CBC4', pattern: 'G', shape: 'cross' },
    'H': { bg: '#FFAB91', pattern: 'H', shape: 'plus' },
    'I': { bg: '#B39DDB', pattern: 'I', shape: 'minus' },
    'J': { bg: '#90CAF9', pattern: 'J', shape: 'dot' },
    'K': { bg: '#FF8A65', pattern: 'K', shape: 'ring' },
    'L': { bg: '#4DB6AC', pattern: 'L', shape: 'wave' },
    'M': { bg: '#9575CD', pattern: 'M', shape: 'zigzag' },
    'N': { bg: '#FF7043', pattern: 'N', shape: 'arrow' },
    'O': { bg: '#66BB6A', pattern: 'O', shape: 'bolt' },
    'P': { bg: '#42A5F5', pattern: 'P', shape: 'moon' },
    'Q': { bg: '#EC407A', pattern: 'Q', shape: 'sun' },
    'R': { bg: '#AB47BC', pattern: 'R', shape: 'cloud' },
    'S': { bg: '#26A69A', pattern: 'S', shape: 'leaf' },
    'T': { bg: '#5C6BC0', pattern: 'T', shape: 'box' }
};

// ==================== 粒子最大数量限制 ====================
var MAX_PARTICLES = 500;
var MAX_CAT_PARTICLES = 100;

// ==================== 棋盘坐标 ====================
var COORD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

module.exports = {
    GAME_WIDTH: GAME_WIDTH,
    GAME_HEIGHT: GAME_HEIGHT,
    REGION_COLORS: REGION_COLORS,
    REGION_GRADIENTS: REGION_GRADIENTS,
    COLORBLIND_COLORS: COLORBLIND_COLORS,
    MAX_PARTICLES: MAX_PARTICLES,
    MAX_CAT_PARTICLES: MAX_CAT_PARTICLES,
    COORD_LETTERS: COORD_LETTERS
};