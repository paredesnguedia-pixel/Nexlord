"use strict";
// Lu avant la création du client : Supabase nettoie l’URL au démarrage.
const HASH = location.hash;

const SB_URL = "https://ztesylgrlxudpnvhvtzd.supabase.co";
const SB_KEY = "sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const BUCKET = "Product-images";
const CATS = ["Vêtements", "Chaussures", "Ustensiles", "Téléphones", "Informatique", "Accessoires", "Autres"];

const db = window.supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);
let products = [], user = null, recovery = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const msg = (id, text, ok) => { const el = $(id); el.textContent = text || ""; el.classList.toggle("ok", !!ok); el.classList.toggle("err", !ok); };
const show = name => ["vLogin", "vForgot", "vReset", "vApp"].forEach(v => $(v).classList.toggle("hidden", v !== name));

function popup(title, text, onClose) {
  $("mTitle").textContent = title;
  $("mText").textContent = text;
  $("modal").classList.remove("hidden");
  $("mOk").focus();
  $("mOk").onclick = () => { $("modal").classList.add("hidden"); if (onClose) onClose(); };
}

function friendly(err) {
  const m = (err && err.message) || String(err);
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(m)) return "E-mail non confirmé. Confirmez-le dans Supabase (Authentication → Users).";
  if (/rate limit|too many|seconds/i.test(m)) return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  if (/same password|different from the old/i.test(m)) return "Choisissez un mot de passe différent de l’ancien.";
  return m;
}

// Afficher / masquer un mot de passe
document.addEventListener("click", e => {
  const b = e.target.closest("[data-eye]");
  if (!b) return;
  const i = $(b.dataset.eye);
  i.type = i.type === "password" ? "text" : "password";
  b.textContent = i.type === "password" ? "👁" : "🙈";
});

$("toForgot").onclick = () => { $("fEmail").value = $("email").value; msg("forgotMsg", ""); show("vForgot"); };
$("toLogin").onclick = () => { msg("loginMsg", ""); show("vLogin"); };

// ---------- Vérification du rôle ----------
async function enter(u) {
  const { data, error } = await db.from("admins").select("email,role").eq("user_id", u.id).maybeSingle();
  if (error) throw Error("Vérification impossible : " + error.message);
  if (!data || !["admin", "super_admin"].includes(data.role)) throw Error("Accès refusé : ce compte n’est pas administrateur.");

  user = u;
  $("identity").textContent = data.email + " — " + (data.role === "super_admin" ? "super administrateur" : "administrateur");
  $("admins").classList.toggle("hidden", data.role !== "super_admin");
  show("vApp");
  await loadProducts();
  return data;
}

// ---------- Connexion ----------
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginBtn").disabled = true;
  msg("loginMsg", "Connexion en cours…", true);
  try {
    const { data, error } = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) throw error;
    const admin = await enter(data.user);
    msg("loginMsg", "");
    $("password").value = "";
    popup("Connexion réussie", "Bienvenue " + admin.email + ". Vous êtes connecté en tant que " + (admin.role === "super_admin" ? "super administrateur" : "administrateur") + ".");
  } catch (err) {
    msg("loginMsg", friendly(err));
    await db.auth.signOut();
    user = null;
  } finally {
    $("loginBtn").disabled = false;
  }
});

$("logout").onclick = async () => { await db.auth.signOut(); location.reload(); };

// ---------- Mot de passe oublié ----------
$("forgotForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("forgotBtn");
  btn.disabled = true;
  msg("forgotMsg", "Envoi en cours…", true);
  try {
    const { error } = await db.auth.resetPasswordForEmail($("fEmail").value.trim(), { redirectTo: location.origin + location.pathname });
    if (error) throw error;
    msg("forgotMsg", "");
    popup("E-mail envoyé", "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé. Pensez à vérifier vos courriers indésirables.");
    let s = 60;
    const t = setInterval(() => {
      btn.textContent = s > 0 ? "Renvoyer dans " + s-- + " s" : "Envoyer le lien";
      if (s < 0) { clearInterval(t); btn.disabled = false; }
    }, 1000);
  } catch (err) {
    msg("forgotMsg", friendly(err));
    btn.disabled = false;
  }
});

// ---------- Nouveau mot de passe (après clic sur le lien reçu) ----------
db.auth.onAuthStateChange(event => {
  if (event === "PASSWORD_RECOVERY") { recovery = true; show("vReset"); }
});

$("resetForm").addEventListener("submit", async e => {
  e.preventDefault();
  const p1 = $("np1").value;
  if (p1.length < 8) return msg("resetMsg", "Le mot de passe doit contenir au moins 8 caractères.");
  if (p1 !== $("np2").value) return msg("resetMsg", "Les deux mots de passe ne correspondent pas.");
  $("resetBtn").disabled = true;
  msg("resetMsg", "Enregistrement…", true);
  try {
    const { error } = await db.auth.updateUser({ password: p1 });
    if (error) throw error;
    recovery = false;
    await db.auth.signOut();
    history.replaceState(null, "", location.pathname);
    $("np1").value = $("np2").value = "";
    msg("resetMsg", "");
    popup("Mot de passe modifié", "Votre nouveau mot de passe est enregistré. Connectez-vous avec celui-ci.", () => show("vLogin"));
  } catch (err) {
    msg("resetMsg", friendly(err));
  } finally {
    $("resetBtn").disabled = false;
  }
});

