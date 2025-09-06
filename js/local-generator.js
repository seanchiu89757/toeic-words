// 本地單字處理器 - 從 TXT 檔案生成符合格式的單字資料
class LocalWordGenerator {
    constructor() {
        this.wordData = [];
        this.processedWords = [];
        
        // 建立難度評估系統
        this.initializeDifficultySystem();
    }

    // 初始化難度評估系統
    initializeDifficultySystem() {
        // 基於TOEIC常見單字的難度分類
        this.difficultyKeywords = {
            '300以下': [
                // 最基礎的功能詞和日常用語
                'a', 'an', 'the', 'be', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
                'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might',
                'go', 'come', 'see', 'get', 'make', 'take', 'give', 'find', 'know', 'think',
                'want', 'need', 'use', 'work', 'call', 'try', 'ask', 'feel', 'become', 'leave',
                'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'show', 'hear', 'play',
                'run', 'move', 'live', 'believe', 'bring', 'happen', 'write', 'sit', 'stand',
                'good', 'bad', 'new', 'old', 'big', 'small', 'long', 'short', 'high', 'low',
                'right', 'wrong', 'same', 'different', 'important', 'next', 'early', 'late',
                'young', 'few', 'many', 'much', 'little', 'other', 'own', 'last', 'first'
            ],
            '300-500': [
                // 基礎商業和辦公室詞彙
                'business', 'company', 'office', 'meeting', 'email', 'phone', 'customer',
                'service', 'product', 'price', 'cost', 'sale', 'buy', 'sell', 'pay',
                'order', 'delivery', 'contract', 'agreement', 'deal', 'offer', 'request',
                'report', 'document', 'file', 'copy', 'print', 'send', 'receive', 'schedule',
                'plan', 'project', 'task', 'job', 'work', 'employee', 'staff', 'manager',
                'department', 'team', 'client', 'account', 'bank', 'money', 'payment',
                'invoice', 'receipt', 'budget', 'profit', 'loss', 'tax', 'discount',
                'warehouse', 'inventory', 'stock', 'supply', 'demand', 'market', 'trade'
            ],
            '500-600': [
                // 中級商業詞彙
                'negotiate', 'proposal', 'analysis', 'strategy', 'marketing', 'advertising',
                'promotion', 'campaign', 'investment', 'finance', 'accounting', 'audit',
                'management', 'administration', 'organization', 'communication', 'presentation',
                'conference', 'seminar', 'training', 'development', 'improvement', 'performance',
                'evaluation', 'assessment', 'review', 'feedback', 'recommendation', 'suggestion',
                'policy', 'procedure', 'regulation', 'compliance', 'standard', 'quality',
                'efficiency', 'productivity', 'objective', 'goal', 'target', 'achievement',
                'responsibility', 'authority', 'decision', 'approval', 'permission', 'requirement'
            ],
            '600-700': [
                // 進階商業詞彙
                'implementation', 'infrastructure', 'acquisition', 'merger', 'partnership',
                'collaboration', 'coordination', 'supervision', 'delegation', 'optimization',
                'restructuring', 'expansion', 'diversification', 'consolidation', 'integration',
                'innovation', 'technology', 'automation', 'digitalization', 'transformation',
                'sustainability', 'profitability', 'competitiveness', 'benchmarking',
                'outsourcing', 'procurement', 'logistics', 'distribution', 'manufacturing',
                'specification', 'certification', 'verification', 'validation', 'authorization',
                'confidentiality', 'transparency', 'accountability', 'governance', 'stewardship'
            ],
            '700-800': [
                // 專業商業術語
                'amortization', 'depreciation', 'capitalization', 'liquidation', 'arbitration',
                'litigation', 'indemnification', 'jurisdiction', 'liability', 'fiduciary',
                'collateral', 'derivative', 'equity', 'leverage', 'portfolio', 'dividend',
                'stakeholder', 'shareholder', 'subsidiary', 'affiliate', 'conglomerate',
                'monopoly', 'oligopoly', 'syndicate', 'consortium', 'franchise',
                'intellectual', 'proprietary', 'patent', 'trademark', 'copyright',
                'compliance', 'regulatory', 'statutory', 'mandatory', 'discretionary'
            ],
            '800-900': [
                // 高級專業詞彙
                'securitization', 'derivatives', 'commodities', 'futures', 'hedging',
                'underwriting', 'actuarial', 'solvency', 'liquidity', 'volatility',
                'macroeconomic', 'microeconomic', 'econometric', 'quantitative', 'qualitative',
                'synergy', 'paradigm', 'methodology', 'framework', 'algorithm',
                'optimization', 'simulation', 'modeling', 'forecasting', 'extrapolation',
                'correlation', 'regression', 'variance', 'deviation', 'probability'
            ],
            '900以上': [
                // 最高級專業詞彙
                'disintermediation', 'recapitalization', 'demutualization', 'securitization',
                'collateralization', 'subordination', 'hypothecation', 'novation',
                'indemnification', 'subrogation', 'rescission', 'estoppel', 'garnishment',
                'amortization', 'accretion', 'convexity', 'duration', 'immunization',
                'stochastic', 'heuristic', 'asymptotic', 'heteroscedastic', 'multicollinearity'
            ]
        };

        // 詞綴難度評分（用於評估詞彙複雜度）
        this.affixDifficulty = {
            prefixes: {
                'un-': 1, 're-': 1, 'in-': 1, 'dis-': 1, 'pre-': 1,
                'anti-': 2, 'inter-': 2, 'trans-': 2, 'super-': 2,
                'micro-': 3, 'macro-': 3, 'pseudo-': 3, 'quasi-': 3
            },
            suffixes: {
                '-ing': 1, '-ed': 1, '-er': 1, '-est': 1, '-ly': 1,
                '-tion': 2, '-sion': 2, '-ment': 2, '-ness': 2, '-ity': 2,
                '-ization': 3, '-ological': 3, '-ification': 3, '-aneous': 3
            }
        };
    }

