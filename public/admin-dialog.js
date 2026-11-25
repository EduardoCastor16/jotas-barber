const adminDialog = document.getElementById('adminDialog');
const dialogForm = adminDialog.querySelector('form');
const dialogAmount = dialogForm.elements.amount;

function showAdminDialog({ title, message, action, amount }) {
  if (adminDialog.open) return Promise.resolve(null);

  adminDialog.querySelector('h2').textContent = title;
  adminDialog.querySelector('p').textContent = message;
  const cancel = dialogForm.querySelector('[data-cancel]');
  const submit = dialogForm.querySelector('[type="submit"]');
  submit.textContent = action;
  dialogAmount.closest('label').hidden = amount === undefined;
  dialogAmount.disabled = amount === undefined;
  dialogAmount.value = amount === undefined ? '' : String(amount).replace('.', ',');
  const trigger = document.activeElement;
  let result = null;

  return new Promise(resolve => {
    dialogForm.onsubmit = event => {
      event.preventDefault();
      result = dialogAmount.disabled ? true : dialogAmount.value;
      adminDialog.close();
    };
    cancel.onclick = () => adminDialog.close();
    adminDialog.addEventListener('close', () => {
      if (trigger?.isConnected) trigger.focus();
      resolve(result);
    }, { once: true });
    adminDialog.showModal();
    if (dialogAmount.disabled) {
      cancel.focus();
    } else {
      dialogAmount.focus();
      dialogAmount.select();
    }
  });
}
