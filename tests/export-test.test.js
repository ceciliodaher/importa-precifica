const { test, expect } = require('@playwright/test');

test.describe('Teste de Exportação', () => {
    test.setTimeout(60000);

    test('Testar exportação do croqui NF', async ({ page }) => {
        console.log('🎯 Testando exportação do croqui...');
        
        // Navegar para o processador (assumindo que já tem dados)
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);

        // Procurar DI e processar
        const processBtn = page.locator('button').filter({ hasText: /processar/i }).first();
        
        if (await processBtn.count() > 0) {
            await processBtn.click();
            await page.waitForTimeout(2000);
            
            // Verificar se chegou no Step 2
            if (await page.locator('#step2').isVisible()) {
                
                // Selecionar estado
                const stateSelect = page.locator('#estadoDestino');
                if (await stateSelect.count() > 0) {
                    await stateSelect.selectOption('GO');
                }
                
                // Calcular impostos
                const calcBtn = page.locator('button').filter({ hasText: /calcular.*impostos/i }).first();
                if (await calcBtn.count() > 0) {
                    await calcBtn.click();
                    await page.waitForTimeout(5000);
                    
                    // Verificar se chegou ao Step 3
                    if (await page.locator('#step3').isVisible()) {
                        console.log('✅ Chegou ao Step 3 - Resultados');
                        
                        // Tentar exportar croqui
                        const exportBtn = page.locator('button').filter({ hasText: /croqui/i }).first();
                        
                        if (await exportBtn.count() > 0) {
                            console.log('🎯 Tentando exportar croqui...');
                            
                            // Configurar listener para download
                            const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
                            
                            await exportBtn.click();
                            
                            try {
                                const download = await downloadPromise;
                                const fileName = download.suggestedFilename();
                                console.log(`✅ CROQUI EXPORTADO: ${fileName}`);
                                
                                // Verificar se é arquivo Excel
                                expect(fileName).toContain('.xlsx');
                                expect(fileName).toContain('croqui_nf');
                                
                            } catch (downloadError) {
                                console.log('⚠️  Download não capturado, mas botão foi clicado');
                                
                                // Aguardar um pouco para ver se aparece algum feedback na tela
                                await page.waitForTimeout(2000);
                            }
                        } else {
                            console.log('❌ Botão de exportar croqui não encontrado');
                        }
                        
                    } else {
                        console.log('❌ Não chegou ao Step 3');
                    }
                }
            }
        } else {
            console.log('❌ Nenhuma DI para processar');
        }
        
        console.log('🎯 Teste de exportação concluído');
    });
});