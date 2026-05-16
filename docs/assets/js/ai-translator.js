/**
 * ========================================
 *     🌍 AI-Powered Page Translation System
 * ========================================
 * 
 * Advanced multi-language translation system with
 * intelligent caching and real-time page translation
 */
class AIPageTranslator {
    constructor() {
        this.currentLanguage = 'en';
        this.originalContent = null;
        this.translationCache = new Map();
        this.supportedLanguages = {
            'en': '🇺🇸 English',
            'ja': '🇯🇵 日本語',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano',
            'es': '🇪🇸 Español',
            'pt': '🇵🇹 Português',
            'fr': '🇫🇷 Français',
            'zh': '🇨🇳 中文',
            'ko': '🇰🇷 한국어',
            'ru': '🇷🇺 Русский'
        };
        this.init();
    }

    /**
     * 🚀 Initialize the translation system
     */
    init() {
        this.saveOriginalContent();
        this.setupLanguageSelector();
        this.loadSavedLanguage();
    }

    /**
     * 💾 Save original page content for restoration
     */
    saveOriginalContent() {
        /* ─── Store original content ─── */
        this.originalContent = {
            title: document.title,
            body: document.body.innerHTML
        };
    }

    /**
     * ⚙️ Setup language selector event binding
     * 
     * 🎯 When user selects a language option → translation starts automatically
     */
    setupLanguageSelector() {
        /* ══════════════════════════════════════════════╗
        ║  🔧 Bind language selector change event       ║
        ╚══════════════════════════════════════════════ */
        const existingSelector = document.getElementById('aiLanguageSelect');

        if (existingSelector) {
            existingSelector.onchange = (e) => this.translatePage(e.target.value);
        }
    }

    createLanguageSelector() {
        const header = document.querySelector('header');
        if (!header) return;

        const languageContainer = document.createElement('div');
        languageContainer.className = 'ai-language-selector';
        
        const select = document.createElement('select');
        select.id = 'aiLanguageSelect';
        select.onchange = (e) => this.translatePage(e.target.value);

        /* ─── 🌐 Add language options ─── */
        Object.entries(this.supportedLanguages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            select.appendChild(option);
        });

        const loadingSpinner = document.createElement('div');
        loadingSpinner.id = 'translationLoading';
        loadingSpinner.className = 'translation-loading hidden';
        loadingSpinner.innerHTML = '🔄 Translating...';

        languageContainer.appendChild(select);
        languageContainer.appendChild(loadingSpinner);
        
