// Match the personal site's saved preference and warm light/dark palettes.
(() => {
  const preference = matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    let saved;
    try { saved = localStorage.getItem("theme"); } catch { /* Storage can be unavailable. */ }
    const dark = saved === "dark" || (saved !== "light" && preference.matches);
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]').content = dark ? "#21201C" : "#FAF9F5";
    document.dispatchEvent(new Event("themechange"));
  }
  apply();
  preference.addEventListener("change", apply);
})();
