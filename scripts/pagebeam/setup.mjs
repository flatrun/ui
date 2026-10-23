// Prepares a signed-in pagebeam context: picks the layout and scheme for every
// page it opens, scopes it to the demo workspace, and hides the development
// build banner, which only a dev agent shows.
export function prepare(style, scheme) {
  return async (page) => {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await page.context().addInitScript(
      ([style, scheme]) => {
        localStorage.setItem("flatrun-style", style);
        localStorage.setItem("flatrun-scheme", scheme);
        localStorage.setItem("flatrun.workspace", "default");
        document.addEventListener("DOMContentLoaded", () => {
          const css = document.createElement("style");
          css.textContent = ".version-warning { display: none !important; }";
          document.head.appendChild(css);
        });
      },
      [style, scheme],
    );
    await page.reload();
  };
}
