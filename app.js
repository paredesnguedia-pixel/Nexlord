"use strict";
// NEXLORD — boutique publique. Les images du bucket privé sont affichées via des URL signées.
const SB_URL = "https://ztesylgrlxudpnvhvtzd.supabase.co";
const SB_KEY = "sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const WHATSAPP_NUMBER = "237657420284";
const BUCKET = "Product-images";

const db = window.supabase.createClient(SB_URL, SB_KEY);
let products = [], category = "Tous";

const money = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);

$("year").textContent = new Date().getFullYear();

async function imageFor(p) {
  if (!p.image_url) return "";
  if (p.image_url.startsWith("http")) return p.image_url;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(p.image_url, 3600);
  return data?.signedUrl || "";
}

async function load() {
  try {
    const { data, error } = await db
      .from("products")
      .select("id,name,description,price_xaf,category,image_url")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    products = await Promise.all((data || []).map(async p => ({ ...p, imageDisplay: await imageFor(p).catch(() => "") })));
    render();
  } catch (e) {
    console.error(e);
    $("productGrid").innerHTML = '<div class="empty">Impossible de charger la boutique. Réessayez dans un instant.</div>';
  }
}

function render() {
  const q = $("searchInput").value.toLowerCase().trim();
  const found = products.filter(p =>
    (category === "Tous" || p.category === category) &&
    `${p.name} ${p.description || ""} ${p.category || ""}`.toLowerCase().includes(q)
  );
  const grid = $("productGrid");
  if (!found.length) {
    grid.innerHTML = '<div class="empty">Aucun produit pour le moment. Revenez bientôt !</div>';
    return;
  }
  grid.innerHTML = found.map(p => {
    const text = encodeURIComponent(`Bonjour NEXLORD, je suis intéressé(e) par ${p.name}${p.price_xaf != null ? " — " + money(p.price_xaf) : ""}. Est-il disponible ?`);
    const image = p.imageDisplay ? `<img src="${safe(p.imageDisplay)}" alt="${safe(p.name)}" loading="lazy" decoding="async">` : "✧";
    return `<article class="card">
      <div class="photo">${image}</div>
      <div class="info">
        <small>${safe(p.category || "Autres")}</small>
        <h3>${safe(p.name)}</h3>
        <p>${safe(p.description || "")}</p>
        <div class="bottom">
          <b>${p.price_xaf != null ? money(p.price_xaf) : "Prix sur demande"}</b>
          <a class="buy" href="https://wa.me/${WHATSAPP_NUMBER}?text=${text}" target="_blank" rel="noopener">Commander ↗</a>
        </div>
      </div>
    </article>`;
  }).join("");
}

$("searchInput").addEventListener("input", render);
$("categoryFilters").addEventListener("click", e => {
  const b = e.target.closest("button[data-category]");
  if (!b) return;
  category = b.dataset.category;
  document.querySelectorAll("#categoryFilters button").forEach(x => x.classList.toggle("active", x === b));
  render();
});

load();
