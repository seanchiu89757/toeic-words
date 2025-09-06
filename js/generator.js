// 單字生成器模組
class WordGenerator {
    constructor() {
        this.apiKey = null;
        this.generatedWords = new Set();
        this.isGenerating = false;
        this.targetCounts = {
            '300以下': 200,
            '300-500': 500,
            '500-600': 800,
            '600-700': 1000,
            '700-800': 1200,
            '800-900': 800,
            '900以上': 500
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

    // 載入已存在的單字
    async loadExistingWords() {
        await wordDB.init();
        const allWords = await wordDB.getAllWords();
        this.generatedWords.clear();
        
        for (const word of allWords) {
            this.generatedWords.add(word.word.toLowerCase());
        }
        
        console.log(`已載入 ${this.generatedWords.size} 個現有單字`);
        
        // 顯示所有已存在單字以便調試
        const allExisting = Array.from(this.generatedWords);
        console.log('所有已存在單字:', allExisting.join(', '));
        
        // 檢查特定單字是否存在
        const testWords = ['customer', 'schedule', 'client', 'product', 'office', 'meeting'];
        testWords.forEach(word => {
            if (this.generatedWords.has(word)) {
                console.log(`✅ "${word}" 在資料庫中`);
            } else {
                console.log(`❌ "${word}" 不在資料庫中`);
            }
        });
    }

    // 建立生成提示
    async buildPrompt(level, count, existingWords) {
        const levelDescriptions = {
            '300以下': '最基礎的日常生活和商業單字，如 work, office, email',
            '300-500': '基本商業溝通單字，如 meeting, schedule, customer',
            '500-600': '中級商業單字，如 negotiate, proposal, budget',
            '600-700': '進階商業單字，如 revenue, strategy, implementation',
            '700-800': '專業商業單字，如 acquisition, synergy, leverage',
            '800-900': '高階商業單字，如 paradigm, consolidation, optimization',
            '900以上': '精通級商業單字，如 ameliorate, expedite, remuneration'
        };

        // 重要！使用所有已存在的單字，而不只是該等級的
        const allExistingWords = Array.from(this.generatedWords);
        console.log(`📋 資料庫中共有 ${allExistingWords.length} 個單字`);
        
        // 獲取該等級已有的所有單字
        const levelWords = await wordDB.getWordsByLevel(level);
        const levelWordsList = levelWords.map(w => w.word.toLowerCase());
        console.log(`📋 ${level} 等級已有 ${levelWordsList.length} 個單字`);
        
        // 提供候選單字池讓 AI 參考選擇（排除已有的）
        const allCandidates = this.getCandidateWords(level);
        const availableCandidates = allCandidates.filter(word => 
            !allExistingWords.includes(word.toLowerCase())
        );
        
        const candidateHint = availableCandidates.length > 0 
            ? `\nSuggested: ${availableCandidates.slice(0, Math.min(10, count * 2)).join(', ')}`
            : '';

        // 優化禁止列表：只傳送最相關的單字以節省token
        let forbiddenList = '';
        if (allExistingWords.length > 0) {
            // 如果單字太多，只傳送該等級的單字+最近使用的50個
            if (allExistingWords.length > 100) {
                const recentWords = allExistingWords.slice(-50);
                const levelSpecific = levelWordsList;
                const combined = [...new Set([...levelSpecific, ...recentWords])];
                forbiddenList = combined.slice(0, 80).join(', ');
                console.log(`📋 優化禁止列表：${allExistingWords.length} → ${combined.slice(0, 80).length} 個單字`);
            } else {
                forbiddenList = allExistingWords.join(', ');
                console.log(`📋 禁止列表包含 ${allExistingWords.length} 個單字`);
            }
        }
            
        return `Generate ${count} unique TOEIC words for level "${level}" (${levelDescriptions[level]})

Avoid these existing words: ${forbiddenList}

${candidateHint}

JSON format:

{
  "words": [
    {
      "word": "example",
      "level": "${level}",
      "phonetic": "/ɪɡˈzɑːmpl/",
      "part_of_speech": "noun",
      "chinese": "範例",
      "common_phrases": [{"phrase": "for example", "chinese": "例如"}],
      "toeic_example": {"sentence": "Here is an example.", "chinese": "這是一個例子。"}
    }
  ]
}`;
    }

    // 呼叫 OpenAI API 生成單字（帶智能重試機制）
    async generateWords(level, count = 10, maxRetries = 3) {
        if (!this.apiKey) {
            throw new Error('請先設定 API Key');
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.attemptGeneration(level, count);
                
                // 如果成功生成至少一半的單字，認為是成功的
                if (result.length >= Math.ceil(count / 2)) {
                    return result;
                }
                
                // 如果生成的單字太少，且還有重試機會，繼續重試
                if (attempt < maxRetries) {
                    console.warn(`第 ${attempt} 次生成單字太少 (${result.length}/${count})，重試中...`);
                    await this.delay(1000 * attempt);
                    continue;
                }
                
                return result; // 最後一次嘗試，返回任何結果
                
            } catch (error) {
                console.warn(`第 ${attempt} 次嘗試失敗:`, error.message);
                
                // 如果是 JSON 錯誤且還有重試機會，調整策略後重試
                if (error.message.includes('JSON') && attempt < maxRetries) {
                    console.log('📝 調整 prompt 策略後重試...');
                    
                    // 調整重試策略：減少批次大小
                    if (count > 5) {
                        count = Math.max(3, Math.floor(count * 0.7));
                        console.log(`縮減批次大小至 ${count} 個`);
                    }
                    
                    await this.delay(2000 * attempt);
                    continue;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // 漸進式等待
                await this.delay(1000 * attempt);
            }
        }
    }

    // 提供候選單字池
    getCandidateWords(level) {
        const candidates = {
            '300以下': [
                'work', 'job', 'time', 'day', 'year', 'way', 'man', 'new', 'good', 'first',
                'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high',
                'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public'
            ],
            '300-500': [
                'business', 'company', 'service', 'product', 'market', 'customer', 'office', 'staff',
                'manager', 'employee', 'meeting', 'email', 'phone', 'address', 'order', 'price',
                'quality', 'delivery', 'payment', 'contract', 'schedule', 'appointment', 'conference',
                'presentation', 'report', 'document', 'information', 'department', 'position', 'salary'
            ],
            '500-600': [
                'negotiate', 'proposal', 'budget', 'profit', 'revenue', 'expense', 'investment', 'policy',
                'procedure', 'regulation', 'requirement', 'standard', 'objective', 'strategy', 'analysis',
                'evaluation', 'assessment', 'survey', 'research', 'development', 'training', 'seminar',
                'workshop', 'certificate', 'qualification', 'experience', 'performance', 'achievement', 'efficiency'
            ],
            '600-700': [
                'implementation', 'coordination', 'collaboration', 'partnership', 'alliance', 'merger', 'acquisition',
                'expansion', 'diversification', 'innovation', 'technology', 'infrastructure', 'maintenance',
                'supervision', 'administration', 'authorization', 'approval', 'recommendation', 'consultation',
                'specification', 'modification', 'enhancement', 'optimization', 'sustainability', 'compliance'
            ],
            '700-800': [
                'leverage', 'synergy', 'paradigm', 'consolidation', 'restructuring', 'transformation',
                'integration', 'synchronization', 'standardization', 'systematization', 'rationalization',
                'prioritization', 'categorization', 'segmentation', 'differentiation', 'specialization',
                'customization', 'personalization', 'utilization', 'maximization', 'minimization'
            ],
            '800-900': [
                'optimization', 'streamlining', 'benchmarking', 'forecasting', 'proliferation', 'diversification',
                'sophistication', 'internationalization', 'globalization', 'localization', 'standardization',
                'harmonization', 'consolidation', 'revitalization', 'rejuvenation', 'transformation', 'innovation'
            ],
            '900以上': [
                'ameliorate', 'expedite', 'remuneration', 'corroborate', 'substantiate', 'consolidate',
                'proliferate', 'disseminate', 'perpetuate', 'enumerate', 'articulate', 'accentuate',
                'differentiate', 'substantiate', 'interpolate', 'extrapolate', 'juxtapose', 'synthesize'
            ]
        };

        return candidates[level] || [];
    }

    // 清理 JSON 內容
    cleanJsonContent(content) {
        console.log('🧹 開始清理 JSON，原始前200字符:', content.substring(0, 200));
        
        // 1. 移除所有 markdown 標記
        content = content.replace(/^```json\s*/gm, '').replace(/\s*```$/gm, '');
        content = content.replace(/^```\s*/gm, '').replace(/\s*```$/gm, '');
        
        // 2. 移除前導和尾隨的空白字符和換行
        content = content.trim();
        
        // 3. 檢查是否有文字解釋，找到第一個 { 和最後一個 }
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
            console.error('❌ 找不到有效的 JSON 結構');
            throw new Error('回應中沒有找到有效的 JSON 結構');
        }
        
        // 4. 提取 JSON 部分
        content = content.substring(jsonStart, jsonEnd + 1);
        
        // 5. 移除可能的前導垃圾字符（如果JSON前有其他字符）
        if (content.charAt(0) !== '{') {
            const firstBrace = content.indexOf('{');
            if (firstBrace > 0) {
                content = content.substring(firstBrace);
            }
        }
        
        console.log('🧹 清理完成，結果前200字符:', content.substring(0, 200));
        return content.trim();
    }

    // 修復常見的 JSON 問題
    fixCommonJsonIssues(content) {
        console.log('🔧 開始修復常見問題，原始內容前200字符:', content.substring(0, 200));
        
        // 更激進的修復策略：處理所有字串值內的引號
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // 處理包含字串值的行
            if (line.includes('": "')) {
                // 使用正則找到所有字串值
                line = line.replace(/: "([^"]*)"([^,}\]]*)/g, function(match, value, after) {
                    // 檢查after是否包含未轉義的引號
                    if (after && after.includes('"') && !after.startsWith('\\"')) {
                        // 找到問題模式如 tomorrow"s
                        const problematicPattern = /(\w)"(\w)/g;
                        const fixed = match.replace(problematicPattern, '$1\\"$2');
                        console.log(`🔧 修復行 ${i+1}: ${match.substring(0, 50)} -> ${fixed.substring(0, 50)}`);
                        return fixed;
                    }
                    return match;
                });
                
