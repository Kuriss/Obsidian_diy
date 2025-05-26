const { Plugin } = require('obsidian');

module.exports = class ScoreRewardPlugin extends Plugin {
  async onload() {
    // 正确加载CSS的方式
    this.addStyle();

    this.registerMarkdownCodeBlockProcessor('reward', async (source, el, ctx) => {
      try {
      const file = this.app.vault.getAbstractFileByPath('Reward.md');
      if (!file) {
        el.setText("请在根目录创建 Reward.md 文件！");
        return;
      }

      // 读取 Reward.md 内容
      const content = await this.app.vault.read(file);
      // 解析 Reward.md 中的行为表和奖励表
      // 简单按 ### 行为 和 ### 奖励 分区解析
      const behaviorSection = this._extractSection(content, '行为列表');
      const rewardSection = this._extractSection(content, '奖励列表');
      const totalSection = this._extractSection(content, '总积分');

      if (!behaviorSection || !rewardSection || !totalSection) {
        el.setText("Reward.md 格式不正确，缺少【行为列表】或【奖励列表】或【总积分】分区。");
        return;
      }

      // 解析行为表，格式：行为名: 积分
      const behaviors = this._parseKVList(behaviorSection);
      // 解析奖励表，格式：奖励名: 所需积分
      const rewards = this._parseKVList(rewardSection);

      // 解析总积分（数字）
      let totalPoints = parseInt(totalSection.trim()) || 0;

      // 获取今天日期字符串 yyyy-mm-dd
      const today = new Date().toISOString().slice(0, 10);

      // 读取当天打勾状态（存在 Reward.md 中【每日记录】分区），初始化时全部未打勾
      const dailyRecordSection = this._extractSection(content, '每日记录') || '';
      // 解析每日记录为 { 日期: {行为名: 打勾（true/false） } }
      let dailyRecord = {};
      try {
        dailyRecord = JSON.parse(dailyRecordSection) || {};
      } catch (e) {
        dailyRecord = {};
      }
      if (!dailyRecord[today]) {
        // 初始化今天所有行为为 false（未打勾）
        dailyRecord[today] = {};
        for (const b of Object.keys(behaviors)) {
          dailyRecord[today][b] = false;
        }
      }

      // 容器清空，开始构造DOM
      el.empty();
      el.classList.add('reward-plugin');

      // 总积分显示
      const totalDiv = document.createElement('div');
      totalDiv.classList.add('total-points');
      totalDiv.textContent = `总积分：${totalPoints}`;

      el.appendChild(totalDiv);

      // 创建行为列表表格
      const table = document.createElement('table');
      
      // 表头
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      ['行为', '积分', '完成'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      // 表体
      const tbody = document.createElement('tbody');

      for (const [behavior, point] of Object.entries(behaviors)) {
        const tr = document.createElement('tr');

        // 行为名称
        const tdName = document.createElement('td');
        tdName.textContent = behavior;
        tr.appendChild(tdName);

        // 行为积分
        const tdPoint = document.createElement('td');
        tdPoint.textContent = point;
        tr.appendChild(tdPoint);

        // 打勾框
        const tdCheck = document.createElement('td');
        tdCheck.style.textAlign = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = dailyRecord[today][behavior] || false;
        tdCheck.appendChild(checkbox);

        // 点击事件：打勾改变积分
        checkbox.addEventListener('change', async () => {
          if (checkbox.checked) {
            // 打勾：加分
            totalPoints += Number(point);
            dailyRecord[today][behavior] = true;
          } else {
            // 取消打勾：扣分
            totalPoints -= Number(point);
            dailyRecord[today][behavior] = false;
          }
          totalDiv.textContent = `总积分：${totalPoints}`;

          // 保存回 Reward.md 文件
          await this._saveRewardMd(file, totalPoints, rewards, behaviors, dailyRecord);

          // 刷新奖励高亮
          updateRewardHighlight();
        });

        tr.appendChild(tdCheck);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      el.appendChild(table);

      // 奖励列表展示（可折叠）
      const rewardContainer = document.createElement('div');
      rewardContainer.classList.add('reward-container');
      
      const rewardHeader = document.createElement('div');
      rewardHeader.classList.add('reward-header');
      
      // 添加一个展开/折叠图标
      const toggleIcon = document.createElement('span');
      toggleIcon.classList.add('toggle-icon');
      toggleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
      rewardHeader.appendChild(toggleIcon);
      
      const rewardTitle = document.createElement('span');
      rewardTitle.textContent = '奖励列表（达到积分自动高亮）';
      rewardTitle.classList.add('reward-title');
      rewardHeader.appendChild(rewardTitle);
      
      rewardContainer.appendChild(rewardHeader);
      
      // 创建奖励列表，默认隐藏
      const rewardList = document.createElement('ul');
      rewardList.classList.add('reward-list', 'collapsed');
      
      for (const [rewardName, reqPoints] of Object.entries(rewards)) {
        const item = document.createElement('li');
        item.textContent = `${rewardName}: ${reqPoints} 分`;
        item.dataset.reqPoints = reqPoints;
        rewardList.appendChild(item);
      }
      
      rewardContainer.appendChild(rewardList);
      el.appendChild(rewardContainer);
      
      // 点击标题切换折叠状态
      rewardHeader.addEventListener('click', () => {
        rewardList.classList.toggle('collapsed');
        if (rewardList.classList.contains('collapsed')) {
          toggleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
        } else {
          toggleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
        }
      });
      
      function updateRewardHighlight() {
        for (const li of rewardList.children) {
          const req = parseInt(li.dataset.reqPoints);
          if (totalPoints >= req) {
            li.classList.add('active');
          } else {
            li.classList.remove('active');
          }
        }
      }
      updateRewardHighlight();
      } catch (error) {
        console.error("Error in ScoreRewardPlugin:", error);
        el.setText(`插件错误: ${error.message}`);
      }
    });
  }

  // 添加样式的正确方法
  addStyle() {
    // 添加一个包含所有样式的CSS文件
    this.loadStyles();
    
    // 注册样式清理函数
    this.register(() => {
      const styleElement = document.getElementById('score-reward-plugin-styles');
      if (styleElement) styleElement.remove();
    });
  }
  
  // 加载样式的方法
  loadStyles() {
    // 添加到文档中
    const styleEl = document.createElement('style');
    styleEl.id = 'score-reward-plugin-styles';
    styleEl.textContent = `
    /* 通用字体与背景 */
    .reward-plugin {
      font-family: var(--font-interface, 'Segoe UI', 'Helvetica Neue', sans-serif);
      background-color: var(--background-primary);
      padding: 18px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      transition: all 0.2s ease;
    }

    /* 总积分 */
    .reward-plugin .total-points {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 12px;
      color: var(--text-accent);
      border-bottom: 2px solid var(--background-modifier-border);
      letter-spacing: 0.5px;
    }

    /* 表格样式 */
    .reward-plugin table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 20px;
    }

    .reward-plugin thead {
      background-color: var(--background-secondary);
      border-radius: 8px;
    }

    .reward-plugin th {
      background-color: var(--background-secondary-alt);
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      border-top: 1px solid var(--background-modifier-border);
      border-bottom: 2px solid var(--background-modifier-border);
    }
    
    .reward-plugin th:first-child {
      border-top-left-radius: 8px;
      border-left: 1px solid var(--background-modifier-border);
    }
    
    .reward-plugin th:last-child {
      border-top-right-radius: 8px;
      border-right: 1px solid var(--background-modifier-border);
    }

    .reward-plugin td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--background-modifier-border-hover);
      vertical-align: middle;
    }
    
    .reward-plugin tbody tr {
      transition: background-color 0.2s ease;
    }
    
    .reward-plugin tbody tr:hover {
      background-color: var(--background-secondary);
    }

    /* 奖励列表折叠部分 */
    .reward-plugin .reward-container {
      margin-top: 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .reward-plugin .reward-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background-color: var(--background-secondary-alt);
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s ease;
    }
    
    .reward-plugin .reward-header:hover {
      background-color: var(--background-modifier-hover);
    }
    
    .reward-plugin .toggle-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background-color: var(--interactive-accent);
      color: var(--text-on-accent);
      transition: transform 0.2s ease, background-color 0.2s ease;
    }
    
    .reward-plugin .toggle-icon svg {
      transition: transform 0.2s ease;
    }
    
    .reward-plugin .reward-header:hover .toggle-icon {
      background-color: var(--interactive-accent-hover);
    }
    
    .reward-plugin .reward-title {
      font-weight: 600;
      font-size: 1rem;
    }
    
    .reward-plugin .reward-list {
      list-style-type: none;
      margin: 0;
      padding: 0;
      max-height: 300px;
      overflow-y: auto;
      transition: max-height 0.3s ease;
    }
    
    .reward-plugin .reward-list.collapsed {
      max-height: 0;
    }

    .reward-plugin .reward-list li {
      padding: 10px 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      background-color: var(--background-primary);
      transition: all 0.2s ease;
    }
    
    .reward-plugin .reward-list li:last-child {
      border-bottom: none;
    }
    
    .reward-plugin li.active {
      background-color: var(--background-modifier-success);
      color: var(--text-accent);
      font-weight: 600;
    }

    /* checkbox 样式 */
    .reward-plugin input[type="checkbox"] {
      transform: scale(1.3);
      margin: 0;
      accent-color: var(--interactive-accent);
      cursor: pointer;
    }
    `;
    document.head.appendChild(styleEl);
  }

  _extractSection(text, sectionName) {
    // 提取 markdown 中 ### sectionName 到下一个 ### 之间的内容
    const regex = new RegExp(`###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  _parseKVList(text) {
    // 解析格式为 - key: value 的列表，返回 {key: value}
    const lines = text.split('\n');
    const result = {};
    for (const line of lines) {
      const m = line.match(/^\s*-\s*(.+?)\s*:\s*(\d+)\s*$/);
      if (m) {
        result[m[1].trim()] = Number(m[2]);
      }
    }
    return result;
  }

  async _saveRewardMd(file, totalPoints, rewards, behaviors, dailyRecord) {
    // 重新生成 Reward.md 内容并保存
    // 内容结构：
    // ### 总积分
    // totalPoints
    //
    // ### 奖励列表
    // - 奖励名: 积分
    //
    // ### 行为列表
    // - 行为名: 积分
    //
    // ### 每日记录
    // JSON.stringify(dailyRecord, null, 2)

    const rewardsText = Object.entries(rewards).map(([k,v]) => `- ${k}: ${v}`).join('\n');
    const behaviorsText = Object.entries(behaviors).map(([k,v]) => `- ${k}: ${v}`).join('\n');
    const dailyRecordText = JSON.stringify(dailyRecord, null, 2);

    const newContent = `### 总积分
${totalPoints}

### 奖励列表
${rewardsText}

### 行为列表
${behaviorsText}

### 每日记录
${dailyRecordText}
`;

    await this.app.vault.modify(file, newContent);
  }

  onunload() {
    // 插件卸载时的清理工作
    console.log('积分奖励插件已卸载');
  }
};