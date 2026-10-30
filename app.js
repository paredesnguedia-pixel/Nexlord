// NEXLORD — boutique publique. Les images du bucket privé sont affichées via URL signées.
const SUPABASE_URL="https://ztesylgrlxudpnvhvtzd.supabase.co";
const SUPABASE_KEY="sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const WHATSAPP_NUMBER="237657420284", BUCKET="Product-images";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let products=[],category="Tous";
const money=n=>new Intl.NumberFormat("fr-FR").format(n)+" FCFA";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.getElementById("year").textContent=new Date().getFullYear();
async function load(){
 const grid=document.getElementById("productGrid");
 try{
  const {data,error}=await db.from("products").select("id,name,description,price_xaf,category,image_url").eq("published",true).order("created_at",{ascending:false});
  if(error)throw error;
  products=await Promise.all((data||[]).map(async p=>{
   let imageDisplay="";
   if(p.image_url){
    if(p.image_url.startsWith("http"))imageDisplay=p.image_url;
    else {const {data:signed}=await db.storage.from(BUCKET).createSignedUrl(p.image_url,3600);imageDisplay=signed?.signedUrl||"";}
   }
   return {...p,imageDisplay};
  }));
  render();
 }catch(e){console.error(e);grid.innerHTML='<div class="empty">Erreur de connexion à la boutique. Vérifiez Supabase.</div>';}
}
function render(){
 const q=document.getElementById("searchInput").value.toLowerCase().trim();
 const found=products.filter(p=>(category==="Tous"||p.category===category)&&(`${p.name} ${p.description} ${p.category}`).toLowerCase().includes(q));
 const grid=document.getElementById("productGrid");
 if(!found.length){grid.innerHTML='<div class="empty">Aucun produit pour le moment. Revenez bientôt !</div>';return;}
 grid.innerHTML=found.map(p=>{
  const msg=encodeURIComponent(`Bonjour NEXLORD, je suis intéressé(e) par ${p.name}${p.price_xaf!=null?" — "+money(p.price_xaf):""}. Est-il disponible ?`);
  const image=p.imageDisplay?`<img src="${safe(p.imageDisplay)}" alt="${safe(p.name)}">`:"✧";
  return `<article class="card"><div class="photo">${image}</div><div class="info"><small>${safe(p.category||"Autres")}</small><h3>${safe(p.name)}</h3><p>${safe(p.description||"")}</p><div class="bottom"><b>${p.price_xaf!=null?money(p.price_xaf):"Prix sur demande"}</b><a class="buy" href="https://wa.me/${WHATSAPP_NUMBER}?text=${msg}" target="_blank" rel="noopener">Commander ↗</a></div></div></article>`;
 }).join("");
}
document.getElementById("searchInput").addEventListener("input",render);
document.getElementById("categoryFilters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;category=b.dataset.category;document.querySelectorAll("#categoryFilters button").forEach(x=>x.classList.toggle("active",x===b));render();});
load();