                // 更廣泛的修復：處理所有縮寫形式
                // 找到字串值內容
                const valueMatch = line.match(/: "(.*?)"/);
                if (valueMatch) {
                    const originalValue = valueMatch[1];
                    let fixedValue = originalValue;
                    
                    // 修復所有常見的縮寫（使用更準確的模式）
                    fixedValue = fixedValue.replace(/([a-z])'s/gi, '$1\\"s');   // it's -> it\"s
                    fixedValue = fixedValue.replace(/([a-z])'t/gi, '$1\\"t');   // don't -> don\"t
                    fixedValue = fixedValue.replace(/([a-z])'d/gi, '$1\\"d');   // we'd -> we\"d
                    fixedValue = fixedValue.replace(/([a-z])'ll/gi, '$1\\"ll'); // we'll -> we\"ll
                    fixedValue = fixedValue.replace(/([a-z])'re/gi, '$1\\"re'); // we're -> we\"re
                    fixedValue = fixedValue.replace(/([a-z])'ve/gi, '$1\\"ve'); // we've -> we\"ve
                    fixedValue = fixedValue.replace(/([a-z])'m/gi, '$1\\"m');   // I'm -> I\"m
                    
                    if (originalValue !== fixedValue) {
                        line = line.replace(`"${originalValue}"`, `"${fixedValue}"`);
                        console.log(`🔧 修復縮寫 (行${i+1}): ${originalValue.substring(0, 30)} -> ${fixedValue.substring(0, 30)}`);
                    }
                }
            }
            
            lines[i] = line;
        }
        content = lines.join('\n');
        
        // 修復尾隨逗號問題
        content = content.replace(/,(\s*[}\]])/g, '$1');
        
        console.log('🔧 修復完成，結果前200字符:', content.substring(0, 200));
        return content;
    }

    // 診斷 JSON 錯誤
    diagnoseJsonError(content, error) {
        const errorMsg = error.message.toLowerCase();
        const firstChar = content.charAt(0);
        const lastChar = content.charAt(content.length - 1);
        
        let diagnosis = [];
        
        // 檢查開始字符
        if (firstChar !== '{') {
            diagnosis.push(`JSON應該以{開始，但實際開始字符是'${firstChar}'`);
        }
        
        // 檢查結束字符
        if (lastChar !== '}') {
            diagnosis.push(`JSON應該以}結束，但實際結束字符是'${lastChar}'`);
        }
        
        // 檢查是否有markdown殘留
        if (content.includes('```')) {
            diagnosis.push('內容中仍有markdown標記');
        }
        
        // 檢查是否有解釋文字
        const hasExplanation = /^[^{]*[a-zA-Z]/.test(content);
        if (hasExplanation) {
            diagnosis.push('JSON前可能有解釋文字');
        }
        
        // 檢查常見錯誤
        if (errorMsg.includes('unexpected token')) {
            diagnosis.push('存在意外的字符或符號');
        }
        
        if (errorMsg.includes('expected property name')) {
            diagnosis.push('屬性名稱格式錯誤（可能缺少引號）');
        }
        
        if (errorMsg.includes('unterminated string')) {
            diagnosis.push('字串未正確結束（缺少結束引號）');
        }
        
        return diagnosis.length > 0 ? diagnosis.join('; ') : '未知錯誤';
    }

    // 提取完整的單字物件
    extractCompleteWords(content) {
        const words = [];
        console.log('🎯 開始提取完整單字，內容長度:', content.length);
        
        try {
            // 方法1: 嘗試分割單字物件
            const lines = content.split('\n');
            let currentWord = [];
            let braceCount = 0;
            let isInWord = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // 檢測單字物件的開始
                if (line.includes('"word":') && !isInWord) {
                    isInWord = true;
                    currentWord = [];
                    braceCount = 0;
                }
                
                if (isInWord) {
                    currentWord.push(line);
                    
                    // 計算大括號
                    for (const char of line) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                    }
                    
                    // 當大括號平衡時，嘗試解析
                    if (braceCount === 0 && currentWord.length > 3) {
                        const wordText = currentWord.join('\n').trim();
                        
                        // 找到單字物件的開始和結束
                        const startIdx = wordText.indexOf('{');
                        const endIdx = wordText.lastIndexOf('}');
                        
                        if (startIdx !== -1 && endIdx !== -1) {
                            const jsonText = wordText.substring(startIdx, endIdx + 1);
                            
                            try {
                                // 確保JSON包含必要欄位
                                if (jsonText.includes('"word"') && 
                                    jsonText.includes('"chinese"') &&
                                    jsonText.includes('"level"')) {
                                    
                                    const wordObj = JSON.parse(jsonText);
                                    
                                    if (wordObj.word && wordObj.chinese && wordObj.level) {
                                        // 檢查是否重複
                                        const isDuplicate = words.some(w => w.word === wordObj.word);
                                        if (!isDuplicate) {
                                            words.push(wordObj);
                                            console.log(`✅ 成功提取單字: ${wordObj.word}`);
                                        } else {
                                            console.log(`⚠️ 跳過重複單字: ${wordObj.word}`);
                                        }
                                    }
                                }
                            } catch (e) {
                                // 可能是不完整的JSON，繼續
                            }
                        }
                        
                        isInWord = false;
                        currentWord = [];
                    }
                }
            }
            
            // 方法2: 如果方法1失敗，使用正則表達式
            if (words.length === 0) {
                console.log('🔄 使用正則表達式提取...');
                
                // 尋找每個完整的單字物件模式
                const regex = /\{\s*"word":\s*"([^"]+)"[\s\S]*?"level":\s*"[^"]+"[\s\S]*?"chinese":\s*"([^"]+)"[\s\S]*?\}/g;
                let match;
                
                while ((match = regex.exec(content)) !== null) {
                    const fullMatch = match[0];
                    try {
                        const wordObj = JSON.parse(fullMatch);
                        if (wordObj.word && wordObj.chinese && wordObj.level) {
                            const isDuplicate = words.some(w => w.word === wordObj.word);
                            if (!isDuplicate) {
                                words.push(wordObj);
                                console.log(`✅ (正則)成功提取單字: ${wordObj.word}`);
                            }
                        }
                    } catch (e) {
                        // 繼續下一個匹配
                    }
                }
            }
            
            console.log(`🎯 共提取到 ${words.length} 個完整單字:`, words.map(w => w.word).join(', '));
            
        } catch (error) {
            console.warn('提取完整單字時發生錯誤:', error);
        }
        
