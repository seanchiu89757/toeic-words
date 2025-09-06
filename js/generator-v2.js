// 全新多益單字生成器 V2.0 - 高效低成本版本
// 主要改進：使用GPT-3.5-turbo、簡化邏輯、強化防重複機制

class WordGeneratorV2 {
    constructor() {
        this.apiKey = null;
        this.existingWords = new Set();
        this.recentWords = [];
        this.isGenerating = false;
        
        // 成本監控
        this.costMonitor = {
            totalTokens: 0,
            totalCost: 0,
            dailyLimit: 10, // 10美元日限制
            sessionCalls: 0
        };
        
        // 生成配置
        this.config = {
            batchSize: 5,      // 固定小批次
            maxRetries: 2,     // 減少重試
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            avoidListLimit: 30 // 只傳送最關鍵的30個禁止單字
        };
        
        // 各等級目標數量
        this.targetCounts = {
            '300以下': 200,
            '300-500': 500,
            '500-600': 800,
            '600-700': 1000,
            '700-800': 1200,
            '800-900': 800,
            '900以上': 500
        };

        // 後備詞庫 - 當API失敗時使用
        this.backupWords = {
            '300-500': [
                'business', 'company', 'service', 'product', 'customer', 'office', 'meeting',
                'email', 'phone', 'order', 'price', 'quality', 'delivery', 'contract'
            ],
            '500-600': [
                'negotiate', 'proposal', 'budget', 'profit', 'investment', 'strategy',
                'analysis', 'training', 'certificate', 'experience'
            ],
            '600-700': [
                'implementation', 'coordination', 'partnership', 'expansion', 'innovation',
                'infrastructure', 'supervision', 'recommendation', 'specification'
            ]
        };
    }

    // 設定 API Key
    setApiKey(key) {
        this.apiKey = key;
    }

    // 測試 API 連線
    async testAPIConnection() {
        if (!this.apiKey) {
            throw new Error('請先輸入 API Key');
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('API Key 無效或連線失敗');
            }

            return { success: true, message: 'API 連線成功' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // 載入現有單字到記憶體
    async loadExistingWords() {
        try {
            await wordDB.init();
            const allWords = await wordDB.getAllWords();
            
            this.existingWords.clear();
            this.recentWords = [];
            
            for (const word of allWords) {
                this.existingWords.add(word.word.toLowerCase());
            }
            
            // 保存最近50個單字用於禁止列表
            this.recentWords = allWords.slice(-50).map(w => w.word.toLowerCase());
            
            console.log(`✅ 載入 ${this.existingWords.size} 個現有單字`);
            
        } catch (error) {
            console.error('載入現有單字失敗:', error);
        }
    }

    // 建立最精簡的 prompt
    buildMinimalPrompt(level, count, avoidWords) {
        const levelDescriptions = {
            '300以下': 'basic daily words',
            '300-500': 'basic business words', 
            '500-600': 'intermediate business words',
            '600-700': 'advanced business words',
            '700-800': 'professional business words',
            '800-900': 'expert business words',
            '900以上': 'advanced vocabulary words'
        };

        // 極簡 prompt - 只包含必要信息
        return `Generate ${count} different TOEIC ${level} words (${levelDescriptions[level]}).

Skip these: ${avoidWords.slice(0, 20).join(', ')}

Return JSON only:
{"words":[{"word":"example","chinese":"範例","phonetic":"/ɪɡˈzɑːmpl/","part_of_speech":"noun","toeic_example":{"sentence":"Here is an example.","chinese":"這是一個例子。"}}]}`;
    }

    // 獲取必須避免的單字（智能篩選）
    getMustAvoidWords(level) {
        // 1. 該等級的所有單字
        const levelWords = Array.from(this.existingWords);
        
        // 2. 最近生成的單字
        const recent = this.recentWords;
        
        // 3. 高頻重複單字（從統計中獲取）
        const highFreq = ['schedule', 'meeting', 'client', 'report', 'budget'];
        
        // 合併並去重，只取最關鍵的
        const combined = [...new Set([...highFreq, ...recent])];
        
        return combined.slice(0, this.config.avoidListLimit);
    }

    // 核心生成方法 - 簡潔高效
    async generateBatch(level, count = 5) {
        if (!this.apiKey) {
            throw new Error('請先設定 API Key');
        }

        // 檢查成本限制
        if (this.costMonitor.totalCost >= this.costMonitor.dailyLimit) {
            throw new Error('已達今日成本限制');
        }

        console.log(`🚀 開始生成 ${count} 個 ${level} 單字`);

        // 1. 準備必要資訊
        const mustAvoid = this.getMustAvoidWords(level);
        const prompt = this.buildMinimalPrompt(level, count, mustAvoid);
        
        console.log(`📝 Prompt 長度: ${prompt.length} 字元`);
        console.log(`🚫 避免單字: ${mustAvoid.slice(0, 10).join(', ')}...`);

        // 2. 單次 API 調用 - 不複雜化
        try {
            const result = await this.callAPI(prompt, count);
            console.log(`📦 收到 ${result.words.length} 個候選單字`);
            
            // 3. 驗證和過濾
            const validWords = this.filterValidWords(result.words, level);
            console.log(`✅ 通過驗證: ${validWords.length} 個單字`);
            
            return validWords;

        } catch (error) {
            console.error('❌ 生成失敗:', error.message);
            
            // 使用後備詞庫
            console.log('🔄 使用後備詞庫...');
            return this.getBackupWords(level, count);
        }
    }

    // 簡化的 API 調用
    async callAPI(prompt, count) {
        const startTime = Date.now();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Generate unique TOEIC words. Return only JSON format.'
                    },
                    {
                        role: 'user',  
                        content: prompt
                    }
                ],
                temperature: this.config.temperature,
                max_tokens: 120 * count // 精準計算
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API 呼叫失敗');
        }

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // 記錄成本
        this.trackCost(data.usage);
        console.log(`💰 用量 - Input: ${data.usage.prompt_tokens}, Output: ${data.usage.completion_tokens}, 耗時: ${duration}ms`);

