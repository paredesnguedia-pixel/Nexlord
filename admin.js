const URL = "https://ztesylgrlxudpnvhvtzd.supabase.co";
const KEY = "sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const BUCKET = "Product-images";

const db = window.supabase.createClient(URL, KEY);
const $ = id => document.getElementById(id);
let products = [], user = null;

const msg = (id, s) => {
  const el = $(id);
  if (el) el.textContent = s;
};

async function enter(u) {
  try {
    const { data, error } = await db
      .from("admins")
      .select("email,role")
      .eq("user_id", u.id)
      .maybeSingle();

    if (error || !data || !["admin", "super_admin"].includes(data.role)) {
      await db.auth.signOut();
      msg("loginMsg", "Accès refusé : compte non administrateur.");
      alert("Accès refusé : compte non administrateur.");
      return;
    }

    user = u;
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("identity").textContent = data.email + " — " + data.role;
    $("admins").classList.toggle("hidden", data.role !== "super_admin");
    await load();
  } catch (err) {
    msg("loginMsg", "Erreur vérification admin : " + err.message);
    alert("Erreur vérification admin : " + err.message);
  }
}

$("loginBtn").addEventListener("click", async function () {
  msg("loginMsg", "Connexion en cours…");

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    msg("loginMsg", "Veuillez remplir tous les champs.");
    alert("Veuillez remplir tous les champs.");
    return;
  }

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      msg("loginMsg", "Erreur : " + error.message);
      alert("Erreur : " + error.message);
      return;
    }

    await enter(data.user);
  } catch (err) {
    msg("loginMsg", "Erreur technique : " + err.message);
    alert("Erreur technique : " + err.message);
  }
});

$("logout").onclick = async function () {
  await db.auth.signOut();
  location.reload();
};

async function load() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    $("products").textContent = error.message;
    return;
  }

  products = data || [];
  $("count").textContent = products.length;

  if (products.length === 0) {
    $("products").innerHTML = "Aucun produit.";
    return;
  }

  $("products").innerHTML = products.map(function (p) {
    return '<div class="item"><b>' + esc(p.name) + '</b> — ' +
      (p.published ? "Publié" : "Brouillon") + '<br>' +
      Number(p.price_xaf || 0).toLocaleString("fr-FR") + ' FCFA<br>' +
      '<button data-edit="' + p.id + '">Modifier</button> ' +
      '<button class="danger" data-del="' + p.id + '">Supprimer</button></div>';
  }).join("");

  document.querySelectorAll("[data-edit]").forEach(function (b) {
    b.onclick = function () { edit(b.dataset.edit); };
  });
  document.querySelectorAll("[data-del]").forEach(function (b) {
    b.onclick = function () { del(b.dataset.del); };
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

$("productForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  msg("formMsg", "Enregistrement…");

  try {
    const id = $("pid").value;
    const old = products.find(function (p) { return p.id === id; });
    let image_url = old && old.image_url ? old.image_url : null;
    const file = $("photo").files[0];

    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "");
      const path = user.id + "/" + crypto.randomUUID() + "." + ext;
      const up = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "image/jpeg"
      });
      if (up.error) throw up.error;
      image_url = path;
    }

    const row = {
      name: $("name").value.trim(),
      description: $("description").value.trim(),
      price_xaf: \( ("price").value ? Number( \)("price").value) : null,
      category: $("category").value.trim() || null,
      image_url: image_url,
      published: $("published").checked,
      updated_at: new Date().toISOString()
    };

    let result;
    if (id) {
      result = await db.from("products").update(row).eq("id", id);
    } else {
      result = await db.from("products").insert(row);
    }

    if (result.error) throw result.error;

    msg("formMsg", "Produit enregistré.");
    reset();
    await load();
  } catch (err) {
    msg("formMsg", "Erreur : " + err.message);
  }
});

function edit(id) {
  const p = products.find(function (x) { return x.id === id; });
  $("pid").value = p.id;
  $("name").value = p.name || "";
  $("description").value = p.description || "";
  $("price").value = p.price_xaf != null ? p.price_xaf : "";
  $("category").value = p.category || "";
  $("published").checked = !!p.published;
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

async function del(id) {
  const p = products.find(function (x) { return x.id === id; });
  if (!confirm("Supprimer " + p.name + " ?")) return;

  const { error } = await db.from("products").delete().eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  if (p.image_url && !p.image_url.startsWith("http")) {
    await db.storage.from(BUCKET).remove([p.image_url]);
  }
  await load();
}

(async function () {
  try {
    const { data } = await db.auth.getSession();
    if (data.session) {
      await enter(data.session.user);
    }
  } catch (err) {
    console.error(err);
  }
})();