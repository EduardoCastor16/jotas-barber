const clientAccessForm = document.getElementById('clientAccessForm');
const clientAccessResult = document.getElementById('clientAccessResult');
const clientPhoneInput = clientAccessForm.elements.phone;
const clientActions = clientAccessForm.querySelectorAll('[value="verify"], [value="reset"]');
const setClientActionsEnabled = enabled => clientActions.forEach(button => { button.disabled = !enabled });

let selectedClient;
clientPhoneInput.addEventListener('input', () => {
  selectedClient = undefined;
  setClientActionsEnabled(false);
  clientAccessResult.textContent = '';
});

clientAccessForm.addEventListener('submit', async event => {
  event.preventDefault();
  const operation = event.submitter?.value || 'find';
  const enteredPhone = clientPhoneInput.value;
  let phone = enteredPhone.replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) phone = '55' + phone;

  if (operation !== 'find') {
    if (selectedClient?.phone !== phone) return;
    if (!confirm('Você confirmou a identidade de ' + selectedClient.name + '?')) return;
  }

  const actions = { find: 'find', verify: 'verify', reset: 'access' };
  const buttons = clientAccessForm.querySelectorAll('button');
  buttons.forEach(button => { button.disabled = true });
  clientAccessResult.textContent = '';
  try {
    const response = await fetch('/api/admin-client-' + actions[operation], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const result = await response.json();
    if (clientPhoneInput.value !== enteredPhone) return;
    if (!result.ok) throw Error(result.error);

    if (operation === 'find') {
      selectedClient = result;
      clientAccessResult.textContent = result.name + ' | +' + result.phone +
        (result.verified ? ' | WhatsApp confirmado' : ' | WhatsApp pendente');
    } else if (operation === 'verify') {
      clientAccessResult.textContent = 'Telefone verificado para ' + selectedClient.name + '.';
    } else {
      clientAccessResult.textContent = 'Senha temporária de ' + selectedClient.name + ' para +' + phone +
        ' — ' + result.code + ' | Entregue somente ao cliente.';
    }
  } catch (error) {
    if (clientPhoneInput.value === enteredPhone) {
      if (operation === 'find') selectedClient = undefined;
      clientAccessResult.textContent = error.message;
    }
  } finally {
    clientAccessForm.querySelector('[value="find"]').disabled = false;
    setClientActionsEnabled(selectedClient?.phone === phone && clientPhoneInput.value === enteredPhone);
  }
});