    // 解析 TXT 檔案內容
    parseTxtFile(content) {
        // 將整個內容作為一個字串處理
        // 移除所有回車符號，只保留換行符號
        content = content.replace(/\r/g, '');
        
        // 使用正則表達式找出所有單字項目
        // 匹配從數字開始，到下一個數字開始之前的所有內容
        const wordPattern = /(\d+)\.\s+([a-zA-Z-]+)\s+([a-z]+(?:\s+[a-z]+)*)\s+([^0-9]+?)(?=\d+\.|$)/g;
        
        const words = [];
        let match;
        
        while ((match = wordPattern.exec(content)) !== null) {
            // 提取第一個詞性（可能有多個詞性）
            const partOfSpeechMatch = match[3].match(/^([a-z]+)/);
            const partOfSpeech = partOfSpeechMatch ? partOfSpeechMatch[1] : match[3];
            
            // 清理中文解釋（移除多餘的空白和換行）
            let chinese = match[4].trim();
            chinese = chinese.replace(/\s+/g, ' '); // 將多個空白替換為單個空白
            
            // 如果中文解釋包含多個詞性的解釋，只取第一個
            const chineseParts = chinese.split(/\s+[a-z]+\s+/);
            if (chineseParts.length > 1) {
                chinese = chineseParts[0].trim();
            }
            
            // 限制中文解釋長度
            if (chinese.length > 50) {
                chinese = chinese.substring(0, 50) + '...';
            }
            
            words.push({
                index: parseInt(match[1]),
                word: match[2].toLowerCase(),
                partOfSpeech: this.convertPartOfSpeech(partOfSpeech),
                chinese: chinese
            });
            
            console.log(`解析成功 #${match[1]}: ${match[2]} (${partOfSpeech}) - ${chinese}`);
        }
        
        console.log(`總共解析出 ${words.length} 個單字`);
        return words;
    }

    // 轉換詞性縮寫為完整形式
    convertPartOfSpeech(abbr) {
        const mapping = {
            'n': 'noun',
            'v': 'verb',
            'a': 'adjective',
            'ad': 'adverb',
            'prep': 'preposition',
            'conj': 'conjunction',
            'pron': 'pronoun',
            'int': 'interjection'
        };
        return mapping[abbr] || abbr;
    }

