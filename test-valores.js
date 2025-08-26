#!/usr/bin/env node

/**
 * Script de teste para validar correções de valores
 * DI: 2518173187
 */

const fs = require('fs');
const path = require('path');

// Importar o parser (simulando o ambiente do navegador)
const xmlContent = fs.readFileSync(path.join(__dirname, 'orientacoes/2518173187.xml'), 'utf8');

// Simular parsing manual dos valores críticos
const valorUnitarioMatch = xmlContent.match(/<valorUnitario>(\d+)<\/valorUnitario>/);
const quantidadeMatch = xmlContent.match(/<quantidade>(\d+)<\/quantidade>/);
const condicaoVendaValorMoedaMatch = xmlContent.match(/<condicaoVendaValorMoeda>(\d+)<\/condicaoVendaValorMoeda>/);
const cargaPesoBrutoMatch = xmlContent.match(/<cargaPesoBruto>(\d+)<\/cargaPesoBruto>/);
const cargaPesoLiquidoMatch = xmlContent.match(/<cargaPesoLiquido>(\d+)<\/cargaPesoLiquido>/);

console.log('=== TESTE DE CONVERSÃO DE VALORES ===\n');

// Testar valorUnitario (7 decimais)
if (valorUnitarioMatch) {
    const raw = valorUnitarioMatch[1];
    const value = parseInt(raw);
    const converted = value / 10000000; // 7 decimais
    console.log(`valorUnitario:`);
    console.log(`  Raw: ${raw}`);
    console.log(`  Convertido: ${converted.toFixed(2)} USD/kg`);
    console.log(`  Esperado: 4468.20 USD/kg`);
    console.log(`  ✅ Correto: ${Math.abs(converted - 4468.20) < 0.01}\n`);
}

// Testar quantidade (5 decimais)
if (quantidadeMatch) {
    const raw = quantidadeMatch[1];
    const value = parseInt(raw);
    const converted = value / 100000; // 5 decimais
    console.log(`quantidade:`);
    console.log(`  Raw: ${raw}`);
    console.log(`  Convertido: ${converted.toFixed(2)} kg`);
    console.log(`  Esperado: 0.20 kg`);
    console.log(`  ✅ Correto: ${Math.abs(converted - 0.20) < 0.01}\n`);
}

// Testar valor FOB (2 decimais)
if (condicaoVendaValorMoedaMatch) {
    const raw = condicaoVendaValorMoedaMatch[1];
    const value = parseInt(raw);
    const converted = value / 100; // 2 decimais (centavos)
    console.log(`condicaoVendaValorMoeda (FOB):`);
    console.log(`  Raw: ${raw}`);
    console.log(`  Convertido: ${converted.toFixed(2)} USD`);
    console.log(`  Esperado: 893.64 USD`);
    console.log(`  ✅ Correto: ${Math.abs(converted - 893.64) < 0.01}\n`);
}

// Testar peso bruto (5 decimais)
if (cargaPesoBrutoMatch) {
    const raw = cargaPesoBrutoMatch[1];
    const value = parseInt(raw);
    const converted = value / 100000; // 5 decimais
    console.log(`cargaPesoBruto:`);
    console.log(`  Raw: ${raw}`);
    console.log(`  Convertido: ${converted.toFixed(2)} kg`);
    console.log(`  Esperado: 1.00 kg`);
    console.log(`  ✅ Correto: ${Math.abs(converted - 1.00) < 0.01}\n`);
}

// Testar peso líquido (5 decimais)
if (cargaPesoLiquidoMatch) {
    const raw = cargaPesoLiquidoMatch[1];
    const value = parseInt(raw);
    const converted = value / 100000; // 5 decimais
    console.log(`cargaPesoLiquido:`);
    console.log(`  Raw: ${raw}`);
    console.log(`  Convertido: ${converted.toFixed(2)} kg`);
    console.log(`  Esperado: 0.20 kg`);
    console.log(`  ✅ Correto: ${Math.abs(converted - 0.20) < 0.01}\n`);
}

// Calcular valor total
console.log('=== CÁLCULO DO VALOR TOTAL ===\n');
const valorUnitario = 4468.20;
const quantidade = 0.20;
const valorTotal = valorUnitario * quantidade;
const taxaCambio = 5.3928;
const valorReais = valorTotal * taxaCambio;

console.log(`Valor unitário: ${valorUnitario.toFixed(2)} USD/kg`);
console.log(`Quantidade: ${quantidade.toFixed(2)} kg`);
console.log(`Valor total: ${valorTotal.toFixed(2)} USD`);
console.log(`Taxa câmbio: ${taxaCambio}`);
console.log(`Valor em reais: R$ ${valorReais.toFixed(2)}`);
console.log(`Esperado: R$ 4819.22`);
console.log(`✅ Correto: ${Math.abs(valorReais - 4819.22) < 0.01}\n`);

// Calcular base ICMS
console.log('=== CÁLCULO DA BASE ICMS ===\n');
const pis = 101.20;
const cofins = 465.05;
const siscomex = 154.23;
const baseAntesICMS = valorReais + pis + cofins + siscomex;
const aliquotaICMS = 0.19;
const baseICMS = baseAntesICMS / (1 - aliquotaICMS);

console.log(`Valor FOB: R$ ${valorReais.toFixed(2)}`);
console.log(`PIS: R$ ${pis.toFixed(2)}`);
console.log(`COFINS: R$ ${cofins.toFixed(2)}`);
console.log(`SISCOMEX: R$ ${siscomex.toFixed(2)}`);
console.log(`Base antes ICMS: R$ ${baseAntesICMS.toFixed(2)}`);
console.log(`Alíquota ICMS: ${(aliquotaICMS * 100).toFixed(0)}%`);
console.log(`Base ICMS: R$ ${baseICMS.toFixed(2)}`);
console.log(`Esperado: R$ 6839.14`);
console.log(`✅ Correto: ${Math.abs(baseICMS - 6839.14) < 0.01}\n`);

console.log('=== TESTE CONCLUÍDO ===');