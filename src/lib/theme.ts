export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("pf_theme") as "light" | "dark") || "light";
}

export function setTheme(t: "light" | "dark") {
  localStorage.setItem("pf_theme", t);
}
