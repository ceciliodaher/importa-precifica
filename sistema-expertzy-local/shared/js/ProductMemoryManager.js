/**
 * ProductMemoryManager.js - Gerenciador de Memória de Produtos Importados
 * 
 * Sistema de armazenamento estruturado para produtos importados
 * Preparado para migração futura para banco de dados
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

class ProductMemoryManager {
    constructor() {
        this.storageKey = 'expertzy_products_memory';
        this.products = [];
        this.lastSyncTime = null;
        this.initializeStorage();
    }

    /**
     * Inicializa o storage e carrega dados existentes
     */
    initializeStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.products = data.products || [];
                this.lastSyncTime = data.lastSyncTime || null;
                console.log(`✅ ProductMemoryManager: ${this.products.length} produtos carregados`);
            } else {
                this.products = [];
                this.saveToStorage();
                console.log('🆕 ProductMemoryManager: Storage inicializado');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar ProductMemoryManager:', error);
            this.products = [];
        }
    }

    /**
     * Gera ID único para produto (UUID v4 simplificado)
     */
    generateProductId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Salva produto na memória
     * @param {Object} productData - Dados do produto da DI
     * @returns {Object} Produto salvo com ID
     */
    saveProduct(productData) {
        try {
            // Estrutura database-ready
            const product = {
                id: this.generateProductId(),
                di_number: productData.di_number || null,
                addition_number: productData.addition_number || null,
                ncm: productData.ncm || null,
                description: productData.description || '',
                quantity: productData.quantity || 0,
                unit: productData.unit || 'UN',
                weight_kg: productData.weight_kg || 0,
                
                // Custos Base (antes de créditos)
                base_costs: {
                    cif_brl: productData.cif_brl || 0,
                    ii: productData.ii || 0,
                    ipi: productData.ipi || 0,
                    pis_import: productData.pis_import || 0,
                    cofins_import: productData.cofins_import || 0,
                    cofins_adicional: productData.cofins_adicional || 0,
                    icms_import: productData.icms_import || 0,
                    icms_st: productData.icms_st || 0,
                    expenses: {
                        siscomex: productData.expenses?.siscomex || 0,
                        afrmm: productData.expenses?.afrmm || 0,
                        capatazia: productData.expenses?.capatazia || 0,
                        armazenagem: productData.expenses?.armazenagem || 0,
                        outras: productData.expenses?.outras || 0
                    },
                    total_base_cost: 0 // Calculado abaixo
                },
                
                // Flags especiais
                special_cases: {
                    is_monofasico: productData.is_monofasico || false,
                    has_icms_st: productData.has_icms_st || false,
                    has_cofins_adicional: productData.has_cofins_adicional || false,
                    industrial_use: productData.industrial_use || false
                },
                
                // Metadados
                metadata: {
                    exchange_rate: productData.exchange_rate || 1,
                    import_date: productData.import_date || new Date().toISOString(),
                    state: productData.state || 'GO',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            };

            // Calcular custo base total
            product.base_costs.total_base_cost = this.calculateTotalBaseCost(product.base_costs);

            // Adicionar à lista
            this.products.push(product);
            this.saveToStorage();

            console.log(`✅ Produto salvo: ${product.id} - NCM ${product.ncm}`);
            return product;

        } catch (error) {
            console.error('❌ Erro ao salvar produto:', error);
            throw error;
        }
    }

    /**
     * Salva múltiplos produtos de uma DI
     * @param {String} diNumber - Número da DI
     * @param {Array} additions - Adições da DI com produtos
     * @param {Object} calculations - Cálculos realizados
     */
    saveProductsFromDI(diNumber, additions, calculations) {
        const savedProducts = [];
        
        try {
            additions.forEach((addition, index) => {
                // Para cada produto na adição
                const products = addition.produtos || [addition]; // Se não tiver produtos, usa a própria adição
                
                products.forEach((product, prodIndex) => {
                    const productData = {
                        di_number: diNumber,
                        addition_number: addition.numero_adicao || index + 1,
                        ncm: addition.ncm || product.ncm,
                        description: product.descricao || addition.descricao || '',
                        quantity: product.quantidade || 0,
                        unit: product.unidade || 'UN',
                        weight_kg: product.peso_liquido || 0,
                        
                        // Custos da adição (rateados se múltiplos produtos)
                        cif_brl: product.valor_unitario_brl * product.quantidade || 0,
                        ii: this.extractTaxValue(calculations, 'ii', index),
                        ipi: this.extractTaxValue(calculations, 'ipi', index),
                        pis_import: this.extractTaxValue(calculations, 'pis', index),
                        cofins_import: this.extractTaxValue(calculations, 'cofins', index),
                        cofins_adicional: this.extractTaxValue(calculations, 'cofins_adicional', index),
                        icms_import: this.extractTaxValue(calculations, 'icms', index),
                        icms_st: this.extractTaxValue(calculations, 'icms_st', index),
                        
                        expenses: {
                            siscomex: this.extractExpense(calculations, 'siscomex', index),
                            afrmm: this.extractExpense(calculations, 'afrmm', index),
                            capatazia: this.extractExpense(calculations, 'capatazia', index),
                            armazenagem: this.extractExpense(calculations, 'armazenagem', index),
                            outras: this.extractExpense(calculations, 'outras', index)
                        },
                        
                        // Flags especiais (detectar automaticamente)
                        is_monofasico: this.checkMonofasico(addition.ncm),
                        has_icms_st: calculations?.icms_st?.valor > 0,
                        has_cofins_adicional: calculations?.cofins_adicional?.valor > 0,
                        industrial_use: false, // Definido pelo usuário depois
                        
                        // Metadados
                        exchange_rate: addition.taxa_cambio || 5.39,
                        import_date: addition.data_registro || new Date().toISOString(),
                        state: calculations?.estado || 'GO'
                    };
                    
                    const saved = this.saveProduct(productData);
                    savedProducts.push(saved);
                });
            });

            console.log(`✅ ${savedProducts.length} produtos salvos da DI ${diNumber}`);
            return savedProducts;

        } catch (error) {
            console.error('❌ Erro ao salvar produtos da DI:', error);
            throw error;
        }
    }

    /**
     * Calcula custo base total
     */
    calculateTotalBaseCost(costs) {
        const taxes = costs.cif_brl + costs.ii + costs.ipi + 
                     costs.pis_import + costs.cofins_import + 
                     costs.cofins_adicional + costs.icms_import + costs.icms_st;
        
        const expenses = Object.values(costs.expenses).reduce((sum, val) => sum + val, 0);
        
        return taxes + expenses;
    }

    /**
     * Extrai valor de imposto dos cálculos
     */
    extractTaxValue(calculations, taxType, additionIndex) {
        try {
            if (calculations?.calculos_individuais?.[additionIndex]) {
                const calc = calculations.calculos_individuais[additionIndex];
                
                switch(taxType) {
                    case 'ii': return calc.impostos?.ii?.valor_devido || 0;
                    case 'ipi': return calc.impostos?.ipi?.valor_devido || 0;
                    case 'pis': return calc.impostos?.pis?.valor_devido || 0;
                    case 'cofins': return calc.impostos?.cofins?.valor_devido || 0;
                    case 'cofins_adicional': return calc.impostos?.cofins?.adicional || 0;
                    case 'icms': return calc.impostos?.icms?.valor_devido || 0;
                    case 'icms_st': return calc.impostos?.icms?.st_valor || 0;
                    default: return 0;
                }
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Extrai valor de despesa dos cálculos
     */
    extractExpense(calculations, expenseType, additionIndex) {
        try {
            if (calculations?.despesas) {
                const proporcao = 1 / (calculations.numero_adicoes || 1);
                
                switch(expenseType) {
                    case 'siscomex': 
                        return (calculations.despesas.automaticas?.siscomex || 0) * proporcao;
                    case 'afrmm': 
                        return (calculations.despesas.automaticas?.afrmm || 0) * proporcao;
                    case 'capatazia': 
                        return (calculations.despesas.automaticas?.capatazia || 0) * proporcao;
                    case 'armazenagem': 
                        return (calculations.despesas.extras?.armazenagem || 0) * proporcao;
                    case 'outras': 
                        return (calculations.despesas.extras?.outras || 0) * proporcao;
                    default: 
                        return 0;
                }
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Verifica se NCM é monofásico (simplificado - deve ser expandido)
     */
    checkMonofasico(ncm) {
        // Lista simplificada - deve ser expandida com NCMs reais
        const monofasicoNCMs = [
            '2207', // Álcool
            '2710', // Combustíveis
            '3303', // Perfumes
            '3304', // Cosméticos
        ];
        
        if (!ncm) return false;
        const ncm4 = ncm.substring(0, 4);
        return monofasicoNCMs.includes(ncm4);
    }

    /**
     * Busca produto por ID
     */
    getProductById(productId) {
        return this.products.find(p => p.id === productId);
    }

    /**
     * Busca produtos por DI
     */
    getProductsByDI(diNumber) {
        return this.products.filter(p => p.di_number === diNumber);
    }

    /**
     * Busca produtos por NCM
     */
    getProductsByNCM(ncm) {
        return this.products.filter(p => p.ncm === ncm);
    }

    /**
     * Atualiza produto existente
     */
    updateProduct(productId, updates) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) {
            throw new Error(`Produto ${productId} não encontrado`);
        }

        this.products[index] = {
            ...this.products[index],
            ...updates,
            metadata: {
                ...this.products[index].metadata,
                updated_at: new Date().toISOString()
            }
        };

        this.saveToStorage();
        console.log(`✅ Produto ${productId} atualizado`);
        return this.products[index];
    }

    /**
     * Remove produto
     */
    deleteProduct(productId) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) {
            throw new Error(`Produto ${productId} não encontrado`);
        }

        const deleted = this.products.splice(index, 1)[0];
        this.saveToStorage();
        console.log(`✅ Produto ${productId} removido`);
        return deleted;
    }

    /**
     * Limpa todos os produtos
     */
    clearAll() {
        this.products = [];
        this.saveToStorage();
        console.log('✅ Todos os produtos foram removidos');
    }

    /**
     * Salva no localStorage
     */
    saveToStorage() {
        try {
            const data = {
                products: this.products,
                lastSyncTime: new Date().toISOString(),
                version: '1.0.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.lastSyncTime = data.lastSyncTime;
            
        } catch (error) {
            console.error('❌ Erro ao salvar no storage:', error);
            throw error;
        }
    }

    /**
     * Exporta dados para JSON (preparação para DB)
     */
    exportToJSON() {
        const data = {
            products: this.products,
            exportTime: new Date().toISOString(),
            totalProducts: this.products.length,
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_memory_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ ${this.products.length} produtos exportados`);
    }

    /**
     * Importa dados de JSON
     */
    importFromJSON(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (!data.products || !Array.isArray(data.products)) {
                throw new Error('Formato de dados inválido');
            }

            this.products = data.products;
            this.saveToStorage();
            
            console.log(`✅ ${this.products.length} produtos importados`);
            return this.products;
            
        } catch (error) {
            console.error('❌ Erro ao importar dados:', error);
            throw error;
        }
    }

    /**
     * Estatísticas dos produtos em memória
     */
    getStatistics() {
        const stats = {
            totalProducts: this.products.length,
            totalDIs: new Set(this.products.map(p => p.di_number)).size,
            totalNCMs: new Set(this.products.map(p => p.ncm)).size,
            totalValue: this.products.reduce((sum, p) => sum + p.base_costs.total_base_cost, 0),
            averageCost: 0,
            productsByState: {},
            specialCases: {
                monofasico: this.products.filter(p => p.special_cases.is_monofasico).length,
                icms_st: this.products.filter(p => p.special_cases.has_icms_st).length,
                cofins_adicional: this.products.filter(p => p.special_cases.has_cofins_adicional).length,
                industrial_use: this.products.filter(p => p.special_cases.industrial_use).length
            }
        };

        if (stats.totalProducts > 0) {
            stats.averageCost = stats.totalValue / stats.totalProducts;
        }

        // Agrupar por estado
        this.products.forEach(p => {
            const state = p.metadata.state;
            stats.productsByState[state] = (stats.productsByState[state] || 0) + 1;
        });

        return stats;
    }
}

// Exportar para uso global se não estiver em ambiente de módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductMemoryManager;
}