// IndexedDB 資料庫管理模組
class WordDatabase {
    constructor() {
        this.dbName = 'TOEICWordsDB';
        this.version = 1;
        this.db = null;
        this.storeName = 'words';
    }

    // 初始化資料庫
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('資料庫開啟失敗');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('資料庫連線成功');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 建立物件儲存庫
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });

                    // 建立索引
                    objectStore.createIndex('word', 'word', { unique: true });
                    objectStore.createIndex('level', 'level', { unique: false });
                    objectStore.createIndex('word_level', ['word', 'level'], { unique: true });
                    
                    console.log('資料庫結構建立完成');
                }
            };
        });
    }

    // 新增單字
    async addWord(wordData) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            // 檢查是否已存在
            const checkRequest = store.index('word').get(wordData.word.toLowerCase());
            
            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    console.log(`單字 ${wordData.word} 已存在`);
                    resolve({ success: false, reason: 'duplicate' });
                } else {
                    // 新增單字
                    const addRequest = store.add({
                        ...wordData,
                        word: wordData.word.toLowerCase(),
                        createdAt: new Date().toISOString()
                    });
                    
                    addRequest.onsuccess = () => {
                        resolve({ success: true, id: addRequest.result });
                    };
                    
                    addRequest.onerror = () => {
                        reject(addRequest.error);
                    };
                }
            };
        });
    }

    // 批量新增單字
    async addBatch(wordsArray) {
        const results = {
            added: [],
            duplicates: [],
            errors: []
        };

        for (const word of wordsArray) {
            try {
                const result = await this.addWord(word);
                if (result.success) {
                    results.added.push(word.word);
                } else if (result.reason === 'duplicate') {
                    results.duplicates.push(word.word);
                }
            } catch (error) {
                results.errors.push({ word: word.word, error: error.message });
            }
        }

        // 發送跨頁面通知
        if (results.added.length > 0) {
            this.notifyDataUpdate('batch_added', {
                count: results.added.length,
                words: results.added,
                timestamp: Date.now()
            });
        }

        return results;
    }

    // 發送跨頁面數據更新通知
    notifyDataUpdate(type, data) {
        try {
            const notification = {
                type,
                data,
                timestamp: Date.now()
            };
            
            // 使用 localStorage 事件進行跨頁面通信
            localStorage.setItem('toeic_data_update', JSON.stringify(notification));
            
            // 立即清除，只是為了觸發事件
            setTimeout(() => {
                localStorage.removeItem('toeic_data_update');
            }, 100);
            
            console.log('📡 發送數據更新通知:', type, data);
        } catch (error) {
            console.warn('跨頁面通知失敗:', error);
        }
    }

    // 取得特定等級的單字
    async getWordsByLevel(level) {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('level');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(level);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 取得所有單字
    async getAllWords() {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 取得統計資料
    async getStatistics() {
        const allWords = await this.getAllWords();
        const stats = {
            total: allWords.length,
            byLevel: {}
        };

        const levels = [
            '300以下', '300-500', '500-600', '600-700',
            '700-800', '800-900', '900以上'
        ];

        for (const level of levels) {
            const levelWords = allWords.filter(w => w.level === level);
            stats.byLevel[level] = levelWords.length;
        }

        return stats;
    }

    // 清空資料庫
    async clearDatabase() {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('資料庫已清空');
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 匯出為 JSON
    async exportToJSON() {
        const allWords = await this.getAllWords();
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            totalWords: allWords.length,
            words: allWords
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // 從 JSON 匯入
    async importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.words || !Array.isArray(data.words)) {
                throw new Error('無效的 JSON 格式');
            }

            const results = await this.addBatch(data.words);
            return {
                success: true,
                ...results
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 檢查重複單字
    async checkDuplicates() {
        const allWords = await this.getAllWords();
        const wordMap = new Map();
        const duplicates = [];

        for (const word of allWords) {
            const key = word.word.toLowerCase();
            if (wordMap.has(key)) {
                duplicates.push({
                    word: key,
                    ids: [wordMap.get(key).id, word.id],
                    levels: [wordMap.get(key).level, word.level]
                });
            } else {
                wordMap.set(key, word);
            }
        }

        return duplicates;
    }

    // 刪除單字
    async deleteWord(id) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 更新單字等級
    async updateWordLevel(wordId, newLevel, reason = '') {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            // 先獲取單字資料
            const getRequest = store.get(wordId);
            
            getRequest.onsuccess = () => {
                const word = getRequest.result;
                if (!word) {
                    reject(new Error('單字不存在'));
                    return;
                }
                
                // 保存原始等級（如果還沒有）
                if (!word.original_level) {
                    word.original_level = word.level;
                }
                
                // 初始化調整歷史
                if (!word.adjustment_history) {
                    word.adjustment_history = [];
                }
                
                // 記錄調整
                word.adjustment_history.push({
                    from: word.level,
                    to: newLevel,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });
                
                // 更新等級
                word.level = newLevel;
                word.user_adjusted = true;
                
                // 儲存更新
                const updateRequest = store.put(word);
                
                updateRequest.onsuccess = () => {
                    console.log(`單字 ${word.word} 等級已從 ${word.adjustment_history[word.adjustment_history.length - 1].from} 調整為 ${newLevel}`);
                    
                    // 發送跨頁面通知
                    this.notifyDataUpdate('level_adjusted', {
                        word: word.word,
                        from: word.adjustment_history[word.adjustment_history.length - 1].from,
                        to: newLevel,
                        timestamp: Date.now()
                    });
                    
                    resolve(word);
                };
                
                updateRequest.onerror = () => {
                    reject(updateRequest.error);
                };
            };
            
            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }
    
    // 恢復單字原始等級
    async resetWordLevel(wordId) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(wordId);
            
            getRequest.onsuccess = () => {
                const word = getRequest.result;
                if (!word) {
                    reject(new Error('單字不存在'));
                    return;
                }
                
                if (word.original_level && word.original_level !== word.level) {
                    word.level = word.original_level;
                    word.user_adjusted = false;
                    
                    const updateRequest = store.put(word);
                    
                    updateRequest.onsuccess = () => {
                        console.log(`單字 ${word.word} 已恢復至原始等級 ${word.original_level}`);
                        resolve(word);
                    };
                    
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                } else {
                    resolve(word);
                }
            };
            
            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }
    
    // 獲取所有用戶調整過的單字
    async getAdjustedWords() {
        const allWords = await this.getAllWords();
        return allWords.filter(word => word.user_adjusted === true);
    }
    
    // 根據單字文字查找單字
    async findWordByText(wordText) {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('word');
        
        return new Promise((resolve, reject) => {
            const request = index.get(wordText.toLowerCase());
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

// 建立全域實例
const wordDB = new WordDatabase();