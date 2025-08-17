/**
 * Calculadora Tributária para Importações
 * Utiliza valores extraídos da DI e aplica regras de benefícios fiscais
 * Segue nomenclaturas definidas na documentação
 */
class TributaryCalculator {
    constructor() {
        this.aliquotas = null;
        this.beneficios = null;
        this.config = null;
        this.loadConfigurations();
    }

    /**
     * Carrega configurações de alíquotas e benefícios
     */
    async loadConfigurations() {
        try {
            // Carregar arquivos de configuração
            const [aliquotasResponse, beneficiosResponse, configResponse] = await Promise.all([
                fetch('data/aliquotas.json'),
                fetch('data/beneficios.json'),
                fetch('data/config.json')
            ]);

            this.aliquotas = await aliquotasResponse.json();
            this.beneficios = await beneficiosResponse.json();
            this.config = await configResponse.json();

            console.log('Configurações carregadas:', {
                aliquotas: this.aliquotas.versao,
                beneficios: this.beneficios.versao,
                config: this.config.versao
            });
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            throw new Error('Falha ao carregar configurações do sistema');
        }
    }

    /**
     * Calcula ICMS com base no estado e benefícios aplicáveis
     * @param {Object} adicao - Dados da adição
     * @param {string} estadoDestino - UF de destino
     * @param {Object} custosExtras - Custos extras rateados
     * @param {string} tipoOperacao - Tipo de operação (interna, interestadual, consumidor_final)
     * @returns {Object} Cálculo detalhado do ICMS
     */
    calculateICMS(adicao, estadoDestino, custosExtras = {}, tipoOperacao = 'interestadual') {
        const aliquotasEstado = this.aliquotas.aliquotas_icms_2025[estadoDestino];
        
        if (!aliquotasEstado) {
            throw new Error(`Estado ${estadoDestino} não encontrado na tabela de alíquotas`);
        }

        // Base de cálculo do ICMS
        let baseCalculo = this.calculateBaseICMS(adicao, custosExtras);
        
        // Determinar alíquota conforme tipo de operação
        let aliquotaICMS = this.getAliquotaICMS(estadoDestino, tipoOperacao);
        
        // Calcular FCP se aplicável
        let fcpValor = this.calculateFCP(estadoDestino, baseCalculo, tipoOperacao);
        
        // Verificar benefícios fiscais aplicáveis
        let beneficio = this.getBeneficioAplicavel(adicao.ncm, estadoDestino);
        
        let icmsCalculado = {
            base_calculo: baseCalculo,
            aliquota_original: aliquotaICMS,
            aliquota_aplicada: aliquotaICMS,
            valor_sem_beneficio: baseCalculo * (aliquotaICMS / 100),
            beneficio_aplicado: null,
            valor_com_beneficio: 0,
            fcp_valor: fcpValor,
            valor_total: 0,
            economia_beneficio: 0
        };

        // Aplicar benefício se houver
        if (beneficio) {
            icmsCalculado = this.applyBeneficio(icmsCalculado, beneficio, estadoDestino, tipoOperacao);
        } else {
            icmsCalculado.valor_com_beneficio = icmsCalculado.valor_sem_beneficio;
        }

        icmsCalculado.valor_total = icmsCalculado.valor_com_beneficio + icmsCalculado.fcp_valor;
        icmsCalculado.economia_beneficio = icmsCalculado.valor_sem_beneficio - icmsCalculado.valor_com_beneficio;

        return icmsCalculado;
    }

    /**
     * Calcula base de cálculo do ICMS incluindo custos extras
     */
    calculateBaseICMS(adicao, custosExtras) {
        let base = adicao.valor_reais || 0;
        
        // Adicionar II
        base += adicao.tributos.ii_valor_devido || 0;
        
        // Adicionar IPI
        base += adicao.tributos.ipi_valor_devido || 0;
        
        // Adicionar PIS/COFINS
        base += (adicao.tributos.pis_valor_devido || 0);
        base += (adicao.tributos.cofins_valor_devido || 0);
        
        // Adicionar custos extras que compõem base ICMS
        if (custosExtras.portuarios) base += custosExtras.portuarios;
        if (custosExtras.logisticos) base += custosExtras.logisticos;
        
        return base;
    }

    /**
     * Determina alíquota de ICMS conforme tipo de operação
     */
    getAliquotaICMS(estadoDestino, tipoOperacao) {
        const aliquotasEstado = this.aliquotas.aliquotas_icms_2025[estadoDestino];
        
        switch (tipoOperacao) {
            case 'interna':
            case 'consumidor_final':
                return aliquotasEstado.aliquota_interna;
                
            case 'interestadual':
            case 'revenda':
            case 'industria':
                // Para mercadoria importada com similar nacional é 4%
                return this.aliquotas.aliquotas_interestaduais.mercadoria_importada_com_similar_nacional;
                
            default:
                return aliquotasEstado.aliquota_interna;
        }
    }

