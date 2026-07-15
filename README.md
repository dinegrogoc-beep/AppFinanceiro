# AppFinanceiro — FrotaControl

Aplicativo (PWA) que controla gastos e manutenção da frota de caminhões.

## O que já tem

- **Caminhões**: placa, chassi, modelo, ano, km atual, motorista vinculado
- **Motoristas**: nome e contato
- **Manutenção por km/data**: pneu, óleo, filtro de óleo, filtro de ar, revisão, borracharia, lavagem, outros — cada registro guarda a data e o km da troca, e um intervalo (em km e/ou dias) para o próximo serviço. O app calcula automaticamente o status: **Em dia**, **Atenção** (perto do limite) ou **Trocar agora**.
- **Viagens (fechamento de caixa)**: valor do frete, % de repasse ao motorista, despesas por categoria (combustível, pedágio, carga/descarga, peças, conserto, etc.) e saldo calculado automaticamente.
- **Dashboard**: saldo geral da frota e alerta mais urgente de cada caminhão.

Os dados ficam salvos localmente no navegador (IndexedDB) — não precisa de servidor nem internet depois de carregado.

## Rodando localmente

```bash
npm install
npm run dev
```

## Instalando no iPhone

1. Suba o app em algum host estático (Vercel, Netlify, GitHub Pages, etc.) com `npm run build` gerando a pasta `dist`.
2. Abra o link no Safari do iPhone.
3. Toque em **Compartilhar → Adicionar à Tela de Início**.

Isso instala como um app normal, com ícone próprio, sem precisar de conta de desenvolvedor Apple nem passar pela App Store.
