import AppShell from "../components/layout/AppShell";

export default function SimplePage({ title, subtitle, children }) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <main className="page-content">
        <section className="dashboard-panel empty-state">
          {children || (
            <>
              <p className="eyebrow">Ready</p>
              <h3>{title}</h3>
              <p>{subtitle}</p>
            </>
          )}
        </section>
      </main>
    </AppShell>
  );
}
