/**
 * Test Script para Verificar Integração Phase 2
 * Testa a integração: XML → DIProcessor → ComplianceCalculator + ItemCalculator → exportCroquiNF
 * 
 * Verifica:
 * 1. ComplianceCalculator inicializa ItemCalculator corretamente
 * 2. calcularTodasAdicoes() chama itemCalculator.processarItensAdicao()
 * 3. produtos_individuais array é criado com dados ICMS/IPI por item
 * 4. exportCroquiNF recebe estrutura correta
 * 5. Soma dos impostos por item confere com total da DI
 */

const fs = require('fs');
const path = require('path');

// Mock do DOM e fetch para ambiente Node.js
global.DOMParser = require('xmldom').DOMParser;
global.fetch = require('node-fetch');
global.console = console;

// Mock do window object
global.window = {
    ItemCalculator: null
};

// Carregar módulos do sistema
const DIProcessor = require('./sistema-expertzy-local/di-processing/js/DIProcessor.js');
const ComplianceCalculator = require('./sistema-expertzy-local/di-processing/js/ComplianceCalculator.js');
const ItemCalculator = require('./sistema-expertzy-local/shared/js/ItemCalculator.js');

// Mock da configuração de alíquotas
const mockAliquotas = {
    "versao": "2025.1",
    "aliquotas_icms_2025": {
        "GO": {
            "aliquota_interna": 19,
            "aliquota_interestadual": 12
        },
        "SC": {
            "aliquota_interna": 17,
            "aliquota_interestadual": 12
        }
    }
};

const mockBeneficios = {
    "versao": "2025.1",
    "GO": {
        "tipo": "credito_icms",
        "percentual": 67,
        "ncms_beneficiados": ["8517", "9018"]
    }
};

const mockConfig = {
    "versao": "2025.1",
    "sistema": "expertzy"
};

// Mock do fetch para carregar configurações
const originalFetch = global.fetch;
global.fetch = (url) => {
    if (url.includes('aliquotas.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAliquotas)
        });
    }
    if (url.includes('beneficios.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBeneficios)
        });
    }
    if (url.includes('config.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockConfig)
        });
    }
    return originalFetch(url);
};

