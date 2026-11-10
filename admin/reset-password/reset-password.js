const config = window.halalAdminConfig;
const form = document.querySelector('#password-form');
const status = document.querySelector('#status');
const errorMessage = document.querySelector('#error');

function showError(message) {
  form.reset();
  history.replaceState(null, '', location.pathname);
  form.hidden = true;
  status.textContent = '';
  errorMessage.textContent = message;
}

async function initialize() {
  // Only an incoming recovery callback may unlock this form. A stored sign-in
  // session alone must never make an expired or previously used link look valid.
  const callback = new URLSearchParams(location.hash.slice(1));
  const recoveryCallback = callback.get('type') === 'recovery'
    && callback.has('access_token') && callback.has('refresh_token')
    && !callback.has('error') && !callback.has('error_code')
    && !new URL(location.href).searchParams.has('code');
  if (!recoveryCallback) {
    history.replaceState(null, '', location.pathname);
    showError('This recovery link is invalid or has expired. Request a new password setup link.');
    return;
  }
  if (!config?.ready) {
    showError('Password setup is unavailable because this deployment is not configured.');
    return;
  }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    const client = createClient(config.value.url, config.value.key, {
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    // The SDK consumes the callback exactly once. Inspect initialization errors
    // before getSession, which could otherwise return an older stored session.
    const { error: callbackError } = await client.auth.initialize();
    history.replaceState(null, '', location.pathname);
    if (callbackError) {
      showError('This recovery link is invalid or has expired. Request a new password setup link.');
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session || data.session.expires_at <= Date.now() / 1000) {
      showError('This recovery link is invalid or has expired. Request a new password setup link.');
      return;
    }
    const { data: verified, error: verificationError } = await client.auth.getUser();
    if (verificationError || !verified.user || verified.user.id !== data.session.user.id) {
      showError('This recovery link is invalid or has expired. Request a new password setup link.');
      return;
    }
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
          if ([401, 403].includes(updateError.status)) {
            form.reset();
            showError('This recovery link is invalid or has expired. Request a new password setup link.');
          } else {
            errorMessage.textContent = 'Unable to save your password. Request a fresh setup link and try again.';
          }
          return;
        }
        form.reset();
        form.hidden = true;
        try { await client.auth.signOut({ scope: 'local' }); } catch { /* The password was saved; keep the form closed. */ }
        status.textContent = 'Password saved. Returning to admin sign in...';
        setTimeout(() => location.assign('/admin/'), 300);
      } catch {
        errorMessage.textContent = 'Unable to save your password. Check your connection and try again.';
      } finally {
        button.disabled = false;
      }
    });
  } catch {
    history.replaceState(null, '', location.pathname);
    showError('Password setup could not be loaded. Check your connection and try again.');
  }
}

initialize();
