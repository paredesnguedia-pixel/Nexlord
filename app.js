"use strict";
const SB_URL = "https://ztesylgrlxudpnvhvtzd.supabase.co";
const SB_KEY = "sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const WHATSAPP_NUMBER = "237657420284";
const BUCKET = "Product-images";

const db = window.supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const arr = a => Array.isArray(a) ? a : [];
const imgsOf = p => arr(p.images).length ? p.images : (p.image_url ? [p.image_url] : []);
const wa = t => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t)}`;
const pick = id => products.find(p => String(p.id) === String(id));
const price = p => p.price_xaf != null ? money(p.price_xaf) : "Prix sur demande";

let products = [], category = "Tous", cart = [], cur = null;
try { cart = JSON.parse(localStorage.getItem("nx_cart") || "[]"); } catch { cart = []; }
const saveCart = () => {
  try { localStorage.setItem("nx_cart", JSON.stringify(cart)); } catch {}
  $("cartCount").textContent = cart.reduce((n, l) => n + l.qty, 0);
};
function toast(t) {
  const el = $("toast"); el.textContent = t; el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2000);
}
const openOv = id => { $(id).classList.add("on"); $(id).scrollTop = 0; document.body.classList.add("lock"); };
const closeOv = () => { document.querySelectorAll(".ov").forEach(o => o.classList.remove("on")); document.body.classList.remove("lock"); };

$("year").textContent = new Date().getFullYear();

async function load() {
  try {
    const { data, error } = await db.from("products")
      .select("id,name,description,price_xaf,category,image_url,images,sizes,colors,in_stock")
      .eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    const paths = [...new Set((data || []).flatMap(imgsOf).filter(u => !u.startsWith("http")))];
    const url = {};
    if (paths.length) {
      const { data: s } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
      (s || []).forEach(x => { if (x.signedUrl) url[x.path] = x.signedUrl; });
    }
    products = (data || []).map(p => ({ ...p, pics: imgsOf(p).map(u => u.startsWith("http") ? u : url[u]).filter(Boolean) }));
    cart = cart.filter(l => { const p = pick(l.id); if (!p || p.in_stock === false) return false; l.name = p.name; l.price = p.price_xaf; return true; });
    saveCart(); render();
  } catch (e) {
    console.error(e);
    $("productGrid").innerHTML = '<div class="empty">Impossible de charger la boutique. Réessayez dans un instant.</div>';
  }
}

const card = p => {
  const ok = p.in_stock !== false;
  return `<article class="card" data-open="${p.id}">${ok ? "" : '<span class="tag">Épuisé</span>'}
    <div class="photo">${p.pics[0] ? `<img src="${safe(p.pics[0])}" alt="${safe(p.name)}" loading="lazy" decoding="async">` : "✧"}</div>
    <div class="info"><small>${safe(p.category || "Autres")}</small><h3>${safe(p.name)}</h3><p>${safe(p.description || "")}</p>
    <div class="bottom"><b>${price(p)}</b></div>
    <div class="acts"><button class="buy" data-add="${p.id}" ${ok ? "" : "disabled"}>🛒 Ajouter</button><button class="buy" data-open="${p.id}">Voir</button></div></div></article>`;
};

function render() {
  const q = $("searchInput").value.toLowerCase().trim();
  const found = products.filter(p => (category === "Tous" || p.category === category) &&
    `${p.name} ${p.description || ""} ${p.category || ""}`.toLowerCase().includes(q));
  $("productGrid").innerHTML = found.length ? found.map(card).join("") : '<div class="empty">Aucun produit pour le moment. Revenez bientôt !</div>';
}

// ---------- Fiche produit ----------
function openView(id) {
  const p = pick(id); if (!p) return;
  cur = { p, size: "", color: "" };
  const ok = p.in_stock !== false;
  const grp = (k, a, l) => arr(a).length ? `<p><small>${l}</small></p><div class="opts">${a.map(x => `<button data-${k}="${safe(x)}">${safe(x)}</button>`).join("")}</div>` : "";
  const rel = products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 6);
  $("viewer").innerHTML = `<div class="vbox"><button class="x" data-close aria-label="Fermer">✕</button>
    ${p.pics.length ? `<div class="gal" id="gal">${p.pics.map(u => `<img src="${safe(u)}" alt="${safe(p.name)}">`).join("")}</div><p class="cnt" id="cnt">1 / ${p.pics.length}${p.pics.length > 1 ? " · faites défiler →" : ""}</p>` : ""}
    <div class="vinfo"><small>${safe(p.category || "Autres")}</small><h2>${safe(p.name)}</h2><b>${price(p)}</b>${ok ? "" : ' <span class="tag" style="position:static">Épuisé</span>'}
    <p>${safe(p.description || "")}</p>${grp("size", p.sizes, "Taille")}${grp("color", p.colors, "Couleur")}<p id="vmsg" class="verr"></p></div>
    ${rel.length ? `<div class="rel"><h3>Dans la même catégorie</h3><div class="grid mini">${rel.map(card).join("")}</div></div>` : ""}
    <div class="vbar"><button data-vadd ${ok ? "" : "disabled"}>🛒 Ajouter</button><button data-vwa ${ok ? "" : "disabled"}>Commander sur WhatsApp</button></div></div>`;
  openOv("viewer");
}

function choice() {
  const { p } = cur;
  if (arr(p.sizes).length && !cur.size) return $("vmsg").textContent = "Choisissez une taille.", null;
  if (arr(p.colors).length && !cur.color) return $("vmsg").textContent = "Choisissez une couleur.", null;
  return { size: cur.size, color: cur.color };
}

function addToCart(p, size = "", color = "") {
  const f = cart.find(l => l.id === p.id && l.size === size && l.color === color);
  if (f) f.qty++; else cart.push({ id: p.id, name: p.name, price: p.price_xaf, size, color, qty: 1 });
  saveCart(); toast("Ajouté au panier ✓");
}

const msgFor = ls => "Bonjour NEXLORD, je souhaite commander :\n" +
  ls.map(l => `• ${l.qty} × ${l.name}${l.size || l.color ? ` (${[l.size, l.color].filter(Boolean).join(", ")})` : ""}${l.price != null ? " — " + money(l.price * l.qty) : ""}`).join("\n") +
  `\n\nTotal articles : ${money(ls.reduce((s, l) => s + (l.price || 0) * l.qty, 0))} (hors livraison)\nZone de livraison à Yaoundé : \nPaiement : Mobile Money / à la livraison`;

function renderCart() {
  const t = cart.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
  $("cartBox").innerHTML = `<button class="x" data-close aria-label="Fermer">✕</button><h2 class="vh">Mon panier</h2>` + (cart.length
    ? cart.map((l, i) => `<div class="cl"><div><b>${safe(l.name)}</b><br><small>${safe([l.size, l.color].filter(Boolean).join(" · "))}</small><br>${l.price != null ? money(l.price * l.qty) : "Prix sur demande"}</div>
      <div class="qty"><button data-q="${i}:-1" aria-label="Moins">−</button><span>${l.qty}</span><button data-q="${i}:1" aria-label="Plus">+</button><button data-q="${i}:0" aria-label="Retirer">🗑</button></div></div>`).join("") +
      `<p class="vinfo"><b>Total : ${money(t)}</b><br><small>Livraison en plus : 500 à 2 000 FCFA selon la zone et le mode choisi.</small></p><div class="vbar"><button data-order>Commander sur WhatsApp</button></div>`
    : '<p class="vinfo">Votre panier est vide.</p>');
}

// ---------- Événements ----------
document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest("[data-close]") || t.classList.contains("ov")) return closeOv();
  if (t.closest("#cartBtn")) { renderCart(); return openOv("cart"); }
  const add = t.closest("[data-add]");
  if (add) {
    const p = pick(add.dataset.add);
    if (arr(p.sizes).length || arr(p.colors).length) { openView(p.id); toast("Choisissez vos options"); } else addToCart(p);
    return;
  }
  const o = t.closest("[data-size],[data-color]");
  if (o && cur) {
    const k = o.dataset.size !== undefined ? "size" : "color";
    cur[k] = o.dataset[k]; $("vmsg").textContent = "";
    o.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === o));
    return;
  }
  if (t.closest("[data-vadd]")) { const c = choice(); if (c) addToCart(cur.p, c.size, c.color); return; }
  if (t.closest("[data-vwa]")) {
    const c = choice();
    if (c) window.open(wa(msgFor([{ id: cur.p.id, name: cur.p.name, price: cur.p.price_xaf, size: c.size, color: c.color, qty: 1 }])), "_blank", "noopener");
    return;
  }
  const q = t.closest("[data-q]");
  if (q) {
    const [i, d] = q.dataset.q.split(":").map(Number);
    if (d === 0 || cart[i].qty + d <= 0) cart.splice(i, 1); else cart[i].qty += d;
    saveCart(); return renderCart();
  }
  if (t.closest("[data-order]")) return void window.open(wa(msgFor(cart)), "_blank", "noopener");
  const op = t.closest("[data-open]");
  if (op) openView(op.dataset.open);
});

document.addEventListener("keydown", e => { if (e.key === "Escape") closeOv(); });
$("viewer").addEventListener("scroll", e => {
  if (e.target.id !== "gal") return;
  const g = e.target, n = g.children.length;
  $("cnt").textContent = `${Math.round(g.scrollLeft / g.clientWidth) + 1} / ${n}${n > 1 ? " · faites défiler →" : ""}`;
}, true);

$("searchInput").addEventListener("input", render);
$("categoryFilters").addEventListener("click", e => {
  const b = e.target.closest("button[data-category]");
  if (!b) return;
  category = b.dataset.category;
  document.querySelectorAll("#categoryFilters button").forEach(x => x.classList.toggle("active", x === b));
  render();
});

saveCart();
load();