    // 根據多個因素判斷單字等級
    getWordLevel(wordData) {
        const word = wordData.word.toLowerCase();
        const partOfSpeech = wordData.partOfSpeech;
        
        // 1. 首先檢查是否在已知難度關鍵字中
        for (const [level, keywords] of Object.entries(this.difficultyKeywords)) {
            if (keywords.includes(word)) {
                console.log(`${word} 在預定義列表中，等級: ${level}`);
                return level;
            }
        }
        
        // 2. 計算難度分數
        let difficultyScore = 0;
        
        // 2.1 單字長度評分 (0-3分)
        if (word.length <= 4) difficultyScore += 0;
        else if (word.length <= 6) difficultyScore += 1;
        else if (word.length <= 8) difficultyScore += 2;
        else if (word.length <= 10) difficultyScore += 3;
        else if (word.length <= 12) difficultyScore += 4;
        else difficultyScore += 5;
        
        // 2.2 音節數評分 (0-3分)
        const syllableCount = this.countSyllables(word);
        difficultyScore += Math.min(syllableCount - 1, 4);
        
        // 2.3 詞綴複雜度評分 (0-3分)
        difficultyScore += this.getAffixScore(word);
        
        // 2.4 詞性評分
        const posScores = {
            'noun': 0,
            'verb': 0,
            'adjective': 1,
            'adverb': 2,
            'preposition': 0,
            'conjunction': 1,
            'pronoun': 0,
            'interjection': 0
        };
        difficultyScore += posScores[partOfSpeech] || 0;
        
        // 2.5 商業相關性評分
        if (this.isBusinessRelated(word)) {
            difficultyScore += 2;
        }
        
        // 2.6 技術/專業詞彙評分
        if (this.isTechnicalTerm(word)) {
            difficultyScore += 3;
        }
        
        // 3. 根據總分決定等級
        console.log(`${word} 難度分數: ${difficultyScore}`);
        
        if (difficultyScore <= 2) return '300以下';
        else if (difficultyScore <= 5) return '300-500';
        else if (difficultyScore <= 8) return '500-600';
        else if (difficultyScore <= 11) return '600-700';
        else if (difficultyScore <= 14) return '700-800';
        else if (difficultyScore <= 17) return '800-900';
        else return '900以上';
    }

