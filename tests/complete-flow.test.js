const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sistema Completo - Importação até Exportação', () => {
    test.setTimeout(120000); // 2 minutos para todo o teste

    test('Fluxo completo: limpar banco → importar → processar → calcular → exportar', async ({ page }) => {
        console.log('🚀 Iniciando teste completo do sistema...');
        
        // Configurar listeners para capturar erros do console
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.log('❌ Console Error:', msg.text());
            }
        });

        // ========================================
        // ETAPA 1: LIMPAR BANCO DE DADOS
        // ========================================
        console.log('\n📋 ETAPA 1: Limpando banco de dados...');
        
        await page.goto('http://localhost:8889/sistema-expertzy-local/xml-import/import-dashboard.html');
        await page.waitForLoadState('networkidle');
        
        // Clicar no botão de limpar banco
        const clearButton = page.locator('button:has-text("Limpar Banco")');
        if (await clearButton.isVisible()) {
            await clearButton.click();
            
            // Confirmar limpeza
            await page.waitForSelector('.swal2-confirm', { state: 'visible' });
            await page.click('.swal2-confirm');
            
            // Aguardar confirmação de sucesso
            await page.waitForSelector('.swal2-success', { timeout: 5000 });
            await page.click('.swal2-confirm');
            
            console.log('✅ Banco de dados limpo com sucesso');
        }

        // ========================================
        // ETAPA 2: IMPORTAR XMLs
        // ========================================
        console.log('\n📋 ETAPA 2: Importando arquivos XML...');
        
        // Arquivo 1: 2518173187.xml
        const xmlFile1 = path.join(__dirname, '..', 'orientacoes', '2518173187.xml');
        await page.locator('#dropZone').click();
        await page.setInputFiles('input[type="file"]', xmlFile1);
        
        // Aguardar processamento
        await page.waitForSelector('.file-item.success', { timeout: 10000 });
        console.log('✅ XML 1 (2518173187) importado');
        
        // Arquivo 2: 2300120746.xml
        const xmlFile2 = path.join(__dirname, '..', 'orientacoes', '2300120746.xml');
        await page.locator('#dropZone').click();
        await page.setInputFiles('input[type="file"]', xmlFile2);
        
        // Aguardar processamento
        await page.waitForSelector('.file-item.success:nth-of-type(2)', { timeout: 10000 });
        console.log('✅ XML 2 (2300120746) importado');
        
        // Aguardar um pouco para garantir que os dados foram salvos
        await page.waitForTimeout(2000);

        // ========================================
        // ETAPA 3: NAVEGAR PARA PROCESSADOR DI
        // ========================================
        console.log('\n📋 ETAPA 3: Acessando processador de DI...');
        
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        
        // Aguardar sistema carregar
        await page.waitForSelector('#step1', { state: 'visible', timeout: 10000 });
        
        // Clicar em "Carregar do Banco"
        await page.click('button:has-text("Carregar do Banco")');
        
        // Aguardar modal aparecer e DIs carregarem
        await page.waitForSelector('#modalBancoDados', { state: 'visible' });
        await page.waitForSelector('.di-list-item', { state: 'visible', timeout: 10000 });
        
        console.log('✅ Lista de DIs carregada do banco');

        // ========================================
        // ETAPA 4: SELECIONAR E PROCESSAR DI
        // ========================================
        console.log('\n📋 ETAPA 4: Selecionando DI para processamento...');
        
        // Selecionar a primeira DI (2300120746 - com 16 adições)
        await page.click('button[onclick*="selectDIForProcessing"]:first-of-type');
        
        // Aguardar navegação para Step 2
        await page.waitForSelector('#step2:not(.d-none)', { timeout: 10000 });
        
        // Verificar se dados foram populados
        const diNumber = await page.textContent('#diNumber');
        expect(diNumber).not.toBe('N/A');
        console.log(`✅ DI ${diNumber} carregada e interface populada`);

        // ========================================
        // ETAPA 5: CONFIGURAR DESPESAS E CALCULAR
        // ========================================
        console.log('\n📋 ETAPA 5: Configurando despesas e calculando impostos...');
        
        // Adicionar algumas despesas extras
        await page.fill('#armazenagem_extra', '500');
        await page.fill('#transporte_interno', '1200');
        await page.fill('#despachante', '800');
        
        // Selecionar estado (GO para teste)
        await page.selectOption('#estadoDestino', 'GO');
        
        // Calcular impostos
        await page.click('button:has-text("Calcular Impostos")');
        
        // Aguardar cálculo completar e navegar para Step 3
        await page.waitForSelector('#step3:not(.d-none)', { timeout: 15000 });
        
        // Verificar se resultados foram exibidos
        const totalImpostos = await page.textContent('#totalImpostos');
        expect(totalImpostos).toBeTruthy();
        console.log(`✅ Impostos calculados: ${totalImpostos}`);

        // ========================================
        // ETAPA 6: EXPORTAR CROQUI NF
        // ========================================
        console.log('\n📋 ETAPA 6: Exportando croqui da nota fiscal...');
        
        // Clicar no botão de exportar croqui
        const exportButton = page.locator('button:has-text("Exportar Croqui NF")');
        
        if (await exportButton.isVisible()) {
            // Configurar listener para download
            const downloadPromise = page.waitForEvent('download');
            
            await exportButton.click();
            
            // Aguardar download
            const download = await downloadPromise;
            const fileName = download.suggestedFilename();
            
            expect(fileName).toContain('croqui_nf');
            expect(fileName).toContain('.xlsx');
            
            console.log(`✅ Croqui exportado: ${fileName}`);
        } else {
            console.log('⚠️  Botão de exportar croqui não encontrado');
        }

        // ========================================
        // ETAPA 7: VERIFICAR LOGS
        // ========================================
        console.log('\n📋 ETAPA 7: Verificando logs do sistema...');
        
        // Voltar para dashboard de importação para ver logs
        await page.goto('http://localhost:8889/sistema-expertzy-local/xml-import/import-dashboard.html');
        await page.waitForLoadState('networkidle');
        
        // Exportar log se disponível
        const logButton = page.locator('button:has-text("Exportar Log")');
        if (await logButton.isVisible()) {
            await logButton.click();
            console.log('✅ Log do sistema exportado');
        }

        // ========================================
        // VERIFICAÇÃO FINAL
        // ========================================
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        
        if (consoleErrors.length > 0) {
            console.log(`⚠️  ${consoleErrors.length} erros encontrados no console:`);
            consoleErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.substring(0, 100)}...`);
            });
        } else {
            console.log('✅ Nenhum erro no console!');
        }
        
        // Assert que não há erros críticos
        const criticalErrors = consoleErrors.filter(e => 
            e.includes('TypeError') || 
            e.includes('ReferenceError') ||
            e.includes('cannot be null')
        );
        
        if (criticalErrors.length > 0) {
            console.log('\n❌ ERROS CRÍTICOS ENCONTRADOS:');
            criticalErrors.forEach(error => console.log(`   - ${error}`));
            throw new Error(`${criticalErrors.length} erros críticos encontrados`);
        }
        
        console.log('\n🎉 TESTE COMPLETO EXECUTADO COM SUCESSO!');
    });
});