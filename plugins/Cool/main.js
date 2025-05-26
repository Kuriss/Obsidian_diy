const { Plugin, Notice } = require('obsidian');

const INSPIRATION_FILE = "笔记卡.md"; // 你可以自定义文件名

module.exports = class InspirationCardPlugin extends Plugin {
    async onload() {
        // 注入美化CSS
        const style = document.createElement('style');
        style.textContent = `
        .inspiration-card-obsidian {
            position: fixed;
            top: 60px;
            right: 40px;
            min-width: 220px;
            max-width: 420px;
            max-height: 60vh;
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(8px) saturate(1.2);
            border-radius: 18px;
            box-shadow: 0 4px 32px #23252633;
            z-index: 9999;
            padding: 28px 36px 24px 28px;
            font-size: 1.15em;
            font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
            animation: inspiration-pop 0.5s cubic-bezier(.68,-0.55,.27,1.55);
            transition: opacity 0.4s, transform 0.4s;
            opacity: 1;
            color: #232526;
            border: 1.5px solid #00ffe7;
            display: flex;
            flex-direction: column;
            align-items: center;
            word-break: break-all;
            overflow: auto;
        }
        .inspiration-card-obsidian.hide {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
        }
        @keyframes inspiration-pop {
            0% { opacity: 0; transform: translateY(-40px) scale(0.8);}
            100% { opacity: 1; transform: translateY(0) scale(1);}
        }
        .inspiration-card-obsidian .inspiration-close {
            position: absolute;
            top: 10px; right: 18px;
            font-size: 1.5em;
            color: #ff00cc;
            cursor: pointer;
            transition: color 0.2s;
            font-family: inherit;
        }
        .inspiration-card-obsidian .inspiration-close:hover {
            color: #fff;
        }
        .inspiration-card-obsidian .inspiration-content {
            text-align: center;
            font-weight: bold;
            text-shadow: 0 0 4px #00ffe7, 0 0 1px #ff00cc;
            letter-spacing: 1px;
            word-break: break-all;
            margin-top: 8px;
            margin-bottom: 2px;
            line-height: 1.7;
            max-width: 100%;
            max-height: 45vh;
            overflow: auto;
        }
        body.theme-dark .inspiration-card-obsidian {
            background: rgba(34, 40, 49, 0.85);
            color: #00ffe7;
            border: 1.5px solid #00ffe7;
        }
        body.theme-dark .inspiration-card-obsidian .inspiration-content {
            text-shadow: 0 0 4px #00ffe7, 0 0 1px #ff00cc;
        }
        `;
        document.head.appendChild(style);

        // 添加右上角按钮
        this.addRibbonIcon('dice', '随机笔记卡片', async () => {
            const inspiration = await this.getRandomInspiration();
            if (inspiration) this.showInspirationCard(inspiration);
            else new Notice("笔记为空，请先添加内容！");
        });

        // 添加右键菜单：选中文字加入灵感库
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                const selected = editor.getSelection();
                if (selected && selected.trim().length > 0) {
                    menu.addItem(item => {
                        item.setTitle("加入笔记池")
                            .setIcon("plus")
                            .onClick(async () => {
                                await this.addInspiration(selected.trim());
                                new Notice("已加入笔记池！");
                            });
                    });
                }
            })
        );
    }

    // 从灵感库随机取一条
    async getRandomInspiration() {
        try {
            const file = this.app.vault.getAbstractFileByPath(INSPIRATION_FILE);
            if (!file) return null;
            const content = await this.app.vault.read(file);
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) return null;
            return lines[Math.floor(Math.random() * lines.length)];
        } catch (e) {
            return null;
        }
    }

    // 添加灵感到灵感库
    async addInspiration(text) {
        let file = this.app.vault.getAbstractFileByPath(INSPIRATION_FILE);
        if (!file) {
            await this.app.vault.create(INSPIRATION_FILE, text + "\n");
        } else {
            await this.app.vault.append(file, text + "\n");
        }
    }

    // 展示卡片
    showInspirationCard(text) {
        // 创建卡片元素
        const card = document.createElement('div');
        card.className = 'inspiration-card-obsidian';
        card.innerHTML = `
            <span class="inspiration-close">&times;</span>
            <div class="inspiration-content">${text}</div>
        `;

        // 关闭按钮
        card.querySelector('.inspiration-close').onclick = () => {
            card.classList.add('hide');
            setTimeout(() => card.remove(), 400);
        };

        // 自动消失
        setTimeout(() => {
            if (card.parentNode) {
                card.classList.add('hide');
                setTimeout(() => card.remove(), 400);
            }
        }, 6000);

        // 插入到body
        document.body.appendChild(card);
    }

    onunload() {
        document.querySelectorAll('.inspiration-card-obsidian').forEach(e => e.remove());
    }
};