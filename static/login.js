const form = document.querySelector('#login-form');
const password = document.querySelector('#password');
const error = document.querySelector('#login-error');
const submit = document.querySelector('#login-submit');
const toggle = document.querySelector('#toggle-password');

toggle.addEventListener('click', () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  toggle.textContent = visible ? 'Ukryj' : 'Pokaż';
  toggle.setAttribute('aria-label', visible ? 'Ukryj hasło' : 'Pokaż hasło');
  toggle.setAttribute('aria-pressed', String(visible));
});

document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', () => {
    const admin = button.dataset.demo === 'admin';
    form.elements.email.value = admin ? 'anna@cityreport.local' : 'jan@cityreport.local';
    password.value = admin ? 'CityReportAdmin123!' : 'CityReport123!';
    error.hidden = true;
    submit.focus();
  });
});

form.addEventListener('input', () => { error.hidden = true; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  error.hidden = true;
  submit.disabled = true;
  submit.textContent = 'Logowanie…';
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.elements.email.value.trim(), password: password.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się zalogować. Spróbuj ponownie.');
    window.location.replace('/');
  } catch (failure) {
    error.textContent = failure instanceof TypeError ? 'Nie można połączyć się z serwerem. Spróbuj ponownie.' : failure.message;
    error.hidden = false;
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Zaloguj się <span aria-hidden="true">→</span>';
    form.removeAttribute('aria-busy');
  }
});
