/**
 * DatabaseConnector.js - Sistema Importa Precifica
 * 
 * Connector para integração com API REST do banco de dados MySQL
 * Fornece sincronização entre localStorage e banco de dados
 * 
 * Funcionalidades:
 * - Cache local com fallback para localStorage
 * - Sincronização automática bidirecional
 * - Queue de operações offline
 * - Retry automático em falhas de rede
 * - Notificações de status de conexão
 */

class DatabaseConnector {
    constructor(apiBaseUrl = 'http://localhost:8889/api/endpoints/') {
        this.apiBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : apiBaseUrl + '/';
        this.cache = new Map();
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.eventListeners = new Map();
        
        // Configurações
        this.config = {
            cacheTimeout: 5 * 60 * 1000, // 5 minutos
            retryAttempts: 3,
            retryDelay: 1000,
            syncInterval: 30 * 1000, // 30 segundos
            requestTimeout: 10000 // 10 segundos
        };

        this.init();
    }

    /**
     * Inicialização do connector
     */
    init() {
        this.setupEventListeners();
        this.setupPeriodicSync();
        this.loadCacheFromStorage();
        this.checkAPIStatus();
        
        Logger.log('DatabaseConnector inicializado', 'info');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Detectar mudanças na conectividade
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.emit('connectionChange', { online: true });
            this.processOfflineQueue();
            Logger.log('Conexão restaurada - processando queue offline', 'info');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.emit('connectionChange', { online: false });
            Logger.log('Conexão perdida - modo offline ativado', 'warning');
        });

        // Salvar cache antes de sair da página
        window.addEventListener('beforeunload', () => {
            this.saveCacheToStorage();
        });
    }

    /**
     * Configurar sincronização periódica
     */
    setupPeriodicSync() {
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.processOfflineQueue();
            }
        }, this.config.syncInterval);
    }

    /**
     * Verificar status da API
     */
    async checkAPIStatus() {
        try {
            const response = await this.makeRequest('GET', 'status.php');
            
            if (response.success) {
                this.emit('apiStatus', { 
                    status: 'healthy', 
                    data: response 
                });
                Logger.log('API status: ' + response.status, 'success');
            } else {
                throw new Error('API retornou erro');
            }
        } catch (error) {
            this.emit('apiStatus', { 
                status: 'error', 
                error: error.message 
            });
            Logger.log('Erro ao verificar status da API: ' + error.message, 'error');
        }
    }

    // ===================================================================
    // MÉTODOS PRINCIPAIS DA API
    // ===================================================================

    /**
     * Listar DIs com filtros e paginação
     */
    async listarDIs(page = 1, limit = 50, filters = {}) {
        const cacheKey = `listar-dis-${page}-${limit}-${JSON.stringify(filters)}`;
        
        // Tentar cache primeiro
        const cached = this.getFromCache(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            Logger.log('Dados de DIs carregados do cache', 'info');
            return cached.data;
        }

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filters
            });

            const response = await this.makeRequest('GET', `listar-dis.php?${params}`);
            
            if (response.success) {
                // Armazenar no cache
                this.setCache(cacheKey, response, Date.now());
                Logger.log(`${response.data.length} DIs carregadas da API`, 'success');
                return response;
            } else {
                throw new Error(response.error || 'Erro desconhecido');
            }
        } catch (error) {
            Logger.log('Erro ao listar DIs: ' + error.message, 'error');
            
            // Fallback para localStorage se offline
            if (!this.isOnline) {
                return this.getFromLocalStorage('dis_list') || { success: false, error: 'Dados não disponíveis offline' };
            }
            
            throw error;
        }
    }

    /**
     * Buscar DI específica
     */
    async buscarDI(numeroDI) {
        if (!numeroDI) {
            throw new Error('Número da DI é obrigatório');
        }

        const cacheKey = `buscar-di-${numeroDI}`;
        
        // Tentar cache primeiro
        const cached = this.getFromCache(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            Logger.log(`DI ${numeroDI} carregada do cache`, 'info');
            return cached.data;
        }

        try {
            const response = await this.makeRequest('GET', `buscar-di.php?numero_di=${numeroDI}`);
            
            if (response.success) {
                // Armazenar no cache
                this.setCache(cacheKey, response, Date.now());
                Logger.log(`DI ${numeroDI} carregada da API`, 'success');
                return response;
            } else {
                throw new Error(response.error || 'DI não encontrada');
            }
        } catch (error) {
            Logger.log(`Erro ao buscar DI ${numeroDI}: ` + error.message, 'error');
            
            // Fallback para localStorage se offline
            if (!this.isOnline) {
                const localData = this.getFromLocalStorage(`di_${numeroDI}`);
                if (localData) {
                    return { success: true, data: localData };
                }
            }
            
            throw error;
        }
    }

    /**
     * Salvar DI processada do XML
     */
    async salvarDI(numeroDI, dadosDI) {
        if (!numeroDI || !dadosDI) {
            throw new Error('Número da DI e dados são obrigatórios para salvar');
        }

        const operacao = {
            type: 'salvar_di',
            data: dadosDI,
            timestamp: Date.now(),
            attempts: 0
        };

        if (this.isOnline) {
            try {
                const response = await this.makeRequest('POST', 'salvar-di.php', dadosDI);
                
                if (response.success) {
                    // Invalidar cache relacionado
                    this.invalidateCache(`buscar-di-${numeroDI}`);
                    this.invalidateCache('listar-dis');
                    
                    Logger.log(`DI ${numeroDI} salva no banco de dados`, 'success');
                    return response;
                } else {
                    throw new Error(response.error || 'Erro ao salvar DI');
                }
            } catch (error) {
                // Adicionar à queue offline se falhar
                this.addToOfflineQueue(operacao);
                throw error;
            }
        } else {
            // Adicionar à queue offline
            this.addToOfflineQueue(operacao);
            
            // Salvar localmente temporariamente
            this.setLocalStorage(`di_temp_${numeroDI}_${Date.now()}`, dadosDI);
            
            Logger.log('DI adicionada à queue offline', 'warning');
            return { success: true, offline: true, message: 'DI será sincronizada quando a conexão for restaurada' };
        }
    }

    /**
     * Salvar cálculo realizado
     */
    async salvarCalculo(dadosCalculo) {
        if (!dadosCalculo.numero_di) {
            throw new Error('Número da DI é obrigatório para salvar cálculo');
        }

        const operacao = {
            type: 'salvar_calculo',
            data: dadosCalculo,
            timestamp: Date.now(),
            attempts: 0
        };

        if (this.isOnline) {
            try {
                const response = await this.makeRequest('POST', 'salvar-calculo.php', dadosCalculo);
                
                if (response.success) {
                    // Invalidar cache relacionado
                    this.invalidateCache(`buscar-di-${dadosCalculo.numero_di}`);
                    this.invalidateCache(`buscar-calculos-${dadosCalculo.numero_di}`);
                    
                    Logger.log(`Cálculo salvo para DI ${dadosCalculo.numero_di}`, 'success');
                    return response;
                } else {
                    throw new Error(response.error || 'Erro ao salvar cálculo');
                }
            } catch (error) {
                // Adicionar à queue offline se falhar
                this.addToOfflineQueue(operacao);
                throw error;
            }
        } else {
            // Adicionar à queue offline
            this.addToOfflineQueue(operacao);
            
            // Salvar localmente temporariamente
            this.setLocalStorage(`calculo_temp_${dadosCalculo.numero_di}_${Date.now()}`, dadosCalculo);
            
            Logger.log('Cálculo adicionado à queue offline', 'warning');
            return { success: true, offline: true, message: 'Cálculo será sincronizado quando a conexão for restaurada' };
        }
    }

    /**
     * Buscar cálculos salvos
     */
    async buscarCalculos(numeroDI, estadoIcms = null, tipoCalculo = null) {
        if (!numeroDI) {
            throw new Error('Número da DI é obrigatório');
        }

        const cacheKey = `buscar-calculos-${numeroDI}-${estadoIcms}-${tipoCalculo}`;
        
        // Tentar cache primeiro
        const cached = this.getFromCache(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            Logger.log(`Cálculos da DI ${numeroDI} carregados do cache`, 'info');
            return cached.data;
        }

        try {
            const params = new URLSearchParams({ numero_di: numeroDI });
            if (estadoIcms) params.append('estado_icms', estadoIcms);
            if (tipoCalculo) params.append('tipo_calculo', tipoCalculo);

            const response = await this.makeRequest('GET', `buscar-calculos.php?${params}`);
            
            if (response.success) {
                // Armazenar no cache
                this.setCache(cacheKey, response, Date.now());
                Logger.log(`${response.data.length} cálculos encontrados para DI ${numeroDI}`, 'success');
                return response;
            } else {
                throw new Error(response.error || 'Erro ao buscar cálculos');
            }
        } catch (error) {
            Logger.log(`Erro ao buscar cálculos da DI ${numeroDI}: ` + error.message, 'error');
            
            // Fallback para localStorage se offline
            if (!this.isOnline) {
                const localData = this.getFromLocalStorage(`calculos_${numeroDI}`);
                if (localData) {
                    return { success: true, data: localData };
                }
            }
            
            throw error;
        }
    }

    // ===================================================================
    // MÉTODOS DE SINCRONIZAÇÃO
    // ===================================================================

    /**
     * Sincronizar DI do localStorage para o banco
     */
    async sincronizarDI(numeroDI, diData) {
        if (!this.isOnline) {
            Logger.log('Não é possível sincronizar offline - DI adicionada à queue', 'warning');
            this.addToOfflineQueue({
                type: 'sincronizar_di',
                data: { numeroDI, diData },
                timestamp: Date.now(),
                attempts: 0
            });
            return { success: false, queued: true };
        }

        try {
            // Primeiro, verificar se DI já existe no banco
            const existente = await this.buscarDI(numeroDI).catch(() => null);
            
            if (existente && existente.success) {
                Logger.log(`DI ${numeroDI} já existe no banco - sincronização desnecessária`, 'info');
                return { success: true, exists: true };
            }

            // Se não existe, seria necessário um endpoint para inserir DI
            // Por agora, apenas salvamos no localStorage e marcamos para sync manual
            this.setLocalStorage(`di_sync_pending_${numeroDI}`, diData);
            
            Logger.log(`DI ${numeroDI} marcada para sincronização manual`, 'warning');
            return { success: true, manual_sync_required: true };

        } catch (error) {
            Logger.log(`Erro ao sincronizar DI ${numeroDI}: ` + error.message, 'error');
            throw error;
        }
    }

    /**
     * Processar queue de operações offline
     */
    async processOfflineQueue() {
        if (!this.isOnline || this.syncInProgress || this.offlineQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        this.emit('syncStart', { queueSize: this.offlineQueue.length });

        Logger.log(`Processando ${this.offlineQueue.length} operações da queue offline`, 'info');

        let processed = 0;
        let failed = 0;

        // Processar operações uma por vez para evitar sobrecarga
        for (let i = this.offlineQueue.length - 1; i >= 0; i--) {
            const operacao = this.offlineQueue[i];
            
            try {
                await this.processOfflineOperation(operacao);
                this.offlineQueue.splice(i, 1); // Remove da queue se bem-sucedida
                processed++;
            } catch (error) {
                operacao.attempts++;
                
                if (operacao.attempts >= this.config.retryAttempts) {
                    // Remove da queue após muitas tentativas
                    this.offlineQueue.splice(i, 1);
                    failed++;
                    Logger.log(`Operação falhou após ${this.config.retryAttempts} tentativas: ${error.message}`, 'error');
                } else {
                    Logger.log(`Tentativa ${operacao.attempts} falhou, tentando novamente: ${error.message}`, 'warning');
                }
            }

            // Pequeno delay entre operações
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.syncInProgress = false;
        this.emit('syncComplete', { processed, failed, remaining: this.offlineQueue.length });

        Logger.log(`Sincronização concluída: ${processed} processadas, ${failed} falharam`, 'info');
    }

    /**
     * Processar uma operação offline específica
     */
    async processOfflineOperation(operacao) {
        switch (operacao.type) {
            case 'salvar_di':
                const responseDI = await this.makeRequest('POST', 'salvar-di.php', operacao.data);
                if (!responseDI.success) {
                    throw new Error(responseDI.error);
                }
                // Invalidar cache relacionado
                this.invalidateCache(`buscar-di-${operacao.data.numero_di}`);
                this.invalidateCache('listar-dis');
                break;
                
            case 'salvar_calculo':
                const response = await this.makeRequest('POST', 'salvar-calculo.php', operacao.data);
                if (!response.success) {
                    throw new Error(response.error);
                }
                // Invalidar cache relacionado
                this.invalidateCache(`buscar-di-${operacao.data.numero_di}`);
                break;
                
            case 'sincronizar_di':
                // Por implementar - seria necessário endpoint específico
                throw new Error('Sincronização de DI requer implementação de endpoint específico');
                
            default:
                throw new Error(`Tipo de operação desconhecido: ${operacao.type}`);
        }
    }

    // ===================================================================
    // MÉTODOS DE CACHE
    // ===================================================================

    /**
     * Obter dados do cache
     */
    getFromCache(key) {
        return this.cache.get(key);
    }

    /**
     * Armazenar dados no cache
     */
    setCache(key, data, timestamp) {
        this.cache.set(key, { data, timestamp });
    }

    /**
     * Verificar se cache é válido
     */
    isCacheValid(timestamp) {
        return Date.now() - timestamp < this.config.cacheTimeout;
    }

    /**
     * Invalidar cache específico
     */
    invalidateCache(key) {
        this.cache.delete(key);
    }

    /**
     * Limpar todo o cache
     */
    clearCache() {
        this.cache.clear();
        Logger.log('Cache limpo', 'info');
    }

    // ===================================================================
    // MÉTODOS DE LOCALSTORAGE
    // ===================================================================

    /**
     * Salvar dados no localStorage
     */
    setLocalStorage(key, data) {
        try {
            localStorage.setItem(`db_connector_${key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            Logger.log(`Erro ao salvar no localStorage: ${error.message}`, 'error');
        }
    }

    /**
     * Obter dados do localStorage
     */
    getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(`db_connector_${key}`);
            if (item) {
                const parsed = JSON.parse(item);
                return parsed.data;
            }
        } catch (error) {
            Logger.log(`Erro ao ler do localStorage: ${error.message}`, 'error');
        }
        return null;
    }

    /**
     * Salvar cache no localStorage
     */
    saveCacheToStorage() {
        try {
            const cacheData = {};
            for (const [key, value] of this.cache) {
                // Apenas salvar cache recente
                if (this.isCacheValid(value.timestamp)) {
                    cacheData[key] = value;
                }
            }
            
            localStorage.setItem('db_connector_cache', JSON.stringify(cacheData));
            Logger.log('Cache salvo no localStorage', 'info');
        } catch (error) {
            Logger.log(`Erro ao salvar cache: ${error.message}`, 'error');
        }
    }

    /**
     * Carregar cache do localStorage
     */
    loadCacheFromStorage() {
        try {
            const cacheData = localStorage.getItem('db_connector_cache');
            if (cacheData) {
                const parsed = JSON.parse(cacheData);
                for (const [key, value] of Object.entries(parsed)) {
                    if (this.isCacheValid(value.timestamp)) {
                        this.cache.set(key, value);
                    }
                }
                Logger.log('Cache carregado do localStorage', 'info');
            }
        } catch (error) {
            Logger.log(`Erro ao carregar cache: ${error.message}`, 'error');
        }
    }

    // ===================================================================
    // MÉTODOS DE REDE
    // ===================================================================

    /**
     * Fazer requisição HTTP para a API
     */
    async makeRequest(method, endpoint, data = null) {
        const url = this.apiBaseUrl + endpoint;
        
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        // Adicionar timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);
        options.signal = controller.signal;

        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Timeout da requisição');
            }
            
            throw error;
        }
    }

    /**
     * Adicionar operação à queue offline
     */
    addToOfflineQueue(operacao) {
        this.offlineQueue.push(operacao);
        this.emit('queueChange', { size: this.offlineQueue.length });
    }

    // ===================================================================
    // SISTEMA DE EVENTOS
    // ===================================================================

    /**
     * Registrar event listener
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remover event listener
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emitir evento
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erro em event listener para '${event}':`, error);
                }
            });
        }
    }

    // ===================================================================
    // MÉTODOS PÚBLICOS DE CONTROLE
    // ===================================================================

    /**
     * Obter status atual do connector
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            cacheSize: this.cache.size,
            queueSize: this.offlineQueue.length,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Forçar sincronização manual
     */
    async forceSyncNow() {
        if (!this.isOnline) {
            throw new Error('Não é possível sincronizar offline');
        }
        
        await this.processOfflineQueue();
    }

    /**
     * Limpar todos os dados
     */
    clearAllData() {
        this.clearCache();
        this.offlineQueue = [];
        
        // Limpar dados relacionados do localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('db_connector_')) {
                localStorage.removeItem(key);
            }
        });
        
        Logger.log('Todos os dados do DatabaseConnector foram limpos', 'info');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DatabaseConnector = DatabaseConnector;
}