        /* ─── 📍 Insert into header ─── */
        const headerContainer = header.querySelector('.header-container') || header;
        headerContainer.appendChild(languageContainer);
    }

    /**
     * 🌍 Translate entire page to target language
     * @param {string} targetLang - Target language code
     */
    async translatePage(targetLang) {
        /* ─── 🔍 Check if already in target language ─── */
        if (targetLang === this.currentLanguage) return;

        this.showLoading(true);

        try {
            /* ══════════════════════════════════════════════╗
            ║  💨 Check cache first for faster loading      ║
            ╚══════════════════════════════════════════════ */
            if (this.translationCache.has(targetLang)) {
                this.applyTranslation(this.translationCache.get(targetLang));
                this.currentLanguage = targetLang;
                this.saveLanguagePreference(targetLang);
                this.showLoading(false);
                return;
            }

            /* ─── 🔄 Restore original language ─── */
            if (targetLang === 'en') {
                this.restoreOriginalContent();
                this.currentLanguage = 'en';
                this.saveLanguagePreference('en');
                this.showLoading(false);
                return;
            }

            /* ═══════════════════════════════════════════════╗
            ║  🤖 AI Translation Pipeline                    ║
            ╚═══════════════════════════════════════════════ */
            const content = this.extractTranslatableContent();
            
            /* ─── 🧠 Translate using AI ─── */
            const translatedContent = await this.performAITranslation(content, targetLang);
            
            /* ─── 💾 Cache the result ─── */
            this.translationCache.set(targetLang, translatedContent);
            
            /* ─── ✨ Apply translation ─── */
            this.applyTranslation(translatedContent);
            
            this.currentLanguage = targetLang;
            this.saveLanguagePreference(targetLang);

        } catch (error) {
            console.error('Translation failed:', error);
            this.showError('Translation failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 📝 Extract all text content from the main section
     * @returns {Array} Array of translatable content with paths  
     */
    extractTranslatableContent() {
        const content = [];

        /* ═══════════════════════════════════════════════╗
        ║  🎯 Target: <main> element in all pages       ║
        ╚═══════════════════════════════════════════════ */
        const main = document.querySelector('main');
        
        if (main) {
            /* ─── 🔍 Extract text content while preserving structure ─── */
            const walker = document.createTreeWalker(
                main,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        /* ─── ⚡ Skip empty text nodes and scripts ─── */
                        const trimmed = node.textContent.trim();
                        if (!trimmed || node.parentElement.tagName === 'SCRIPT') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let textNode;
            while (textNode = walker.nextNode()) {
                content.push({
                    text: textNode.textContent.trim(),
                    path: this.getNodePath(textNode)
                });
            }
        }

        /* ─── 📄 Also extract page title ─── */
        content.push({
            text: document.title,
            path: 'title'
        });

        return content;
    }

    getNodePath(node) {
        const path = [];
        let current = node;
        
        while (current && current !== document.body) {
            if (current.nodeType === Node.TEXT_NODE) {
                current = current.parentElement;
                continue;
            }
            
            const siblings = Array.from(current.parentNode.children);
            const index = siblings.indexOf(current);
            path.unshift(`${current.tagName.toLowerCase()}:${index}`);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }

    /**
     * 🤖 Perform AI translation with batch processing
     * @param {Array} contentArray - Content to translate
     * @param {string} targetLang - Target language code
     * @returns {Array} Translated content array
     */
    async performAITranslation(contentArray, targetLang) {
        const translations = [];
        const batchSize = 5; /* 📦 Translate in batches to avoid API limits */

        for (let i = 0; i < contentArray.length; i += batchSize) {
            const batch = contentArray.slice(i, i + batchSize);
            const batchTranslations = await Promise.all(
                batch.map(item => this.translateSingleText(item.text, targetLang))
            );
            
            batch.forEach((item, index) => {
                translations.push({
                    original: item.text,
                    translated: batchTranslations[index],
                    path: item.path
                });
            });

            /* ─── ⏱️ Small delay to be nice to the API ─── */
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return translations;
    }

    /**
     * 🌐 Translate single text using AI services
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code
     * @returns {string} Translated text
     */
    async translateSingleText(text, targetLang) {
        try {
            /* ══════════════════════════════════════════════╗
            ║  📡 Using LibreTranslate (free & open source) ║
            ╚══════════════════════════════════════════════ */
            const response = await fetch('https://libretranslate.com/translate', {
                method: 'POST',
                body: JSON.stringify({
                    q: text,
                    source: 'auto',
                    target: targetLang === 'ja' ? 'ja' : targetLang === 'zh' ? 'zh' : targetLang,
                    format: 'text'
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            return data.translatedText || text;
        } catch (error) {
            /* ── 🔄 Fallback to MyMemory API ─── */
            try {
                const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`);
                const data = await response.json();
                return data.responseData.translatedText || text;
            } catch (fallbackError) {
                console.error('Both translation services failed:', fallbackError);
                return text; /* 🔙 Return original text if all fails */
            }
        }
    }

    /**
     * ✨ Apply translations to DOM elements
     * @param {Array} translations - Array of translation objects
     */
    applyTranslation(translations) {
        translations.forEach(({ original, translated, path }) => {
            if (path === 'title') {
                document.title = translated;
                return;
            }

            /* ─── 🔍 Find and replace text content ─── */
            const main = document.querySelector('main');
            if (!main) return;

            const walker = document.createTreeWalker(
                main,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let textNode;
            while (textNode = walker.nextNode()) {
                if (textNode.textContent.trim() === original) {
                    textNode.textContent = translated;
                }
            }
        });
    }

    /**
     * 🔄 Restore original page content
     */
    restoreOriginalContent() {
        document.title = this.originalContent.title;
        document.body.innerHTML = this.originalContent.body;
        /* ─── 🔄 Re-initialize after restoring content ─── */
        this.setupLanguageSelector();
    }

    /**
     * 🔄 Show/hide loading indicator
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        const loader = document.getElementById('translationLoading');
        if (loader) {
            loader.classList.toggle('hidden', !show);
        }
    }

    /**
     * ❌ Show error message as toast
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'translation-error-toast';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        /* ─── ⏰ Auto-remove after 5 seconds ─── */
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * 💾 Save language preference to localStorage
     * @param {string} lang - Language to save
     */
    saveLanguagePreference(lang) {
        localStorage.setItem('aiTranslationLanguage', lang);
    }

    /**
     * 📖 Load saved language preference from localStorage
     */
    loadSavedLanguage() {
        const saved = localStorage.getItem('aiTranslationLanguage');
        if (saved && saved !== 'en') {
            const selector = document.getElementById('aiLanguageSelect');
            if (selector) {
                selector.value = saved;
                this.translatePage(saved);
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════
   🚀 Initialize AI translator when DOM is loaded
   ═══════════════════════════════════════════════════════════ */
let aiTranslator;
document.addEventListener('DOMContentLoaded', () => {
    /* ─── ⏱️ Wait for header to be loaded ─── */
    setTimeout(() => {
        aiTranslator = new AIPageTranslator();
    }, 500);
});

/* ═══════════════════════════════════════════════════════════
   🌍 Export for manual use - Global API
   ═══════════════════════════════════════════════════════════ */
window.aiTranslate = (lang) => {
    if (aiTranslator) {
        aiTranslator.translatePage(lang);
    }
};