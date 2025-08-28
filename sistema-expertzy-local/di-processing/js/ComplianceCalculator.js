/**
 * ComplianceCalculator.js - Phase 1: Compliance Tax Calculator
 * 
 * Handles ONLY mandatory tax calculations for import compliance
 * Focus: II, IPI, PIS, COFINS, ICMS with correct expense inclusion
 * NO business logic, NO pricing, NO scenario analysis
 * 
 * CRITICAL FIX: Proper SISCOMEX inclusion in ICMS tax base
 * PERFORMANCE FIX: Single calculation execution (no repetitions)
 */

class ComplianceCalculator {
    constructor() {
        this.configuracoes = null;
        this.estadoDestino = 'GO'; // Default Goiás
        this.calculationMemory = [];
        this.lastCalculation = null;
    }

    /**
     * Carrega configurações fiscais (alíquotas, regimes) - USANDO ARQUIVOS EXISTENTES
     */
    async carregarConfiguracoes() {
        try {
            console.log('📂 ComplianceCalculator: Carregando configurações fiscais...');
            
            // Carregar arquivos de configuração existentes (como no sistema legado)
            const [aliquotasResponse, beneficiosResponse, configResponse] = await Promise.all([
                fetch('../shared/data/aliquotas.json'),
                fetch('../shared/data/beneficios.json'),
                fetch('../shared/data/config.json')
            ]);

            if (!aliquotasResponse.ok || !beneficiosResponse.ok || !configResponse.ok) {
                throw new Error('Erro ao carregar arquivos de configuração');
            }

            const aliquotas = await aliquotasResponse.json();
            const beneficios = await beneficiosResponse.json();
            const config = await configResponse.json();

            // Estruturar configurações no formato esperado
            this.configuracoes = {
                aliquotas: aliquotas,
                beneficios: beneficios,
                config: config,
                versao: config.versao || '2025.1'
            };

            console.log('✅ Configurações fiscais carregadas:', {
                aliquotas: aliquotas.versao,
                beneficios: beneficios.versao,
                config: config.versao
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
            // Usar configurações padrão
            this.configuracoes = this.getConfiguracoesPadrao();
        }
    }

    /**
     * Configurações fiscais padrão (fallback)
     */
    getConfiguracoesPadrao() {
        return {
            aliquotas: {
                pis: 2.1,
                cofins: 9.65,
                icms: {
                    'GO': 17.0,
                    'SP': 18.0,
                    'MG': 18.0,
                    'SC': 17.0,
                    'ES': 17.0
                },
                ipi: {
                    default: 0
                },
                ii: {
                    default: 0
                }
            },
            beneficios: {
                'GO': {
                    tipo: 'credito_icms',
                    percentual: 67,
                    ncms_beneficiados: ['8517', '9018', '8471']
                },
                'SC': {
                    tipo: 'diferimento',
                    percentual: 75,
                    codigo: 'TTD060'
                },
                'ES': {
                    tipo: 'fundap',
                    aliquota_efetiva: 9.0
                }
            }
        };
    }

    /**
     * Calcula impostos de importação para uma adição da DI
     * ENTRADA: Dados da DI + despesas consolidadas
     * SAÍDA: Estrutura completa de impostos calculados
     */
    calcularImpostosImportacao(adicao, despesasConsolidadas = null) {
        console.log('🧮 ComplianceCalculator: Iniciando cálculo de impostos...');
        
        try {
            // Validar entrada
            if (!adicao || !adicao.valor_reais) {
                throw new Error('Dados da adição inválidos para cálculo');
            }

            const calculo = {
                adicao_numero: adicao.numero_adicao,
                ncm: adicao.ncm,
                timestamp: new Date().toISOString(),
                
                // Valores base
                valores_base: {
                    cif_usd: adicao.valor_moeda_negociacao || 0,
                    cif_brl: adicao.valor_reais || 0,
                    taxa_cambio: adicao.taxa_cambio || 0,
                    peso_liquido: adicao.peso_liquido || 0
                },

                // Despesas
                despesas: this.processarDespesas(despesasConsolidadas),
                
                // Impostos calculados
                impostos: {},
                
                // Totais
                totais: {},
                
                // Estado e benefícios
                estado: this.estadoDestino,
                beneficios: {}
            };

            // 1. Calcular II (Imposto de Importação)
            calculo.impostos.ii = this.calcularII(adicao, calculo.valores_base);
            
            // 2. Calcular IPI 
            calculo.impostos.ipi = this.calcularIPI(adicao, calculo.valores_base, calculo.impostos.ii);
            
            // 3. Calcular PIS/COFINS
            calculo.impostos.pis = this.calcularPIS(adicao, calculo.valores_base);
            calculo.impostos.cofins = this.calcularCOFINS(adicao, calculo.valores_base);
            
            // 4. Calcular ICMS (com despesas incluídas corretamente)
            calculo.impostos.icms = this.calcularICMS(adicao, calculo);
            
            // 5. Calcular totais finais
            calculo.totais = this.calcularTotais(calculo);
            
            // 6. Aplicar benefícios fiscais se aplicáveis
            calculo.beneficios = this.aplicarBeneficios(calculo);
            
            // Salvar cálculo na memória
            this.salvarCalculoMemoria(calculo);
            this.lastCalculation = calculo;
            
            console.log('✅ ComplianceCalculator: Cálculo de impostos concluído');
            console.log('📊 Resumo:', {
                CIF: `R$ ${calculo.valores_base.cif_brl.toFixed(2)}`,
                II: `R$ ${calculo.impostos.ii.valor_devido.toFixed(2)}`,
                IPI: `R$ ${calculo.impostos.ipi.valor_devido.toFixed(2)}`,
                PIS: `R$ ${calculo.impostos.pis.valor_devido.toFixed(2)}`,
                COFINS: `R$ ${calculo.impostos.cofins.valor_devido.toFixed(2)}`,
                ICMS: `R$ ${calculo.impostos.icms.valor_devido.toFixed(2)}`,
                'Total Impostos': `R$ ${calculo.totais.total_impostos.toFixed(2)}`,
                'Custo Total': `R$ ${calculo.totais.custo_total.toFixed(2)}`
            });
            
            return calculo;
            
        } catch (error) {
            console.error('❌ ComplianceCalculator: Erro no cálculo:', error);
            throw error;
        }
    }

    /**
     * Processa e consolida despesas para cálculo
     * CRÍTICO: Inclui SISCOMEX corretamente na base ICMS
     */
    processarDespesas(despesasConsolidadas) {
        if (!despesasConsolidadas) {
            return {
                automaticas: 0,
                extras_tributaveis: 0,
                extras_custos: 0,
                total_base_icms: 0,
                total_custos: 0
            };
        }

        const despesas = {
            // Despesas automáticas da DI (sempre na base ICMS)
            automaticas: despesasConsolidadas.automaticas?.total || 0,
            
            // Despesas extras classificadas pelo usuário
            extras_tributaveis: despesasConsolidadas.extras?.total_icms || 0,
            extras_custos: (despesasConsolidadas.extras?.total || 0) - (despesasConsolidadas.extras?.total_icms || 0),
            
            // Totais para diferentes fins
            total_base_icms: 0,
            total_custos: 0
        };

        // CRÍTICO: SISCOMEX sempre na base ICMS
        despesas.total_base_icms = despesas.automaticas + despesas.extras_tributaveis;
        despesas.total_custos = despesas.automaticas + despesas.extras_tributaveis + despesas.extras_custos;

        console.log('💰 Despesas consolidadas incluídas na base ICMS:', `R$ ${despesas.total_base_icms.toFixed(2)}`);
        console.log('📊 Detalhamento:', `Automáticas R$ ${despesas.automaticas.toFixed(2)} + Extras tributáveis R$ ${despesas.extras_tributaveis.toFixed(2)}`);

        return despesas;
    }

    /**
     * Calcula II - Imposto de Importação
     */
    calcularII(adicao, valoresBase) {
        const aliquota = this.obterAliquotaII(adicao.ncm);
        const baseCalculo = valoresBase.cif_brl;
        const valorCalculado = baseCalculo * (aliquota / 100);
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorCalculado,
            valor_devido: valorCalculado,
            regime: adicao.tributos?.ii_regime_nome || 'RECOLHIMENTO INTEGRAL'
        };
    }

    /**
     * Calcula IPI 
     */
    calcularIPI(adicao, valoresBase, ii) {
        const aliquota = this.obterAliquotaIPI(adicao.ncm);
        const baseCalculo = valoresBase.cif_brl + ii.valor_devido;
        const valorCalculado = baseCalculo * (aliquota / 100);
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorCalculado,
            valor_devido: valorCalculado,
            regime: adicao.tributos?.ipi_regime_nome || 'SEM BENEFÍCIO'
        };
    }

