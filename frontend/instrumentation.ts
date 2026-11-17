// Runs once when the server starts (Next.js instrumentation hook)
export async function register() {
  // RENDER_EXTERNAL_URL is the service's public URL, set by Render; elsewhere it's unset
  // and there is nothing to keep awake
  const publicUrl = process.env.RENDER_EXTERNAL_URL;
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !publicUrl) return;

  const { startKeepAwake } = await import('./lib/keep-awake');
  startKeepAwake(publicUrl);
}
