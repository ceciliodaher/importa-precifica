/**
 * Teste do Module 2 Refatorado
 * Valida nova arquitetura: Seletor DI + Calculador ICMS
 */

const fs = require('fs');
const fetch = require('node-fetch');

class Module2Tester {
    constructor() {
        this.apiBase = 'http://localhost:8889/api/endpoints';
        this.results = {
            api_connectivity: false,
            data_processed: false,
            di_selection: false,
            icms_calculation: false,
            workflow_complete: false
        };
    }

    async runTests() {
        console.log('🧪 Testando Module 2 Refatorado...\n');
        
        try {
            await this.testAPIConnectivity();
            await this.testDataProcessed();
            await this.testDISelection();
            await this.testWorkflowLogic();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Erro nos testes:', error);
        }
    }

    async testAPIConnectivity() {
        console.log('1. 🔌 Testando conectividade API...');
        
        try {
            const response = await fetch(`${this.apiBase}/status.php`);
            const data = await response.json();
            
            if (data.success && data.banco_dados.status === 'conectado') {
                console.log('   ✅ API conectada e banco funcionando');
                console.log(`   📊 DIs disponíveis: ${data.estatisticas.total_dis}`);
                this.results.api_connectivity = true;
            } else {
                throw new Error('API ou banco não estão funcionando');
            }
            
        } catch (error) {
            console.log('   ❌ Erro de conectividade:', error.message);
        }
    }

    async testDataProcessed() {
        console.log('\n2. 🔄 Testando dados processados...');
        
        try {
            const response = await fetch(`${this.apiBase}/listar-dis.php?limit=1`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const di = data.data[0];
                
                // Verificar se dados estão processados (não brutos)
                const valorCorreto = typeof di.valor_total_reais === 'string' && 
                                   parseFloat(di.valor_total_reais) > 0;
                const dataFormatada = di.data_registro_formatada && 
                                    di.data_registro_formatada.includes('/');
                
                if (valorCorreto && dataFormatada) {
                    console.log('   ✅ Dados vêm processados da API');
                    console.log(`   💰 Valor: R$ ${di.valor_total_reais} (já formatado)`);
                    console.log(`   📅 Data: ${di.data_registro_formatada} (padrão BR)`);
                    this.results.data_processed = true;
                } else {
                    throw new Error('Dados não estão processados corretamente');
                }
            }
            
        } catch (error) {
            console.log('   ❌ Erro nos dados:', error.message);
        }
    }

    async testDISelection() {
        console.log('\n3. 🎯 Testando seleção de DI...');
        
        try {
            // Buscar DI específica
            const response = await fetch(`${this.apiBase}/buscar-di.php?numero_di=2518173187`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const di = data.data;
                
                // Verificar campos necessários para cálculo ICMS
                const camposRequeridos = [
                    'numero_di',
                    'importador_uf',
                    'adicoes'
                ];
                
                const camposValidos = camposRequeridos.every(campo => {
                    const value = di[campo];
                    return value && (Array.isArray(value) ? value.length > 0 : true);
                });
                
                if (camposValidos && di.adicoes[0].valor_reais) {
                    console.log('   ✅ DI carregada com todos os dados necessários');
                    console.log(`   🏢 Importador: ${di.importador_nome} (${di.importador_uf})`);
                    console.log(`   📦 Adições: ${di.adicoes.length}`);
                    console.log(`   💰 Valor primeira adição: R$ ${di.adicoes[0].valor_reais}`);
                    this.results.di_selection = true;
                } else {
                    throw new Error('DI não tem dados suficientes para cálculo');
                }
            }
            
        } catch (error) {
            console.log('   ❌ Erro na seleção:', error.message);
        }
    }

    async testWorkflowLogic() {
        console.log('\n4. ⚙️ Testando lógica de workflow...');
        
        try {
            // Testar se Module 2 não tenta processar XML
            const htmlContent = fs.readFileSync('/Users/ceciliodaher/Documents/git/importa-precifica/sistema-expertzy-local/di-processing/di-processor.html', 'utf8');
            
            // Verificar se upload XML foi removido
            const hasXMLUpload = htmlContent.includes('type="file"') && 
                               htmlContent.includes('accept=".xml"');
            const hasDataLoader = htmlContent.includes('DataLoader.js');
            const hasDIProcessor = htmlContent.includes('DIProcessor.js');
            
            if (!hasXMLUpload && hasDataLoader && !hasDIProcessor) {
                console.log('   ✅ Interface refatorada corretamente');
                console.log('   📤 Upload XML removido do Module 2');
                console.log('   🔄 DataLoader.js incluído');
                console.log('   ❌ DIProcessor.js removido');
                this.results.workflow_complete = true;
            } else {
                throw new Error('Interface ainda tem elementos antigos');
            }
            
        } catch (error) {
            console.log('   ❌ Erro no workflow:', error.message);
        }
    }

    printResults() {
        console.log('\n📋 RESULTADOS DOS TESTES:');
        console.log('========================');
        
        Object.entries(this.results).forEach(([test, passed]) => {
            const icon = passed ? '✅' : '❌';
            const status = passed ? 'PASSOU' : 'FALHOU';
            console.log(`${icon} ${test.replace(/_/g, ' ').toUpperCase()}: ${status}`);
        });
        
        const totalPassed = Object.values(this.results).filter(Boolean).length;
        const totalTests = Object.keys(this.results).length;
        
        console.log(`\n🏆 SCORE: ${totalPassed}/${totalTests} testes passaram`);
        
        if (totalPassed === totalTests) {
            console.log('\n🎉 SUCESSO! Module 2 refatorado está funcionando corretamente!');
            console.log('   ✨ Nova arquitetura: Seletor DI + Calculador ICMS');
            console.log('   🚀 Sem processamento XML desnecessário');
            console.log('   📊 Trabalha apenas com dados processados da API');
        } else {
            console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
        }
    }
}

// Executar testes
if (require.main === module) {
    const tester = new Module2Tester();
    tester.runTests();
}

module.exports = Module2Tester;