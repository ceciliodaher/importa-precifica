/**
 * ConfigLoader.js - Simple Configuration Loader
 * 
 * Loads only essential configuration files that change with legislation
 * Maintains KISS principle - don't over-engineer what works
 */

class ConfigLoader {
    constructor() {
        this.cache = {};
        this.loaded = false;
    }

    /**
     * Load all essential configuration files
     */
    async loadAll() {
        if (this.loaded) {
            return this.cache;
        }

        try {
            console.log('📂 ConfigLoader: Carregando configurações essenciais...');

            // Load existing working configurations
            const configs = await Promise.all([
                fetch('../shared/data/aliquotas.json').then(r => r.json()),
                fetch('../shared/data/beneficios.json').then(r => r.json()),
                fetch('../shared/data/config.json').then(r => r.json()),
                fetch('../shared/data/import-fees.json').then(r => r.json())
            ]);

            this.cache = {
                aliquotas: configs[0],
                beneficios: configs[1], 
                config: configs[2],
                importFees: configs[3]
            };

            this.loaded = true;
            console.log('✅ ConfigLoader: Configurações carregadas com sucesso');
            return this.cache;

        } catch (error) {
            console.error('❌ ConfigLoader: Erro ao carregar configurações:', error);
            throw new Error(`Falha ao carregar configurações: ${error.message}`);
        }
    }

    /**
     * Get ICMS rate for specific state
     */
    getICMSRate(estado) {
        if (!this.loaded) {
            throw new Error('ConfigLoader não inicializado - chame loadAll() primeiro');
        }

        const estadoConfig = this.cache.aliquotas.aliquotas_icms_2025[estado];
        if (!estadoConfig) {
            throw new Error(`Estado ${estado} não encontrado nas configurações ICMS`);
        }

        return estadoConfig.aliquota_interna;
    }

    /**
     * Get AFRMM rate
     */
    getAFRMMRate() {
        if (!this.loaded) {
            throw new Error('ConfigLoader não inicializado - chame loadAll() primeiro');
        }

        return this.cache.importFees.afrmm.rate;
    }

    /**
     * Get fiscal benefits for state and NCM
     */
    getBenefits(estado, ncm) {
        if (!this.loaded) {
            throw new Error('ConfigLoader não inicializado - chame loadAll() primeiro');
        }

        return this.cache.beneficios[estado] || null;
    }

    /**
     * Get SISCOMEX fees
     */
    getSISCOMEXFees() {
        if (!this.loaded) {
            throw new Error('ConfigLoader não inicializado - chame loadAll() primeiro');
        }

        return this.cache.importFees.siscomex;
    }

    /**
     * Get import fees configuration
     */
    getImportFees() {
        if (!this.loaded) {
            throw new Error('ConfigLoader não inicializado - chame loadAll() primeiro');
        }

        return this.cache.importFees;
    }

    /**
     * Check if configuration is loaded
     */
    isLoaded() {
        return this.loaded;
    }
}