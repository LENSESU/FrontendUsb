export const themeInitScript = `
(function () {
  try {
    var mode = localStorage.getItem("usb-lens-theme") || "system";
    if (mode !== "light" && mode !== "dark" && mode !== "system") mode = "system";
    var resolved = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = resolved;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themeMode = "system";
  }
})();
`;
