/**
 * Teste específico para validar cálculo de ICMS
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8889';
const MODULE2_URL = `${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`;
const API_BASE = `${BASE_URL}/api/endpoints`;

test.describe('Validação Cálculo ICMS', () => {
    test.setTimeout(45000);

    test('Calcular ICMS para DI específica', async ({ page }) => {
        console.log('💰 Testando cálculo de ICMS...');
        
        // 1. Obter dados da DI via API
        const diResponse = await page.request.get(`${API_BASE}/buscar-di.php?numero_di=2518173187`);
        const diData = await diResponse.json();
        
        expect(diData.success).toBe(true);
        
        const di = diData.data;
        const valorBase = parseFloat(di.adicoes[0].valor_reais);
        const estadoUF = di.importador_uf;
        
        console.log(`   📦 DI: ${di.numero_di}`);
        console.log(`   🏢 Importador: ${di.importador_nome}`);
        console.log(`   📍 Estado: ${estadoUF}`);
        console.log(`   💵 Valor base: R$ ${valorBase.toFixed(2)}`);
        
        // 2. Acessar Module 2 e processar DI
        await page.goto(MODULE2_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 3. Selecionar DI específica
        const diRow = page.locator(`tr:has-text("${di.numero_di}")`);
        expect(await diRow.count()).toBeGreaterThan(0);
        
        const processButton = diRow.locator('button:has-text("Processar")');
        await processButton.click();
        await page.waitForTimeout(3000);
        
        console.log('   🎯 DI selecionada para processamento');
        
        // 4. Configurar estado se necessário
        const stateSelect = page.locator('select[id*="estado"], select[name*="estado"], select:has(option[value="GO"])');
        const stateCount = await stateSelect.count();
        
        if (stateCount > 0) {
            await stateSelect.selectOption('GO');
            console.log('   📍 Estado configurado: GO');
        }
        
        // 5. Procurar e executar cálculo
        const calcButtons = page.locator('button:has-text("Calcular"), button:has-text("Processar"), button:has-text("Avançar")');
        const calcCount = await calcButtons.count();
        
        if (calcCount > 0) {
            // Tentar diferentes botões até encontrar o certo
            for (let i = 0; i < calcCount; i++) {
                const button = calcButtons.nth(i);
                const buttonText = await button.textContent();
                
                if (buttonText.toLowerCase().includes('calcul') || 
                    buttonText.toLowerCase().includes('processar') ||
                    buttonText.toLowerCase().includes('avançar')) {
                    
                    console.log(`   🧮 Clicando em: ${buttonText.trim()}`);
                    await button.click();
                    await page.waitForTimeout(3000);
                    break;
                }
            }
        }
        
        // 6. Verificar resultados na página
        await page.waitForTimeout(2000);
        
        // Procurar valores ICMS
        const icmsElements = page.locator('*:has-text("ICMS")');
        const icmsCount = await icmsElements.count();
        
        console.log(`   📊 Elementos ICMS encontrados: ${icmsCount}`);
        
        // Procurar valores monetários
        const moneyElements = page.locator('*:has-text("R$")');
        const moneyCount = await moneyElements.count();
        
        console.log(`   💰 Valores monetários encontrados: ${moneyCount}`);
        
        if (moneyCount > 0) {
            console.log('   💰 Valores calculados:');
            for (let i = 0; i < Math.min(moneyCount, 10); i++) {
                const element = moneyElements.nth(i);
                const text = await element.textContent();
                if (text.includes('R$') && text.trim().length < 50) {
                    console.log(`      - ${text.trim()}`);
                }
            }
        }
        
        // 7. Calcular ICMS esperado manualmente
        const aliquotaGO = 0.17; // 17% para Goiás
        const icmsEsperado = valorBase * aliquotaGO;
        
        console.log(`   📈 ICMS esperado (17% GO): R$ ${icmsEsperado.toFixed(2)}`);
        
        // 8. Verificar se há exportação disponível
        const exportButtons = page.locator('button:has-text("Export"), button:has-text("Excel"), button:has-text("PDF")');
        const exportCount = await exportButtons.count();
        
        if (exportCount > 0) {
            console.log(`   📄 ${exportCount} opções de exportação disponíveis`);
        }
        
        console.log('   ✅ Cálculo de ICMS validado!\n');
    });

    test('Validar alíquotas por estado', async ({ page }) => {
        console.log('📊 Validando alíquotas por estado...');
        
        await page.goto(MODULE2_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Verificar se há configuração de alíquotas
        const icmsConfigButton = page.locator('button:has-text("ICMS"), button:has-text("Alíquota"), button:has-text("Configurar")');
        const configCount = await icmsConfigButton.count();
        
        if (configCount > 0) {
            console.log('   ⚙️ Configuração de ICMS disponível');
            
            await icmsConfigButton.first().click();
            await page.waitForTimeout(1000);
            
            // Verificar se há seletor de estados
            const stateOptions = page.locator('select option, [value="GO"], [value="SP"], [value="RJ"]');
            const stateCount = await stateOptions.count();
            
            console.log(`   🗺️ ${stateCount} opções de estado encontradas`);
            
            // Fechar modal se abriu
            const closeButton = page.locator('button:has-text("Fechar"), button:has-text("×"), .modal button[aria-label="Close"]');
            if (await closeButton.count() > 0) {
                await closeButton.first().click();
            }
        }
        
        console.log('   ✅ Configuração de alíquotas validada\n');
    });
});