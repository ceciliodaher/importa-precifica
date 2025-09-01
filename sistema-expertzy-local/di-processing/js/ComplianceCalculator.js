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
        this.itemCalculator = new ItemCalculator(); // NOVO: Integração para cálculos por item
    }

    /**
     * Calcular impostos para TODAS as adições de uma DI
     * @param {object} di - Objeto DI completo com todas as adições
     * @param {object} despesasConsolidadas - Despesas totais da DI
     * @returns {object} Cálculo consolidado de todas as adições
     */
    calcularTodasAdicoes(di, despesasConsolidadas = null) {
        console.log('📋 ComplianceCalculator: Processando DI completa com múltiplas adições...');
        
        if (!di || !di.adicoes || di.adicoes.length === 0) {
            throw new Error('DI sem adições válidas para cálculo');
        }
        
        const totalAdicoes = di.adicoes.length;
        console.log(`  Total de adições a processar: ${totalAdicoes}`);
        
        // Arrays para armazenar cálculos individuais
        const calculosIndividuais = [];
        const resumoPorAdicao = [];
        const produtosIndividuais = []; // Array para produtos com impostos individuais
        
        // Calcular valor total da DI para rateio proporcional
        const valorTotalDI = di.adicoes.reduce((sum, ad) => sum + (ad.valor_reais || 0), 0);
        
        // Processar cada adição E seus produtos individuais
        for (let i = 0; i < di.adicoes.length; i++) {
            const adicao = di.adicoes[i];
            console.log(`  Processando adição ${i + 1}/${totalAdicoes}: NCM ${adicao.ncm}`);
            
            // Calcular despesas proporcionais para esta adição
            let despesasAdicao = null;
            if (despesasConsolidadas && valorTotalDI > 0) {
                const proporcao = (adicao.valor_reais || 0) / valorTotalDI;
                despesasAdicao = {
                    automaticas: (despesasConsolidadas.automaticas || 0) * proporcao,
                    extras_tributaveis: (despesasConsolidadas.extras_tributaveis || 0) * proporcao,
                    extras_custos: (despesasConsolidadas.extras_custos || 0) * proporcao,
                    total_base_icms: (despesasConsolidadas.total_base_icms || 0) * proporcao,
                    total: (despesasConsolidadas.total || 0) * proporcao
                };
            }
            
            // Calcular impostos para esta adição
            const calculoAdicao = this.calcularImpostosImportacao(adicao, despesasAdicao);
            calculosIndividuais.push(calculoAdicao);
            
            // NOVO: Calcular impostos para cada produto individual usando ItemCalculator
            if (adicao.produtos && adicao.produtos.length > 0) {
                const resultadoItens = this.itemCalculator.processarItensAdicao(
                    adicao, 
                    despesasAdicao?.automaticas || 0,
                    despesasAdicao?.extras_tributaveis || 0
                );
                
                // Adicionar produtos calculados ao array global
                resultadoItens.itens.forEach((item, index) => {
                    produtosIndividuais.push({
                        adicao_numero: adicao.numero_adicao,
                        produto_index: index + 1,
                        ncm: adicao.ncm,
                        descricao: item.produto.descricao,
                        valor_unitario_brl: item.produto.valor_unitario,
                        valor_total_brl: item.valorItem,
                        quantidade: item.produto.quantidade,
                        ii_item: item.tributos.ii.valor,
                        ipi_item: item.tributos.ipi.valor, 
                        pis_item: item.tributos.pis.valor,
                        cofins_item: item.tributos.cofins.valor,
                        icms_item: item.valorICMS,
                        base_icms_item: item.baseICMS
                    });
                });
                
                console.log(`    ✅ ${resultadoItens.itens.length} produtos processados individualmente`);
            }
            
            // Guardar resumo
            resumoPorAdicao.push({
                numero: adicao.numero_adicao,
                ncm: adicao.ncm,
                valor: adicao.valor_reais || 0,
                peso: adicao.peso_liquido || 0,
                impostos: {
                    ii: calculoAdicao.impostos.ii.valor_devido || 0,
                    ipi: calculoAdicao.impostos.ipi.valor_devido || 0,
                    pis: calculoAdicao.impostos.pis.valor_devido || 0,
                    cofins: calculoAdicao.impostos.cofins.valor_devido || 0,
                    icms: calculoAdicao.impostos.icms?.valor_devido || 0
                }
            });
        }
        
        // Consolidar totais incluindo produtos individuais
        const totaisConsolidados = this.consolidarTotaisDI(calculosIndividuais, resumoPorAdicao, produtosIndividuais);
        
        console.log('✅ DI processada com sucesso:', {
            adicoes: totalAdicoes,
            produtos: produtosIndividuais.length,
            'II Total': `R$ ${totaisConsolidados.impostos.ii.valor_devido.toFixed(2)}`,
            'IPI Total': `R$ ${totaisConsolidados.impostos.ipi.valor_devido.toFixed(2)}`,
            'PIS Total': `R$ ${totaisConsolidados.impostos.pis.valor_devido.toFixed(2)}`,
            'COFINS Total': `R$ ${totaisConsolidados.impostos.cofins.valor_devido.toFixed(2)}`
        });
        
        // Validação automática comparando com totais extraídos do XML
        this.validarTotaisComXML(di, totaisConsolidados);
        
        return totaisConsolidados;
    }
    
    /**
     * Consolidar totais de todas as adições incluindo produtos individuais
     * @private
     */
    consolidarTotaisDI(calculosIndividuais, resumos, produtosIndividuais = []) {
        // Somar todos os impostos
        const totais = {
            ii: 0,
            ipi: 0,
            pis: 0,
            cofins: 0,
            icms: 0,
            valor_aduaneiro: 0,
            despesas: 0
        };
        
        calculosIndividuais.forEach(calc => {
            totais.ii += calc.impostos.ii?.valor_devido || 0;
            totais.ipi += calc.impostos.ipi?.valor_devido || 0;
            totais.pis += calc.impostos.pis?.valor_devido || 0;
            totais.cofins += calc.impostos.cofins?.valor_devido || 0;
            totais.icms += calc.impostos.icms?.valor_devido || 0;
            totais.valor_aduaneiro += calc.valores_base?.cif_brl || 0;
            totais.despesas += calc.despesas?.total || 0;
        });
        
        const totalImpostos = totais.ii + totais.ipi + totais.pis + totais.cofins + totais.icms;
        
        return {
            tipo: 'DI_COMPLETA',
            numero_adicoes: calculosIndividuais.length,
            timestamp: new Date().toISOString(),
            
            valores_base: {
                valor_aduaneiro_total: totais.valor_aduaneiro,
                despesas_totais: totais.despesas
            },
            
            impostos: {
                ii: { 
                    valor_devido: totais.ii,
                    detalhamento: 'Soma de todas as adições'
                },
                ipi: { 
                    valor_devido: totais.ipi,
                    detalhamento: 'Soma de todas as adições'
                },
                pis: { 
                    valor_devido: totais.pis,
                    detalhamento: 'Soma de todas as adições'
                },
                cofins: { 
                    valor_devido: totais.cofins,
                    detalhamento: 'Soma de todas as adições'
                },
                icms: { 
                    valor_devido: totais.icms,
                    aliquota: 19,
                    detalhamento: 'Soma de todas as adições'
                }
            },
            
            totais: {
                total_impostos: totalImpostos,
                custo_total: totais.valor_aduaneiro + totais.despesas + totalImpostos
            },
            
            adicoes_detalhes: resumos,
            calculos_individuais: calculosIndividuais,
            produtos_individuais: produtosIndividuais // NOVO: Produtos com tributos por item
        };
    }
    
    /**
     * Validar totais calculados vs totais extraídos do XML
     * @private
     */
    validarTotaisComXML(di, totaisCalculados) {
        // Obter totais extraídos pelo DIProcessor
        const totaisXML = di.totals?.tributos_totais;
        
        if (!totaisXML) {
            console.log('⚠️ Totais de tributos não encontrados no XML extraído');
            return;
        }
        
        const calculados = {
            ii: totaisCalculados.impostos.ii.valor_devido,
            ipi: totaisCalculados.impostos.ipi.valor_devido,
            pis: totaisCalculados.impostos.pis.valor_devido,
            cofins: totaisCalculados.impostos.cofins.valor_devido
        };
        
        const extraidos = {
            ii: totaisXML.ii_total || 0,
            ipi: totaisXML.ipi_total || 0,
            pis: totaisXML.pis_total || 0,
            cofins: totaisXML.cofins_total || 0
        };
        
        console.log('🔍 VALIDAÇÃO AUTOMÁTICA - Calculados vs XML:');
        console.log('==========================================');
        
        let temDiferenca = false;
        const tolerancia = 0.10; // 10 centavos de tolerância
        
        Object.keys(calculados).forEach(imposto => {
            const calculado = calculados[imposto] || 0;
            const extraido = extraidos[imposto] || 0;
            const diferenca = Math.abs(extraido - calculado);
            
            if (diferenca > tolerancia) {
                const percentual = extraido > 0 ? (diferenca / extraido * 100).toFixed(2) : '100.00';
                console.log(`❌ ${imposto.toUpperCase()}: XML R$ ${extraido.toFixed(2)} | Calc R$ ${calculado.toFixed(2)} | Diferença: R$ ${diferenca.toFixed(2)} (${percentual}%)`);
                temDiferenca = true;
            } else {
                console.log(`✅ ${imposto.toUpperCase()}: R$ ${calculado.toFixed(2)} ✓`);
            }
        });
        
        if (!temDiferenca) {
            console.log('🎉 TODOS OS CÁLCULOS ESTÃO CONSISTENTES COM O XML!');
        } else {
            console.log('⚠️ ATENÇÃO: Diferenças encontradas entre cálculos e XML');
            console.log('   Verifique se todas as adições foram processadas corretamente');
        }
        
        console.log('==========================================');
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
            throw new Error('Falha crítica ao carregar configurações fiscais. Sistema não pode funcionar sem elas.');
        }
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
        if (!adicao.tributos || adicao.tributos.ii_aliquota_ad_valorem === null || adicao.tributos.ii_aliquota_ad_valorem === undefined) {
            throw new Error('Dados de II não encontrados na DI');
        }
        
        // Usar valores já extraídos da DI (conforme POP de Impostos)
        const aliquota = adicao.tributos.ii_aliquota_ad_valorem;
        const valorDevido = adicao.tributos.ii_valor_devido || 0;
        const baseCalculo = valoresBase.cif_brl;
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorDevido,
            valor_devido: valorDevido,
            regime: adicao.tributos?.ii_regime_nome || 'RECOLHIMENTO INTEGRAL'
        };
    }

    /**
     * Calcula IPI 
     */
    calcularIPI(adicao, valoresBase, ii) {
        if (!adicao.tributos || adicao.tributos.ipi_aliquota_ad_valorem === null || adicao.tributos.ipi_aliquota_ad_valorem === undefined) {
            throw new Error('Dados de IPI não encontrados na DI');
        }
        
        // Usar valores já extraídos da DI (conforme POP de Impostos)
        const aliquota = adicao.tributos.ipi_aliquota_ad_valorem;
        const valorDevido = adicao.tributos.ipi_valor_devido || 0;
        const baseCalculo = valoresBase.cif_brl + ii.valor_devido;
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorDevido,
            valor_devido: valorDevido,
            regime: adicao.tributos?.ipi_regime_nome || 'SEM BENEFÍCIO'
        };
    }

    /**
     * Calcula PIS
     */
    calcularPIS(adicao, valoresBase) {
        if (!adicao.tributos || adicao.tributos.pis_aliquota_ad_valorem === null || adicao.tributos.pis_aliquota_ad_valorem === undefined) {
            throw new Error('Dados de PIS não encontrados na DI');
        }
        
        // Usar valores já extraídos da DI (conforme POP de Impostos)
        const aliquota = adicao.tributos.pis_aliquota_ad_valorem;
        const valorDevido = adicao.tributos.pis_valor_devido || 0;
        const baseCalculo = valoresBase.cif_brl;
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorDevido,
            valor_devido: valorDevido
        };
    }

    /**
     * Calcula COFINS
     */
    calcularCOFINS(adicao, valoresBase) {
        if (!adicao.tributos || adicao.tributos.cofins_aliquota_ad_valorem === null || adicao.tributos.cofins_aliquota_ad_valorem === undefined) {
            throw new Error('Dados de COFINS não encontrados na DI');
        }
        
        // Usar valores já extraídos da DI (conforme POP de Impostos)
        const aliquota = adicao.tributos.cofins_aliquota_ad_valorem;
        const valorDevido = adicao.tributos.cofins_valor_devido || 0;
        const baseCalculo = valoresBase.cif_brl;
        
        return {
            aliquota: aliquota,
            base_calculo: baseCalculo,
            valor_calculado: valorDevido,
            valor_devido: valorDevido
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
        if (!this.configuracoes || !this.configuracoes.aliquotas) {
            throw new Error('Configurações fiscais não carregadas');
        }
        
        // Usar alíquota do II extraída da DI ou configuração específica por NCM
        return this.configuracoes.aliquotas.ii && this.configuracoes.aliquotas.ii[ncm] ? 
               this.configuracoes.aliquotas.ii[ncm] : 0;
    }

    obterAliquotaIPI(ncm) {
        if (!this.configuracoes || !this.configuracoes.aliquotas) {
            throw new Error('Configurações fiscais não carregadas');
        }
        
        // Usar alíquota do IPI extraída da DI ou configuração específica por NCM
        return this.configuracoes.aliquotas.ipi && this.configuracoes.aliquotas.ipi[ncm] ? 
               this.configuracoes.aliquotas.ipi[ncm] : 0;
    }

    obterAliquotaICMS(estado) {
        if (!this.configuracoes || !this.configuracoes.aliquotas || !this.configuracoes.aliquotas.aliquotas_icms_2025) {
            throw new Error('Configurações de ICMS não carregadas');
        }
        
        const aliquotaEstado = this.configuracoes.aliquotas.aliquotas_icms_2025[estado];
        if (!aliquotaEstado || !aliquotaEstado.aliquota_interna) {
            throw new Error(`Alíquota ICMS não encontrada para o estado: ${estado}`);
        }
        
        return aliquotaEstado.aliquota_interna;
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