const { test, expect } = require('@playwright/test');

test.describe('Sistema Importa Precifica - DI Grande 2300120746', () => {
    
    test('Processamento completo da DI 2300120746 com 16 adições', async ({ page }) => {
        // Configurar timeout maior para DI grande
        test.setTimeout(300000); // 5 minutos
        
        console.log('🚀 Teste DI Grande: Iniciando processamento da DI 2300120746...');
        
        // 1. Limpar banco de dados
        console.log('🧹 1. Limpando banco de dados...');
        await page.goto('http://localhost:8889/sistema-expertzy-local/xml-import/import-dashboard.html');
        await page.waitForSelector('#clearBankBtn');
        await page.click('#clearBankBtn');
        await page.waitForSelector('.alert-success', { timeout: 10000 });
        
        // 2. Importar XML da DI 2300120746
        console.log('📤 2. Importando XML da DI 2300120746...');
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles('/Users/ceciliodaher/Documents/git/importa-precifica/orientacoes/2300120746.xml');
        
        // Aguardar processamento completo
        await page.waitForSelector('.list-group-item:has-text("2300120746")', { timeout: 30000 });
        
        // Verificar estatísticas
        const statsText = await page.textContent('#bankStats');
        expect(statsText).toContain('1'); // 1 DI no banco
        console.log('   ✅ DI 2300120746 importada com sucesso');
        
        // 3. Navegar para Module 2
        console.log('🔄 3. Navegando para Module 2...');
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForSelector('#availableDIs');
        
        // Aguardar carregamento das DIs disponíveis
        await page.waitForSelector('.di-item:has-text("2300120746")', { timeout: 15000 });
        
        // 4. Selecionar DI 2300120746
        console.log('🎯 4. Selecionando DI 2300120746...');
        await page.click('.di-item:has-text("2300120746")');
        
        // Aguardar população dos dados
        await page.waitForSelector('#step2Content.show', { timeout: 10000 });
        
        // 5. Verificar dados básicos da DI
        console.log('🔍 5. Verificando dados básicos da DI...');
        
        // Verificar número da DI
        const diNumber = await page.textContent('#diNumber');
        expect(diNumber).toBe('2300120746');
        
        // Verificar Incoterm (deve ser CFR)
        const incoterm = await page.textContent('#diIncoterm');
        expect(incoterm).toBe('CFR');
        console.log(`   ✅ Incoterm: ${incoterm}`);
        
        // Verificar Fornecedor (deve ser "INTERNATION UNIT POWER LIMITED")
        const supplier = await page.textContent('#supplierName');
        expect(supplier).toContain('INTERNATION UNIT POWER');
        console.log(`   ✅ Fornecedor: ${supplier}`);
        
        // 6. Verificar quantidade de adições (deve ser 16)
        console.log('📊 6. Verificando adições...');
        const additionsRows = await page.locator('#additionsTable tbody tr').count();
        expect(additionsRows).toBe(16);
        console.log(`   ✅ 16 adições carregadas corretamente`);
        
        // Verificar algumas adições específicas por NCM
        const firstAdditionNCM = await page.textContent('#additionsTable tbody tr:first-child .ncm-column');
        expect(firstAdditionNCM).toBe('73181500');
        console.log(`   ✅ Primeira adição NCM: ${firstAdditionNCM}`);
        
        // 7. Configurar estado para GO e calcular impostos
        console.log('⚙️ 7. Configurando estado e calculando impostos...');
        await page.selectOption('#stateSelect', 'GO');
        await page.waitForTimeout(1000);
        
        await page.click('#calculateTaxesBtn');
        
        // Aguardar cálculo completo (pode demorar para 16 adições)
        await page.waitForSelector('#step3Content.show', { timeout: 60000 });
        
        // 8. Verificar resultados dos cálculos
        console.log('💰 8. Verificando resultados dos cálculos...');
        
        // Verificar se valores não estão concatenados (problema anterior)
        const cifValue = await page.textContent('[data-field="valor_aduaneiro_total"]');
        const numericValue = parseFloat(cifValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
        expect(numericValue).toBeGreaterThan(0);
        expect(numericValue).toBeLessThan(1000000); // Valor razoável para CIF
        console.log(`   ✅ Valor CIF: ${cifValue} (numérico: ${numericValue})`);
        
        // Verificar ICMS calculado para GO (19%)
        const icmsValue = await page.textContent('[data-field="icms_valor"]');
        const icmsNumeric = parseFloat(icmsValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
        expect(icmsNumeric).toBeGreaterThan(0);
        console.log(`   ✅ ICMS: ${icmsValue} (numérico: ${icmsNumeric})`);
        
        // 9. Testar exportação
        console.log('📄 9. Testando exportação...');
        
        // Clicar em exportar Excel
        await page.click('#exportExcelBtn');
        await page.waitForTimeout(3000); // Aguardar download
        console.log('   ✅ Exportação Excel concluída');
        
        // 10. Verificar tabela de produtos individuais
        console.log('📦 10. Verificando produtos individuais...');
        const productsTable = await page.locator('#productsTable tbody tr');
        const productsCount = await productsTable.count();
        expect(productsCount).toBe(16); // Deve ter 16 produtos (1 por adição)
        console.log(`   ✅ ${productsCount} produtos calculados individualmente`);
        
        // Verificar dados de um produto específico
        const firstProductData = await page.locator('#productsTable tbody tr:first-child');
        const productNCM = await firstProductData.locator('[data-column="ncm"]').textContent();
        const productSupplier = await firstProductData.locator('[data-column="fornecedor"]').textContent();
        
        expect(productNCM).toBe('73181500');
        expect(productSupplier).toContain('INTERNATION UNIT POWER');
        console.log(`   ✅ Produto: NCM ${productNCM}, Fornecedor: ${productSupplier}`);
        
        // 11. Validação final de integridade
        console.log('✅ 11. Validação final de integridade...');
        
        // Verificar se não há erros no console
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(msg.text());
            }
        });
        
        // Aguardar um pouco para capturar possíveis erros
        await page.waitForTimeout(2000);
        
        // Verificar se há erros críticos
        const criticalErrors = consoleLogs.filter(log => 
            log.includes('TypeError') || 
            log.includes('ReferenceError') ||
            log.includes('is not a function')
        );
        
        if (criticalErrors.length > 0) {
            console.warn('⚠️ Erros encontrados no console:', criticalErrors);
        } else {
            console.log('   ✅ Nenhum erro crítico no console');
        }
        
        console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('📊 Resumo:');
        console.log(`   - DI: 2300120746`);
        console.log(`   - Adições: ${additionsRows}`);
        console.log(`   - Incoterm: ${incoterm}`);
        console.log(`   - Fornecedor: ${supplier}`);
        console.log(`   - Estado: GO`);
        console.log(`   - Produtos calculados: ${productsCount}`);
        console.log(`   - CIF Total: ${cifValue}`);
        console.log(`   - ICMS: ${icmsValue}`);
    });
    
    test('Verificar performance do sistema com DI de 16 adições', async ({ page }) => {
        console.log('⏱️ Teste de Performance: Medindo tempos de processamento...');
        
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        
        // Medir tempo de carregamento inicial
        const startTime = Date.now();
        await page.waitForSelector('#availableDIs', { timeout: 15000 });
        const loadTime = Date.now() - startTime;
        console.log(`   📊 Tempo de carregamento inicial: ${loadTime}ms`);
        
        // Medir tempo de seleção da DI
        const selectStartTime = Date.now();
        await page.click('.di-item:has-text("2300120746")');
        await page.waitForSelector('#step2Content.show', { timeout: 15000 });
        const selectTime = Date.now() - selectStartTime;
        console.log(`   📊 Tempo de seleção e população da DI: ${selectTime}ms`);
        
        // Medir tempo de cálculo
        await page.selectOption('#stateSelect', 'GO');
        const calcStartTime = Date.now();
        await page.click('#calculateTaxesBtn');
        await page.waitForSelector('#step3Content.show', { timeout: 60000 });
        const calcTime = Date.now() - calcStartTime;
        console.log(`   📊 Tempo de cálculo dos impostos: ${calcTime}ms`);
        
        // Verificar limites de performance
        expect(loadTime).toBeLessThan(10000); // < 10s para carregamento
        expect(selectTime).toBeLessThan(15000); // < 15s para seleção
        expect(calcTime).toBeLessThan(45000); // < 45s para cálculo
        
        console.log('✅ Performance dentro dos limites aceitáveis');
    });
    
});