class Phase2IntegrationTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.xmlFilePath = './orientacoes/2300120746.xml';
        this.diData = null;
        this.calculosData = null;
    }

    async runAllTests() {
        console.log('🧪 Iniciando testes de integração Phase 2');
        console.log('==================================================');

        try {
            // Preparar dados de teste
            await this.prepareTestData();

            // Executar testes
            await this.test1_DIProcessorParsing();
            await this.test2_ComplianceCalculatorInitialization();
            await this.test3_ItemCalculatorIntegration();
            await this.test4_ProdutosIndividuaisGeneration();
            await this.test5_TaxValidation();
            await this.test6_ExportCroquiNFDataStructure();

            // Resultados
            this.printResults();

        } catch (error) {
            console.error('❌ Erro crítico nos testes:', error);
            this.testResults.errors.push(error.message);
        }
    }

    async prepareTestData() {
        console.log('\n📋 Preparando dados de teste...');
        
        // Ler arquivo XML
        if (!fs.existsSync(this.xmlFilePath)) {
            throw new Error(`Arquivo XML não encontrado: ${this.xmlFilePath}`);
        }
        
        const xmlContent = fs.readFileSync(this.xmlFilePath, 'utf8');
        console.log('  ✓ XML carregado');

        // Processar DI
        const diProcessor = new DIProcessor();
        this.diData = diProcessor.parseXML(xmlContent);
        console.log(`  ✓ DI processada: ${this.diData.numero_di} com ${this.diData.adicoes.length} adições`);

        // Inicializar ComplianceCalculator
        this.complianceCalculator = new ComplianceCalculator();
        await this.complianceCalculator.carregarConfiguracoes();
        console.log('  ✓ ComplianceCalculator inicializado');
    }

    async test1_DIProcessorParsing() {
        console.log('\n🔍 Teste 1: DIProcessor parsing correto');
        
        try {
            // Verificar estrutura básica da DI
            this.assert(this.diData !== null, 'DI data não deve ser null');
            this.assert(this.diData.numero_di, 'Número da DI deve existir');
            this.assert(this.diData.adicoes && this.diData.adicoes.length > 0, 'Deve haver adições');
            
            // Verificar primeira adição tem dados necessários
            const primeiraAdicao = this.diData.adicoes[0];
            this.assert(primeiraAdicao.tributos, 'Primeira adição deve ter tributos');
            this.assert(primeiraAdicao.produtos, 'Primeira adição deve ter produtos');
            this.assert(primeiraAdicao.valor_reais > 0, 'Primeira adição deve ter valor em reais');
            
            console.log('  ✅ DIProcessor parsing OK');
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ DIProcessor parsing falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test1: ${error.message}`);
        }
    }

    async test2_ComplianceCalculatorInitialization() {
        console.log('\n🔍 Teste 2: ComplianceCalculator inicialização com ItemCalculator');
        
        try {
            // Verificar se ComplianceCalculator tem ItemCalculator
            this.assert(this.complianceCalculator.itemCalculator, 'ComplianceCalculator deve ter itemCalculator');
            this.assert(typeof this.complianceCalculator.itemCalculator.processarItensAdicao === 'function', 
                       'ItemCalculator deve ter método processarItensAdicao');
            this.assert(typeof this.complianceCalculator.itemCalculator.calcularTributosIndividuais === 'function', 
                       'ItemCalculator deve ter método calcularTributosIndividuais');
            
            console.log('  ✅ ComplianceCalculator inicialização OK');
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ ComplianceCalculator inicialização falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test2: ${error.message}`);
        }
    }

    async test3_ItemCalculatorIntegration() {
        console.log('\n🔍 Teste 3: ItemCalculator integração com ComplianceCalculator');
        
        try {
            // Testar cálculo de uma adição
            const primeiraAdicao = this.diData.adicoes[0];
            const despesasTeste = {
                automaticas: 1000,
                extras_tributaveis: 500,
                total_base_icms: 1500
            };

            // Executar processamento individual
            const resultadoItens = this.complianceCalculator.itemCalculator.processarItensAdicao(
                primeiraAdicao, 
                despesasTeste.automaticas, 
                despesasTeste.extras_tributaveis
            );

            this.assert(resultadoItens, 'Resultado do processamento de itens não deve ser null');
            this.assert(resultadoItens.itens && resultadoItens.itens.length > 0, 'Deve gerar pelo menos 1 item');
            
            const primeiroItem = resultadoItens.itens[0];
            this.assert(primeiroItem.tributos, 'Item deve ter tributos calculados');
            this.assert(primeiroItem.tributos.ii.valor >= 0, 'Item deve ter II calculado');
            this.assert(primeiroItem.tributos.ipi.valor >= 0, 'Item deve ter IPI calculado');
            this.assert(primeiroItem.tributos.pis.valor >= 0, 'Item deve ter PIS calculado');
            this.assert(primeiroItem.tributos.cofins.valor >= 0, 'Item deve ter COFINS calculado');
            this.assert(primeiroItem.valorICMS >= 0, 'Item deve ter ICMS calculado');

            console.log('  ✅ ItemCalculator integração OK');
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ ItemCalculator integração falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test3: ${error.message}`);
        }
    }

    async test4_ProdutosIndividuaisGeneration() {
        console.log('\n🔍 Teste 4: Geração do array produtos_individuais');
        
        try {
            // Executar cálculo completo da DI
            const despesasConsolidadas = {
                automaticas: { total: 2000 },
                extras: { total_icms: 1000, total: 1500 },
                total_base_icms: 3000,
                total: 3500
            };

            this.calculosData = this.complianceCalculator.calcularTodasAdicoes(this.diData, despesasConsolidadas);
            
            // Verificar se produtos_individuais foi criado
            this.assert(this.calculosData.produtos_individuais, 'Deve ter array produtos_individuais');
            this.assert(Array.isArray(this.calculosData.produtos_individuais), 'produtos_individuais deve ser array');
            this.assert(this.calculosData.produtos_individuais.length > 0, 'Deve haver produtos individuais');

            // Verificar estrutura dos produtos individuais
            const primeiroProduto = this.calculosData.produtos_individuais[0];
            const camposRequeridos = [
                'adicao_numero', 'produto_index', 'ncm', 'descricao',
                'valor_unitario_brl', 'valor_total_brl', 'quantidade',
                'ii_item', 'ipi_item', 'pis_item', 'cofins_item', 'icms_item', 'base_icms_item'
            ];

            camposRequeridos.forEach(campo => {
                this.assert(primeiroProduto.hasOwnProperty(campo), `Produto deve ter campo ${campo}`);
            });

            // Verificar que valores não são zero (exceto em casos específicos)
            this.assert(primeiroProduto.valor_total_brl > 0, 'Produto deve ter valor total > 0');
            this.assert(primeiroProduto.base_icms_item > 0, 'Produto deve ter base ICMS > 0');

            console.log('  ✅ Produtos individuais geração OK');
            console.log(`      📊 ${this.calculosData.produtos_individuais.length} produtos gerados`);
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ Produtos individuais geração falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test4: ${error.message}`);
        }
    }

    async test5_TaxValidation() {
        console.log('\n🔍 Teste 5: Validação soma impostos individuais vs DI total');
        
        try {
            if (!this.calculosData || !this.calculosData.produtos_individuais) {
                throw new Error('Dados de cálculo não disponíveis');
            }

            // Somar impostos individuais
            const somaIndividual = this.calculosData.produtos_individuais.reduce((soma, produto) => {
                return {
                    ii: soma.ii + (produto.ii_item || 0),
                    ipi: soma.ipi + (produto.ipi_item || 0),
                    pis: soma.pis + (produto.pis_item || 0),
                    cofins: soma.cofins + (produto.cofins_item || 0),
                    icms: soma.icms + (produto.icms_item || 0)
                };
            }, { ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 });

            // Obter totais da DI
            const totaisDI = {
                ii: this.calculosData.impostos.ii.valor_devido,
                ipi: this.calculosData.impostos.ipi.valor_devido,
                pis: this.calculosData.impostos.pis.valor_devido,
                cofins: this.calculosData.impostos.cofins.valor_devido,
                icms: this.calculosData.impostos.icms.valor_devido
            };

            // Validar com tolerância de R$ 0,50
            const tolerancia = 0.50;
            Object.keys(somaIndividual).forEach(imposto => {
                const diferenca = Math.abs(somaIndividual[imposto] - totaisDI[imposto]);
                this.assert(diferenca <= tolerancia, 
                           `${imposto.toUpperCase()}: diferença R$ ${diferenca.toFixed(2)} > tolerância R$ ${tolerancia.toFixed(2)}`);
            });

            console.log('  ✅ Validação tributária OK');
            console.log('      📊 Diferenças dentro da tolerância de R$ 0,50');
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ Validação tributária falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test5: ${error.message}`);
        }
    }

    async test6_ExportCroquiNFDataStructure() {
        console.log('\n🔍 Teste 6: Estrutura de dados para exportCroquiNF');
        
        try {
            if (!this.calculosData) {
                throw new Error('Dados de cálculo não disponíveis');
            }

            // Simular o que o exportCroquiNF esperaria
            const mockExportCroqui = {
                prepareProdutos: (calculos) => {
                    if (!calculos.produtos_individuais || calculos.produtos_individuais.length === 0) {
                        throw new Error('produtos_individuais não encontrado ou vazio');
                    }
                    
                    return calculos.produtos_individuais.map((produto, index) => {
                        // Verificar campos esperados pelo exportCroquiNF
                        const camposExport = [
                            'adicao_numero', 'ncm', 'descricao',
                            'valor_unitario_brl', 'valor_total_brl', 'quantidade',
                            'ii_item', 'ipi_item', 'pis_item', 'cofins_item', 
                            'icms_item', 'base_icms_item'
                        ];
                        
                        camposExport.forEach(campo => {
                            if (!produto.hasOwnProperty(campo)) {
                                throw new Error(`Campo ${campo} ausente em produto ${index + 1}`);
                            }
                        });
                        
                        return {
                            item: `${String(index + 1).padStart(3, '0')}`,
                            adicao: produto.adicao_numero,
                            descricao: produto.descricao,
                            ncm: produto.ncm,
                            valor_unitario_reais: produto.valor_unitario_brl,
                            valor_total_reais: produto.valor_total_brl,
                            quantidade: produto.quantidade,
                            valor_ii: produto.ii_item,
                            valor_ipi: produto.ipi_item,
                            valor_pis: produto.pis_item,
                            valor_cofins: produto.cofins_item,
                            valor_icms: produto.icms_item,
                            bc_icms: produto.base_icms_item
                        };
                    });
                }
            };

            // Testar preparação dos produtos
            const produtosExport = mockExportCroqui.prepareProdutos(this.calculosData);
            this.assert(produtosExport.length > 0, 'Deve gerar produtos para export');
            this.assert(produtosExport[0].item === '001', 'Primeiro item deve ser 001');
            this.assert(produtosExport[0].valor_total_reais > 0, 'Produto deve ter valor total');

            console.log('  ✅ Estrutura export OK');
            console.log(`      📊 ${produtosExport.length} produtos preparados para export`);
            this.testResults.passed++;
            
        } catch (error) {
            console.log('  ❌ Estrutura export falhou:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Test6: ${error.message}`);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    printResults() {
        console.log('\n🏁 RESULTADOS DOS TESTES');
        console.log('==========================');
        console.log(`✅ Testes passaram: ${this.testResults.passed}`);
        console.log(`❌ Testes falharam: ${this.testResults.failed}`);
        console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        } else {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ A integração Phase 2 está funcionando corretamente!');
        }
        
        // Salvar resultados
        const resultadoCompleto = {
            timestamp: new Date().toISOString(),
            sistema: 'Expertzy Phase 2 Integration Test',
            resultados: this.testResults,
            dados_teste: {
                di_numero: this.diData?.numero_di,
                total_adicoes: this.diData?.adicoes?.length,
                total_produtos_individuais: this.calculosData?.produtos_individuais?.length
            }
        };
        
        fs.writeFileSync('./test-phase2-results.json', JSON.stringify(resultadoCompleto, null, 2));
        console.log('\n💾 Resultados salvos em: test-phase2-results.json');
    }
}

// Executar testes
if (require.main === module) {
    const test = new Phase2IntegrationTest();
    test.runAllTests().catch(console.error);
}

module.exports = Phase2IntegrationTest;