        return words;
    }

    // 進階 JSON 修復
    advancedJsonFix(content, error) {
        try {
            console.log('🔨 開始進階修復，錯誤:', error.message);
            const errorMessage = error.message.toLowerCase();
            
            // 檢查是否是截斷問題
            if (errorMessage.includes("expected ',' or '}'") || 
                errorMessage.includes("unexpected end") ||
                errorMessage.includes("unterminated")) {
                
                console.log('🔨 檢測到可能的截斷問題，嘗試提取完整的單字');
                
                // 嘗試提取完整的單字物件
                const completeWords = this.extractCompleteWords(content);
                if (completeWords.length > 0) {
                    const fixedJson = {
                        words: completeWords
                    };
                    const fixedJsonString = JSON.stringify(fixedJson, null, 2);
                    console.log(`🔨 成功提取 ${completeWords.length} 個完整單字:`, completeWords.map(w => w.word).join(', '));
                    return fixedJsonString;
                } else {
                    console.warn('🔨 無法提取任何完整單字');
                }
            }
            
            // 根據錯誤類型進行修復
            if (errorMessage.includes('unterminated string')) {
                // 修復未結束的字串
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const quoteCount = (line.match(/"/g) || []).length;
                    if (quoteCount % 2 !== 0) {
                        // 奇數個引號，可能缺少結尾引號
                        lines[i] = line + '"';
                    }
                }
                content = lines.join('\n');
            }
            
            if (errorMessage.includes("expected ',' or '}'")) {
                // 修復缺少逗號的問題
                content = content.replace(/}(\s*){/g, '},\n{');
                content = content.replace(/](\s*){/g, '],\n{');
            }
            
            // 嘗試截取到最後一個完整的物件
            const objects = [];
            let braceCount = 0;
            let currentObject = '';
            let inString = false;
            let escapeNext = false;
            
            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                
                if (escapeNext) {
                    escapeNext = false;
                    currentObject += char;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    currentObject += char;
                    continue;
                }
                
                if (char === '"' && !escapeNext) {
                    inString = !inString;
                }
                
                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                }
                
                currentObject += char;
                
                if (braceCount === 0 && currentObject.trim() && !inString) {
                    if (currentObject.trim().startsWith('{')) {
                        objects.push(currentObject.trim());
                        currentObject = '';
                    }
                }
            }
            
            if (objects.length > 0) {
                // 重建 JSON
                const wordsArray = objects.join(',\n');
                return `{"words": [${wordsArray}]}`;
            }
            
            return null;
        } catch (fixError) {
            console.warn('進階修復失敗:', fixError);
            return null;
        }
    }

    // 單次生成嘗試
    async attemptGeneration(level, count) {
        // 重新載入最新的已存在單字
        await this.loadExistingWords();
        
        const prompt = await this.buildPrompt(level, count, this.generatedWords);
        // 顯示提示詞的關鍵部分而不是前500字符
        const forbiddenSection = prompt.indexOf('FORBIDDEN WORDS');
        if (forbiddenSection !== -1) {
            const forbiddenPreview = prompt.substring(forbiddenSection, forbiddenSection + 1000);
            console.log('📝 禁止單字部分:', forbiddenPreview);
        } else {
            console.log('📝 生成提示詞預覽:', prompt.substring(0, 500));
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate UNIQUE words only. No duplicates. Each word must be completely different. Pure JSON format: start with {, end with }. Verify each word is unique before including.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.9,  // 大幅提高隨機性以避免重複
                max_tokens: Math.min(1500, 150 * count)  // 動態調整token上限
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API 呼叫失敗');
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        console.log('🔍 GPT原始回應前200字符:', content.substring(0, 200));
        
        // 檢查是否完全不是JSON格式的回應
        if (!content.includes('{') || !content.includes('}')) {
            throw new Error('GPT 回應中沒有 JSON 結構，可能是純文字回應');
        }
        
        // 強化清理流程
        content = this.cleanJsonContent(content);
        
        // 額外安全檢查：如果清理後還是不是以{開始，嘗試更激進的修復
        if (!content.startsWith('{')) {
            const bracketIndex = content.indexOf('{');
            if (bracketIndex > 0) {
                console.warn('⚠️ 發現JSON前有垃圾字符，強制截取');
                content = content.substring(bracketIndex);
            }
        }
        
        // 檢查結尾
        if (!content.endsWith('}')) {
            const lastBracket = content.lastIndexOf('}');
            if (lastBracket > 0) {
                console.warn('⚠️ 發現JSON後有垃圾字符，強制截取');
                content = content.substring(0, lastBracket + 1);
            }
        }
        
        // 嘗試修復常見的 JSON 問題
        content = this.fixCommonJsonIssues(content);
        
        // 解析 JSON
        let result;
        try {
            result = JSON.parse(content);
            console.log('✅ JSON 解析成功，包含', result.words?.length || 0, '個單字');
        } catch (parseError) {
            console.error('❌ JSON 解析失敗:', parseError.message);
            console.error('📋 錯誤位置:', parseError.message.match(/position (\d+)/)?.[1]);
            
            // 如果錯誤位置在後半部，嘗試截取前半部分
            const errorPosMatch = parseError.message.match(/position (\d+)/);
            if (errorPosMatch) {
                const errorPos = parseInt(errorPosMatch[1]);
                console.log(`🔍 錯誤發生在位置 ${errorPos}/${content.length}`);
                
                // 嘗試截取到錯誤位置前的內容
                if (errorPos > 100) {
                    const truncated = content.substring(0, errorPos - 10);
                    
                    // 嘗試修補JSON結構
                    let repaired = truncated;
                    
                    // 計算需要多少個 } 來平衡
                    const openBraces = (repaired.match(/{/g) || []).length;
                    const closeBraces = (repaired.match(/}/g) || []).length;
                    const openBrackets = (repaired.match(/\[/g) || []).length;
                    const closeBrackets = (repaired.match(/\]/g) || []).length;
                    
                    // 添加缺少的閉合符號
                    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
                        repaired += ']';
                    }
                    for (let i = 0; i < (openBraces - closeBraces); i++) {
                        repaired += '}';
                    }
                    
                    try {
                        result = JSON.parse(repaired);
                        console.log('✅ 截斷修復成功，救回', result.words?.length || 0, '個單字');
                    } catch (e) {
                        // 繼續其他修復方法
                    }
                }
            }
            
            // 如果還沒成功，嘗試進階修復
            if (!result) {
                console.error('📋 清理後內容 (前500字符):', content.substring(0, 500));
                console.error('📋 清理後內容 (後100字符):', content.slice(-100));
                
                // 診斷常見問題
                const diagnosis = this.diagnoseJsonError(content, parseError);
                console.error('🔍 錯誤診斷:', diagnosis);
                
                // 嘗試進階修復
                const fixedContent = this.advancedJsonFix(content, parseError);
                if (fixedContent) {
                    try {
                        result = JSON.parse(fixedContent);
                        console.log('✅ 進階修復成功，包含', result.words?.length || 0, '個單字');
                    } catch (secondError) {
                        console.error('❌ 修復後仍然失敗:', secondError.message);
                        
                        // 最後手段：強制提取
                        const extracted = this.extractCompleteWords(content);
                        if (extracted.length > 0) {
                            result = { words: extracted };
                            console.log('🆘 最後手段成功，強制提取了', extracted.length, '個單字');
                        } else {
                            throw new Error(`JSON 格式錯誤無法修復: ${parseError.message}。診斷: ${diagnosis}`);
                        }
                    }
                } else {
                    // 最後手段：強制提取
                    const extracted = this.extractCompleteWords(content);
                    if (extracted.length > 0) {
                        result = { words: extracted };
                        console.log('🆘 最後手段成功，強制提取了', extracted.length, '個單字');
                    } else {
                        throw new Error(`JSON 格式錯誤: ${parseError.message}。診斷: ${diagnosis}`);
                    }
                }
            }
        }

        // 驗證回應格式
        if (!result.words || !Array.isArray(result.words)) {
            throw new Error('回應格式不正確：缺少 words 陣列');
        }

        // 🚨 新增：立即檢查GPT回應中的重複單字
        const duplicateCheck = this.checkForDuplicatesInResponse(result.words);
        if (duplicateCheck.hasDuplicates) {
            console.error('🚨 GPT生成了重複單字:', duplicateCheck.duplicates);
            console.error('🚨 原始單字列表:', result.words.map(w => w.word).join(', '));
            // 可以選擇拋出錯誤強制重試，或者自動去重
            console.warn('⚠️ 自動移除重複單字並繼續處理');
            result.words = duplicateCheck.uniqueWords;
        }

        // 過濾重複的單字並驗證格式
        const uniqueWords = [];
        console.log('🔍 開始過濾單字，已存在單字數:', this.generatedWords.size);
        
        for (const word of result.words) {
            // 驗證必要欄位
            if (!word.word || !word.level || !word.chinese) {
                console.warn('跳過格式不完整的單字:', word);
                continue;
            }
            
            const wordLower = word.word.toLowerCase();
            if (!this.generatedWords.has(wordLower)) {
                uniqueWords.push(word);
                this.generatedWords.add(wordLower);
                console.log(`✅ 接受新單字: ${word.word}`);
            } else {
                console.log(`❌ 過濾重複單字: ${word.word}`);
            }
        }
        
        console.log(`📊 過濾結果: 原始${result.words.length}個 → 接受${uniqueWords.length}個`);
        return uniqueWords;
    }

    // 批量生成到目標數量
    async generateToTarget(level, progressCallback, batchSize = 10) {
        await this.loadExistingWords();
        
        const stats = await wordDB.getStatistics();
        const currentCount = stats.byLevel[level] || 0;
        const targetCount = this.targetCounts[level];
        const remaining = targetCount - currentCount;

        if (remaining <= 0) {
            progressCallback(`${level} 已達到目標數量`);
            return { success: true, message: '已達標' };
        }

        progressCallback(`${level}: 目前 ${currentCount}/${targetCount}，需要生成 ${remaining} 個`);

        let totalGenerated = 0;
        let attempts = 0;
        let consecutiveFailures = 0;
        const maxAttempts = Math.ceil(remaining / 3); // 減少最大嘗試次數
        const maxConsecutiveFailures = 3;

        while (totalGenerated < remaining && attempts < maxAttempts && consecutiveFailures < maxConsecutiveFailures) {
            attempts++;
            
            // 動態調整批次大小：如果連續失敗，減少批次大小
            let currentBatchSize = Math.min(batchSize, remaining - totalGenerated);
            if (consecutiveFailures > 1) {
                currentBatchSize = Math.min(Math.floor(batchSize / 2), currentBatchSize);
            }
            
            progressCallback(`正在生成第 ${attempts} 批（${currentBatchSize} 個）...`);

            try {
                const newWords = await this.generateWords(level, currentBatchSize);
                
                if (newWords.length > 0) {
                    const results = await wordDB.addBatch(newWords);
                    const addedCount = results.added.length;
                    totalGenerated += addedCount;
                    
                    progressCallback(`第 ${attempts} 批完成：新增 ${addedCount} 個，重複 ${results.duplicates.length} 個`);
                    
                    // 重設失敗計數
                    consecutiveFailures = 0;
                } else {
                    progressCallback(`第 ${attempts} 批完成：但沒有新單字`);
                    consecutiveFailures++;
                }

                // 動態調整等待時間
                const waitTime = consecutiveFailures > 0 ? 3000 : 1500;
                await this.delay(waitTime);
                
            } catch (error) {
                consecutiveFailures++;
                progressCallback(`第 ${attempts} 批失敗：${error.message}`);
                
                // 如果連續失敗，等待更長時間
                await this.delay(3000 + (consecutiveFailures * 1000));
            }

            const progress = ((currentCount + totalGenerated) / targetCount) * 100;
            progressCallback(null, progress);
        }
        
        // 檢查是否因為連續失敗而停止
        if (consecutiveFailures >= maxConsecutiveFailures) {
            progressCallback(`⚠️ 連續失敗 ${maxConsecutiveFailures} 次，暫停生成`);
        }

        return {
            success: true,
            generated: totalGenerated,
            finalCount: currentCount + totalGenerated,
            target: targetCount
        };
    }

    // 🔍 檢查GPT回應中的重複單字
    checkForDuplicatesInResponse(words) {
        const seenWords = new Set();
        const duplicates = [];
        const uniqueWords = [];
        
        for (const wordObj of words) {
            if (!wordObj.word) continue;
            
            const wordLower = wordObj.word.toLowerCase().trim();
            
            if (seenWords.has(wordLower)) {
                duplicates.push(wordObj.word);
            } else {
                seenWords.add(wordLower);
                uniqueWords.push(wordObj);
            }
        }
        
        return {
            hasDuplicates: duplicates.length > 0,
            duplicates: duplicates,
            uniqueWords: uniqueWords,
            originalCount: words.length,
            uniqueCount: uniqueWords.length
        };
    }

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 更新統計顯示
    async updateStatistics() {
        const stats = await wordDB.getStatistics();
        
        // 更新總數
        const totalElement = document.getElementById('total-words');
        if (totalElement) {
            totalElement.textContent = stats.total;
        }

        // 更新各等級統計
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

        return stats;
    }

    // 檢查並顯示重複單字
    async checkAndDisplayDuplicates() {
        const duplicates = await wordDB.checkDuplicates();
        const duplicateList = document.getElementById('duplicate-list');
        
        if (duplicateList) {
            if (duplicates.length === 0) {
                duplicateList.innerHTML = '<p style="color: green;">✓ 沒有重複的單字</p>';
            } else {
                duplicateList.innerHTML = `
                    <p style="color: red;">發現 ${duplicates.length} 個重複單字：</p>
                    ${duplicates.map(d => `
                        <div>
                            ${d.word} (等級: ${d.levels.join(', ')})
                        </div>
                    `).join('')}
                `;
            }
        }

        return duplicates;
    }
}

