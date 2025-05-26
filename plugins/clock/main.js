// main.js
module.exports = class ClockComponentPlugin extends require('obsidian').Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor('clock', (source, el, ctx) => {
            // 解析参数
            let format = "HH:mm:ss";
            let color = "#00ffe7";
            source.split('\n').forEach(line => {
                if (line.startsWith('format:')) format = line.replace('format:', '').trim();
                if (line.startsWith('color:')) color = line.replace('color:', '').trim();
            });

            // 创建时钟元素
            const clockEl = document.createElement('span');
            clockEl.style.color = color;
            clockEl.style.fontWeight = 'bold';
            clockEl.style.fontFamily = 'Consolas, Monaco, monospace';
            clockEl.style.fontSize = '1.2em';

            const updateClock = () => {
                const now = new Date();
                // 简单格式化
                let timeStr = now.toLocaleTimeString();
                if (format === "HH:mm:ss") {
                    timeStr = now.toTimeString().slice(0,8);
                }
                clockEl.textContent = timeStr;
            };
            updateClock();
            setInterval(updateClock, 1000);

            el.appendChild(clockEl);
        });
    }
};