    /**
     * Calcula PIS
     */
    calcularPIS(adicao, valoresBase) {
        const aliquota = this.configuracoes?.aliquotas?.pis || 2.1;
        const baseCalculo = valoresBase.cif_brl;
        const valorCalculado = baseCalculo * (aliquota / 100);
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorCalculado,
            valor_devido: valorCalculado
        };
    }

    /**
     * Calcula COFINS
     */
    calcularCOFINS(adicao, valoresBase) {
        const aliquota = this.configuracoes?.aliquotas?.cofins || 9.65;
        const baseCalculo = valoresBase.cif_brl;
        const valorCalculado = baseCalculo * (aliquota / 100);
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorCalculado,
            valor_devido: valorCalculado
        };
    }

    /**
     * Calcula ICMS com despesas incluídas corretamente
     * CRÍTICO: Base ICMS deve incluir SISCOMEX e outras despesas
     */
    calcularICMS(adicao, calculo) {
        const aliquotaICMS = this.obterAliquotaICMS(this.estadoDestino);
        
        // Base ICMS = CIF + II + IPI + PIS + COFINS + DESPESAS ADUANEIRAS
        const baseAntes = 
            calculo.valores_base.cif_brl +
            calculo.impostos.ii.valor_devido +
            calculo.impostos.ipi.valor_devido +
            calculo.impostos.pis.valor_devido +
            calculo.impostos.cofins.valor_devido +
            calculo.despesas.total_base_icms; // INCLUI SISCOMEX!

        console.log('📊 Cálculo Base ICMS (Calculator):');
        console.log(`        - Base antes ICMS: R$ ${baseAntes.toFixed(2)}`);
        console.log(`        - Alíquota ICMS: ${aliquotaICMS}%`);
        
        // Fator de divisão para ICMS por dentro
        const fatorDivisao = 1 - (aliquotaICMS / 100);
        console.log(`        - Fator divisão: ${fatorDivisao.toFixed(4)}`);
        
        // Base ICMS final (com ICMS por dentro)
        const baseICMS = baseAntes / fatorDivisao;
        console.log(`        - Base ICMS final: R$ ${baseICMS.toFixed(2)}`);
        
        // Valor ICMS devido
        const valorICMS = baseICMS - baseAntes;
        
        return {
            aliquota: aliquotaICMS,
            base_calculo_antes: baseAntes,
            base_calculo_final: baseICMS,
            fator_divisao: fatorDivisao,
            valor_devido: valorICMS,
            despesas_inclusas: calculo.despesas.total_base_icms
        };
    }

    /**
     * Calcula totais finais
     */
    calcularTotais(calculo) {
        const totalImpostos = 
            calculo.impostos.ii.valor_devido +
            calculo.impostos.ipi.valor_devido +
            calculo.impostos.pis.valor_devido +
            calculo.impostos.cofins.valor_devido +
            calculo.impostos.icms.valor_devido;

        const custoTotal = 
            calculo.valores_base.cif_brl +
            totalImpostos +
            calculo.despesas.total_custos;

        return {
            total_impostos: totalImpostos,
            custo_total: custoTotal,
            custo_por_kg: calculo.valores_base.peso_liquido > 0 ? custoTotal / calculo.valores_base.peso_liquido : 0
        };
    }

    /**
     * Aplica benefícios fiscais por estado
     */
    aplicarBeneficios(calculo) {
        const beneficios = this.configuracoes?.beneficios?.[this.estadoDestino];
        
        if (!beneficios) {
            return { aplicado: false, motivo: 'Sem benefícios para o estado' };
        }

        // Verificar se NCM tem benefício
        const ncmBeneficiado = this.verificarNCMBeneficiado(calculo.ncm, beneficios);
        
        if (!ncmBeneficiado) {
            return { aplicado: false, motivo: 'NCM não contemplado nos benefícios' };
        }

        // Aplicar benefício conforme tipo
        switch (beneficios.tipo) {
            case 'credito_icms':
                return this.aplicarCreditoICMS(calculo, beneficios);
            case 'diferimento':
                return this.aplicarDiferimento(calculo, beneficios);
            case 'fundap':
                return this.aplicarFUNDAP(calculo, beneficios);
            default:
                return { aplicado: false, motivo: 'Tipo de benefício desconhecido' };
        }
    }

    /**
     * Obter alíquotas por NCM (simplificado - pode ser expandido)
     */
    obterAliquotaII(ncm) {
        // Por enquanto retorna 0 - deve ser expandido com tabela TIPI
        return this.configuracoes?.aliquotas?.ii?.default || 0;
    }

    obterAliquotaIPI(ncm) {
        // Por enquanto retorna 0 - deve ser expandido com tabela TIPI
        return this.configuracoes?.aliquotas?.ipi?.default || 0;
    }

    obterAliquotaICMS(estado) {
        return this.configuracoes?.aliquotas?.icms?.[estado] || 17;
    }

    /**
     * Verifica se NCM tem benefício
     */
    verificarNCMBeneficiado(ncm, beneficios) {
        if (!beneficios.ncms_beneficiados) return true;
        
        return beneficios.ncms_beneficiados.some(ncm_pattern => 
            ncm.startsWith(ncm_pattern)
        );
    }

    /**
     * Aplica crédito ICMS (ex: Goiás 67%)
     */
    aplicarCreditoICMS(calculo, beneficios) {
        const creditoPercentual = beneficios.percentual;
        const valorCredito = calculo.impostos.icms.valor_devido * (creditoPercentual / 100);
        const icmsLiquido = calculo.impostos.icms.valor_devido - valorCredito;
        
        return {
            aplicado: true,
            tipo: 'credito_icms',
            percentual: creditoPercentual,
            valor_credito: valorCredito,
            icms_original: calculo.impostos.icms.valor_devido,
            icms_liquido: icmsLiquido,
            economia: valorCredito
        };
    }

    /**
     * Aplica diferimento ICMS (ex: SC 75%)
     */
    aplicarDiferimento(calculo, beneficios) {
        const percentualDiferido = beneficios.percentual;
        const valorDiferido = calculo.impostos.icms.valor_devido * (percentualDiferido / 100);
        const icmsRecolher = calculo.impostos.icms.valor_devido - valorDiferido;
        
        return {
            aplicado: true,
            tipo: 'diferimento',
            percentual: percentualDiferido,
            codigo: beneficios.codigo,
            valor_diferido: valorDiferido,
            icms_original: calculo.impostos.icms.valor_devido,
            icms_recolher: icmsRecolher,
            economia_fluxo: valorDiferido
        };
    }

    /**
     * Aplica FUNDAP (ES)
     */
    aplicarFUNDAP(calculo, beneficios) {
        const aliquotaOriginal = calculo.impostos.icms.aliquota;
        const aliquotaEfetiva = beneficios.aliquota_efetiva;
        const icmsEfetivo = calculo.impostos.icms.base_calculo_final * (aliquotaEfetiva / 100);
        const economia = calculo.impostos.icms.valor_devido - icmsEfetivo;
        
        return {
            aplicado: true,
            tipo: 'fundap',
            aliquota_original: aliquotaOriginal,
            aliquota_efetiva: aliquotaEfetiva,
            icms_original: calculo.impostos.icms.valor_devido,
            icms_efetivo: icmsEfetivo,
            economia: economia
        };
    }

    /**
     * Salva cálculo na memória para auditoria
     */
    salvarCalculoMemoria(calculo) {
        this.calculationMemory.push({
            id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: calculo.timestamp,
            tipo: 'IMPOSTOS_IMPORTACAO',
            adicao: calculo.adicao_numero,
            resumo: calculo.totais,
            detalhes: calculo
        });

        // Manter apenas últimos 50 cálculos
        if (this.calculationMemory.length > 50) {
            this.calculationMemory = this.calculationMemory.slice(-50);
        }
    }

    /**
     * Define estado de destino
     */
    setEstadoDestino(estado) {
        this.estadoDestino = estado;
        console.log(`📍 Estado destino definido: ${estado}`);
    }

    /**
     * Obtém último cálculo realizado
     */
    getUltimoCalculo() {
        return this.lastCalculation;
    }

    /**
     * Obtém histórico de cálculos
     */
    getHistoricoCalculos() {
        return this.calculationMemory;
    }

    /**
     * Limpa cache de cálculos
     */
    limparCache() {
        this.calculationMemory = [];
        this.lastCalculation = null;
        console.log('🧹 Cache de cálculos limpo');
    }
}

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceCalculator;
}