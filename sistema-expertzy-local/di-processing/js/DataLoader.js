/**
 * DataLoader - Carregador de DIs do Banco de Dados
 * Substitui DIProcessor.js - trabalha apenas com dados processados da API
 * Não processa XML - apenas carrega dados já processados
 */
class DataLoader {
    constructor() {
        this.diData = null;
        this.databaseConnector = null;
        this.configLoader = new ConfigLoader();
        this.configsLoaded = false;
    }

    /**
     * Inicializa o carregador com conexão ao banco
     */
    async init() {
        if (!this.databaseConnector) {
            this.databaseConnector = new DatabaseConnector();
        }
        
        if (!this.configsLoaded) {
            await this.configLoader.loadAll();
            this.configsLoaded = true;
        }
    }

    /**
     * Carrega DI específica do banco via API
     * @param {string} numeroDI - Número da DI
     * @returns {object} Dados da DI já processados
     */
    async loadDI(numeroDI) {
        await this.init();
        
        try {
            console.log(`📥 DataLoader: Carregando DI ${numeroDI} da API...`);
            
            const response = await this.databaseConnector.buscarDI(numeroDI);
            
            if (!response || !response.data) {
                throw new Error(`DI ${numeroDI} não encontrada no banco`);
            }
            
            // Dados já vêm processados da API - usar diretamente
            this.diData = response.data;
            
            console.log('✅ DataLoader: DI carregada com sucesso', {
                numero_di: this.diData.numero_di,
                total_adicoes: this.diData.total_adicoes,
                valor_total: this.diData.resumo?.valor_total_adicoes
            });
            
            return this.diData;
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao carregar DI', error);
            throw error;
        }
    }

    /**
     * Lista DIs disponíveis no banco
     * @param {number} page - Página
     * @param {number} limit - Limite por página  
     * @param {object} filters - Filtros de busca
     * @returns {object} Lista paginada de DIs
     */
    async listDIs(page = 1, limit = 10, filters = {}) {
        await this.init();
        
        try {
            console.log('📋 DataLoader: Listando DIs disponíveis...', { page, limit, filters });
            
            const response = await this.databaseConnector.listarDIs(page, limit, filters);
            
            console.log(`✅ DataLoader: ${response?.data?.length || 0} DIs encontradas`);
            
            return response;
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao listar DIs', error);
            throw error;
        }
    }

    /**
     * Obtém estatísticas do banco
     * @returns {object} Estatísticas gerais
     */
    async getStats() {
        await this.init();
        
        try {
            // Usar endpoint de status que já existe
            const response = await this.databaseConnector.checkAPIStatus();
            
            if (response && response.stats) {
                return response.stats;
            }
            
            return {
                total_dis: 0,
                total_adicoes: 0,
                total_mercadorias: 0,
                last_import: null
            };
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao obter estatísticas', error);
            return {
                total_dis: 0,
                total_adicoes: 0, 
                total_mercadorias: 0,
                last_import: null
            };
        }
    }

    /**
     * Valida se DI carregada tem dados necessários para cálculos
     * @returns {boolean} Se DI é válida
     */
    validateLoadedDI() {
        if (!this.diData) {
            throw new Error('Nenhuma DI carregada');
        }
        
        if (!this.diData.numero_di) {
            throw new Error('Número da DI não encontrado');
        }
        
        if (!this.diData.adicoes || this.diData.adicoes.length === 0) {
            throw new Error('DI sem adições - não é possível calcular impostos');
        }
        
        if (!this.diData.importador_uf) {
            throw new Error('Estado do importador não encontrado - necessário para cálculo ICMS');
        }
        
        console.log('✅ DataLoader: DI validada com sucesso');
        return true;
    }

    /**
     * Obtém dados da DI atualmente carregada
     * @returns {object} Dados da DI
     */
    getCurrentDI() {
        return this.diData;
    }

    /**
     * Limpa dados carregados
     */
    clear() {
        this.diData = null;
        console.log('🧹 DataLoader: Dados limpos');
    }

    /**
     * Formata dados para compatibilidade com ComplianceCalculator
     * @returns {object} Dados formatados
     */
    getFormattedData() {
        if (!this.diData) {
            throw new Error('Nenhuma DI carregada');
        }
        
        // Os dados da API já estão no formato correto
        // Apenas garantir alguns campos necessários
        const formatted = {
            ...this.diData,
            
            // Garantir campo importador estruturado
            importador: {
                nome: this.diData.importador_nome,
                cnpj: this.diData.importador_cnpj,
                endereco_uf: this.diData.importador_uf,
                cidade: this.diData.importador_cidade
            },
            
            // Garantir totais calculados
            totais: this.diData.resumo || {}
        };
        
        return formatted;
    }
}