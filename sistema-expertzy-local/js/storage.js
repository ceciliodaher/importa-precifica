/**
 * Módulo de Armazenamento Local para Sistema Expertzy
 * Gerencia localStorage com configurações e dados da DI
 */
class StorageManager {
    constructor() {
        this.prefix = 'expertzy_';
        this.sessionDuration = 24 * 60 * 60 * 1000; // 24 horas
        this.initStorage();
    }

    /**
     * Inicializa storage verificando versão e limpando dados expirados
     */
    initStorage() {
        this.cleanExpiredData();
        this.ensureDefaultConfig();
    }

    /**
     * Limpa dados expirados do localStorage
     */
    cleanExpiredData() {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && (now - data.timestamp > this.sessionDuration)) {
                        localStorage.removeItem(key);
                        console.log(`Removido dado expirado: ${key}`);
                    }
                } catch (error) {
                    // Se não conseguir parsear, remove o item
                    localStorage.removeItem(key);
                }
            }
        });
    }

    /**
     * Garante configurações padrão
     */
    ensureDefaultConfig() {
        if (!this.getConfig()) {
            this.saveConfig({
                estado_padrao: 'GO',
                regime_tributario: 'real',
                tipo_operacao_padrao: 'interestadual',
                auto_calculate: true,
                show_tooltips: true,
                format_numbers: true
            });
        }
    }

    /**
     * Gera chave completa com prefixo
     */
    getKey(name) {
        return `${this.prefix}${name}`;
    }

    /**
     * Cria objeto de dados com timestamp
     */
    createDataObject(data) {
        return {
            data: data,
            timestamp: Date.now(),
            version: '2025.1'
        };
    }

    /**
     * Salva dados da DI processada
     */
    saveDI(diData) {
        try {
            const dataObject = this.createDataObject(diData);
            localStorage.setItem(this.getKey('di_data'), JSON.stringify(dataObject));
            
            // Salvar na lista de histórico
            this.addToHistory({
                numero_di: diData.numero_di,
                data_processamento: new Date().toLocaleString('pt-BR'),
                total_adicoes: diData.total_adicoes,
                valor_total: diData.totais?.valor_total_fob_brl || 0
            });

            console.log('DI salva com sucesso:', diData.numero_di);
            return true;
        } catch (error) {
            console.error('Erro ao salvar DI:', error);
            return false;
        }
    }

    /**
     * Recupera dados da DI
     */
    getDI() {
        try {
            const stored = localStorage.getItem(this.getKey('di_data'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return null;
        } catch (error) {
            console.error('Erro ao recuperar DI:', error);
            return null;
        }
    }

    /**
     * Limpa dados da DI atual do localStorage
     */
    clearDIData() {
        try {
            localStorage.removeItem(this.getKey('di_data'));
            console.log('Dados da DI limpos do localStorage');
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados da DI:', error);
            return false;
        }
    }

    /**
     * Salva configurações de custos extras
     */
    saveCustosExtras(custos) {
        try {
            const dataObject = this.createDataObject(custos);
            localStorage.setItem(this.getKey('custos_config'), JSON.stringify(dataObject));
            return true;
        } catch (error) {
            console.error('Erro ao salvar custos extras:', error);
            return false;
        }
    }

    /**
     * Recupera configurações de custos extras
     */
    getCustosExtras() {
        try {
            const stored = localStorage.getItem(this.getKey('custos_config'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return {
                portuarios: 0,
                bancarios: 0,
                logisticos: 0,
                administrativos: 0
            };
        } catch (error) {
            console.error('Erro ao recuperar custos extras:', error);
            return {};
        }
    }

    /**
     * Salva configurações do usuário
     */
    saveConfig(config) {
        try {
            const dataObject = this.createDataObject(config);
            localStorage.setItem(this.getKey('user_config'), JSON.stringify(dataObject));
            return true;
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            return false;
        }
    }

    /**
     * Recupera configurações do usuário
     */
    getConfig() {
        try {
            const stored = localStorage.getItem(this.getKey('user_config'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return null;
        } catch (error) {
            console.error('Erro ao recuperar configurações:', error);
            return null;
        }
    }

    /**
     * Adiciona operação ao histórico
     */
    addToHistory(operation) {
        try {
            let history = this.getHistory();
            
            // Adicionar nova operação no início
            history.unshift({
                ...operation,
                id: Date.now().toString(),
                timestamp: Date.now()
            });

            // Manter apenas últimas 50 operações
            if (history.length > 50) {
                history = history.slice(0, 50);
            }

            const dataObject = this.createDataObject(history);
            localStorage.setItem(this.getKey('operation_history'), JSON.stringify(dataObject));
            return true;
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            return false;
        }
    }

    /**
     * Recupera histórico de operações
     */
    getHistory() {
        try {
            const stored = localStorage.getItem(this.getKey('operation_history'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return [];
        } catch (error) {
            console.error('Erro ao recuperar histórico:', error);
            return [];
        }
    }

    /**
     * Salva resultado de cálculos
     */
    saveCalculationResults(results) {
        try {
            const dataObject = this.createDataObject(results);
            localStorage.setItem(this.getKey('calculation_results'), JSON.stringify(dataObject));
            return true;
        } catch (error) {
            console.error('Erro ao salvar resultados:', error);
            return false;
        }
    }

    /**
     * Recupera resultado de cálculos
     */
    getCalculationResults() {
        try {
            const stored = localStorage.getItem(this.getKey('calculation_results'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return null;
        } catch (error) {
            console.error('Erro ao recuperar resultados:', error);
            return null;
        }
    }

    /**
     * Salva configurações de estado e operação
     */
    saveOperationConfig(estadoDestino, regimeTributario, tipoOperacao) {
        const config = this.getConfig() || {};
        config.estado_padrao = estadoDestino;
        config.regime_tributario = regimeTributario;
        config.tipo_operacao_padrao = tipoOperacao;
        return this.saveConfig(config);
    }

    /**
     * Exporta todos os dados para backup
     */
    exportAllData() {
        const allData = {};
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                } catch (error) {
                    allData[key] = localStorage.getItem(key);
                }
            }
        });

        return {
            export_date: new Date().toISOString(),
            system_version: '2025.1',
            data: allData
        };
    }

    /**
     * Importa dados de backup
     */
    importData(backupData) {
        try {
            if (backupData.data) {
                Object.keys(backupData.data).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        localStorage.setItem(key, JSON.stringify(backupData.data[key]));
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }

    /**
     * Limpa todos os dados do sistema
     */
    clearAllData() {
        const keys = Object.keys(localStorage);
        let cleared = 0;
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
                cleared++;
            }
        });

        console.log(`Removidos ${cleared} itens do storage`);
        this.ensureDefaultConfig();
        return cleared;
    }

    /**
     * Retorna informações sobre uso do storage
     */
    getStorageInfo() {
        const keys = Object.keys(localStorage);
        let expertzyKeys = 0;
        let totalSize = 0;
        
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            totalSize += value.length;
            
            if (key.startsWith(this.prefix)) {
                expertzyKeys++;
            }
        });

        return {
            total_keys: keys.length,
            expertzy_keys: expertzyKeys,
            estimated_size_bytes: totalSize,
            estimated_size_mb: (totalSize / 1024 / 1024).toFixed(2),
            storage_available: this.isStorageAvailable()
        };
    }

    /**
     * Verifica se localStorage está disponível
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Salva arquivo XML original para referência
     */
    saveOriginalXML(xmlContent, filename) {
        try {
            const dataObject = this.createDataObject({
                content: xmlContent,
                filename: filename,
                size: xmlContent.length
            });
            localStorage.setItem(this.getKey('original_xml'), JSON.stringify(dataObject));
            return true;
        } catch (error) {
            console.error('Erro ao salvar XML original:', error);
            return false;
        }
    }

    /**
     * Recupera arquivo XML original
     */
    getOriginalXML() {
        try {
            const stored = localStorage.getItem(this.getKey('original_xml'));
            if (stored) {
                const dataObject = JSON.parse(stored);
                return dataObject.data;
            }
            return null;
        } catch (error) {
            console.error('Erro ao recuperar XML original:', error);
            return null;
        }
    }
}