// 應用程式設定檔
const AppConfig = {
    // 版本資訊
    version: '1.0.0',
    
    // 各等級目標單字數
    levelTargets: {
        '300以下': 200,
        '300-500': 500,
        '500-600': 800,
        '600-700': 1000,
        '700-800': 1200,
        '800-900': 800,
        '900以上': 500
    },
    
    // 預設設定
    defaults: {
        level: '300-500',
        batchSize: 10,
        showPhonetic: true,
        autoPlaySound: false
    },
    
    // API 設定（注意：不要在此儲存 API Key）
    api: {
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 2000,
        rateLimitDelay: 2000 // 毫秒
    },
    
    // 資料庫設定
    database: {
        name: 'TOEICWordsDB',
        version: 1,
        storeName: 'words'
    },
    
    // UI 設定
    ui: {
        animationDuration: 300,
        maxPhrases: 3,
        maxExampleLength: 200
    }
};

// 防止設定被意外修改
Object.freeze(AppConfig);