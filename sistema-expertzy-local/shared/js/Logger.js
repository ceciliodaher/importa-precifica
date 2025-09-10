/**
 * Logger.js - Sistema de Log para Importa Precifica
 * 
 * Classe simples para gerenciar logs do sistema
 */

class Logger {
    /**
     * Log de mensagem genérica
     * @param {string} message - Mensagem para logar
     * @param {string} type - Tipo do log (info, success, warning, error)
     */
    static log(message, type = 'info') {
        const timestamp = new Date().toISOString().substring(11, 19);
        const prefix = `[${timestamp}]`;
        
        switch(type) {
            case 'success':
                console.log(`${prefix} ✅ ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'info':
            default:
                console.log(`${prefix} ℹ️ ${message}`);
                break;
        }
    }
    
    /**
     * Log de sucesso
     */
    static success(message) {
        this.log(message, 'success');
    }
    
    /**
     * Log de erro
     */
    static error(message) {
        this.log(message, 'error');
    }
    
    /**
     * Log de aviso
     */
    static warning(message) {
        this.log(message, 'warning');
    }
    
    /**
     * Log de informação
     */
    static info(message) {
        this.log(message, 'info');
    }
}

// Tornar disponível globalmente
window.Logger = Logger;