// ---------- Produits ----------
$("category").innerHTML = CATS.map(c => `<option>${c}</option>`).join("");

async function loadProducts() {
  const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
  if (error) { $("products").textContent = "Chargement impossible : " + error.message; return; }
  products = data || [];
  $("count").textContent = products.length;
  $("products").innerHTML = products.length ? products.map(p =>
    `<div class="item"><b>${esc(p.name)}</b> — ${p.published ? "Publié" : "Brouillon"}<br>
    <span class="muted">${p.price_xaf != null ? Number(p.price_xaf).toLocaleString("fr-FR") + " FCFA" : "Prix sur demande"} · ${esc(p.category || "Autres")}</span><br>
    <button data-edit="${esc(p.id)}">Modifier</button><button class="danger" data-del="${esc(p.id)}">Supprimer</button></div>`
  ).join("") : "Aucun produit pour le moment.";
}

$("products").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.edit) edit(b.dataset.edit);
  if (b.dataset.del) del(b.dataset.del);
});

const find = id => products.find(p => String(p.id) === String(id));
const isStored = u => u && !u.startsWith("http");

function edit(id) {
  const p = find(id);
  if (!p) return;
  $("pid").value = p.id;
  $("name").value = p.name || "";
  $("description").value = p.description || "";
  $("price").value = p.price_xaf ?? "";
  $("category").value = CATS.includes(p.category) ? p.category : "Autres";
  $("published").checked = !!p.published;
  $("photo").value = "";
  $("formTitle").textContent = "Modifier le produit";
  $("cancel").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function reset() {
  $("productForm").reset();
  $("pid").value = "";
  $("formTitle").textContent = "Ajouter un produit";
  $("cancel").classList.add("hidden");
}
$("cancel").onclick = reset;

$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("saveBtn").disabled = true;
  msg("formMsg", "Enregistrement…", true);
  const id = $("pid").value, old = id ? find(id) : null;
  let image = old?.image_url || null, newPath = null;
  try {
    const f = $("photo").files[0];
    if (f) {
      if (!f.type.startsWith("image/")) throw Error("Choisissez un fichier image.");
      if (f.size > 5 * 1048576) throw Error("L’image dépasse 5 Mo.");
      const ext = ((f.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg").toLowerCase();
      newPath = user.id + "/" + crypto.randomUUID() + "." + ext;
      const up = await db.storage.from(BUCKET).upload(newPath, f, { contentType: f.type });
      if (up.error) throw up.error;
      image = newPath;
    }
    const row = {
      name: $("name").value.trim(),
      description: $("description").value.trim() || null,
      price_xaf: $("price").value === "" ? null : Number($("price").value),
      category: $("category").value,
      image_url: image,
      published: $("published").checked,
      updated_at: new Date().toISOString()
    };
    let r;
    if (id) {
      r = await db.from("products").update(row).eq("id", id);
    } else {
      r = await db.from("products").insert({ ...row, seller_id: user.id });
      // Si la table n’a pas de colonne seller_id, on réessaie sans.
      if (r.error && /seller_id/.test(r.error.message) && /column/i.test(r.error.message)) r = await db.from("products").insert(row);
    }
    if (r.error) throw r.error;
    if (newPath && old && isStored(old.image_url)) await db.storage.from(BUCKET).remove([old.image_url]);
    reset();
    msg("formMsg", "Produit enregistré.", true);
    await loadProducts();
  } catch (err) {
    if (newPath) await db.storage.from(BUCKET).remove([newPath]);
    msg("formMsg", "Erreur : " + (err.message || err));
  } finally {
    $("saveBtn").disabled = false;
  }
});

async function del(id) {
  const p = find(id);
  if (!p || !confirm("Supprimer « " + p.name + " » ?")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return msg("formMsg", "Suppression impossible : " + error.message);
  if (isStored(p.image_url)) await db.storage.from(BUCKET).remove([p.image_url]);
  await loadProducts();
}

// ---------- Démarrage ----------
(async () => {
  if (HASH.includes("error_description")) {
    const d = new URLSearchParams(HASH.slice(1)).get("error_description") || "";
    msg("loginMsg", /expired|invalid/i.test(d) ? "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau avec « Mot de passe oublié ? »." : d.replace(/\+/g, " "));
    history.replaceState(null, "", location.pathname);
    return;
  }
  if (HASH.includes("type=recovery")) { recovery = true; show("vReset"); return; }
  try {
    const { data } = await db.auth.getSession();
    if (data.session && !recovery) await enter(data.session.user);
  } catch (err) {
    await db.auth.signOut();
    show("vLogin");
    msg("loginMsg", friendly(err));
  }
})();