    /**
     * Calcula FCP (Fundo de Combate à Pobreza)
     */
    calculateFCP(estadoDestino, baseCalculo, tipoOperacao) {
        const aliquotasEstado = this.aliquotas.aliquotas_icms_2025[estadoDestino];
        
        // FCP só se aplica em operações para consumidor final
        if (tipoOperacao !== 'consumidor_final') {
            return 0;
        }
        
        if (!aliquotasEstado.fcp) {
            return 0;
        }
        
        let aliquotaFCP = 0;
        
        if (typeof aliquotasEstado.fcp === 'number') {
            aliquotaFCP = aliquotasEstado.fcp;
        } else if (typeof aliquotasEstado.fcp === 'object') {
            // Aplicar regra: entre X e Y = usar X, até X = usar zero
            aliquotaFCP = aliquotasEstado.fcp.min > 0 ? aliquotasEstado.fcp.min : 0;
        }
        
        return baseCalculo * (aliquotaFCP / 100);
    }

    /**
     * Verifica se há benefício fiscal aplicável
     */
    getBeneficioAplicavel(ncm, estadoDestino) {
        // Verificar Goiás - COMEXPRODUZIR
        if (estadoDestino === 'GO') {
            if (!this.isNCMVedadoGoias(ncm)) {
                return {
                    tipo: 'GO_COMEXPRODUZIR',
                    dados: this.beneficios.goias_comexproduzir
                };
            }
        }
        
        // Verificar Santa Catarina - TTDs
        if (estadoDestino === 'SC') {
            return {
                tipo: 'SC_TTD_409_FASE1', // Default para primeira fase
                dados: this.beneficios.santa_catarina_ttds.ttd_409.fase_1
            };
        }
        
        // Verificar Minas Gerais - Corredor
        if (estadoDestino === 'MG') {
            return {
                tipo: 'MG_CORREDOR',
                dados: this.beneficios.minas_gerais_corredor
            };
        }
        
        // Verificar outros estados
        const outrosEstados = this.beneficios.outros_estados;
        for (const [estado, beneficio] of Object.entries(outrosEstados)) {
            if (estadoDestino === estado.toUpperCase()) {
                return {
                    tipo: beneficio.codigo,
                    dados: beneficio
                };
            }
        }
        
        return null;
    }

    /**
     * Verifica se NCM é vedado em Goiás
     */
    isNCMVedadoGoias(ncm) {
        const vedados = this.beneficios.goias_comexproduzir.ncms_vedados.exemplos;
        
        // Verificar se NCM completo ou capítulo está vedado
        return vedados.some(vedado => {
            if (vedado.length <= 4) {
                // Capítulo (ex: "2710")
                return ncm.startsWith(vedado);
            } else {
                // NCM específico
                return ncm === vedado || ncm.startsWith(vedado);
            }
        });
    }

    /**
     * Aplica benefício fiscal conforme regras específicas
     */
    applyBeneficio(icmsCalculado, beneficio, estadoDestino, tipoOperacao) {
        const calculadora = this.beneficios.calculadora_beneficios;
        
        switch (beneficio.tipo) {
            case 'GO_COMEXPRODUZIR':
                return this.applyBeneficioGoias(icmsCalculado, calculadora.GO_COMEXPRODUZIR, tipoOperacao);
                
            case 'SC_TTD_409_FASE1':
                return this.applyBeneficioSC(icmsCalculado, calculadora.SC_TTD_409_FASE1);
                
            case 'SC_TTD_409_FASE2':
                return this.applyBeneficioSC(icmsCalculado, calculadora.SC_TTD_409_FASE2);
                
            case 'SC_TTD_410':
                return this.applyBeneficioSC(icmsCalculado, calculadora.SC_TTD_410);
                
            default:
                return icmsCalculado;
        }
    }

    /**
     * Aplica benefício COMEXPRODUZIR de Goiás
     */
    applyBeneficioGoias(icmsCalculado, regras, tipoOperacao) {
        let resultado = { ...icmsCalculado };
        resultado.beneficio_aplicado = 'COMEXPRODUZIR - Goiás';
        
        if (tipoOperacao === 'interestadual') {
            // Crédito outorgado de 65%
            const creditoOutorgado = resultado.valor_sem_beneficio * 0.65;
            const icmsEfetivo = resultado.valor_sem_beneficio * 0.35;
            const funproduzir = creditoOutorgado * 0.05;
            const protege = creditoOutorgado * 0.15;
            
            resultado.valor_com_beneficio = icmsEfetivo + funproduzir + protege;
            resultado.detalhes_beneficio = {
                credito_outorgado: creditoOutorgado,
                icms_efetivo: icmsEfetivo,
                funproduzir: funproduzir,
                protege: protege,
                carga_efetiva_percentual: 1.92
            };
            
        } else if (tipoOperacao === 'interna') {
            // Base reduzida para carga efetiva de 4%
            const baseReduzida = resultado.base_calculo * 0.2105; // 21.05% da base
            resultado.valor_com_beneficio = baseReduzida * 0.19; // 19% sobre base reduzida = 4% efetivo
            resultado.detalhes_beneficio = {
                base_original: resultado.base_calculo,
                base_reduzida: baseReduzida,
                percentual_reducao: 78.95,
                carga_efetiva_percentual: 4.00
            };
        }
        
        return resultado;
    }

