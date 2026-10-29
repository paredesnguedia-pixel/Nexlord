// Configuration Supabase : remplacez les deux valeurs ci-dessous par l'URL du projet et la clé publique.
// Ne mettez JAMAIS la clé secrète/service_role dans un site public.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_PUBLIC_ANON_KEY_HERE";
const WHATSAPP_NUMBER = "237657420284";
const demo = [
{id:"d1",name:"T-shirt essentiel",description:"Un style simple pour tous les jours.",price_xaf:8000,category:"Vêtements"},
{id:"d2",name:"Sneakers urbaines",description:"Confort et style pour vos déplacements.",price_xaf:22000,category:"Chaussures"},
{id:"d3",name:"Ensemble d'ustensiles de cuisine",description:"Les essentiels pratiques pour la maison.",price_xaf:12000,category:"Ustensiles"},
{id:"d4",name:"Smartphone nouvelle génération",description:"Performance et élégance au quotidien.",price_xaf:125000,category:"Téléphones"},
{id:"d5",name:"Ordinateur portable",description:"Travaillez et créez sans limites.",price_xaf:280000,category:"Informatique"},
{id:"d6",name:"Écouteurs sans fil",description:"Un son immersif, partout avec vous.",price_xaf:18000,category:"Accessoires"}
];
let products=[], category="Tous";
const money=n=>new Intl.NumberFormat("fr-FR").format(n)+" FCFA";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.getElementById("year").textContent=new Date().getFullYear();
async function load(){
 const grid=document.getElementById("productGrid");
 if(!SUPABASE_URL.includes("PASTE_")&&!SUPABASE_ANON_KEY.includes("PASTE_")&&window.supabase){
  try{const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);const {data,error}=await db.from("products").select("id,name,description,price_xaf,category,image_url").eq("published",true).order("created_at",{ascending:false});if(error)throw error;products=data||[]}
  catch(e){console.error(e);grid.innerHTML='<div class="empty">Erreur de connexion à la boutique. Vérifiez Supabase.</div>';return}
 }else products=demo;
 render();
}
function render(){
 const q=document.getElementById("searchInput").value.toLowerCase().trim();
 const found=products.filter(p=>(category==="Tous"||p.category===category)&&(`${p.name} ${p.description} ${p.category}`).toLowerCase().includes(q));
 const grid=document.getElementById("productGrid");
 if(!found.length){grid.innerHTML='<div class="empty">Aucun produit pour le moment. Revenez bientôt !</div>';return}
 grid.innerHTML=found.map(p=>{const msg=encodeURIComponent(`Bonjour NEXLORD, je suis intéressé(e) par ${p.name}${p.price_xaf!=null?" — "+money(p.price_xaf):""}. Est-il disponible ?`);const image=p.image_url?`<img src="${safe(p.image_url)}" alt="${safe(p.name)}">`:"✧";return `<article class="card"><div class="photo">${image}</div><div class="info"><small>${safe(p.category||"Autres")}</small><h3>${safe(p.name)}</h3><p>${safe(p.description||"")}</p><div class="bottom"><b>${p.price_xaf!=null?money(p.price_xaf):"Prix sur demande"}</b><a class="buy" href="https://wa.me/${WHATSAPP_NUMBER}?text=${msg}" target="_blank" rel="noopener">Commander ↗</a></div></div></article>`}).join("");
}
document.getElementById("searchInput").addEventListener("input",render);
document.getElementById("categoryFilters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;category=b.dataset.category;document.querySelectorAll("#categoryFilters button").forEach(x=>x.classList.toggle("active",x===b));render()});
load();