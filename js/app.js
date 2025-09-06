// 學習頁面主程式
class TOEICLearningApp {
    constructor() {
        this.currentWords = [];
        this.originalWords = []; // 保存原始順序
        this.currentIndex = 0;
        this.currentLevel = '300-500';
        this.isAnswerShown = false;
        this.learnedWords = new Set();
        this.isRandomMode = true; // 預設隨機模式
    }

    // 初始化應用
    async init() {
        try {
            await wordDB.init();
            console.log('應用程式初始化成功');
            
            // 綁定事件
            this.bindEvents();
            
            // 設置跨頁面通信監聽
            this.setupCrossPageCommunication();
            
            // 載入預設等級的單字（會自動調用 displayWord）
            await this.loadWords(this.currentLevel);
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('應用程式載入失敗，請重新整理頁面');
        }
    }

    // 設置跨頁面通信
    setupCrossPageCommunication() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'toeic_data_update' && e.newValue) {
                try {
                    const notification = JSON.parse(e.newValue);
                    console.log('📨 收到數據更新通知:', notification);
                    
                    if (notification.type === 'batch_added') {
                        this.handleDataUpdate(notification.data);
                    }
                } catch (error) {
                    console.warn('處理跨頁面通知失敗:', error);
                }
            }
        });
        
        console.log('🔄 跨頁面通信已設置');
    }
    
    // 處理數據更新
    async handleDataUpdate(data) {
        // 檢查是否影響當前等級
        const hasCurrentLevelWords = data.words && data.words.length > 0;
        
        if (hasCurrentLevelWords) {
            console.log(`💡 檢測到新單字生成，準備更新 ${this.currentLevel} 等級...`);
            
            // 顯示更新提示
            this.showUpdateNotification(data.count);
            
            // 延遲 2 秒後自動重新載入（讓用戶看到提示）
            setTimeout(async () => {
                const oldCount = this.currentWords.length;
                await this.loadWords(this.currentLevel);
                const newCount = this.currentWords.length;
                
                if (newCount > oldCount) {
                    console.log(`✅ 自動更新完成：${oldCount} → ${newCount} 個單字`);
                }
            }, 2000);
        }
    }
    
    // 顯示更新通知
    showUpdateNotification(count) {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <span>🎉 檢測到 ${count} 個新單字已生成！</span>
            <small>正在自動更新...</small>
        `;
        
        // 插入到頁面頂部
        document.body.insertBefore(notification, document.body.firstChild);
        
        // 3 秒後移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 應用顯示模式（隨機或順序）
    applyDisplayMode() {
        if (this.isRandomMode) {
            // Fisher-Yates 隨機打亂算法
            this.currentWords = [...this.originalWords];
            for (let i = this.currentWords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.currentWords[i], this.currentWords[j]] = [this.currentWords[j], this.currentWords[i]];
            }
        } else {
            this.currentWords = [...this.originalWords];
        }
    }

    // 切換顯示模式
    toggleDisplayMode() {
        this.isRandomMode = !this.isRandomMode;
        this.currentIndex = 0; // 重新開始
        this.applyDisplayMode();
        
        console.log(`切換到${this.isRandomMode ? '隨機' : '順序'}模式`);
        this.displayWord();
        this.updateProgress();
    }

    // 重新隨機排列
    reshuffleWords() {
        if (this.isRandomMode && this.currentWords.length > 1) {
            this.currentIndex = 0;
            this.applyDisplayMode();
            console.log('重新隨機排列單字');
            this.displayWord();
            this.updateProgress();
        }
    }

    // 綁定事件處理
    bindEvents() {
        // 等級載入按鈕
        const loadLevelBtn = document.getElementById('load-level-btn');
        if (loadLevelBtn) {
            loadLevelBtn.addEventListener('click', async () => {
                const levelSelect = document.getElementById('level');
                const newLevel = levelSelect.value;
                
                if (newLevel !== this.currentLevel) {
                    loadLevelBtn.disabled = true;
                    loadLevelBtn.textContent = '載入中...';
                    
                    console.log(`🔄 切換等級: ${this.currentLevel} → ${newLevel}`);
                    this.currentLevel = newLevel;
                    this.currentIndex = 0;
                    
                    try {
                        await this.loadWords(this.currentLevel);
                        console.log('✅ 等級切換完成');
                    } catch (error) {
                        console.error('❌ 等級切換失敗:', error);
                        this.showError(`載入 ${newLevel} 失敗: ${error.message}`);
                    } finally {
                        loadLevelBtn.disabled = false;
                        loadLevelBtn.textContent = '載入';
                    }
                } else {
                    console.log('已經是當前等級，無需重新載入');
                }
            });
        }

        // 上一個按鈕
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                    this.displayWord();
                }
            });
        }

        // 下一個按鈕
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentIndex < this.currentWords.length - 1) {
                    this.currentIndex++;
                    this.displayWord();
                    this.markAsLearned();
                }
            });
        }

        // 顯示答案按鈕
        const showAnswerBtn = document.getElementById('show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.addEventListener('click', () => {
                this.toggleAnswer();
            });
        }

        // 模式切換按鈕
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', () => {
                this.toggleDisplayMode();
                toggleModeBtn.textContent = this.isRandomMode ? '🎲 隨機模式' : '📋 順序模式';
            });
        }

        // 重新洗牌按鈕
        const reshuffleBtn = document.getElementById('reshuffle-btn');
        if (reshuffleBtn) {
            reshuffleBtn.addEventListener('click', () => {
                this.reshuffleWords();
            });
        }

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    if (this.currentIndex > 0) {
                        this.currentIndex--;
                        this.displayWord();
                    }
                    break;
                case 'ArrowRight':
                    if (this.currentIndex < this.currentWords.length - 1) {
                        this.currentIndex++;
                        this.displayWord();
                        this.markAsLearned();
                    }
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.toggleAnswer();
                    break;
            }
        });
    }

    // 載入單字
    async loadWords(level) {
        console.log(`🔄 開始載入 ${level} 等級單字...`);
        
        try {
            // 初始化資料庫
            await wordDB.init();
            
            // 先嘗試從資料庫載入
            this.originalWords = await wordDB.getWordsByLevel(level);
            console.log(`📚 從資料庫載入到 ${this.originalWords.length} 個 ${level} 單字`);
            
            // 如果資料庫沒有資料，嘗試從 JSON 檔案載入
            if (this.originalWords.length === 0) {
                console.log('📄 嘗試從 JSON 檔案載入預設資料...');
                await this.loadFromJSON();
                this.originalWords = await wordDB.getWordsByLevel(level);
                console.log(`📚 從 JSON 載入後，共有 ${this.originalWords.length} 個 ${level} 單字`);
            }

            if (this.originalWords.length === 0) {
                console.log(`⚠️ ${level} 等級沒有找到任何單字`);
                this.showError(`${level} 等級目前沒有單字，請到管理頁面生成單字後再來學習`);
                return;
            }

            // 應用隨機或順序模式
            this.applyDisplayMode();
            console.log(`✅ 應用顯示模式完成，準備顯示 ${this.currentWords.length} 個單字`);
            
            // 重要：確保 currentIndex 在有效範圍內
            if (this.currentIndex >= this.currentWords.length) {
                this.currentIndex = 0;
            }
            
            console.log(`載入了 ${this.currentWords.length} 個 ${level} 單字 ${this.isRandomMode ? '(隨機順序)' : '(原始順序)'}`);
            this.showWelcomeMessage(level, this.currentWords.length);
            this.updateProgress();
            
            // 確保顯示第一個單字
            console.log(`🎯 準備顯示第 ${this.currentIndex + 1} 個單字`);
            this.displayWord();
            
        } catch (error) {
            console.error('💥 載入單字失敗:', error);
            this.showError(`載入單字失敗：${error.message}`);
        }
    }

    // 從 JSON 檔案載入
    async loadFromJSON() {
        try {
            const response = await fetch('../data/words.json');
            if (response.ok) {
                const jsonData = await response.text();
                const result = await wordDB.importFromJSON(jsonData);
                console.log('從 JSON 載入結果:', result);
            }
        } catch (error) {
            console.log('無法載入預設資料:', error);
        }
    }

    // 顯示單字
    displayWord() {
        console.log(`📖 displayWord() 被調用`);
        console.log(`📊 當前狀態: currentWords.length=${this.currentWords.length}, currentIndex=${this.currentIndex}`);
        
        if (this.currentWords.length === 0) {
            console.log('❌ currentWords 為空，無法顯示單字');
            this.showError('沒有可顯示的單字');
            return;
        }

        if (this.currentIndex < 0 || this.currentIndex >= this.currentWords.length) {
            console.log(`❌ currentIndex 超出範圍: ${this.currentIndex}/${this.currentWords.length}`);
            this.currentIndex = 0;
        }

        const word = this.currentWords[this.currentIndex];
        console.log(`✏️ 準備顯示單字:`, word?.word);
        
        if (!word || !word.word) {
            console.log('❌ 單字資料無效:', word);
            this.showError('單字資料有誤，請重新載入');
            return;
        }
        
        // 重置答案顯示狀態
        this.isAnswerShown = false;
        
        // 顯示單字
        const wordElement = document.getElementById('word');
        if (wordElement) {
            wordElement.textContent = word.word;
            console.log(`📝 單字已設定到 DOM: "${word.word}"`);
        } else {
            console.error('❌ 找不到 word 元素！');
            return;
        }
        
        // 顯示等級標籤
        const levelBadge = document.getElementById('word-level');
        if (levelBadge) {
            levelBadge.textContent = word.level;
            levelBadge.className = `word-level-badge level-${word.level.replace('/', '-')}`;
            
            // 如果是用戶調整過的，添加標記
            if (word.user_adjusted) {
                levelBadge.classList.add('user-adjusted');
            }
        }
        
        // 控制學習提示
        const learningHint = document.getElementById('learning-hint');
        if (learningHint) {
            learningHint.style.display = this.isAnswerShown ? 'none' : 'block';
            learningHint.className = this.isAnswerShown ? 'learning-hint hidden' : 'learning-hint';
        }
        
        // 隱藏或顯示其他資訊
        const elements = {
            'phonetic': word.phonetic,
            'part-of-speech': word.part_of_speech,
            'chinese': word.chinese,
            'example-sentence': word.toeic_example?.sentence,
            'example-chinese': word.toeic_example?.chinese
        };

        for (const [id, content] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                if (this.isAnswerShown) {
                    element.textContent = content || '無資料';
                    element.style.display = 'block';
                } else {
                    element.textContent = '';
                    element.style.display = 'none';
                }
            }
        }

        // 重新渲染片語（根據顯示狀態）
        this.renderPhrases(word);
        
        // 控制例句區塊的顯示
        const exampleContainer = document.querySelector('.example');
        if (exampleContainer) {
            exampleContainer.style.display = this.isAnswerShown ? 'block' : 'none';
        }
        
        // 控制常用詞句區塊的顯示
        const phrasesSection = document.getElementById('phrases-section');
        if (phrasesSection) {
            phrasesSection.style.display = this.isAnswerShown ? 'block' : 'none';
        }

        // 更新按鈕狀態
        document.getElementById('prev-btn').disabled = this.currentIndex === 0;
        document.getElementById('next-btn').disabled = this.currentIndex === this.currentWords.length - 1;
        
        // 更新顯示答案按鈕文字
        document.getElementById('show-answer-btn').textContent = this.isAnswerShown ? '隱藏答案' : '顯示答案';
        
        // 更新進度
        this.updateProgress();
        
        console.log(`✅ 單字顯示完成: "${word.word}" (${this.currentIndex + 1}/${this.currentWords.length})`);
    }

    // 渲染片語
    renderPhrases(word) {
        const phrasesList = document.getElementById('phrases-list');
        const phrasesContainer = document.querySelector('.phrases');
        
        if (phrasesList) {
            phrasesList.innerHTML = '';
            
            // 控制整個片語區塊的顯示
            if (phrasesContainer) {
                phrasesContainer.style.display = this.isAnswerShown ? 'block' : 'none';
            }
            
            if (this.isAnswerShown) {
                if (word.common_phrases && word.common_phrases.length > 0) {
                    word.common_phrases.forEach(phrase => {
                        const div = document.createElement('div');
                        div.className = 'phrase-item';
                        div.style.display = 'flex';
                        div.style.alignItems = 'center';
                        div.style.gap = '10px';
                        div.style.margin = '8px 0';
                        
                        // 詞句文字
                        const textSpan = document.createElement('span');
                        textSpan.style.flex = '1';
                        textSpan.textContent = `${phrase.phrase} - ${phrase.chinese}`;
                        
                        // 語音按鈕
                        const speakBtn = document.createElement('button');
                        speakBtn.className = 'speech-btn speak-phrase-btn';
                        speakBtn.innerHTML = '🔊';
                        speakBtn.style.padding = '5px 10px';
                        speakBtn.style.fontSize = '14px';
                        speakBtn.onclick = () => {
                            if (window.speechService) {
                                // 獲取當前速度設定
                                const speedSlider = document.getElementById('speed-slider');
                                const currentRate = speedSlider ? parseFloat(speedSlider.value) : 0.9;
                                window.speechService.speak(phrase.phrase, {rate: currentRate * 0.9});
                            }
                        };
                        
                        div.appendChild(textSpan);
                        div.appendChild(speakBtn);
                        phrasesList.appendChild(div);
                    });
                } else {
                    const div = document.createElement('div');
                    div.className = 'phrase-item';
                    div.textContent = '無常用片語資料';
                    div.style.color = '#999';
                    phrasesList.appendChild(div);
                }
            }
        }
    }

    // 切換答案顯示
    toggleAnswer() {
        this.isAnswerShown = !this.isAnswerShown;
        
        if (this.currentWords.length > 0) {
            const word = this.currentWords[this.currentIndex];
            
            // 重新設定所有答案元素的內容和顯示狀態
            const elements = {
                'phonetic': word.phonetic,
                'part-of-speech': word.part_of_speech,
                'chinese': word.chinese,
                'example-sentence': word.toeic_example?.sentence,
                'example-chinese': word.toeic_example?.chinese
            };

            for (const [id, content] of Object.entries(elements)) {
                const element = document.getElementById(id);
                if (element) {
                    if (this.isAnswerShown) {
                        element.textContent = content || '無資料';
                        element.style.display = 'block';
                    } else {
                        element.textContent = '';
                        element.style.display = 'none';
                    }
                }
            }

            // 重新渲染片語
            this.renderPhrases(word);
            
            // 控制例句區塊的顯示
            const exampleContainer = document.querySelector('.example');
            if (exampleContainer) {
                exampleContainer.style.display = this.isAnswerShown ? 'block' : 'none';
            }
            
            // 控制常用詞句區塊的顯示
            const phrasesSection = document.getElementById('phrases-section');
            if (phrasesSection) {
                phrasesSection.style.display = this.isAnswerShown ? 'block' : 'none';
            }
        }

        // 控制學習提示
        const learningHint = document.getElementById('learning-hint');
        if (learningHint) {
            learningHint.style.display = this.isAnswerShown ? 'none' : 'block';
        }

        // 更新按鈕文字
        document.getElementById('show-answer-btn').textContent = 
            this.isAnswerShown ? '隱藏答案' : '顯示答案';

        // 如果顯示答案，標記為已學習
        if (this.isAnswerShown) {
            this.markAsLearned();
        }
    }

    // 標記為已學習
    markAsLearned() {
        if (this.currentWords.length > 0) {
            const word = this.currentWords[this.currentIndex];
            this.learnedWords.add(word.word);
            this.updateProgress();
        }
    }

    // 更新進度顯示
    updateProgress() {
        const progressElement = document.getElementById('progress');
        const learnedElement = document.getElementById('learned-count');
        
        if (progressElement) {
            progressElement.textContent = 
                `進度：${this.currentIndex + 1}/${this.currentWords.length}`;
        }
        
        if (learnedElement) {
            learnedElement.textContent = 
                `已學習：${this.learnedWords.size}`;
        }
    }

    // 顯示歡迎訊息
    showWelcomeMessage(level, count) {
        const targetCounts = {
            '300以下': 200, '300-500': 500, '500-600': 800,
            '600-700': 1000, '700-800': 1200, '800-900': 800, '900以上': 500
        };
        
        const target = targetCounts[level];
        const percentage = Math.round((count / target) * 100);
        
        console.log(`🎯 ${level} 載入完成！目前有 ${count}/${target} 個單字 (${percentage}%)`);
        
        // 可以在 UI 上顯示進度提示（可選）
        if (count < target / 2) {
            console.log('💡 提示：單字數量較少，建議到管理頁面生成更多單字以獲得更好的學習體驗');
        }
    }

    // 顯示錯誤訊息
    showError(message) {
        const wordCard = document.getElementById('word-card');
        if (wordCard) {
            wordCard.innerHTML = `
                <div style="text-align: center; color: #666; padding: 50px;">
                    <h2>📚 準備學習</h2>
                    <p style="margin: 20px 0; color: #999;">${message}</p>
                    <p style="font-size: 14px; color: #aaa;">
                        💡 提示：即使只有少量單字也能開始學習<br>
                        您可以隨時回到管理頁面新增更多單字
                    </p>
                </div>
            `;
        }
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', async () => {
    const app = new TOEICLearningApp();
    await app.init();
});