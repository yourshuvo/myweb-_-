export default function PublicLoading() {
  return (
    <main className="win98-window-shell win98-window--document" id="main-content">
      <section className="retro-window public-window" aria-label="Opening window">
        <div className="retro-titlebar"><strong>Opening...</strong></div>
        <div className="public-loading" role="status"><span className="retro-progress"><span /></span><p>Opening this folder...</p></div>
      </section>
    </main>
  );
}

