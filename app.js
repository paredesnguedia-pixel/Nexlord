// CONFIGURATION SUPABASE
const SUPABASE_URL = "https://ztesylgrlxudpnvhvtzd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const WHATSAPP_NUMBER = "237657420284";

let products = [];
let category = "Tous";

const money = n =>
  new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

const safe = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

document.getElementById("year").textContent =
  new Date().getFullYear();

async function load() {
  const grid = document.getElementById("productGrid");

  try {
    if (!window.supabase) {
      throw new Error("Bibliothèque Supabase non chargée.");
    }

    const db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    const { data, error } = await db
      .from("products")
      .select("id,name,description,price_xaf,category,image_url")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    products = data || [];
    render();

  } catch (e) {
    console.error("Erreur Supabase :", e);
    grid.innerHTML =
      '<div class="empty">Impossible de charger les produits. Vérifiez Supabase.</div>';
  }
}

function render() {
  const q = document
    .getElementById("searchInput")
    .value.toLowerCase().trim();

  const found = products.filter(p =>
    (category === "Tous" || p.category === category) &&
    (`${p.name} ${p.description} ${p.category}`)
      .toLowerCase().includes(q)
  );

  const grid = document.getElementById("productGrid");

  if (!found.length) {
    grid.innerHTML =
      '<div class="empty">Aucun produit pour le moment. Revenez bientôt !</div>';
    return;
  }

  grid.innerHTML = found.map(p => {
    const msg = encodeURIComponent(
      `Bonjour NEXLORD, je suis intéressé(e) par ${p.name}` +
      `${p.price_xaf != null ? " — " + money(p.price_xaf) : ""}. Est-il disponible ?`
    );

    const image = p.image_url
      ? `<img src="${safe(p.image_url)}" alt="${safe(p.name)}">`
      : "✧";

    return `
      <article class="card">
        <div class="photo">${image}</div>
        <div class="info">
          <small>${safe(p.category || "Autres")}</small>
          <h3>${safe(p.name)}</h3>
          <p>${safe(p.description || "")}</p>
          <div class="bottom">
            <b>${p.price_xaf != null ? money(p.price_xaf) : "Prix sur demande"}</b>
            <a class="buy"
              href="https://wa.me/${WHATSAPP_NUMBER}?text=${msg}"
              target="_blank"
              rel="noopener">
              Commander ↗
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

document
  .getElementById("searchInput")
  .addEventListener("input", render);

document
  .getElementById("categoryFilters")
  .addEventListener("click", e => {
    const b = e.target.closest("button[data-category]");
    if (!b) return;

    category = b.dataset.category;

    document
      .querySelectorAll("#categoryFilters button")
      .forEach(x => x.classList.toggle("active", x === b));

    render();
  });

load();