    /**
     * Aplica benefício TTD de Santa Catarina
     */
    applyBeneficioSC(icmsCalculado, regras) {
        let resultado = { ...icmsCalculado };
        resultado.beneficio_aplicado = 'TTD - Santa Catarina';
        
        // Aplicar alíquota reduzida de antecipação
        resultado.valor_com_beneficio = resultado.base_calculo * (regras.antecipacao_importacao / 100);
        
        // Adicionar Fundo de Educação
        const fundoEducacao = resultado.base_calculo * (regras.fundo_educacao / 100);
        resultado.valor_com_beneficio += fundoEducacao;
        
        resultado.detalhes_beneficio = {
            antecipacao_importacao: regras.antecipacao_importacao,
            fundo_educacao: regras.fundo_educacao,
            valor_antecipacao: resultado.base_calculo * (regras.antecipacao_importacao / 100),
            valor_fundo: fundoEducacao
        };
        
        return resultado;
    }

    /**
     * Verifica se COFINS tem adicional de 1%
     */
    hasCofinsAdicional(ncm) {
        const ncmsComAdicional = this.aliquotas.tributos_federais.cofins_adicional_ncms.exemplos_ncms_com_adicional;
        
        return ncmsComAdicional.some(codigo => {
            // Verificar se é capítulo (ex: "84.02") ou NCM específico
            if (codigo.includes('.')) {
                return ncm.startsWith(codigo.replace('.', ''));
            }
            return ncm.startsWith(codigo);
        });
    }

    /**
     * Calcula custos totais de uma adição incluindo tributos e custos extras
     */
    calculateTotalCosts(adicao, estadoDestino, custosExtras = {}, tipoOperacao = 'interestadual') {
        // Valores já extraídos da DI (fonte principal)
        const tributosDI = {
            ii_valor: adicao.tributos.ii_valor_devido || 0,
            ipi_valor: adicao.tributos.ipi_valor_devido || 0,
            pis_valor: adicao.tributos.pis_valor_devido || 0,
            cofins_valor: adicao.tributos.cofins_valor_devido || 0
        };

        // Verificar se COFINS tem adicional de 1%
        const temCofinsAdicional = this.hasCofinsAdicional(adicao.ncm);
        if (temCofinsAdicional) {
            // Adicionar 1% sobre a base de cálculo
            const baseCalculo = adicao.valor_reais || 0;
            tributosDI.cofins_adicional = baseCalculo * 0.01;
            tributosDI.cofins_valor += tributosDI.cofins_adicional;
        }

        // Calcular ICMS com benefícios
        const icmsCalculado = this.calculateICMS(adicao, estadoDestino, custosExtras, tipoOperacao);

        // Custos extras
        const totalCustosExtras = Object.values(custosExtras).reduce((sum, value) => sum + (value || 0), 0);

        // Custo total
        const custoTotal = {
            valor_mercadoria: adicao.valor_reais || 0,
            tributos_federais: tributosDI,
            icms_calculado: icmsCalculado,
            custos_extras: custosExtras,
            total_custos_extras: totalCustosExtras,
            custo_total: 0
        };

        // Somar tudo
        custoTotal.custo_total = custoTotal.valor_mercadoria +
                                Object.values(tributosDI).reduce((sum, value) => sum + (value || 0), 0) +
                                icmsCalculado.valor_total +
                                totalCustosExtras;

        return custoTotal;
    }

    /**
     * Calcula custo unitário baseado na quantidade de produtos
     */
    calculateUnitCosts(adicao, custoTotal) {
        const quantidadeTotal = adicao.produtos.reduce((sum, produto) => sum + (produto.quantidade || 0), 0);
        
        if (quantidadeTotal === 0) {
            return { custo_unitario: 0, quantidade_total: 0 };
        }

        return {
            custo_unitario: custoTotal.custo_total / quantidadeTotal,
            quantidade_total: quantidadeTotal,
            custos_por_produto: adicao.produtos.map(produto => ({
                ...produto,
                custo_rateado: (custoTotal.custo_total / quantidadeTotal) * produto.quantidade,
                custo_unitario: custoTotal.custo_total / quantidadeTotal
            }))
        };
    }

    /**
     * Calcula todos os cenários de um estado para comparação
     */
    calculateStateScenarios(adicao, estadoDestino, custosExtras = {}) {
        const cenarios = {};

        // Cenário 1: Venda Interestadual
        cenarios.interestadual = this.calculateTotalCosts(adicao, estadoDestino, custosExtras, 'interestadual');

        // Cenário 2: Venda Interna
        cenarios.interna = this.calculateTotalCosts(adicao, estadoDestino, custosExtras, 'interna');

        // Cenário 3: Consumidor Final
        cenarios.consumidor_final = this.calculateTotalCosts(adicao, estadoDestino, custosExtras, 'consumidor_final');

        return cenarios;
    }
}