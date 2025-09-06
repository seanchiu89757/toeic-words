// 語音朗讀功能模組
class SpeechService {
    constructor() {
        // 檢查瀏覽器支援
        this.isSupported = 'speechSynthesis' in window;
        
        if (!this.isSupported) {
            console.warn('此瀏覽器不支援語音合成功能');
            return;
        }
        
        // 初始化語音設定
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.currentVoice = null;
        
        // 預設設定
        this.settings = {
            rate: 0.9,        // 語速（0.1-10）
            pitch: 1.0,       // 音調（0-2）
            volume: 1.0,      // 音量（0-1）
            lang: 'en-US'     // 預設語言
        };
        
        // 載入可用語音
        this.loadVoices();
        
        // 處理語音列表更新
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }
    
    // 載入可用語音
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        
        // 選擇最佳英文語音
        const englishVoices = this.voices.filter(voice => 
            voice.lang.startsWith('en')
        );
        
        // 優先選擇美式英語
        const usVoices = englishVoices.filter(voice => 
            voice.lang === 'en-US'
        );
        
        // 優先選擇本地語音（離線可用）
        const localVoices = usVoices.filter(voice => voice.localService === true);
        const onlineVoices = usVoices.filter(voice => voice.localService === false);
        
        // 如果有本地語音就優先使用，否則使用線上語音
        const preferredVoice = localVoices[0] || onlineVoices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') ||
            voice.name.includes('Natural')
        );
        
        this.currentVoice = preferredVoice || usVoices[0] || englishVoices[0];
        
        console.log(`已選擇語音: ${this.currentVoice?.name || '預設'} (${this.currentVoice?.localService ? '離線' : '需要網路'})`);
        
        // 顯示所有可用語音的資訊
        console.log('可用語音列表：');
        englishVoices.forEach(voice => {
            console.log(`  - ${voice.name} (${voice.lang}) [${voice.localService ? '離線' : '線上'}]`);
        });
    }
    
    // 朗讀文字
    speak(text, options = {}) {
        if (!this.isSupported) {
            console.warn('語音功能不可用');
            return Promise.reject('Speech synthesis not supported');
        }
        
        // 停止當前朗讀
        this.stop();
        
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 設定語音參數
            utterance.voice = this.currentVoice;
            utterance.rate = options.rate || this.settings.rate;
            utterance.pitch = options.pitch || this.settings.pitch;
            utterance.volume = options.volume || this.settings.volume;
            utterance.lang = options.lang || this.settings.lang;
            
            // 調試資訊
            console.log(`朗讀設定 - 速度: ${utterance.rate}, 音調: ${utterance.pitch}, 音量: ${utterance.volume}`);
            
            // 事件處理
            utterance.onend = () => {
                console.log('朗讀完成');
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('朗讀錯誤:', event);
                reject(event);
            };
            
            // 開始朗讀
            this.synthesis.speak(utterance);
        });
    }
    
    // 朗讀單字（較慢速度）
    speakWord(word) {
        return this.speak(word, {
            rate: 0.7,  // 較慢速度
            pitch: 1.0
        });
    }
    
    // 朗讀例句（正常速度）
    speakSentence(sentence) {
        return this.speak(sentence, {
            rate: 0.9,  // 正常速度
            pitch: 1.0
        });
    }
    
    // 朗讀中文（使用中文語音）
    speakChinese(text) {
        // 尋找中文語音
        const chineseVoice = this.voices.find(voice => 
            voice.lang.includes('zh') || 
            voice.lang.includes('cmn')
        );
        
        if (chineseVoice) {
            const originalVoice = this.currentVoice;
            this.currentVoice = chineseVoice;
            
            return this.speak(text, {
                rate: 0.9,
                lang: 'zh-TW'
            }).finally(() => {
                this.currentVoice = originalVoice;
            });
        }
        
        return Promise.reject('No Chinese voice available');
    }
    
    // 朗讀單字資料（包含單字、例句）
    async speakWordData(wordData) {
        try {
            // 1. 朗讀英文單字（慢速）
            await this.speakWord(wordData.word);
            await this.delay(500);
            
            // 2. 再朗讀一次（正常速度）
            await this.speak(wordData.word, { rate: 0.9 });
            await this.delay(800);
            
            // 3. 朗讀例句
            if (wordData.toeic_example?.sentence) {
                await this.speakSentence(wordData.toeic_example.sentence);
            }
            
        } catch (error) {
            console.error('朗讀失敗:', error);
        }
    }
    
    // 朗讀常用詞句
    async speakPhrases(phrases) {
        for (const phrase of phrases) {
            await this.speak(phrase.phrase, { rate: 0.85 });
            await this.delay(500);
        }
    }
    
    // 停止朗讀
    stop() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }
    
    // 暫停朗讀
    pause() {
        if (this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
        }
    }
    
    // 繼續朗讀
    resume() {
        if (this.synthesis.paused) {
            this.synthesis.resume();
        }
    }
    
    // 檢查是否正在朗讀
    isSpeaking() {
        return this.synthesis.speaking;
    }
    
    // 更新設定
    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }
    
    // 獲取可用語音列表
    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            local: voice.localService
        }));
    }
    
    // 設定指定語音
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.currentVoice = voice;
            return true;
        }
        return false;
    }
    
    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 測試語音功能
    test() {
        const testText = "Hello, this is a test of the speech synthesis system.";
        return this.speak(testText);
    }
}

// 建立全域實例
const speechService = new SpeechService();

// 匯出給其他模組使用
window.speechService = speechService;