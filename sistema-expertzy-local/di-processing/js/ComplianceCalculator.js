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
        this.estadoDestino = null; // Estado deve ser fornecido explicitamente - sem default
        this.calculationMemory = [];
        this.lastCalculation = null;
        this.itemCalculator = new ItemCalculator(); // NOVO: Integração para cálculos por item
        
        // NOVA INTEGRAÇÃO: ProductMemoryManager para sistema de precificação
        this.productMemory = null;
        this.initializeProductMemory();
    }
    
    /**
     * Inicializa ProductMemoryManager se disponível
     */
    initializeProductMemory() {
        try {
            if (typeof ProductMemoryManager !== 'undefined') {
                this.productMemory = new ProductMemoryManager();
                console.log('✅ ProductMemoryManager integrado ao ComplianceCalculator');
            } else {
                console.log('ℹ️ ProductMemoryManager não disponível - produtos não serão salvos para precificação');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar ProductMemoryManager:', error);
            this.productMemory = null;
        }
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
        
        // Validar que estado foi configurado (deve ser feito externamente antes de chamar este método)
        if (!this.estadoDestino) {
            throw new Error('Estado destino não configurado - ComplianceCalculator requer estado definido via setEstadoDestino()');
        }
        
        // Configurar DI data para ItemCalculator usar em rateios
        this.itemCalculator.setDIData(di);
        
        // Configurar ICMS para ItemCalculator - obrigatório para cálculos por item
        const aliquotaICMS = this.obterAliquotaICMS(this.estadoDestino);
        
        // Verificar se há configurações NCM específicas disponíveis globalmente
        const ncmConfigs = window.icmsConfig?.ncmConfigs || {};
        
        this.itemCalculator.atualizarConfigICMS({
            estado: this.estadoDestino,
            aliquotaPadrao: aliquotaICMS,
            ncmConfigs: ncmConfigs // Usar configurações NCM-específicas se disponíveis
        });
        
        console.log(`📊 ItemCalculator configurado com ICMS: Estado ${this.estadoDestino}, Alíquota padrão ${aliquotaICMS}%, NCMs personalizados: ${Object.keys(ncmConfigs).length}`);
        
        const totalAdicoes = di.adicoes.length;
        console.log(`  Total de adições a processar: ${totalAdicoes}`);
        
        // Arrays para armazenar cálculos individuais
        const calculosIndividuais = [];
        const resumoPorAdicao = [];
        const produtosIndividuais = []; // Array para produtos com impostos individuais
        
        // Calcular valor total da DI para rateio proporcional
        const valorTotalDI = di.adicoes.reduce((sum, ad) => {
            if (!ad.valor_reais) {
                throw new Error(`Valor em reais ausente na adição ${ad.numero_adicao}`);
            }
            return sum + ad.valor_reais;
        }, 0);
        
        // Processar cada adição E seus produtos individuais
        for (let i = 0; i < di.adicoes.length; i++) {
            const adicao = di.adicoes[i];
            console.log(`  Processando adição ${i + 1}/${totalAdicoes}: NCM ${adicao.ncm}`);
            
            // Calcular despesas proporcionais para esta adição
            let despesasAdicao = null;
            if (despesasConsolidadas && valorTotalDI > 0) {
                const proporcao = adicao.valor_reais / valorTotalDI;
                despesasAdicao = {
                    automaticas: {
                        siscomex: despesasConsolidadas.automaticas.siscomex * proporcao,
                        afrmm: despesasConsolidadas.automaticas.afrmm * proporcao,
                        capatazia: despesasConsolidadas.automaticas.capatazia * proporcao,
                        total: despesasConsolidadas.automaticas.total * proporcao
                    },
                    extras: {
                        total_icms: despesasConsolidadas.extras?.total_icms ? despesasConsolidadas.extras.total_icms * proporcao : 0,
                        total: despesasConsolidadas.extras?.total ? despesasConsolidadas.extras.total * proporcao : 0
                    },
                    totais: {
                        tributavel_icms: despesasConsolidadas.totais.tributavel_icms * proporcao
                    }
                };
            }
            
            // Calcular impostos para esta adição
            const calculoAdicao = this.calcularImpostosImportacao(adicao, despesasAdicao);
            calculosIndividuais.push(calculoAdicao);
            
            // NOVO: Calcular impostos para cada produto individual usando ItemCalculator
            // SEMPRE processar adições - ItemCalculator criará fallback se necessário
            console.log(`🔍 ComplianceCalculator: Processando produtos da adição ${adicao.numero_adicao}, produtos existentes: ${adicao.produtos?.length || 0}`);
            
            // Passar despesas totais da DI - ItemCalculator fará o rateio correto
            const despesasTotaisDI = despesasConsolidadas ? {
                total_despesas_aduaneiras: despesasConsolidadas.totais?.tributavel_icms || despesasConsolidadas.automaticas?.total
            } : null;
            
            const resultadoItens = this.itemCalculator.processarItensAdicao(
                adicao, 
                despesasTotaisDI,
                null
            );
            
            // Adicionar produtos calculados ao array global
            console.log(`🔍 ComplianceCalculator: resultadoItens para adição ${adicao.numero_adicao}:`, {
                itens: resultadoItens.itens?.length || 0,
                estrutura: resultadoItens
            });
            
            if (resultadoItens.itens && resultadoItens.itens.length > 0) {
                resultadoItens.itens.forEach((item, index) => {
                    const produtoIndividual = {
                        adicao_numero: adicao.numero_adicao,
                        produto_index: index + 1,
                        ncm: adicao.ncm,
                        descricao: item.produto?.descricao || item.produto?.descricao_mercadoria || `Item ${index + 1}`,
                        codigo: item.produto?.codigo || `ITEM-${adicao.numero_adicao}-${index + 1}`,
                        unidade_medida: item.produto?.unidade_medida || 'UN',
                        valor_unitario_brl: item.produto?.valor_unitario || 0,
                        valor_total_brl: item.valorItem || 0,
                        quantidade: item.produto?.quantidade || 1,
                        ii_item: item.tributos?.ii?.valor || 0,
                        ipi_item: item.tributos?.ipi?.valor || 0, 
                        pis_item: item.tributos?.pis?.valor || 0,
                        cofins_item: item.tributos?.cofins?.valor || 0,
                        icms_item: item.valorICMS || 0,
                        base_icms_item: item.baseICMS || 0
                    };
                    
                    console.log(`🔍 ComplianceCalculator: Adicionando produto individual:`, produtoIndividual);
                    produtosIndividuais.push(produtoIndividual);
                });
                
                console.log(`    ✅ ${resultadoItens.itens.length} produtos processados individualmente`);
            } else {
                throw new Error(`ItemCalculator não retornou itens válidos para adição ${adicao.numero_adicao} - sistema deve garantir pelo menos 1 produto por adição`);
            }
            
            // Guardar resumo
            resumoPorAdicao.push({
                numero: adicao.numero_adicao,
                ncm: adicao.ncm,
                valor: adicao.valor_reais,
                peso: adicao.peso_liquido,
                impostos: {
                    ii: calculoAdicao.impostos.ii.valor_devido,
                    ipi: calculoAdicao.impostos.ipi.valor_devido,
                    pis: calculoAdicao.impostos.pis.valor_devido,
                    cofins: calculoAdicao.impostos.cofins.valor_devido,
                    icms: calculoAdicao.impostos.icms?.valor_devido
                }
            });
        }
        
        // Log final do array de produtos individuais
        console.log(`🔍 ComplianceCalculator: Array produtosIndividuais final:`, {
            length: produtosIndividuais.length,
            samples: produtosIndividuais.slice(0, 3) // Primeiros 3 itens para debug
        });
        
        // Consolidar totais incluindo produtos individuais e despesas originais
        const totaisConsolidados = this.consolidarTotaisDI(calculosIndividuais, resumoPorAdicao, produtosIndividuais, despesasConsolidadas, di);
        
        console.log('✅ DI processada com sucesso:', {
            adicoes: totalAdicoes,
            produtos: produtosIndividuais.length,
            'II Total': `R$ ${parseFloat(totaisConsolidados.impostos.ii.valor_devido).toFixed(2)}`,
            'IPI Total': `R$ ${parseFloat(totaisConsolidados.impostos.ipi.valor_devido).toFixed(2)}`,
            'PIS Total': `R$ ${parseFloat(totaisConsolidados.impostos.pis.valor_devido).toFixed(2)}`,
            'COFINS Total': `R$ ${parseFloat(totaisConsolidados.impostos.cofins.valor_devido).toFixed(2)}`
        });
        
        // Validação automática comparando com totais extraídos do XML
        this.validarTotaisComXML(di, totaisConsolidados);
        
        // NOVA FUNCIONALIDADE: Salvar produtos na memória para sistema de precificação
        this.salvarProdutosNaMemoria(di, totaisConsolidados, despesasConsolidadas);
        
        // INTEGRAÇÃO: Atualizar dados salvos no localStorage com cálculos completos
        this.atualizarDISalvaComCalculos(di, totaisConsolidados, despesasConsolidadas);
        
        return totaisConsolidados;
    }
    
    /**
     * Consolidar totais de todas as adições incluindo produtos individuais com rateio completo
     * @private
     */
    consolidarTotaisDI(calculosIndividuais, resumos, produtosIndividuais = [], despesasConsolidadas = null, di = null) {
        // Somar todos os impostos
        const totais = {
            ii: 0,
            ipi: 0,
            pis: 0,
            cofins: 0,
            icms: 0,
            valor_aduaneiro: 0,
            despesas: 0,
            peso_total: 0
        };
        
        calculosIndividuais.forEach(calc => {
            // Impostos já calculados - devem existir (podem ser zero mas a estrutura deve existir)
            const ii = parseFloat(calc.impostos.ii.valor_devido);
            const ipi = parseFloat(calc.impostos.ipi.valor_devido);
            const pis = parseFloat(calc.impostos.pis.valor_devido);
            const cofins = parseFloat(calc.impostos.cofins.valor_devido);
            const icms = parseFloat(calc.impostos.icms.valor_devido);
            const cifBrl = parseFloat(calc.valores_base.cif_brl);
            const despesas = parseFloat(calc.despesas.total_custos);
            const peso = parseFloat(calc.valores_base.peso_liquido);
            
            if (isNaN(ii) || isNaN(ipi) || isNaN(pis) || isNaN(cofins) || isNaN(icms)) {
                throw new Error(`Valores de impostos inválidos na consolidação: II=${ii}, IPI=${ipi}, PIS=${pis}, COFINS=${cofins}, ICMS=${icms}`);
            }
            if (isNaN(cifBrl)) {
                throw new Error(`Valor CIF BRL inválido na consolidação: ${calc.valores_base.cif_brl}`);
            }
            if (isNaN(despesas)) {
                throw new Error(`Total de despesas inválido na consolidação: ${calc.despesas.total_custos}`);
            }
            if (isNaN(peso)) {
                throw new Error(`Peso líquido inválido na consolidação: ${calc.valores_base.peso_liquido}`);
            }
            
            totais.ii += ii;
            totais.ipi += ipi;
            totais.pis += pis;
            totais.cofins += cofins;
            totais.icms += icms;
            totais.valor_aduaneiro += cifBrl;
            totais.despesas += despesas;
            totais.peso_total += peso;
        });
        
        const totalImpostos = totais.ii + totais.ipi + totais.pis + totais.cofins + totais.icms;
        
        // Criar adicoes_detalhes com rateio hierárquico completo
        const adicoesComRateioCompleto = this.criarAdicoesComRateioHierarquico(
            di, 
            calculosIndividuais, 
            despesasConsolidadas,
            resumos
        );
        
        return {
            tipo: 'DI_COMPLETA',
            numero_adicoes: calculosIndividuais.length,
            timestamp: new Date().toISOString(),
            estado: this.estadoDestino, // Estado do importador da DI
            ncm: resumos.map(r => r.ncm).join(', '), // Lista de NCMs
            
            valores_base: {
                valor_aduaneiro_total: totais.valor_aduaneiro,
                despesas_totais: totais.despesas,
                peso_liquido: totais.peso_total,
                taxa_cambio: calculosIndividuais[0]?.valores_base?.taxa_cambio
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
                    aliquota: this.obterAliquotaICMS(this.estadoDestino),
                    detalhamento: 'Soma de todas as adições'
                }
            },
            
            despesas: despesasConsolidadas || {
                automaticas: totais.despesas,
                extras_tributaveis: 0,
                extras_custos: 0,
                total_base_icms: totais.despesas,
                total_custos: totais.despesas
            },
            
            totais: {
                total_impostos: totalImpostos,
                custo_total: totais.valor_aduaneiro + totais.despesas + totalImpostos,
                custo_por_kg: totais.peso_total > 0 ? 
                    (totais.valor_aduaneiro + totais.despesas + totalImpostos) / totais.peso_total : 0
            },
            
            adicoes_detalhes: adicoesComRateioCompleto,
            calculos_individuais: calculosIndividuais,
            produtos_individuais: produtosIndividuais, // NOVO: Produtos com tributos por item
            
            // Metadados para rastreabilidade
            estado: this.estadoDestino,
            data_calculo: new Date().toISOString(),
            versao: '2.0'
        };
    }
    
    /**
     * Criar estrutura de adições com rateio hierárquico completo (DI → Adição → Item)
     * KISS: Apenas ratear valores já calculados, zero é válido
     * @private
     */
    criarAdicoesComRateioHierarquico(di, calculosIndividuais, despesasConsolidadas, resumos) {
        const valorTotalDI = di.adicoes.reduce((sum, ad) => sum + ad.valor_reais, 0);
        
        // Valores para rateio 
        const freteTotalDI = di.frete_brl;
        const seguroTotalDI = di.seguro_brl;
        const afrmm = despesasConsolidadas.automaticas.afrmm;
        const siscomex = despesasConsolidadas.automaticas.siscomex;
        const capatazia = despesasConsolidadas.automaticas.capatazia;
        
        return di.adicoes.map((adicao, index) => {
            const calculoAdicao = calculosIndividuais[index];
            
            // RATEIO NÍVEL 1: DI → Adição
            const proporcaoAdicao = adicao.valor_reais / valorTotalDI;
            
            const despesasRateadasAdicao = {
                frete: freteTotalDI * proporcaoAdicao,
                seguro: seguroTotalDI * proporcaoAdicao,
                afrmm: afrmm * proporcaoAdicao,
                siscomex: siscomex * proporcaoAdicao,
                capatazia: capatazia * proporcaoAdicao,
                total: (freteTotalDI + seguroTotalDI + afrmm + siscomex + capatazia) * proporcaoAdicao
            };
            
            // RATEIO NÍVEL 2: Adição → Produtos
            let produtosComRateio = [];
            if (adicao.produtos && adicao.produtos.length > 0) {
                const valorTotalProdutosAdicao = adicao.produtos.reduce(
                    (sum, p) => sum + p.valor_total_brl, 0
                );
                
                produtosComRateio = adicao.produtos.map(produto => {
                    const proporcaoProduto = produto.valor_total_brl / valorTotalProdutosAdicao;
                    
                    // Rateio das despesas do produto
                    const despesasProduto = {
                        frete: despesasRateadasAdicao.frete * proporcaoProduto,
                        seguro: despesasRateadasAdicao.seguro * proporcaoProduto,
                        afrmm: despesasRateadasAdicao.afrmm * proporcaoProduto,
                        siscomex: despesasRateadasAdicao.siscomex * proporcaoProduto,
                        capatazia: despesasRateadasAdicao.capatazia * proporcaoProduto,
                        total: despesasRateadasAdicao.total * proporcaoProduto
                    };
                    
                    // Rateio dos impostos (valores já calculados)
                    const impostosProduto = {
                        ii: calculoAdicao.impostos.ii.valor_devido * proporcaoProduto,
                        ipi: calculoAdicao.impostos.ipi.valor_devido * proporcaoProduto,
                        pis: calculoAdicao.impostos.pis.valor_devido * proporcaoProduto,
                        cofins: calculoAdicao.impostos.cofins.valor_devido * proporcaoProduto,
                        icms: calculoAdicao.impostos.icms.valor_devido * proporcaoProduto
                    };
                    
                    const custoTotalItem = produto.valor_total_brl + 
                                          despesasProduto.total + 
                                          impostosProduto.ii + 
                                          impostosProduto.ipi + 
                                          impostosProduto.pis + 
                                          impostosProduto.cofins + 
                                          impostosProduto.icms;
                    
                    return {
                        ...produto,
                        despesas_rateadas: despesasProduto,
                        impostos_item: impostosProduto,
                        custo_total_item: custoTotalItem
                    };
                });
            }
            
            const custoTotalAdicao = adicao.valor_reais +
                                    despesasRateadasAdicao.total +
                                    calculoAdicao.impostos.ii.valor_devido +
                                    calculoAdicao.impostos.ipi.valor_devido +
                                    calculoAdicao.impostos.pis.valor_devido +
                                    calculoAdicao.impostos.cofins.valor_devido +
                                    calculoAdicao.impostos.icms.valor_devido;
            
            return {
                numero_adicao: adicao.numero_adicao,
                ncm: adicao.ncm,
                incoterm: adicao.condicao_venda_incoterm,
                valor_aduaneiro: adicao.valor_reais,
                peso_liquido: adicao.peso_liquido,
                despesas_rateadas: despesasRateadasAdicao,
                impostos: {
                    ii: calculoAdicao.impostos.ii.valor_devido,
                    ipi: calculoAdicao.impostos.ipi.valor_devido,
                    pis: calculoAdicao.impostos.pis.valor_devido,
                    cofins: calculoAdicao.impostos.cofins.valor_devido,
                    icms: calculoAdicao.impostos.icms.valor_devido
                },
                produtos_com_rateio: produtosComRateio,
                custo_total: custoTotalAdicao
            };
        });
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
            ii: totaisXML.ii_total,
            ipi: totaisXML.ipi_total,
            pis: totaisXML.pis_total,
            cofins: totaisXML.cofins_total
        };
        
        console.log('🔍 VALIDAÇÃO AUTOMÁTICA - Calculados vs XML:');
        console.log('==========================================');
        
        let temDiferenca = false;
        const tolerancia = 0.10; // 10 centavos de tolerância
        
        Object.keys(calculados).forEach(imposto => {
            const calculado = calculados[imposto];
            const extraido = extraidos[imposto];
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
                    cif_usd: adicao.valor_moeda_negociacao,
                    cif_brl: adicao.valor_reais,
                    taxa_cambio: adicao.taxa_cambio,
                    peso_liquido: adicao.peso_liquido
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
                CIF: `R$ ${parseFloat(calculo.valores_base.cif_brl).toFixed(2)}`,
                II: `R$ ${parseFloat(calculo.impostos.ii.valor_devido).toFixed(2)}`,
                IPI: `R$ ${parseFloat(calculo.impostos.ipi.valor_devido).toFixed(2)}`,
                PIS: `R$ ${parseFloat(calculo.impostos.pis.valor_devido).toFixed(2)}`,
                COFINS: `R$ ${parseFloat(calculo.impostos.cofins.valor_devido).toFixed(2)}`,
                ICMS: `R$ ${parseFloat(calculo.impostos.icms.valor_devido).toFixed(2)}`,
                'Total Impostos': `R$ ${parseFloat(calculo.totais.total_impostos).toFixed(2)}`,
                'Custo Total': `R$ ${parseFloat(calculo.totais.custo_total).toFixed(2)}`
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
            console.warn('⚠️ Despesas consolidadas não fornecidas - usando zero para cálculo');
            return {
                automaticas: 0,
                extras_tributaveis: 0,
                extras_custos: 0,
                total_base_icms: 0,
                total_custos: 0
            };
        }

        // Validar estrutura de despesas
        if (!despesasConsolidadas.automaticas || typeof despesasConsolidadas.automaticas.total === 'undefined') {
            throw new Error('Estrutura de despesas automáticas inválida ou ausente');
        }

        const despesas = {
            // Despesas automáticas da DI (sempre na base ICMS)
            automaticas: despesasConsolidadas.automaticas.total,
            
            // Despesas extras classificadas pelo usuário (podem ser zero)
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
        // CRÍTICO: Converter valores para número - SEM FALLBACKS
        if (adicao.tributos.ii_valor_devido === undefined) {
            throw new Error('Valor devido II ausente na DI');
        }
        if (valoresBase.cif_brl === undefined) {
            throw new Error('Valor CIF não disponível para cálculo II');
        }
        
        const aliquota = parseFloat(adicao.tributos.ii_aliquota_ad_valorem);
        const valorDevido = parseFloat(adicao.tributos.ii_valor_devido);
        const baseCalculo = parseFloat(valoresBase.cif_brl);
        
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
        const valorDevido = adicao.tributos.ipi_valor_devido;
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
        const valorDevido = adicao.tributos.pis_valor_devido;
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
        const valorDevido = adicao.tributos.cofins_valor_devido;
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
        // CRÍTICO: Converter todos os valores para número - SEM FALLBACKS
        if (calculo.valores_base.cif_brl === undefined) {
            throw new Error('Valor CIF não disponível para cálculo ICMS');
        }
        if (calculo.impostos.ii.valor_devido === undefined) {
            throw new Error('Valor II não disponível para cálculo ICMS');
        }
        if (calculo.impostos.ipi.valor_devido === undefined) {
            throw new Error('Valor IPI não disponível para cálculo ICMS');
        }
        if (calculo.impostos.pis.valor_devido === undefined) {
            throw new Error('Valor PIS não disponível para cálculo ICMS');
        }
        if (calculo.impostos.cofins.valor_devido === undefined) {
            throw new Error('Valor COFINS não disponível para cálculo ICMS');
        }
        if (calculo.despesas.total_base_icms === undefined) {
            throw new Error('Total despesas para base ICMS não disponível');
        }
        
        const baseAntes = 
            parseFloat(calculo.valores_base.cif_brl) +
            parseFloat(calculo.impostos.ii.valor_devido) +
            parseFloat(calculo.impostos.ipi.valor_devido) +
            parseFloat(calculo.impostos.pis.valor_devido) +
            parseFloat(calculo.impostos.cofins.valor_devido) +
            parseFloat(calculo.despesas.total_base_icms); // INCLUI SISCOMEX!

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
        if (!estado) {
            throw new Error('Estado destino é obrigatório');
        }
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
    
    /**
     * NOVA FUNCIONALIDADE: Salva produtos na memória para sistema de precificação
     * @param {Object} di - Dados da DI
     * @param {Object} totaisConsolidados - Resultados do cálculo
     * @param {Object} despesasConsolidadas - Despesas consolidadas
     */
    salvarProdutosNaMemoria(di, totaisConsolidados, despesasConsolidadas) {
        if (!this.productMemory) {
            console.log('ℹ️ ProductMemoryManager não disponível - produtos não serão salvos');
            return;
        }
        
        try {
            console.log('💾 Salvando produtos na memória para sistema de precificação...');
            
            // Extrair dados relevantes da DI para salvar produtos estruturados
            const diNumber = di.numero_di;
            const additions = di.adicoes || [];
            
            // Usar método específico do ProductMemoryManager para salvar dados da DI
            const savedProducts = this.productMemory.saveProductsFromDI(
                diNumber, 
                additions, 
                totaisConsolidados
            );
            
            console.log(`✅ ${savedProducts.length} produtos salvos na memória para precificação`);
            
            // Opcional: Notificar outros sistemas que produtos foram salvos
            this.notifyProductsSaved(savedProducts);
            
        } catch (error) {
            console.error('❌ Erro ao salvar produtos na memória:', error);
            // Não interrompe o fluxo principal - é uma funcionalidade adicional
        }
    }
    
    /**
     * Notifica outros sistemas que produtos foram salvos
     * @param {Array} products - Produtos salvos
     */
    notifyProductsSaved(products) {
        try {
            // Dispatch event para outros sistemas
            const event = new CustomEvent('productsMemorySaved', {
                detail: {
                    products: products,
                    count: products.length,
                    timestamp: new Date().toISOString()
                }
            });
            
            if (typeof window !== 'undefined') {
                window.dispatchEvent(event);
            }
            
            console.log(`📡 Evento 'productsMemorySaved' disparado para ${products.length} produtos`);
            
        } catch (error) {
            console.error('❌ Erro ao notificar salvamento de produtos:', error);
        }
    }
    
    /**
     * NOVO: Salva produtos individuais calculados no banco estruturado
     * Substitui armazenamento JSON em calculos_salvos.resultados
     * @param {number} calculoId - ID do cálculo na tabela calculos_salvos
     * @param {Array} produtosIndividuais - Array de produtos calculados
     * @returns {Promise} - Resultado da operação
     */
    async salvarProdutosCalculadosNoBanco(calculoId, produtosIndividuais) {
        console.log(`💾 Salvando ${produtosIndividuais.length} produtos individuais no banco para cálculo ID ${calculoId}...`);
        
        try {
            // Validar parâmetros obrigatórios
            if (!calculoId || !Number.isInteger(calculoId) || calculoId <= 0) {
                throw new Error('ID do cálculo inválido ou ausente');
            }
            
            if (!produtosIndividuais || !Array.isArray(produtosIndividuais) || produtosIndividuais.length === 0) {
                throw new Error('Array de produtos individuais inválido ou vazio');
            }
            
            // Preparar dados para API
            const requestData = {
                calculo_id: calculoId,
                produtos: produtosIndividuais
            };
            
            // Fazer requisição para API
            const response = await fetch('/api/endpoints/salvar-produtos-individuais.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.message || 'Erro desconhecido na API'}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(`API retornou erro: ${result.message || 'Erro desconhecido'}`);
            }
            
            console.log('✅ Produtos individuais salvos no banco com sucesso:', {
                calculo_id: result.dados.calculo_id,
                numero_di: result.dados.numero_di,
                produtos_inseridos: result.dados.produtos_inseridos,
                produtos_com_erro: result.dados.produtos_com_erro
            });
            
            // Log de erros se houver
            if (result.dados.produtos_com_erro > 0 && result.erros && result.erros.length > 0) {
                console.warn(`⚠️ ${result.dados.produtos_com_erro} produtos tiveram erros:`, result.erros);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro ao salvar produtos individuais no banco:', error);
            
            // Re-throw com contexto adicional
            throw new Error(`Falha ao salvar produtos no banco: ${error.message}`);
        }
    }
    
    /**
     * INTEGRAÇÃO: Atualiza DI salva no localStorage com cálculos completos - NO FALLBACKS
     * @param {Object} di - Dados da DI processada
     * @param {Object} totaisConsolidados - Totais calculados
     * @param {Object} despesasConsolidadas - Despesas consolidadas
     */
    atualizarDISalvaComCalculos(di, totaisConsolidados, despesasConsolidadas) {
        if (!di || !di.numero_di) {
            throw new Error('DI inválida para atualização no localStorage');
        }
        
        if (!totaisConsolidados) {
            throw new Error('Totais consolidados ausentes para atualização no localStorage');
        }
        
        if (!despesasConsolidadas) {
            throw new Error('Despesas consolidadas ausentes para atualização no localStorage');
        }
        
        try {
            console.log('🔄 Atualizando DI salva com cálculos completos...');
            
            // Recuperar DI salva anteriormente
            const dadosSalvos = localStorage.getItem('expertzy_processed_di');
            if (!dadosSalvos) {
                console.warn('⚠️ DI não encontrada no localStorage para atualização - dados salvos após processamento podem ter se perdido');
                return;
            }
            
            const diSalva = JSON.parse(dadosSalvos);
            
            // Validar que é a mesma DI
            if (diSalva.di_numero !== di.numero_di) {
                throw new Error(`DI no localStorage (${diSalva.di_numero}) não corresponde à DI calculada (${di.numero_di})`);
            }
            
            // Atualizar com cálculos completos
            diSalva.integration.phase1_completed = true;
            diSalva.integration.calculations_pending = false;
            diSalva.integration.calculations_completed_at = new Date().toISOString();
            
            // Adicionar cálculos de impostos
            diSalva.calculoImpostos = totaisConsolidados;
            
            // Adicionar despesas consolidadas
            diSalva.despesas = despesasConsolidadas;
            
            // Atualizar valores base com dados finais
            if (totaisConsolidados.valores_base) {
                diSalva.valores_base_finais = {
                    cif_brl: totaisConsolidados.valores_base.cif_brl,
                    peso_liquido: totaisConsolidados.valores_base.peso_liquido,
                    taxa_cambio: di.taxa_cambio
                };
            }
            
            // Salvar dados atualizados
            localStorage.setItem('expertzy_processed_di', JSON.stringify(diSalva));
            
            // Validar que atualização funcionou
            const verificacao = localStorage.getItem('expertzy_processed_di');
            if (!verificacao) {
                throw new Error('Falha ao atualizar DI no localStorage');
            }
            
            const dadosVerificados = JSON.parse(verificacao);
            if (!dadosVerificados.integration.phase1_completed) {
                throw new Error('Atualização de DI no localStorage não foi aplicada corretamente');
            }
            
            console.log(`✅ DI ${di.numero_di} atualizada no localStorage com cálculos completos - pronta para precificação`);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar DI salva com cálculos:', error);
            // Não lança exceção para não quebrar fluxo principal
        }
    }
}

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceCalculator;
}