        // 解析回應
        return this.parseResponse(data.choices[0].message.content.trim());
    }

    // 簡化的 JSON 解析 - 不嘗試修復
    parseResponse(text) {
        console.log('🔍 解析回應:', text.substring(0, 200) + '...');
        
        try {
            // 尋找 JSON 部分
            const jsonMatch = text.match(/\{.*\}/s);
            if (!jsonMatch) {
                throw new Error('回應中沒有找到 JSON');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            if (!parsed.words || !Array.isArray(parsed.words)) {
                throw new Error('JSON 格式不正確');
            }
            
            return parsed;
            
        } catch (error) {
            console.error('❌ JSON 解析失敗:', error.message);
            // 失敗就失敗，不嘗試修復
            return { words: [] };
        }
    }

    // 智能單字驗證和過濾
    filterValidWords(words, level) {
        const validWords = [];
        const seenInBatch = new Set();
        
        for (const wordObj of words) {
            if (!wordObj.word || !wordObj.chinese) {
                console.log(`⚠️ 跳過不完整單字:`, wordObj);
                continue;
            }
            
            const word = wordObj.word.toLowerCase().trim();
            
            // 檢查1：批次內重複
            if (seenInBatch.has(word)) {
                console.log(`❌ 批次內重複: ${word}`);
                continue;
            }
            
            // 檢查2：資料庫重複
            if (this.existingWords.has(word)) {
                console.log(`❌ 資料庫重複: ${word}`);
                continue;
            }
            
            // 檢查3：相似度檢查 - 避免複數形式重複
            if (this.isTooSimilar(word)) {
                console.log(`❌ 過於相似: ${word}`);
                continue;
            }
            
            // 通過所有檢查
            seenInBatch.add(word);
            this.existingWords.add(word); // 加入記憶體避免後續重複
            wordObj.level = level; // 確保等級正確
            validWords.push(wordObj);
            
            console.log(`✅ 接受單字: ${word} (${wordObj.chinese})`);
        }
        
        return validWords;
    }

    // 檢查單字是否過於相似
    isTooSimilar(word) {
        // 檢查複數形式
        if (this.existingWords.has(word + 's') || this.existingWords.has(word + 'es')) {
            return true;
        }
        
        // 檢查去除s的形式
        if (word.endsWith('s') && this.existingWords.has(word.slice(0, -1))) {
            return true;
        }
        
        // 檢查過去式
        if (word.endsWith('ed') && this.existingWords.has(word.slice(0, -2))) {
            return true;
        }
        
        return false;
    }

    // 獲取後備單字（當API失敗時）
    getBackupWords(level, count) {
        const backup = this.backupWords[level] || this.backupWords['300-500'];
        const available = backup.filter(word => !this.existingWords.has(word.toLowerCase()));
        
        return available.slice(0, count).map(word => ({
            word: word,
            level: level,
            phonetic: `/${word}/`, // 簡化音標
            part_of_speech: 'noun',
            chinese: '商業用詞',
            toeic_example: {
                sentence: `This is about ${word}.`,
                chinese: `這是關於${word}的。`
            }
        }));
    }

    // 成本監控
    trackCost(usage) {
        this.costMonitor.totalTokens += usage.total_tokens;
        this.costMonitor.sessionCalls++;
        
        // GPT-3.5-turbo 定價 (截至2024年)
        const inputCost = (usage.prompt_tokens / 1000) * 0.0010;   // $0.001/1K tokens
        const outputCost = (usage.completion_tokens / 1000) * 0.0020; // $0.002/1K tokens
        const callCost = inputCost + outputCost;
        
        this.costMonitor.totalCost += callCost;
        
        console.log(`💰 成本統計 - 本次: $${callCost.toFixed(4)}, 總計: $${this.costMonitor.totalCost.toFixed(4)}`);
        
        if (this.costMonitor.totalCost >= this.costMonitor.dailyLimit * 0.8) {
            console.warn('⚠️ 接近成本限制！');
        }
    }

    // 批量生成到目標數量
    async generateToTarget(level, progressCallback) {
        await this.loadExistingWords();
        
        const stats = await wordDB.getStatistics();
        const currentCount = stats.byLevel[level] || 0;
        const targetCount = this.targetCounts[level];
        const remaining = targetCount - currentCount;

        if (remaining <= 0) {
            progressCallback(`✅ ${level} 已達目標數量 ${currentCount}/${targetCount}`);
            return { success: true, message: '已達標' };
        }

        progressCallback(`🎯 ${level}: 目前 ${currentCount}/${targetCount}，需要 ${remaining} 個`);

        let totalGenerated = 0;
        let attempts = 0;
        const maxAttempts = Math.ceil(remaining / this.config.batchSize) + 2; // 預留空間

        while (totalGenerated < remaining && attempts < maxAttempts) {
            attempts++;
            const batchSize = Math.min(this.config.batchSize, remaining - totalGenerated);
            
            progressCallback(`📦 第 ${attempts} 批 (${batchSize} 個)...`);

            try {
                const newWords = await this.generateBatch(level, batchSize);
                
                if (newWords.length > 0) {
                    const results = await wordDB.addBatch(newWords);
                    const addedCount = results.added.length;
                    totalGenerated += addedCount;
                    
                    progressCallback(`✅ 第 ${attempts} 批完成：新增 ${addedCount} 個，重複 ${results.duplicates.length} 個`);
                } else {
                    progressCallback(`⚠️ 第 ${attempts} 批沒有新單字`);
                }

                // 更新進度條
                const progress = ((currentCount + totalGenerated) / targetCount) * 100;
                progressCallback(null, Math.min(progress, 100));
                
                // 適當延遲避免頻率限制
                if (attempts < maxAttempts) {
                    await this.delay(2000);
                }
                
            } catch (error) {
                progressCallback(`❌ 第 ${attempts} 批失敗：${error.message}`);
                await this.delay(3000);
            }
        }

        return {
            success: true,
            generated: totalGenerated,
            finalCount: currentCount + totalGenerated,
            target: targetCount,
            cost: this.costMonitor.totalCost
        };
    }

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 重置成本監控
    resetCostMonitor() {
        this.costMonitor = {
            totalTokens: 0,
            totalCost: 0,
            dailyLimit: 10,
            sessionCalls: 0
        };
        console.log('💰 成本監控已重置');
    }

    // 獲取成本報告
    getCostReport() {
        return {
            totalCalls: this.costMonitor.sessionCalls,
            totalTokens: this.costMonitor.totalTokens,
            totalCost: this.costMonitor.totalCost,
            averageCostPerCall: this.costMonitor.sessionCalls > 0 
                ? this.costMonitor.totalCost / this.costMonitor.sessionCalls 
                : 0,
            remainingBudget: this.costMonitor.dailyLimit - this.costMonitor.totalCost
        };
    }

    // 更新統計顯示
    async updateStatistics() {
        const stats = await wordDB.getStatistics();
        
        const totalElement = document.getElementById('total-words');
        if (totalElement) {
            totalElement.textContent = stats.total;
        }

        const levelStatsElement = document.getElementById('level-stats');
        if (levelStatsElement) {
            levelStatsElement.innerHTML = '';
            
            for (const [level, count] of Object.entries(stats.byLevel)) {
                const target = this.targetCounts[level];
                const percentage = Math.round((count / target) * 100);
                
                const statDiv = document.createElement('div');
                statDiv.innerHTML = `
                    <strong>${level}:</strong> ${count}/${target} 
                    <span style="color: ${percentage >= 100 ? 'green' : 'orange'}">
                        (${percentage}%)
                    </span>
                `;
                levelStatsElement.appendChild(statDiv);
            }
        }

        // 顯示成本統計
        const costElement = document.getElementById('cost-stats');
        if (costElement) {
            const report = this.getCostReport();
            costElement.innerHTML = `
                <div><strong>成本統計</strong></div>
                <div>API調用: ${report.totalCalls} 次</div>
                <div>總Token: ${report.totalTokens}</div>
                <div>總成本: $${report.totalCost.toFixed(4)}</div>
                <div>平均每次: $${report.averageCostPerCall.toFixed(4)}</div>
                <div>剩餘預算: $${report.remainingBudget.toFixed(2)}</div>
            `;
        }

        return stats;
    }
}