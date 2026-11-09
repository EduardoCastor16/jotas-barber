# Barbearia do Jota's

Aplicativo web de agendamentos com área de clientes e painel administrativo, em desenvolvimento.

## Executar localmente

```bash
npm install
npm run dev
```

## Cloudflare Pages

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

## Estado atual

A versão inicial é uma interface de apresentação. Ainda **não** oferece cadastro, agendamentos, autenticação, Pix ou notificações. A rota `/admin` é apenas uma tela informativa e não exibe dados privados.

## Regras previstas

- Um barbeiro e múltiplos clientes com login.
- Agendamento a partir do dia seguinte, em intervalos de 15 minutos e com duração por serviço.
- Sinal Pix enviado para chave definida pelo Jota; comprovante via WhatsApp.
- Conferência manual do recebimento e aprovação pelo administrador.
- Nenhum pagamento integrado e nenhum produto à venda.
- Serviços, valores e horários administráveis pelo Jota.

**Segurança:** não adicionar credenciais, chaves Pix privadas, dados pessoais ou segredos ao repositório. O backend deve validar autenticação, autorização, disponibilidade e transições de status antes de liberar agendamentos reais.
