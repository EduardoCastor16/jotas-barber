# Barbearia do Jota's

Interface adaptada do repositório `barbearia-agendamento-modelo`, com seleção de serviços, referências fotográficas, etapas de reserva e consulta de agendamentos.

## Segurança e ativação

O projeto NÃO usa a planilha, a agenda, o telefone ou o segredo do barbeiro anterior. Configure um Google Apps Script e uma planilha exclusivos do Jota antes de liberar agendamentos reais.

1. Crie uma planilha exclusiva com abas compatíveis com `apps-script/Code.gs`.
2. Substitua `CONFIGURE_A_PLANILHA_DO_JOTA` pelo ID da planilha no Apps Script e implante-o na conta autorizada do Jota.
3. Configure `APPS_SCRIPT_URL` como variável do Worker e `API_SECRET` como segredo, usando o mesmo valor nas propriedades do Apps Script.
4. Verifique as regras do Pix e a aprovação manual antes de ativar reservas. O backend importado do modelo confirma reservas imediatamente e NÃO implementa aprovação de sinal; portanto não deve ser ativado sem adaptação.

## Publicação

`npm install && npm run build`, depois `npx wrangler deploy`.

## Estado

Fluxo visual e botões do modelo integrados; agendamento real desabilitado até a configuração e revisão do backend. Painel ADMIN com autenticação e aprovação de Pix ainda não implementado.

## Conta Google de referência

Conta informada pelo proprietário para a integração: `Thiaghosts333@gmail.com`.

**Importante:** o endereço de e-mail identifica a conta pretendida, mas não concede acesso à agenda. O titular precisa autorizar o Apps Script/OAuth com essa conta; até lá, não existe sincronização ativa. Não colocar tokens, senhas ou chaves no repositório.


## Atualização de novembro de 2026

- Interface redesenhada em preto, branco e cinza, com logo original transparente.
- Painel administrativo em `/admin.html`, com sessão assinada HMAC em cookie HttpOnly/Secure/SameSite e listagem/aprovação/rejeição de solicitações.
- Script Apps Script com ações `admin-list`, `admin-approve` e `admin-reject`; somente a API do Worker deve enviar `API_SECRET`.
- Planilha real: `1MWCe2Nlxwy-DphNaYL7jdS3bGBw7sDAkzCpuFXmjnc4`.
- Agenda específica do Jota configurada na aba `Configuracoes`.
- A criação de reservas segue **desabilitada** por padrão no Worker. Para liberar, configure `BOOKING_ENABLED=true` somente após conferir Pix, disponibilidade, horário e integração.

### Implantação pendente

1. Executar `testarIntegracao` no Apps Script com a conta da agência que possui acesso à agenda.
2. Implantar Apps Script como web app executado pelo proprietário, com acesso externo; cadastrar `API_SECRET` em Script Properties.
3. No Cloudflare Worker, cadastrar `APPS_SCRIPT_URL` e `API_SECRET` (segredos), além de `ADMIN_SECRET` (senha administrativa forte e diferente do segredo da API).
4. Configurar proteção contra tentativas de login (rate limiting/WAF) no Cloudflare antes de abrir o painel ao público.
5. Validar os serviços com preços e durações ausentes, horários de funcionamento, WhatsApp, chave Pix, valor do sinal, política de cancelamento e tempo de expiração de pedidos pendentes.
6. Testar ponta a ponta em ambiente de testes: consulta, solicitação, pagamento manual, aprovação, criação do evento e rejeição.
7. Somente após testes, definir `BOOKING_ENABLED=true` e publicar.

### Limitações atuais

- Não há login/cadastro de clientes; consulta individual é por nome, WhatsApp e código de reserva.
- Não há upload de comprovante; a confirmação manual é realizada após verificação externa do pagamento pelo Jota.
- Não há cancelamento automático, política de reembolso, expiração de pendências nem notificações automáticas.
- O painel ADMIN foi implementado no código, mas ainda não foi testado com o Apps Script implantado.
- O script ainda não foi implantado na conta Google; não afirmar que o site está integrado.

<!-- redeploy: verificar vínculo de segredos do Worker com implantação ativa; 2026-11-14 -->