// 初始化事件處理
document.addEventListener('DOMContentLoaded', () => {
    const generator = new WordGenerator();
    
    // API Key 測試按鈕
    const testApiBtn = document.getElementById('test-api-btn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', async () => {
            const apiKeyInput = document.getElementById('api-key');
            const statusDiv = document.getElementById('api-status');
            
            generator.setApiKey(apiKeyInput.value);
            
            statusDiv.textContent = '測試中...';
            statusDiv.className = 'status-message';
            
            const result = await generator.testAPIConnection();
            
            statusDiv.textContent = result.message;
            statusDiv.className = `status-message ${result.success ? 'success' : 'error'}`;
        });
    }

    // 生成按鈕
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const apiKeyInput = document.getElementById('api-key');
            const levelSelect = document.getElementById('target-level');
            const batchSizeInput = document.getElementById('batch-size');
            const logArea = document.getElementById('generation-log');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            
            if (!apiKeyInput.value) {
                alert('請先輸入 API Key');
                return;
            }

            // 獲取並驗證批次大小
            const batchSize = parseInt(batchSizeInput.value) || 10;
            if (batchSize < 1 || batchSize > 50) {
                alert('批次數量必須在 1-50 之間');
                return;
            }

            generator.setApiKey(apiKeyInput.value);
            generateBtn.disabled = true;
            
            logArea.innerHTML += `📋 開始生成，批次大小: ${batchSize}\n`;
            
            const result = await generator.generateToTarget(
                levelSelect.value,
                (message, progress) => {
                    if (message) {
                        logArea.innerHTML += message + '\n';
                        logArea.scrollTop = logArea.scrollHeight;
                    }
                    if (progress !== undefined) {
                        progressFill.style.width = `${progress}%`;
                        progressText.textContent = `進度: ${Math.round(progress)}%`;
                    }
                },
                batchSize
            );

            generateBtn.disabled = false;
            await generator.updateStatistics();
            await generator.checkAndDisplayDuplicates();
        });
    }

    // 匯出按鈕
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const jsonData = await wordDB.exportToJSON();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `toeic_words_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // 匯入按鈕
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');
    
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                const result = await wordDB.importFromJSON(text);
                
                if (result.success) {
                    alert(`匯入成功！\n新增: ${result.added.length}\n重複: ${result.duplicates.length}`);
                    await generator.updateStatistics();
                } else {
                    alert(`匯入失敗: ${result.error}`);
                }
            }
        });
    }

    // 清空按鈕
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm('確定要清空所有資料嗎？此操作無法復原！')) {
                await wordDB.clearDatabase();
                await generator.updateStatistics();
                alert('資料庫已清空');
            }
        });
    }
});