// Browser-visible values only. Reject secret keys and inconsistent deployments.
window.halalAdminConfig = (() => {
  const value = { url: window.HALALCHECK_SUPABASE_URL, key: window.HALALCHECK_SUPABASE_ANON_KEY, statsEndpoint: window.HALALCHECK_ADMIN_STATS_ENDPOINT };
  try {
    const project = new URL(value.url);
    const endpoint = new URL(value.statsEndpoint);
    let publicKey = typeof value.key === 'string' && /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value.key);
    if (!publicKey && typeof value.key === 'string' && value.key.split('.').length === 3) {
      const payload = JSON.parse(atob(value.key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      publicKey = payload.role === 'anon' && (!payload.ref || payload.ref === project.hostname.split('.')[0]);
    }
    if (!publicKey || project.protocol !== 'https:' || !project.hostname.endsWith('.supabase.co') || project.username || project.password || project.search || project.hash || !['', '/'].includes(project.pathname) || endpoint.origin !== project.origin || endpoint.pathname !== '/functions/v1/admin-stats' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw new Error('Invalid configuration');
    return { ready: true, value };
  } catch { return { ready: false }; }
})();