    // 計算音節數
    countSyllables(word) {
        word = word.toLowerCase();
        let count = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = 'aeiou'.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                count++;
            }
            previousWasVowel = isVowel;
        }
        
        // 處理特殊情況
        if (word.endsWith('le') && word.length > 2) {
            count++;
        }
        if (word.endsWith('e') && count > 1) {
            count--;
        }
        
        return Math.max(1, count);
    }

    // 計算詞綴分數
    getAffixScore(word) {
        let score = 0;
        
        // 檢查前綴
        for (const [prefix, value] of Object.entries(this.affixDifficulty.prefixes)) {
            if (word.startsWith(prefix.replace('-', ''))) {
                score += value;
                break;
            }
        }
        
        // 檢查後綴
        for (const [suffix, value] of Object.entries(this.affixDifficulty.suffixes)) {
            if (word.endsWith(suffix.replace('-', ''))) {
                score += value;
                break;
            }
        }
        
        return Math.min(score, 4);
    }

    // 判斷是否為商業相關詞彙
    isBusinessRelated(word) {
        const businessTerms = [
            'business', 'company', 'corporate', 'finance', 'market', 'trade',
            'commerce', 'industry', 'economy', 'management', 'executive',
            'professional', 'commercial', 'enterprise', 'organization'
        ];
        
        return businessTerms.some(term => word.includes(term));
    }

    // 判斷是否為技術/專業術語
    isTechnicalTerm(word) {
        // 檢查是否包含技術詞綴
        const technicalPatterns = [
            'ization', 'ological', 'ification', 'metric', 'analysis',
            'synthesis', 'hypothesis', 'algorithm', 'systematic'
        ];
        
        // 檢查是否為複合詞或連字符詞
        if (word.includes('-') && word.length > 8) return true;
        
        return technicalPatterns.some(pattern => word.includes(pattern));
    }

    // 生成音標（簡化版本，基於常見規則）
    generatePhonetic(word) {
        // 這是一個簡化的音標生成，實際應用可能需要更完整的音標字典
        const phoneticPatterns = {
            'tion': 'ʃən',
            'sion': 'ʒən',
            'ture': 'tʃər',
            'age': 'ɪdʒ',
            'ate': 'eɪt',
            'ite': 'aɪt',
            'ive': 'ɪv',
            'ous': 'əs',
            'ance': 'əns',
            'ence': 'əns',
            'able': 'əbl',
            'ible': 'əbl',
            'ment': 'mənt',
            'ness': 'nəs',
            'ship': 'ʃɪp',
            'hood': 'hʊd',
            'less': 'ləs',
            'ful': 'fʊl',
            'ly': 'li',
            'er': 'ər',
            'or': 'ər',
            'ist': 'ɪst',
            'ism': 'ɪzəm',
            'ize': 'aɪz',
            'ise': 'aɪz',
            'fy': 'faɪ',
            'cy': 'si',
            'ty': 'ti',
            'al': 'əl',
            'ar': 'ər',
            'ary': 'əri',
            'ory': 'əri',
            'ic': 'ɪk',
            'ical': 'ɪkəl'
        };

        let phonetic = word;
        
        // 應用音標規則
        for (const [pattern, replacement] of Object.entries(phoneticPatterns)) {
            if (word.endsWith(pattern)) {
                const base = word.slice(0, -pattern.length);
                phonetic = base + replacement;
                break;
            }
        }

        // 基本母音轉換
        phonetic = phonetic.replace(/a(?!r|l|w|y)/g, 'æ')
                          .replace(/e(?!r|w|y)/g, 'ɛ')
                          .replace(/i(?!ng|nk)/g, 'ɪ')
                          .replace(/o(?!r|w|y|u)/g, 'ɒ')
                          .replace(/u(?!r)/g, 'ʌ');

        return `/${phonetic}/`;
    }

    // 生成常用詞句
    generateCommonPhrases(word, partOfSpeech) {
        const phrases = {
            'abandon': [
                { phrase: "abandon ship", chinese: "棄船" },
                { phrase: "abandon hope", chinese: "放棄希望" },
                { phrase: "abandon a project", chinese: "放棄專案" }
            ],
            'ability': [
                { phrase: "ability to pay", chinese: "支付能力" },
                { phrase: "leadership ability", chinese: "領導能力" },
                { phrase: "technical ability", chinese: "技術能力" }
            ],
            'abroad': [
                { phrase: "go abroad", chinese: "出國" },
                { phrase: "study abroad", chinese: "留學" },
                { phrase: "travel abroad", chinese: "出國旅行" }
            ],
            'absence': [
                { phrase: "absence from work", chinese: "缺勤" },
                { phrase: "in the absence of", chinese: "在缺少...的情況下" },
                { phrase: "leave of absence", chinese: "請假" }
            ],
            'accept': [
                { phrase: "accept an offer", chinese: "接受提議" },
                { phrase: "accept responsibility", chinese: "承擔責任" },
                { phrase: "widely accepted", chinese: "廣泛接受" }
            ],
            'access': [
                { phrase: "access to information", chinese: "獲取資訊" },
                { phrase: "easy access", chinese: "容易進入" },
                { phrase: "restricted access", chinese: "限制進入" }
            ],
            'account': [
                { phrase: "bank account", chinese: "銀行帳戶" },
                { phrase: "take into account", chinese: "考慮到" },
                { phrase: "on account of", chinese: "由於" }
            ],
            'achieve': [
                { phrase: "achieve success", chinese: "取得成功" },
                { phrase: "achieve goals", chinese: "達成目標" },
                { phrase: "achieve results", chinese: "取得成果" }
            ],
            'acquire': [
                { phrase: "acquire knowledge", chinese: "獲得知識" },
                { phrase: "acquire skills", chinese: "習得技能" },
                { phrase: "acquire a company", chinese: "收購公司" }
            ],
            'adjust': [
                { phrase: "adjust to", chinese: "適應" },
                { phrase: "adjust the schedule", chinese: "調整時程" },
                { phrase: "price adjustment", chinese: "價格調整" }
            ]
        };

        // 如果有預設詞句，返回預設
        if (phrases[word]) {
            return phrases[word];
        }

        // 否則生成通用詞句
        const genericPhrases = {
            'noun': [
                { phrase: `the ${word}`, chinese: `這個${word}` },
                { phrase: `a ${word}`, chinese: `一個${word}` }
            ],
            'verb': [
                { phrase: `to ${word}`, chinese: `去${word}` },
                { phrase: `will ${word}`, chinese: `將會${word}` }
            ],
            'adjective': [
                { phrase: `very ${word}`, chinese: `非常${word}` },
                { phrase: `more ${word}`, chinese: `更加${word}` }
            ]
        };

        return genericPhrases[partOfSpeech] || [];
    }

    // 生成 TOEIC 相關例句
    generateToeicExample(word, partOfSpeech, chinese) {
        const examples = {
            'abandon': {
                sentence: "The company decided to abandon the unprofitable project.",
                chinese: "公司決定放棄這個無利可圖的專案。"
            },
            'ability': {
                sentence: "Her ability to manage multiple tasks impressed the supervisor.",
                chinese: "她處理多項任務的能力讓主管印象深刻。"
            },
            'abroad': {
                sentence: "The manager will travel abroad for the international conference.",
                chinese: "經理將出國參加國際會議。"
            },
            'absence': {
                sentence: "His absence from the meeting was noticed by everyone.",
                chinese: "大家都注意到他缺席會議。"
            },
            'absolute': {
                sentence: "The deadline is absolute and cannot be extended.",
                chinese: "截止日期是絕對的，不能延期。"
            },
            'accept': {
                sentence: "We are pleased to accept your proposal.",
                chinese: "我們很高興接受您的提案。"
            },
            'access': {
                sentence: "Employees need a keycard to access the building.",
                chinese: "員工需要門禁卡才能進入大樓。"
            },
            'account': {
                sentence: "Please transfer the funds to our corporate account.",
                chinese: "請將資金轉入我們的公司帳戶。"
            },
            'achieve': {
                sentence: "The team worked hard to achieve their sales target.",
                chinese: "團隊努力工作以達成銷售目標。"
            },
            'acquire': {
                sentence: "The company plans to acquire new technology next quarter.",
                chinese: "公司計劃下季度採購新技術。"
            }
        };

        // 如果有預設例句，使用預設
        if (examples[word]) {
            return examples[word];
        }

        // 否則生成通用例句
        const genericExamples = {
            'noun': {
                sentence: `The ${word} is important for business operations.`,
                chinese: `${chinese}對業務運作很重要。`
            },
            'verb': {
                sentence: `We need to ${word} the proposal by Friday.`,
                chinese: `我們需要在星期五前${chinese}提案。`
            },
            'adjective': {
                sentence: `The ${word} report was submitted to management.`,
                chinese: `${chinese}的報告已提交給管理層。`
            },
            'adverb': {
                sentence: `The project was completed ${word}.`,
                chinese: `專案${chinese}完成了。`
            },
            'preposition': {
                sentence: `The meeting is scheduled ${word} 3 PM.`,
                chinese: `會議安排${chinese}下午3點。`
            }
        };

        return genericExamples[partOfSpeech] || {
            sentence: `This is an example of "${word}" in business context.`,
            chinese: `這是"${word}"在商業環境中的例子。`
        };
    }

    // 處理上傳的檔案
    async processFile(fileContent) {
        // 解析檔案
        const parsedWords = this.parseTxtFile(fileContent);
        
        // 處理每個單字
        this.processedWords = parsedWords.map(wordData => {
            const level = this.getWordLevel(wordData);
            const phonetic = this.generatePhonetic(wordData.word);
            const example = this.generateToeicExample(
                wordData.word, 
                wordData.partOfSpeech, 
                wordData.chinese
            );
            const phrases = this.generateCommonPhrases(
                wordData.word,
                wordData.partOfSpeech
            );

            return {
                word: wordData.word,
                chinese: wordData.chinese,
                phonetic: phonetic,
                part_of_speech: wordData.partOfSpeech,
                level: level,
                common_phrases: phrases,  // 新增常用詞句
                toeic_example: example
            };
        });

        return this.processedWords;
    }

    // 按等級分組單字
    groupByLevel() {
        const grouped = {};
        
        for (const word of this.processedWords) {
            if (!grouped[word.level]) {
                grouped[word.level] = [];
            }
            grouped[word.level].push(word);
        }
        
        return grouped;
    }

    // 匯出為 JSON
    exportToJSON() {
        const exportData = {
            version: '2.0',
            generated_date: new Date().toISOString(),
            total_words: this.processedWords.length,
            words: this.processedWords,
            by_level: this.groupByLevel()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // 儲存到 IndexedDB
    async saveToDatabase(progressCallback) {
        const grouped = this.groupByLevel();
        let totalSaved = 0;
        
        for (const [level, words] of Object.entries(grouped)) {
            progressCallback(`正在儲存 ${level} 等級單字...`);
            
            const results = await wordDB.addBatch(words);
            totalSaved += results.added.length;
            
            progressCallback(`${level}: 新增 ${results.added.length} 個，重複 ${results.duplicates.length} 個`);
            
            // 更新進度
            const progress = (totalSaved / this.processedWords.length) * 100;
            progressCallback(null, progress);
        }
        
        return {
            success: true,
            total: totalSaved
        };
    }

    // 生成靜態資料檔案
    generateStaticDataFile() {
        const data = {
            version: '2.0',
            generated_date: new Date().toISOString(),
            total_words: this.processedWords.length,
            levels: this.levelRanges,
            words: this.processedWords
        };
        
        return data;
    }

    // 獲取統計資訊
    getStatistics() {
        const stats = {
            total: this.processedWords.length,
            byLevel: {}
        };
        
        const grouped = this.groupByLevel();
        for (const [level, words] of Object.entries(grouped)) {
            stats.byLevel[level] = words.length;
        }
        
        return stats;
    }
}

// 建立全域實例
const localGenerator = new LocalWordGenerator();