/**
 * Teste de integração ProductMemoryManager
 * Simula o fluxo do Module 2 para verificar se produtos são salvos corretamente
 */

// Simular dados de produto calculado (como viria do ComplianceCalculator)
const testProducts = [
    {
        id: 'prod_1726407628421_test001',
        di_number: '2520345968',
        addition_number: '001',
        produto_index: 1,
        description: 'TECA250001AA - Latex Powdered Examination Gloves - X-Small Size',
        codigo: 'TECA250001AA',
        ncm: '40151200',
        quantity: 42,
        unit: 'UN',
        base_costs: {
            cif_brl: 966.00,
            ii: 0.00,
            ipi: 0.00,
            pis_import: 0.00,
            cofins_import: 0.00,
            icms_import: 13.15,
            expenses: {
                siscomex: 0.00,
                afrmm: 0.00,
                capatazia: 0.00,
                armazenagem: 0.00,
                outras: 0.00
            },
            total_base_cost: 979.15
        },
        special_cases: {
            is_monofasico: false,
            has_icms_st: false,
            has_cofins_adicional: false,
            industrial_use: false
        },
        metadata: {
            exchange_rate: 5.38,
            import_date: '2025-09-15',
            state: 'SC'
        }
    },
    {
        id: 'prod_1726407628422_test002',
        di_number: '2520345968',
        addition_number: '001',
        produto_index: 2,
        description: 'TECA250001AB - Latex Powdered Examination Gloves - Small Size',
        codigo: 'TECA250001AB',
        ncm: '40151200',
        quantity: 992,
        unit: 'UN',
        base_costs: {
            cif_brl: 22816.00,
            ii: 0.00,
            ipi: 0.00,
            pis_import: 0.00,
            cofins_import: 0.00,
            icms_import: 310.45,
            expenses: {
                siscomex: 0.00,
                afrmm: 0.00,
                capatazia: 0.00,
                armazenagem: 0.00,
                outras: 0.00
            },
            total_base_cost: 23126.45
        },
        special_cases: {
            is_monofasico: false,
            has_icms_st: false,
            has_cofins_adicional: false,
            industrial_use: false
        },
        metadata: {
            exchange_rate: 5.38,
            import_date: '2025-09-15',
            state: 'SC'
        }
    }
];

async function testProductMemoryManager() {
    console.log('🧪 Testando ProductMemoryManager Integration...');
    
    try {
        // 1. Testar salvamento
        console.log('💾 Testando salvamento de produtos...');
        const saveResponse = await fetch('http://localhost:8889/api/endpoints/salvar-produtos-memoria.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                products: testProducts
            })
        });
        
        const saveResult = await saveResponse.json();
        console.log('📊 Resultado do salvamento:', saveResult);
        
        if (!saveResult.success) {
            console.error('❌ Erro no salvamento:', saveResult.error);
            return;
        }
        
        // 2. Testar consulta
        console.log('\n🔍 Testando consulta de produtos salvos...');
        const queryResponse = await fetch('http://localhost:8889/api/endpoints/consultar-produtos-memoria.php');
        const queryResult = await queryResponse.json();
        
        console.log('📋 Produtos carregados:', queryResult);
        
        if (queryResult.success && queryResult.count > 0) {
            console.log(`✅ ${queryResult.count} produtos encontrados na memória!`);
            console.log('🎯 ProductMemoryManager funcionando corretamente');
        } else {
            console.log('⚠️ Nenhum produto encontrado na memória');
        }
        
        // 3. Testar busca específica por DI
        console.log('\n🎯 Testando busca por DI específica...');
        const diQueryResponse = await fetch('http://localhost:8889/api/endpoints/consultar-produtos-memoria.php?numero_di=2520345968');
        const diQueryResult = await diQueryResponse.json();
        
        console.log('📊 Produtos da DI 2520345968:', diQueryResult);
        
        console.log('\n🎉 Teste de integração ProductMemoryManager concluído!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar teste se rodando via Node.js
if (typeof window === 'undefined') {
    // Simular fetch para Node.js (caso necessário)
    if (typeof fetch === 'undefined') {
        console.log('⚠️ Este teste deve ser executado no browser ou com fetch disponível');
        console.log('📝 Copie e cole este código no console do Module 2');
    } else {
        testProductMemoryManager();
    }
} else {
    // Executando no browser
    testProductMemoryManager();
}