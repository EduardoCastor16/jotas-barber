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
