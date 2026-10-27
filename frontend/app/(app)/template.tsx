// A template remounts on every navigation (a layout doesn't), so each page's
// sections rise in one after another when it opens.
export default function PageTemplate({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8 stagger">{children}</div>;
}
