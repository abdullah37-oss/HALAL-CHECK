const config = window.halalAdminConfig;
const form = document.querySelector('#password-form');
const status = document.querySelector('#status');
const errorMessage = document.querySelector('#error');

function showError(message) {
  form.hidden = true;
  status.textContent = '';
  errorMessage.textContent = message;
}

async function initialize() {
  if (!config?.ready) {
    showError('Password setup is unavailable because this deployment is not configured.');
    return;
  }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    const client = createClient(config.value.url, config.value.key, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    const code = new URL(location.href).searchParams.get('code');
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        showError('This recovery link is invalid or has expired. Request a new password setup link.');
        return;
      }
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      showError('This recovery link is invalid or has expired. Request a new password setup link.');
      return;
    }
    history.replaceState(null, '', `${location.pathname}`);
    form.hidden = false;
    status.textContent = 'Recovery link verified. Choose a password of at least 12 characters.';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = document.querySelector('#new-password').value;
      const confirmation = document.querySelector('#confirm-password').value;
      errorMessage.textContent = '';
      if (password.length < 12 || password !== confirmation) {
        errorMessage.textContent = 'Use at least 12 characters and enter the same password twice.';
        return;
      }
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) {
          errorMessage.textContent = 'Unable to save your password. Request a fresh setup link and try again.';
          return;
        }
        status.textContent = 'Password saved. Returning to admin sign in...';
        form.reset();
        setTimeout(() => location.assign('/admin/'), 300);
      } catch {
        errorMessage.textContent = 'Unable to save your password. Check your connection and try again.';
      } finally {
        button.disabled = false;
      }
    });
  } catch {
    showError('Password setup could not be loaded. Check your connection and try again.');
  }
}

initialize();
