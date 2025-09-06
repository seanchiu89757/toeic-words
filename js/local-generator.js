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
        // 擴展的預設例句庫 - 真實的商業情境
        const specificExamples = {
            // A 開頭
            'abandon': {
                sentence: "The company decided to abandon the unprofitable project after two quarters of losses.",
                chinese: "在連續兩季虧損後，公司決定放棄這個無利可圖的專案。"
            },
            'abide': {
                sentence: "All employees must abide by the company's code of conduct.",
                chinese: "所有員工都必須遵守公司的行為準則。"
            },
            'ability': {
                sentence: "Her ability to negotiate contracts has saved the company millions.",
                chinese: "她的合約談判能力為公司節省了數百萬。"
            },
            'able': {
                sentence: "With the new software, we are able to process orders twice as fast.",
                chinese: "有了新軟體，我們能夠以兩倍的速度處理訂單。"
            },
            'abnormal': {
                sentence: "The accounting department discovered abnormal transactions in the quarterly report.",
                chinese: "會計部門在季度報告中發現了異常交易。"
            },
            'abroad': {
                sentence: "Our marketing director frequently travels abroad to meet international clients.",
                chinese: "我們的行銷總監經常出國會見國際客戶。"
            },
            'aboard': {
                sentence: "Please ensure all passengers are aboard before departure.",
                chinese: "請確保所有乘客在出發前都已上車。"
            },
            'absence': {
                sentence: "His frequent absence from team meetings has affected project coordination.",
                chinese: "他經常缺席團隊會議影響了專案協調。"
            },
            'absent': {
                sentence: "Three employees were absent due to the flu outbreak.",
                chinese: "由於流感爆發，三名員工缺勤。"
            },
            'absolute': {
                sentence: "Customer satisfaction is our absolute priority.",
                chinese: "客戶滿意度是我們的絕對優先事項。"
            },
            'absorb': {
                sentence: "The parent company will absorb all subsidiary debts.",
                chinese: "母公司將承擔所有子公司的債務。"
            },
            'abstract': {
                sentence: "Please provide an abstract of your research proposal.",
                chinese: "請提供您研究提案的摘要。"
            },
            'abuse': {
                sentence: "The company has a zero-tolerance policy for workplace abuse.",
                chinese: "公司對職場霸凌採取零容忍政策。"
            },
            'academic': {
                sentence: "We require academic transcripts for all job applicants.",
                chinese: "我們要求所有求職者提供學術成績單。"
            },
            'accelerate': {
                sentence: "Digital transformation will accelerate our business growth.",
                chinese: "數位轉型將加速我們的業務成長。"
            },
            'accept': {
                sentence: "We are pleased to accept your terms and conditions.",
                chinese: "我們很高興接受您的條款和條件。"
            },
            'access': {
                sentence: "Remote employees can access the company database through VPN.",
                chinese: "遠端員工可以通過 VPN 存取公司資料庫。"
            },
            'accident': {
                sentence: "The workplace accident resulted in stricter safety regulations.",
                chinese: "這起工作場所事故導致了更嚴格的安全規定。"
            },
            'accommodate': {
                sentence: "The conference room can accommodate up to 50 participants.",
                chinese: "會議室可容納多達 50 名參與者。"
            },
            'accompany': {
                sentence: "A detailed invoice must accompany all expense reports.",
                chinese: "所有費用報告都必須附上詳細的發票。"
            },
            'accomplish': {
                sentence: "The team accomplished all project milestones ahead of schedule.",
                chinese: "團隊提前完成了所有專案里程碑。"
            },
            'account': {
                sentence: "The finance team is reviewing all client accounts for discrepancies.",
                chinese: "財務團隊正在審查所有客戶帳戶是否有差異。"
            },
            'accountant': {
                sentence: "Our certified accountant will prepare the annual tax returns.",
                chinese: "我們的註冊會計師將準備年度納稅申報表。"
            },
            'accurate': {
                sentence: "Accurate financial forecasting is essential for business planning.",
                chinese: "準確的財務預測對業務規劃至關重要。"
            },
            'achieve': {
                sentence: "We achieved a 15% increase in productivity this quarter.",
                chinese: "本季我們的生產力提高了 15%。"
            },
            'acquire': {
                sentence: "The corporation plans to acquire three startups this year.",
                chinese: "該公司計劃今年收購三家新創公司。"
            },
            'activity': {
                sentence: "Marketing activities will focus on social media campaigns.",
                chinese: "行銷活動將專注於社群媒體活動。"
            },
            'actual': {
                sentence: "The actual costs exceeded the initial budget by 20%.",
                chinese: "實際成本超出初始預算 20%。"
            },
            'adapt': {
                sentence: "Companies must adapt quickly to changing market conditions.",
                chinese: "公司必須快速適應不斷變化的市場條件。"
            },
            'add': {
                sentence: "We need to add two more developers to meet the deadline.",
                chinese: "我們需要再增加兩名開發人員才能趕上截止日期。"
            },
            'address': {
                sentence: "The CEO will address employee concerns at tomorrow's meeting.",
                chinese: "執行長將在明天的會議上處理員工的關切。"
            },
            'adequate': {
                sentence: "Please ensure adequate supplies are ordered for the conference.",
                chinese: "請確保為會議訂購足夠的用品。"
            },
            'adjust': {
                sentence: "We need to adjust our pricing strategy for the Asian market.",
                chinese: "我們需要調整亞洲市場的定價策略。"
            },
            'administration': {
                sentence: "The administration department handles all employee benefits.",
                chinese: "行政部門處理所有員工福利。"
            },
            'admit': {
                sentence: "The manager admitted that the project timeline was unrealistic.",
                chinese: "經理承認專案時間表不切實際。"
            },
            'adopt': {
                sentence: "We will adopt new quality control measures next month.",
                chinese: "我們將在下個月採用新的品質控制措施。"
            },
            'advance': {
                sentence: "Employees can request a salary advance in emergency situations.",
                chinese: "員工在緊急情況下可以申請預支薪水。"
            },
            'advantage': {
                sentence: "Our competitive advantage lies in superior customer service.",
                chinese: "我們的競爭優勢在於卓越的客戶服務。"
            },
            'advertise': {
                sentence: "We advertise our products through multiple digital channels.",
                chinese: "我們通過多個數位管道宣傳我們的產品。"
            },
            'advice': {
                sentence: "The consultant's advice helped streamline our operations.",
                chinese: "顧問的建議幫助我們精簡了營運。"
            },
            'advise': {
                sentence: "I advise reviewing the contract with legal counsel.",
                chinese: "我建議與法律顧問一起審查合約。"
            },
            'affect': {
                sentence: "Supply chain disruptions will affect delivery schedules.",
                chinese: "供應鏈中斷將影響交貨時間表。"
            },
            'afford': {
                sentence: "Small businesses cannot afford lengthy legal disputes.",
                chinese: "小企業無法承擔漫長的法律糾紛。"
            },
            'after': {
                sentence: "The audit will begin after the fiscal year ends.",
                chinese: "審計將在財政年度結束後開始。"
            },
            'agency': {
                sentence: "We hired a marketing agency to redesign our brand.",
                chinese: "我們聘請了一家行銷公司來重新設計我們的品牌。"
            },
            'agenda': {
                sentence: "Please submit agenda items for next week's board meeting.",
                chinese: "請提交下週董事會會議的議程項目。"
            },
            'agent': {
                sentence: "Our insurance agent recommended comprehensive coverage.",
                chinese: "我們的保險代理人建議全面保險。"
            },
            'agree': {
                sentence: "Both parties agree to the revised payment terms.",
                chinese: "雙方同意修訂後的付款條件。"
            },
            'agreement': {
                sentence: "The partnership agreement will be signed tomorrow.",
                chinese: "合作協議將於明天簽署。"
            },
            'aim': {
                sentence: "We aim to reduce operational costs by 10% this year.",
                chinese: "我們的目標是今年將營運成本降低 10%。"
            },
            'airport': {
                sentence: "The company shuttle provides transportation to the airport.",
                chinese: "公司接駁車提供前往機場的交通服務。"
            },
            'allow': {
                sentence: "Company policy does not allow personal use of office equipment.",
                chinese: "公司政策不允許個人使用辦公設備。"
            },
            'alternative': {
                sentence: "We need to find alternative suppliers to reduce dependency.",
                chinese: "我們需要尋找替代供應商以減少依賴。"
            },
            'although': {
                sentence: "Although sales increased, profit margins remained flat.",
                chinese: "儘管銷售額增加，但利潤率保持不變。"
            },
            'always': {
                sentence: "Customer feedback is always valuable for improvement.",
                chinese: "客戶回饋對於改進總是有價值的。"
            },
            'amend': {
                sentence: "We need to amend the contract to include new specifications.",
                chinese: "我們需要修改合約以包含新規格。"
            },
            'amount': {
                sentence: "The total amount due is listed on the invoice.",
                chinese: "應付總額列在發票上。"
            },
            'analysis': {
                sentence: "The market analysis reveals significant growth potential.",
                chinese: "市場分析顯示了巨大的成長潛力。"
            },
            'analyze': {
                sentence: "We analyze customer data to improve service quality.",
                chinese: "我們分析客戶資料以提高服務品質。"
            },
            'announce': {
                sentence: "The company will announce quarterly earnings next week.",
                chinese: "公司將在下週公布季度收益。"
            },
            'annual': {
                sentence: "The annual report shows steady revenue growth.",
                chinese: "年度報告顯示收入穩定成長。"
            },
            'answer': {
                sentence: "Please answer all customer inquiries within 24 hours.",
                chinese: "請在 24 小時內回覆所有客戶詢問。"
            },
            'anticipate': {
                sentence: "We anticipate strong demand for the new product line.",
                chinese: "我們預期新產品線會有強勁的需求。"
            },
            'any': {
                sentence: "Any delays must be reported to management immediately.",
                chinese: "任何延誤都必須立即向管理層報告。"
            },
            'apologize': {
                sentence: "We apologize for the inconvenience caused by the system outage.",
                chinese: "我們為系統故障造成的不便深表歉意。"
            },
            'apparent': {
                sentence: "It became apparent that we needed additional resources.",
                chinese: "很明顯我們需要額外的資源。"
            },
            'appear': {
                sentence: "The CEO will appear at the annual shareholders meeting.",
                chinese: "執行長將出席年度股東大會。"
            },
            'application': {
                sentence: "Your job application has been forwarded to the hiring manager.",
                chinese: "您的求職申請已轉發給招聘經理。"
            },
            'apply': {
                sentence: "These new regulations apply to all departments.",
                chinese: "這些新規定適用於所有部門。"
            },
            'appoint': {
                sentence: "The board will appoint a new CFO next month.",
                chinese: "董事會將在下個月任命新的財務長。"
            },
            'appointment': {
                sentence: "Please schedule an appointment with the client for Tuesday.",
                chinese: "請安排週二與客戶的約會。"
            },
            'appreciate': {
                sentence: "We appreciate your patience during the renovation.",
                chinese: "我們感謝您在裝修期間的耐心。"
            },
            'approach': {
                sentence: "Our approach to customer service sets us apart from competitors.",
                chinese: "我們的客戶服務方式使我們有別於競爭對手。"
            },
            'appropriate': {
                sentence: "Please wear appropriate attire for the client presentation.",
                chinese: "請為客戶簡報穿著適當的服裝。"
            },
            'approval': {
                sentence: "Budget approval is required before starting the project.",
                chinese: "在開始專案之前需要預算批准。"
            },
            'approve': {
                sentence: "The committee will approve the proposal at today's meeting.",
                chinese: "委員會將在今天的會議上批准該提案。"
            },
            'area': {
                sentence: "Sales in the metropolitan area exceeded expectations.",
                chinese: "大都會地區的銷售超出預期。"
            },
            'argue': {
                sentence: "The lawyers will argue the case in court next week.",
                chinese: "律師將在下週在法庭上辯論此案。"
            },
            'arise': {
                sentence: "Should any problems arise, contact tech support immediately.",
                chinese: "如果出現任何問題，請立即聯繫技術支援。"
            },
            'arrange': {
                sentence: "Please arrange transportation for the visiting executives.",
                chinese: "請為來訪的主管安排交通。"
            },
            'arrival': {
                sentence: "The shipment's arrival has been delayed by customs.",
                chinese: "貨物的到達因海關而延誤。"
            },
            'arrive': {
                sentence: "The consultant will arrive at 9 AM for the strategy session.",
                chinese: "顧問將在上午 9 點到達進行策略會議。"
            },
            'article': {
                sentence: "The trade journal published an article about our innovation.",
                chinese: "貿易期刊發表了一篇關於我們創新的文章。"
            },
            'as': {
                sentence: "As per your request, we have expedited the order.",
                chinese: "根據您的要求，我們已加快訂單處理。"
            },
            'ask': {
                sentence: "Customers often ask about our return policy.",
                chinese: "客戶經常詢問我們的退貨政策。"
            },
            'aspect': {
                sentence: "Every aspect of the proposal was carefully reviewed.",
                chinese: "提案的每個方面都經過仔細審查。"
            },
            'assemble': {
                sentence: "Workers assemble products according to quality standards.",
                chinese: "工人根據品質標準組裝產品。"
            },
            'assess': {
                sentence: "We need to assess the financial impact of the merger.",
                chinese: "我們需要評估合併的財務影響。"
            },
            'asset': {
                sentence: "Our employees are our most valuable asset.",
                chinese: "我們的員工是我們最寶貴的資產。"
            },
            'assign': {
                sentence: "The manager will assign tasks based on expertise.",
                chinese: "經理將根據專業知識分配任務。"
            },
            'assist': {
                sentence: "Customer service representatives assist with product inquiries.",
                chinese: "客服代表協助處理產品諮詢。"
            },
            'associate': {
                sentence: "Each sales associate must meet monthly quotas.",
                chinese: "每個銷售人員都必須達到月度配額。"
            },
            'assume': {
                sentence: "We cannot assume that market conditions will remain stable.",
                chinese: "我們不能假設市場條件會保持穩定。"
            },
            'assure': {
                sentence: "I can assure you that quality is our top priority.",
                chinese: "我可以向您保證品質是我們的首要任務。"
            },
            'attach': {
                sentence: "Please attach your resume to the email application.",
                chinese: "請將您的履歷附在電子郵件申請中。"
            },
            'attempt': {
                sentence: "The company will attempt to enter new markets next year.",
                chinese: "公司將嘗試明年進入新市場。"
            },
            'attend': {
                sentence: "All managers must attend the mandatory training session.",
                chinese: "所有經理都必須參加強制培訓課程。"
            },
            'attention': {
                sentence: "This matter requires immediate attention from senior management.",
                chinese: "此事需要高層管理人員立即關注。"
            },
            'attitude': {
                sentence: "A positive attitude contributes to workplace productivity.",
                chinese: "積極的態度有助於提高工作效率。"
            },
            'attorney': {
                sentence: "Our corporate attorney reviewed the merger documents.",
                chinese: "我們的公司律師審查了合併文件。"
            },
            'attract': {
                sentence: "Competitive salaries attract top talent to our company.",
                chinese: "有競爭力的薪資吸引頂尖人才加入我們公司。"
            },
            'auction': {
                sentence: "The company's assets will be sold at auction.",
                chinese: "公司的資產將在拍賣會上出售。"
            },
            'audience': {
                sentence: "The presentation captivated the audience of investors.",
                chinese: "這次簡報吸引了投資者觀眾。"
            },
            'audit': {
                sentence: "The annual audit revealed no significant discrepancies.",
                chinese: "年度審計未發現重大差異。"
            },
            'author': {
                sentence: "The author of the business guide will speak at our conference.",
                chinese: "這本商業指南的作者將在我們的會議上發言。"
            },
            'authority': {
                sentence: "Department heads have authority to approve overtime.",
                chinese: "部門主管有權批准加班。"
            },
            'authorize': {
                sentence: "Only senior managers can authorize purchases over $10,000.",
                chinese: "只有高級經理才能授權超過 10,000 美元的採購。"
            },
            'automatic': {
                sentence: "The system provides automatic backup every night.",
                chinese: "系統每晚自動提供備份。"
            },
            'available': {
                sentence: "Technical support is available 24/7 for premium customers.",
                chinese: "高級客戶可享受全天候技術支援。"
            },
            'average': {
                sentence: "The average processing time has decreased by 30%.",
                chinese: "平均處理時間減少了 30%。"
            },
            'avoid': {
                sentence: "To avoid delays, submit all documents before the deadline.",
                chinese: "為避免延誤，請在截止日期前提交所有文件。"
            },
            'award': {
                sentence: "The company received an award for environmental sustainability.",
                chinese: "該公司因環境永續發展而獲獎。"
            },
            'aware': {
                sentence: "Employees should be aware of the new safety protocols.",
                chinese: "員工應該了解新的安全協議。"
            },
            'away': {
                sentence: "The manager is away on business until Friday.",
                chinese: "經理出差到週五。"
            }
        };

        // 如果有特定例句，直接返回
        if (specificExamples[word]) {
            return specificExamples[word];
        }

        // 根據詞性生成更多樣化的例句
        const contextualExamples = this.generateContextualExample(word, partOfSpeech, chinese);
        return contextualExamples;
    }

    // 生成情境化的例句
    generateContextualExample(word, partOfSpeech, chinese) {
        // 商業情境模板
        const businessContexts = {
            'noun': [
                {
                    sentence: `The ${word} was discussed in detail during the board meeting.`,
                    chinese: `董事會會議上詳細討論了${chinese}。`
                },
                {
                    sentence: `Our ${word} has improved significantly since last quarter.`,
                    chinese: `自上季度以來，我們的${chinese}有了顯著改善。`
                },
                {
                    sentence: `The new ${word} policy will be implemented next month.`,
                    chinese: `新的${chinese}政策將於下個月實施。`
                },
                {
                    sentence: `We need to review the ${word} before making a decision.`,
                    chinese: `在做決定之前，我們需要審查${chinese}。`
                },
                {
                    sentence: `The ${word} exceeded our initial expectations.`,
                    chinese: `${chinese}超出了我們最初的預期。`
                }
            ],
            'verb': [
                {
                    sentence: `The management team will ${word} the proposal tomorrow.`,
                    chinese: `管理團隊明天將${chinese}這個提案。`
                },
                {
                    sentence: `We must ${word} our strategy to remain competitive.`,
                    chinese: `我們必須${chinese}我們的策略以保持競爭力。`
                },
                {
                    sentence: `Employees are encouraged to ${word} innovative solutions.`,
                    chinese: `鼓勵員工${chinese}創新的解決方案。`
                },
                {
                    sentence: `The company decided to ${word} its operations overseas.`,
                    chinese: `公司決定${chinese}其海外業務。`
                },
                {
                    sentence: `Please ${word} the documents before the deadline.`,
                    chinese: `請在截止日期前${chinese}文件。`
                }
            ],
            'adjective': [
                {
                    sentence: `The ${word} performance exceeded quarterly targets.`,
                    chinese: `${chinese}的表現超過了季度目標。`
                },
                {
                    sentence: `We received ${word} feedback from our clients.`,
                    chinese: `我們收到了客戶${chinese}的回饋。`
                },
                {
                    sentence: `The ${word} market conditions affected our sales.`,
                    chinese: `${chinese}的市場條件影響了我們的銷售。`
                },
                {
                    sentence: `This is a ${word} opportunity for business expansion.`,
                    chinese: `這是業務擴展的${chinese}機會。`
                },
                {
                    sentence: `The ${word} results were presented to stakeholders.`,
                    chinese: `${chinese}的結果已向利益相關者展示。`
                }
            ],
            'adverb': [
                {
                    sentence: `The project was ${word} completed ahead of schedule.`,
                    chinese: `專案${chinese}地提前完成了。`
                },
                {
                    sentence: `Sales have increased ${word} over the past year.`,
                    chinese: `過去一年銷售額${chinese}地增長。`
                },
                {
                    sentence: `The team worked ${word} to meet the deadline.`,
                    chinese: `團隊${chinese}地工作以趕上截止日期。`
                },
                {
                    sentence: `Customer satisfaction has improved ${word}.`,
                    chinese: `客戶滿意度${chinese}地提高了。`
                },
                {
                    sentence: `We ${word} appreciate your business partnership.`,
                    chinese: `我們${chinese}地感謝您的業務合作。`
                }
            ],
            'preposition': [
                {
                    sentence: `The meeting will be held ${word} the conference room.`,
                    chinese: `會議將${chinese}會議室舉行。`
                },
                {
                    sentence: `Please submit the report ${word} Friday.`,
                    chinese: `請${chinese}週五提交報告。`
                },
                {
                    sentence: `The office is located ${word} the financial district.`,
                    chinese: `辦公室位於${chinese}金融區。`
                },
                {
                    sentence: `We'll discuss this ${word} the next meeting.`,
                    chinese: `我們將${chinese}下次會議討論這個問題。`
                }
            ],
            'conjunction': [
                {
                    sentence: `We'll proceed with the plan ${word} we receive approval.`,
                    chinese: `${chinese}我們收到批准，我們將繼續執行計劃。`
                },
                {
                    sentence: `The project was successful ${word} there were challenges.`,
                    chinese: `${chinese}有挑戰，專案還是成功了。`
                }
            ]
        };

        // 選擇適合的模板
        const templates = businessContexts[partOfSpeech];
        if (templates && templates.length > 0) {
            // 根據單字的字母順序選擇不同的模板，增加多樣性
            const index = word.charCodeAt(0) % templates.length;
            return templates[index];
        }

        // 預設例句（如果沒有匹配的詞性）
        return {
            sentence: `The word "${word}" is commonly used in business communications.`,
            chinese: `"${word}"（${chinese}）這個詞常用於商業溝通中。`
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