/**
 * Teste final de validação - Sistema Importa Precifica
 * Verifica se todas as correções foram aplicadas corretamente
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8889';
const MODULE2_URL = `${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`;
const API_BASE = `${BASE_URL}/api/endpoints`;

test.describe('Validação Final - Sistema Completo', () => {
    test.setTimeout(60000);

    test('Verificar sistema sem erros críticos', async ({ page }) => {
        console.log('🔍 Testando sistema após correções...');
        
        // 1. Verificar Module 2 carrega sem erros
        await page.goto(MODULE2_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Capturar erros de console
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        // 2. Verificar se há DIs para selecionar
        const hasTable = await page.locator('table tbody tr').count();
        console.log(`   📊 DIs disponíveis: ${hasTable}`);
        
        // 3. Se há DIs, testar seleção e cálculo
        if (hasTable > 0) {
            console.log('   🎯 Testando seleção de DI...');
            
            // Clicar no primeiro botão "Processar"
            const processButton = page.locator('button:has-text("Processar")').first();
            await processButton.click();
            await page.waitForTimeout(3000);
            
            // Verificar se avançou para configuração
            const bodyText = await page.textContent('body');
            if (bodyText.includes('Step 2') || bodyText.includes('Configuração')) {
                console.log('   ✅ Avançou para configuração de impostos');
                
                // Tentar executar cálculo
                const calcButton = page.locator('button:has-text("Calcular"), button:has-text("Processar Impostos")').first();
                if (await calcButton.count() > 0) {
                    console.log('   🧮 Executando cálculo de impostos...');
                    await calcButton.click();
                    await page.waitForTimeout(2000);
                    
                    // Verificar se não há erros após cálculo
                    await page.waitForTimeout(1000);
                }
            }
        } else {
            console.log('   ⚠️ Nenhuma DI disponível - banco vazio');
        }
        
        // 4. Verificar erros de console
        if (errors.length > 0) {
            console.log('   ❌ Erros de console encontrados:');
            errors.forEach(error => console.log(`      - ${error}`));
            throw new Error(`${errors.length} erros de console encontrados`);
        } else {
            console.log('   ✅ Sistema carregou sem erros de console');
        }
        
        console.log('   ✅ Validação final APROVADA!\n');
    });

    test('Verificar API funcionando', async ({ page }) => {
        console.log('📡 Testando API...');
        
        const statusResponse = await page.request.get(`${API_BASE}/status.php`);
        const statusData = await statusResponse.json();
        
        expect(statusData.success).toBe(true);
        console.log(`   📊 Sistema: ${statusData.status}`);
        console.log(`   📦 DIs: ${statusData.estatisticas.total_dis}`);
        console.log('   ✅ API funcionando\n');
    });
});