import { ReactNode } from 'react';

/** Login/register screen: a photo panel with a greeting on the left, the form on the right. */
export function AuthHero({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth-hero-layout">
      <div className="auth-hero-left">
        <div className="hero-background">
          <div className="hero-overlay">
            <div className="hero-title">{title}</div>
            <div className="hero-subtitle">{subtitle}</div>
          </div>
        </div>
      </div>
      <div className="auth-hero-right">
        <div className="auth-form-container">{children}</div>
      </div>
    </div>
  );
}
