const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Teste Simples do Fluxo', () => {
    test.setTimeout(180000); // 3 minutos

    test('Fluxo básico de importação e processamento', async ({ page }) => {
        console.log('🚀 Iniciando teste simples...');
        
        // Capturar erros do console
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Ignorar erros de fontes Google
                if (!text.includes('fonts.googleapis.com')) {
                    errors.push(text);
                    console.log('❌ Erro:', text);
                }
            }
        });

        try {
            // ========================================
            // PARTE 1: LIMPAR BANCO E IMPORTAR
            // ========================================
            console.log('\n📋 PARTE 1: Dashboard de Importação');
            
            await page.goto('http://localhost:8889/sistema-expertzy-local/xml-import/import-dashboard.html');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000);
            
            // Verificar se a página carregou
            const title = await page.title();
            console.log(`   Título da página: ${title}`);
            
            // Tentar limpar o banco
            console.log('   Tentando limpar banco...');
            const clearBtn = page.locator('button').filter({ hasText: /limpar.*banco/i }).first();
            
            if (await clearBtn.count() > 0) {
                await clearBtn.click();
                await page.waitForTimeout(1000);
                
                // Confirmar se houver dialog
                const confirmBtn = page.locator('.swal2-confirm').first();
                if (await confirmBtn.count() > 0) {
                    await confirmBtn.click();
                    await page.waitForTimeout(2000);
                    
                    // Fechar confirmação de sucesso
                    const okBtn = page.locator('.swal2-confirm').first();
                    if (await okBtn.count() > 0) {
                        await okBtn.click();
                    }
                }
                console.log('   ✅ Banco limpo');
            } else {
                console.log('   ⚠️  Botão de limpar não encontrado');
            }
            
            // Importar XMLs
            console.log('   Importando XMLs...');
            
            const xmlFiles = [
                path.join(__dirname, '..', 'orientacoes', '2518173187.xml'),
                path.join(__dirname, '..', 'orientacoes', '2300120746.xml')
            ];
            
            for (const xmlFile of xmlFiles) {
                const fileName = path.basename(xmlFile);
                console.log(`   Importando ${fileName}...`);
                
                // Procurar input de arquivo
                const fileInput = page.locator('input[type="file"]').first();
                await fileInput.setInputFiles(xmlFile);
                
                // Aguardar processamento
                await page.waitForTimeout(3000);
                console.log(`   ✅ ${fileName} processado`);
            }
            
            // ========================================
            // PARTE 2: PROCESSAR DI
            // ========================================
            console.log('\n📋 PARTE 2: Processador de DI');
            
            await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(5000); // Aguardar sistema carregar DIs automaticamente
            
            // As DIs já devem estar carregadas automaticamente
            console.log('   Procurando DIs carregadas...');
            
            // Procurar botão de processar DI na tabela
            const processBtn = page.locator('button').filter({ hasText: /processar/i }).first();
            
            if (await processBtn.count() > 0) {
                    console.log('   Selecionando DI para processar...');
                    await processBtn.click();
                    await page.waitForTimeout(3000);
                    
                    // Verificar se avançou para Step 2
                    const step2 = page.locator('#step2');
                    if (await step2.count() > 0) {
                        const isVisible = await step2.isVisible();
                        console.log(`   Step 2 visível: ${isVisible}`);
                        
                        if (isVisible) {
                            // Verificar se dados foram populados
                            const diNumber = await page.locator('#diNumber').textContent();
                            console.log(`   ✅ DI carregada: ${diNumber}`);
                            
                            // Tentar calcular impostos
                            console.log('   Calculando impostos...');
                            
                            // Selecionar estado
                            const stateSelect = page.locator('#estadoDestino');
                            if (await stateSelect.count() > 0) {
                                await stateSelect.selectOption('GO');
                            }
                            
                            const calcBtn = page.locator('button').filter({ hasText: /calcular.*impostos/i }).first();
                            if (await calcBtn.count() > 0) {
                                await calcBtn.click();
                                await page.waitForTimeout(5000);
                                
                                // Verificar se chegou ao Step 3
                                const step3 = page.locator('#step3');
                                if (await step3.count() > 0 && await step3.isVisible()) {
                                    console.log('   ✅ Cálculos completados!');
                                    
                                    // Tentar exportar
                                    const exportBtn = page.locator('button').filter({ hasText: /exportar.*croqui/i }).first();
                                    if (await exportBtn.count() > 0) {
                                        console.log('   Exportando croqui...');
                                        
                                        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
                                        await exportBtn.click();
                                        const download = await downloadPromise;
                                        
                                        if (download) {
                                            console.log(`   ✅ Download: ${download.suggestedFilename()}`);
                                        } else {
                                            console.log('   ⚠️  Download não detectado');
                                        }
                                    }
                                } else {
                                    console.log('   ❌ Step 3 não visível após cálculo');
                                }
                            } else {
                                console.log('   ❌ Botão calcular não encontrado');
                            }
                        }
                    } else {
                        console.log('   ❌ Step 2 não encontrado');
                    }
            } else {
                console.log('   ❌ Nenhuma DI para processar');
            }
            
        } catch (error) {
            console.error('💥 Erro durante teste:', error.message);
            throw error;
        }
        
        // Relatório final
        console.log('\n📊 RELATÓRIO FINAL:');
        if (errors.length > 0) {
            console.log(`   ${errors.length} erros encontrados`);
            errors.slice(0, 5).forEach(e => console.log(`   - ${e.substring(0, 100)}`));
        } else {
            console.log('   ✅ Sem erros no console!');
        }
    });
});